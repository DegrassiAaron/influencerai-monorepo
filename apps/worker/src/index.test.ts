import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

type Listener = (...args: any[]) => void;

type WorkerMockInstance = {
  queueName: string;
  processor: (...args: any[]) => unknown;
  opts: Record<string, unknown>;
  on: (event: string, handler: Listener) => WorkerMockInstance;
  emit: (event: string, ...args: any[]) => void;
};

const workerInstances: WorkerMockInstance[] = [];

vi.mock('bullmq', () => {
  class WorkerMock {
    queueName: string;
    processor: (...args: any[]) => unknown;
    opts: Record<string, unknown>;
    listeners: Map<string, Listener[]>;

    constructor(queueName: string, processor: (...args: any[]) => unknown, opts: Record<string, unknown>) {
      this.queueName = queueName;
      this.processor = processor;
      this.opts = opts;
      this.listeners = new Map();
      workerInstances.push(this as unknown as WorkerMockInstance);
    }

    on(event: string, handler: Listener) {
      const handlers = this.listeners.get(event) ?? [];
      handlers.push(handler);
      this.listeners.set(event, handlers);
      return this;
    }

    emit(event: string, ...args: any[]) {
      const handlers = this.listeners.get(event) ?? [];
      handlers.forEach((handler) => handler(...args));
    }

    async close() {
      return Promise.resolve();
    }
  }

  return { Worker: WorkerMock };
});

const contentDeps: any[] = [];
const loraDeps: any[] = [];
const videoDeps: any[] = [];

const createContentGenerationProcessorMock = vi.fn((deps) => {
  contentDeps.push(deps);
  return vi.fn().mockResolvedValue({ ok: true });
});

const createLoraTrainingProcessorMock = vi.fn((deps) => {
  loraDeps.push(deps);
  return vi.fn().mockResolvedValue({ ok: true });
});

const createVideoGenerationProcessorMock = vi.fn((deps) => {
  videoDeps.push(deps);
  return vi.fn().mockResolvedValue({ ok: true });
});

vi.mock('./processors/contentGeneration', () => ({
  createContentGenerationProcessor: createContentGenerationProcessorMock,
}));

vi.mock('./processors/loraTraining', () => ({
  createLoraTrainingProcessor: createLoraTrainingProcessorMock,
}));

vi.mock('./processors/videoGeneration', () => ({
  createVideoGenerationProcessor: createVideoGenerationProcessorMock,
}));

