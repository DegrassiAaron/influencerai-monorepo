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
type QueueMockInstance = {
  name: string;
  opts: Record<string, unknown>;
  getJobCounts: (...args: any[]) => Promise<Record<string, number>>;
};
const queueInstances: QueueMockInstance[] = [];

const fetchWithTimeoutMock = vi.fn(async () => 'fetch-result');
const sleepMock = vi.fn(async () => {});

vi.mock('./httpClient', async () => {
  const actual = await vi.importActual<typeof import('./httpClient')>('./httpClient');
  return {
    ...actual,
    fetchWithTimeout: fetchWithTimeoutMock,
    sleep: sleepMock,
  };
});

const createFfmpegRunnerMock = vi.fn(() => ({
  aspectRatio: '9:16',
  audioFilter: 'loudnorm',
  preset: 'medium',
  run: vi.fn(),
}));

vi.mock('./ffmpeg', () => ({
  createFfmpegRunner: createFfmpegRunnerMock,
}));

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

  class QueueMock {
    name: string;
    opts: Record<string, unknown>;

    constructor(name: string, opts: Record<string, unknown>) {
      this.name = name;
      this.opts = opts;
      queueInstances.push(this as unknown as QueueMockInstance);
    }

    async getJobCounts() {
      return { waiting: 0, failed: 0, completed: 0 } as Record<string, number>;
    }
  }

  return { Worker: WorkerMock, Queue: QueueMock };
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

const monitoringInstance = {
  app: { inject: vi.fn() },
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  recordFailure: vi.fn().mockResolvedValue(undefined),
  recordCompletion: vi.fn(),
  registry: { getSingleMetric: vi.fn() },
};

const createMonitoringServerMock = vi.fn(() => monitoringInstance);

vi.mock('./processors/contentGeneration', () => ({
  createContentGenerationProcessor: createContentGenerationProcessorMock,
}));

vi.mock('./processors/loraTraining', () => ({
  createLoraTrainingProcessor: createLoraTrainingProcessorMock,
}));

vi.mock('./processors/videoGeneration', () => ({
  createVideoGenerationProcessor: createVideoGenerationProcessorMock,
}));

vi.mock('./monitoring', () => ({
  createMonitoringServer: createMonitoringServerMock,
}));

