import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('bullmq', () => {
  const WorkerMock = vi.fn().mockImplementation(() => {
    const handlers: Record<string, (...args: any[]) => void> = {};
    const instance: any = {
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler;
        return instance;
      }),
      emit: (event: string, ...args: any[]) => {
        handlers[event]?.(...args);
      },
      __handlers: handlers,
    };
    return instance;
  });
  return { Worker: WorkerMock };
});

vi.mock('ioredis', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock(
  '@influencerai/sdk',
  () => ({
    __esModule: true,
    InfluencerAIClient: vi.fn(),
  }),
  { virtual: true }
);

import { Worker } from 'bullmq';
import type { WorkerDependencies } from './index';
import { createWorkers } from './index';

describe('createWorkers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('instantiates workers with expected parameters and registers listeners', async () => {
    process.env.BULL_PREFIX = 'test-prefix';

    const WorkerMock = Worker as unknown as ReturnType<typeof vi.fn>;

    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const api: WorkerDependencies['api'] = {
      updateJob: vi.fn().mockResolvedValue(undefined),
      createJob: vi.fn().mockResolvedValue({} as any),
    };

    const s3Helpers = {
      getClient: vi.fn().mockReturnValue(null),
      putTextObject: vi.fn(),
      getSignedGetUrl: vi.fn(),
    };

    const dependencies: WorkerDependencies = {
      logger,
      api,
      connection: {} as any,
      s3: s3Helpers,
    };

    const workers = createWorkers(dependencies);

    expect(WorkerMock).toHaveBeenCalledTimes(2);
    expect(WorkerMock).toHaveBeenNthCalledWith(
      1,
      'content-generation',
      expect.any(Function),
      { connection: dependencies.connection, prefix: 'test-prefix' }
    );
    expect(WorkerMock).toHaveBeenNthCalledWith(
      2,
      'lora-training',
      expect.any(Function),
      { connection: dependencies.connection, prefix: 'test-prefix' }
    );

    const contentWorkerInstance = WorkerMock.mock.results[0].value as any;
    const loraWorkerInstance = WorkerMock.mock.results[1].value as any;

    expect(contentWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(contentWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(loraWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(loraWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));

    const contentFailedHandler = contentWorkerInstance.on.mock.calls.find((call: any[]) => call[0] === 'failed')[1];
    const loraFailedHandler = loraWorkerInstance.on.mock.calls.find((call: any[]) => call[0] === 'failed')[1];

    const error = new Error('failure');
    await contentFailedHandler({ data: { jobId: 'job-123' } }, error);
    await loraFailedHandler({ data: { jobId: 'job-456' } }, error);

    expect(api.updateJob).toHaveBeenCalledWith('job-123', {
      status: 'failed',
      result: { message: 'failure', stack: expect.any(String) },
    });
    expect(api.updateJob).toHaveBeenCalledWith('job-456', {
      status: 'failed',
      result: { message: 'failure', stack: expect.any(String) },
    });

    expect(logger.info).toHaveBeenCalledWith('Workers started and listening for jobs...');
    expect(workers.contentWorker).toBe(contentWorkerInstance);
    expect(workers.loraWorker).toBe(loraWorkerInstance);
  });
});