describe('createWorkers', () => {
  beforeEach(async () => {
    workerInstances.length = 0;
    contentDeps.length = 0;
    loraDeps.length = 0;
    videoDeps.length = 0;
    vi.clearAllMocks();
    await vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('boots BullMQ workers with shared dependencies and wire-up', async () => {
    process.env.BULL_PREFIX = 'test-prefix';
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const updateJob = vi.fn().mockResolvedValue(undefined);
    const createJob = vi.fn().mockResolvedValue({ id: 'child-123' });
    const s3Client = { client: {}, bucket: 'assets' };
    const s3 = {
      getClient: vi.fn(() => s3Client),
      putTextObject: vi.fn().mockResolvedValue(undefined),
      putBinaryObject: vi.fn().mockResolvedValue(undefined),
      getSignedGetUrl: vi.fn(async (_client: unknown, _bucket: string, key: string) => `https://assets.local/${key}`),
    };

    const { createWorkers } = await import('./index');

    const workers = createWorkers({
      logger,
      api: {
        updateJob,
        createJob,
      },
      connection: { kind: 'redis-mock' } as any,
      s3,
    });

    expect(workers.contentWorker).toBeDefined();
    expect(workers.loraWorker).toBeDefined();
    expect(workers.videoWorker).toBeDefined();

    expect(workerInstances).toHaveLength(3);
    expect(workerInstances.map((instance) => instance.queueName).sort()).toEqual([
      'content-generation',
      'lora-training',
      'video-generation',
    ]);

    workerInstances.forEach((instance) => {
      expect(instance.opts).toMatchObject({ connection: expect.objectContaining({ kind: 'redis-mock' }), prefix: 'test-prefix' });
    });

    expect(createContentGenerationProcessorMock).toHaveBeenCalledTimes(1);
    expect(createLoraTrainingProcessorMock).toHaveBeenCalledTimes(1);
    expect(createVideoGenerationProcessorMock).toHaveBeenCalledTimes(1);

    const deps = contentDeps[0];
    expect(deps.logger).toBe(logger);

    await deps.patchJobStatus('job-1', { status: 'running' });
    expect(updateJob).toHaveBeenCalledWith('job-1', { status: 'running' });

    await deps.createChildJob({
      parentJobId: 'job-1',
      caption: 'Caption',
      script: 'Script',
      persona: { name: 'Ava' },
      context: 'Launch',
      durationSec: 30,
    });
    expect(createJob).toHaveBeenCalledWith({
      type: 'video-generation',
      payload: {
        parentJobId: 'job-1',
        caption: 'Caption',
        script: 'Script',
        persona: { name: 'Ava' },
        context: 'Launch',
        durationSec: 30,
      },
      priority: 5,
    });

    const uploadResult = await deps.uploadTextAssets({
      jobIdentifier: 'job-1',
      caption: 'caption text',
      script: 'script text',
    });

    expect(s3.getClient).toHaveBeenCalledTimes(1);
    expect(s3.putTextObject).toHaveBeenCalledWith(s3Client.client, s3Client.bucket, 'content-generation/job-1/caption.txt', 'caption text');
    expect(s3.putTextObject).toHaveBeenCalledWith(s3Client.client, s3Client.bucket, 'content-generation/job-1/script.txt', 'script text');
    expect(s3.getSignedGetUrl).toHaveBeenCalledWith(
      s3Client.client,
      s3Client.bucket,
      'content-generation/job-1/caption.txt',
      24 * 3600
    );
    expect(s3.getSignedGetUrl).toHaveBeenCalledWith(s3Client.client, s3Client.bucket, 'content-generation/job-1/script.txt', 24 * 3600);
    expect(uploadResult).toEqual({
      captionUrl: 'https://assets.local/content-generation/job-1/caption.txt',
      scriptUrl: 'https://assets.local/content-generation/job-1/script.txt',
    });

    const failedWorker = workerInstances.find((instance) => instance.queueName === 'content-generation');
    expect(failedWorker).toBeDefined();

    failedWorker!.emit(
      'failed',
      { data: { jobId: 'job-failed' } },
      new Error('Boom')
    );

    await vi.waitFor(() => {
      expect(updateJob).toHaveBeenCalledWith('job-failed', expect.objectContaining({ status: 'failed' }));
    });
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ id: undefined, err: expect.any(Error) }), expect.any(String));
  });

  it('retries patchJobStatus once before logging a warning', async () => {
    vi.useFakeTimers();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const updateJob = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(undefined);
    const createJob = vi.fn().mockResolvedValue({ id: 'child' });
    const s3 = {
      getClient: vi.fn(() => null),
      putTextObject: vi.fn(),
      putBinaryObject: vi.fn(),
      getSignedGetUrl: vi.fn(),
    };

    const { createWorkers } = await import('./index');
    createWorkers({
      logger,
      api: { updateJob, createJob },
      connection: {} as any,
      s3,
    });

    const deps = contentDeps[0];
    const promise = deps.patchJobStatus('job-2', { status: 'running' });
    await vi.runAllTimersAsync();
    await promise;

    expect(updateJob).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a warning when patchJobStatus exhausts retries', async () => {
    vi.useFakeTimers();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const updateJob = vi.fn().mockRejectedValue(new Error('offline'));
    const createJob = vi.fn().mockResolvedValue({ id: 'child' });
    const s3 = {
      getClient: vi.fn(() => null),
      putTextObject: vi.fn(),
      putBinaryObject: vi.fn(),
      getSignedGetUrl: vi.fn(),
    };

    const { createWorkers } = await import('./index');
    createWorkers({
      logger,
      api: { updateJob, createJob },
      connection: {} as any,
      s3,
    });

    const deps = contentDeps[0];
    const promise = deps.patchJobStatus('job-3', { status: 'running' });
    await vi.runAllTimersAsync();
    await promise;

    expect(updateJob).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-3', data: { status: 'running' }, err: expect.any(Error) }),
      'Failed to PATCH job status after retries'
    );
  });
});
