import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Worker } from 'bullmq';
import type Redis from 'ioredis';
import type { InfluencerAIClient } from '@influencerai/sdk';
import type { Logger } from 'pino';

type WorkerMockInstance = {
  name: string;
  processor: (...args: any[]) => unknown;
  opts: unknown;
  handlers: Map<string, (...args: any[]) => unknown>;
  on: ReturnType<typeof vi.fn>;
};

const workerMockState = vi.hoisted(() => {
  const instances: WorkerMockInstance[] = [];
  const WorkerMockFn = vi.fn<WorkerMockInstance, ConstructorParameters<typeof Worker>>((name, processor, opts) => {
    const handlers = new Map<string, (...args: any[]) => unknown>();
    const instance: WorkerMockInstance = {
      name,
      processor,
      opts,
      handlers,
      on: vi.fn((event: string, handler: (...args: any[]) => unknown) => {
        handlers.set(event, handler);
        return instance;
      }),
    };
    instances.push(instance);
    return instance;
  });
  const WorkerMock = WorkerMockFn as unknown as WorkerConstructor;
  return { instances, WorkerMock, WorkerMockFn };
});

type WorkerConstructor = typeof Worker;

const loggerMockState = vi.hoisted(() => {
  const logger: Pick<Logger, 'info' | 'warn' | 'error'> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return { logger };
});

const contentProcessorMockState = vi.hoisted(() => {
  const processorFn = vi.fn();
  const factory = vi.fn(() => processorFn as any);
  return { processorFn, factory };
});

const promptsMockState = vi.hoisted(() => ({
  imageCaptionPrompt: vi.fn(),
  videoScriptPrompt: vi.fn(),
}));

vi.mock('bullmq', () => ({
  Worker: workerMockState.WorkerMock,
}));

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({ disconnect: vi.fn() })),
}));

vi.mock('@influencerai/sdk', () => {
  class FakeClient {
    updateJob = vi.fn();
    createJob = vi.fn();
    constructor(public baseUrl: string) {}
  }
  return { InfluencerAIClient: FakeClient };
}, { virtual: true });

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock('./logger', () => loggerMockState);

vi.mock('./processors/contentGeneration', () => ({
  createContentGenerationProcessor: contentProcessorMockState.factory,
}));

vi.mock('@influencerai/prompts', () => promptsMockState, { virtual: true });

function getHandler(instance: WorkerMockInstance, event: string) {
  const handler = instance.handlers.get(event);
  expect(handler, `Handler for event "${event}" to be registered`).toBeTruthy();
  return handler!;
}

describe('worker bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    workerMockState.instances.length = 0;
    contentProcessorMockState.factory.mockClear();
    contentProcessorMockState.processorFn.mockClear();
    loggerMockState.logger.info.mockClear();
    loggerMockState.logger.warn.mockClear();
    loggerMockState.logger.error.mockClear();
    process.env.NODE_ENV = 'test';
    process.env.BULL_PREFIX = 'test-prefix';
  });

  it('instantiates workers and registers event handlers', async () => {
    const { createWorkers } = await import('./index');

    const patchJobStatus = vi.fn().mockResolvedValue(undefined);
    const connection = { kind: 'redis' } as unknown as Redis;
    const apiClient = { updateJob: vi.fn(), createJob: vi.fn() } as unknown as InfluencerAIClient;

    const result = createWorkers({
      connection,
      apiClient,
      logger: loggerMockState.logger,
      patchJobStatus,
      contentProcessorFactory: contentProcessorMockState.factory,
      prefix: 'queue-prefix',
    });

    expect(result.contentWorker).toBe(workerMockState.instances[0]);
    expect(result.loraWorker).toBe(workerMockState.instances[1]);
    expect(result.patchJobStatus).toBe(patchJobStatus);
    expect(result.apiClient).toBe(apiClient);
    expect(result.connection).toBe(connection);

    expect(workerMockState.WorkerMockFn).toHaveBeenCalledTimes(2);
    expect(workerMockState.WorkerMockFn).toHaveBeenNthCalledWith(1, 'content-generation', contentProcessorMockState.processorFn, {
      connection,
      prefix: 'queue-prefix',
    });
    expect(workerMockState.WorkerMockFn.mock.calls[1][0]).toBe('lora-training');
    expect(typeof workerMockState.WorkerMockFn.mock.calls[1][1]).toBe('function');
    expect(workerMockState.WorkerMockFn.mock.calls[1][2]).toEqual({ connection, prefix: 'queue-prefix' });

    expect(contentProcessorMockState.factory).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: loggerMockState.logger,
        patchJobStatus,
        callOpenRouter: expect.any(Function),
        createChildJob: expect.any(Function),
        uploadTextAssets: expect.any(Function),
        prompts: promptsMockState,
      })
    );

    const contentFailedHandler = getHandler(workerMockState.instances[0], 'failed');
    const failure = new Error('boom');
    contentFailedHandler({ data: { jobId: 'job-123' } }, failure);
    expect(patchJobStatus).toHaveBeenCalledWith('job-123', {
      status: 'failed',
      result: { message: failure.message, stack: failure.stack },
    });

    patchJobStatus.mockClear();
    contentFailedHandler({ data: {} }, failure);
    expect(patchJobStatus).not.toHaveBeenCalled();

    const loraFailedHandler = getHandler(workerMockState.instances[1], 'failed');
    const loraError = new Error('oops');
    loraFailedHandler({ data: { jobId: 'lora-1' } }, loraError);
    expect(patchJobStatus).toHaveBeenCalledWith('lora-1', {
      status: 'failed',
      result: { message: loraError.message, stack: loraError.stack },
    });
  });

  it('swallows errors thrown by patchJobStatus handlers', async () => {
    const { createWorkers } = await import('./index');

    const patchJobStatus = vi.fn().mockRejectedValue(new Error('network'));
    createWorkers({
      logger: loggerMockState.logger,
      patchJobStatus: patchJobStatus as unknown as (jobId: string, data: any) => Promise<void>,
      contentProcessorFactory: contentProcessorMockState.factory,
    });

    const failedHandler = getHandler(workerMockState.instances[0], 'failed');
    expect(() => failedHandler({ data: { jobId: '123' } }, new Error('fail'))).not.toThrow();
    await Promise.resolve();
    expect(patchJobStatus).toHaveBeenCalledTimes(1);
  });
});