describe('createWorkers', () => {
  beforeEach(async () => {
    workerInstances.length = 0;
    queueInstances.length = 0;
    contentDeps.length = 0;
    loraDeps.length = 0;
    videoDeps.length = 0;
    vi.clearAllMocks();
    await vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.BULL_PREFIX;
    delete process.env.COMFYUI_TIMEOUT_MS;
    delete process.env.COMFYUI_POLL_INTERVAL_MS;
    delete process.env.COMFYUI_MAX_POLL_ATTEMPTS;
    delete process.env.COMFYUI_VIDEO_WORKFLOW_JSON;
    delete process.env.WORKER_BULL_BOARD_USER;
    delete process.env.WORKER_BULL_BOARD_PASSWORD;
    delete process.env.WORKER_MONITOR_PORT;
    delete process.env.WORKER_MONITOR_HOST;
    delete process.env.WORKER_ALERT_WEBHOOK_URL;
    delete process.env.WORKER_ALERT_FAILURE_THRESHOLD;
  });

  it('boots BullMQ workers with shared dependencies and wire-up', async () => {
    process.env.BULL_PREFIX = 'test-prefix';
    process.env.COMFYUI_TIMEOUT_MS = '45000';
    process.env.COMFYUI_POLL_INTERVAL_MS = '2000';
    process.env.COMFYUI_MAX_POLL_ATTEMPTS = '8';
    process.env.COMFYUI_VIDEO_WORKFLOW_JSON = '{"nodes": []}';
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
    const fetchDataset = vi.fn();
    const fetchLoraConfig = vi.fn();

    process.env.WORKER_BULL_BOARD_USER = 'bull';
    process.env.WORKER_BULL_BOARD_PASSWORD = 'board';
    process.env.WORKER_MONITOR_PORT = '3035';
    const { createWorkers } = await import('./index');

    const workers = createWorkers({
      logger,
      api: {
        updateJob,
        createJob,
      },
      connection: { kind: 'redis-mock' } as any,
      s3,
      fetchDataset,
      fetchLoraConfig,
    });

    expect(createMonitoringServerMock).toHaveBeenCalledTimes(1);
    expect(createMonitoringServerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        logger,
        port: 3035,
        host: '0.0.0.0',
        auth: { username: 'bull', password: 'board' },
        webhook: undefined,
      })
    );
    expect(monitoringInstance.start).toHaveBeenCalledTimes(1);
    const expectedQueues = ['content-generation', 'lora-training', 'video-generation'];
    expect(queueInstances.map((queue) => queue.name).sort()).toEqual(expectedQueues);
    const monitoringArgs = createMonitoringServerMock.mock.calls[0]?.[0];
    expect(monitoringArgs.queues.map((entry: any) => entry.name).sort()).toEqual(expectedQueues);

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
    expect(s3.getClient).toHaveBeenCalledWith(logger);
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

    expect(loraDeps).toHaveLength(1);
    const loraDependencies = loraDeps[0];
    expect(loraDependencies.logger).toBe(logger);
    expect(loraDependencies.fetchDataset).toBe(fetchDataset);
    expect(loraDependencies.fetchLoraConfig).toBe(fetchLoraConfig);

    expect(videoDeps).toHaveLength(1);
    const videoDependencies = videoDeps[0];
    const ffmpegRunnerInstance = createFfmpegRunnerMock.mock.results[0]?.value;
    expect(createFfmpegRunnerMock).toHaveBeenCalledWith(logger);
    expect(videoDependencies.ffmpeg).toBe(ffmpegRunnerInstance);
    expect(videoDependencies.comfy.baseUrl).toBe('http://127.0.0.1:8188');
    expect(videoDependencies.comfy.clientId).toBe('influencerai-worker');
    expect(videoDependencies.comfy.pollIntervalMs).toBe(2000);
    expect(videoDependencies.comfy.maxPollAttempts).toBe(8);
    expect(videoDependencies.comfy.workflowPayload).toEqual({ nodes: [] });

    const comfyFetchResult = await videoDependencies.comfy.fetch('http://localhost:8188/prompt', { method: 'POST' });
    expect(fetchWithTimeoutMock).toHaveBeenCalledWith('http://localhost:8188/prompt', { method: 'POST' }, 45000);
    expect(comfyFetchResult).toBe('fetch-result');

    const contentQueueWorker = workerInstances.find((instance) => instance.queueName === 'content-generation');
    expect(contentQueueWorker).toBeDefined();

    contentQueueWorker!.emit('completed', { id: 'job-success', processedOn: 0, finishedOn: 10 } as any);
    expect(monitoringInstance.recordCompletion).toHaveBeenCalledWith(
      'content-generation',
      expect.objectContaining({ id: 'job-success', processedOn: 0, finishedOn: 10 })
    );

    contentQueueWorker!.emit(
      'failed',
      { data: { jobId: 'job-failed' } },
      new Error('Boom')
    );

    await vi.waitFor(() => {
      expect(updateJob).toHaveBeenCalledWith('job-failed', expect.objectContaining({ status: 'failed' }));
    });
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ id: undefined, err: expect.any(Error) }), expect.any(String));
    expect(monitoringInstance.recordFailure).toHaveBeenCalledWith('content-generation', 'job-failed', expect.any(Error));

    const loraFailedWorker = workerInstances.find((instance) => instance.queueName === 'lora-training');
    expect(loraFailedWorker).toBeDefined();
    loraFailedWorker!.emit('failed', { data: { jobId: 'lora-job' } }, new Error('LoRA failed'));

    const videoFailedWorker = workerInstances.find((instance) => instance.queueName === 'video-generation');
    expect(videoFailedWorker).toBeDefined();
    videoFailedWorker!.emit('failed', { data: { jobId: 'video-job' } }, new Error('Video failed'));

    await vi.waitFor(() => {
      expect(updateJob).toHaveBeenCalledWith('lora-job', expect.objectContaining({ status: 'failed' }));
      expect(updateJob).toHaveBeenCalledWith('video-job', expect.objectContaining({ status: 'failed' }));
    });
    expect(monitoringInstance.recordFailure).toHaveBeenCalledWith('lora-training', 'lora-job', expect.any(Error));
    expect(monitoringInstance.recordFailure).toHaveBeenCalledWith('video-generation', 'video-job', expect.any(Error));
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

    logger.warn.mockClear();
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

    logger.warn.mockClear();
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
