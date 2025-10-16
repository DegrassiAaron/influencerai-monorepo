import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { createLoraTrainingProcessor, type LoraTrainingJobData } from './loraTraining';

type FakeChildProcess = ChildProcessWithoutNullStreams &
  EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };

function createFakeChild(): FakeChildProcess {
  const emitter = new EventEmitter() as FakeChildProcess;
  emitter.stdin = new PassThrough();
  emitter.stdout = new PassThrough();
  emitter.stderr = new PassThrough();
  emitter.kill = vi.fn();
  emitter.pid = 1234 as any;
  return emitter;
}

describe('createLoraTrainingProcessor', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  let tmpRoot: string;

  beforeEach(async () => {
    vi.useRealTimers();
    logger.info.mockReset();
    logger.warn.mockReset();
    logger.error.mockReset();
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lora-worker-test-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('runs kohya_ss, streams logs, uploads artifacts and marks job succeeded', async () => {
    const datasetPath = path.join(tmpRoot, 'dataset');
    await fs.mkdir(datasetPath, { recursive: true });

    const fakeChild = createFakeChild();
    const spawn = vi.fn(() => fakeChild);
    const patchJobStatus = vi.fn().mockResolvedValue(undefined);
    const putBinaryObject = vi.fn().mockResolvedValue(undefined);
    const getSignedGetUrl = vi.fn().mockResolvedValue('https://minio.local/model.safetensors');

    const processor = createLoraTrainingProcessor({
      logger,
      patchJobStatus,
      s3: {
        getClient: () => ({ client: {} as any, bucket: 'assets' }),
        putBinaryObject,
        getSignedGetUrl,
      },
      fetchDataset: vi.fn(async () => ({ path: datasetPath })),
      spawn,
      now: () => 0,
    });

    const outputDir = path.join(tmpRoot, 'loras', 'job-1');
    const job: { id: string; data: LoraTrainingJobData } = {
      id: 'queue-job-1',
      data: {
        jobId: 'job-1',
        payload: {
          config: {
            outputPath: outputDir,
            modelName: 'base.safetensors',
            epochs: 2,
            learningRate: 0.0001,
          },
          s3Prefix: 'lora-training/job-1/',
          datasetId: 'ds-1',
        },
      },
    };

    const processorPromise = processor(job as any);

    // Simulate stdout streaming
    fakeChild.stdout.write('step 1/2\n');
    fakeChild.stdout.write('loss 0.123 (50%)\n');
    fakeChild.stderr.write('warning: something minor\n');

    // Create fake artifact before closing process
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, 'model.safetensors'), 'fake');

    // Complete process
    setTimeout(() => {
      fakeChild.emit('close', 0);
    }, 0);

    const result = await processorPromise;

    expect(result.success).toBe(true);
    expect(result.outputDir).toBe(outputDir);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts?.[0].url).toBe('https://minio.local/model.safetensors');
    expect(putBinaryObject).toHaveBeenCalledTimes(1);
    expect(getSignedGetUrl).toHaveBeenCalledTimes(1);

    const progressCalls = patchJobStatus.mock.calls.filter(
      ([, payload]) => payload?.status === 'running'
    );
    expect(progressCalls.length).toBeGreaterThan(0);

    const finalCall = patchJobStatus.mock.calls.find(
      ([, payload]) => payload?.status === 'succeeded'
    );
    expect(finalCall).toBeTruthy();
    expect(finalCall?.[1]?.result?.artifacts).toHaveLength(1);
  });

  it('marks job as failed when kohya_ss exits with error', async () => {
    const datasetPath = path.join(tmpRoot, 'dataset-error');
    await fs.mkdir(datasetPath, { recursive: true });

    const fakeChild = createFakeChild();
    const spawn = vi.fn(() => fakeChild);
    const patchJobStatus = vi.fn().mockResolvedValue(undefined);

    const processor = createLoraTrainingProcessor({
      logger,
      patchJobStatus,
      s3: {
        getClient: () => null,
        putBinaryObject: vi.fn(),
        getSignedGetUrl: vi.fn(),
      },
      fetchDataset: vi.fn(async () => ({ path: datasetPath })),
      spawn,
    });

    const job: { id: string; data: LoraTrainingJobData } = {
      id: 'queue-job-2',
      data: {
        jobId: 'job-2',
        payload: { config: { outputPath: path.join(tmpRoot, 'loras-error') }, datasetId: 'ds-2' },
      },
    };

    const promise = processor(job as any);
    await vi.waitFor(() => {
      expect(spawn).toHaveBeenCalled();
    });
    fakeChild.emit('close', 1);
    await expect(promise).rejects.toThrow(/kohya_ss exited with code 1/);

    const failedCall = patchJobStatus.mock.calls.find(
      ([, payload]) => payload?.status === 'failed'
    );
    expect(failedCall).toBeTruthy();
    expect(failedCall?.[1]?.result?.message).toMatch(/kohya_ss exited with code 1/);
  });

  it('supports dry run jobs by returning command preview without spawning process', async () => {
    const datasetPath = path.join(tmpRoot, 'dataset-dry-run');
    await fs.mkdir(datasetPath, { recursive: true });

    const spawn = vi.fn();
    const patchJobStatus = vi.fn().mockResolvedValue(undefined);

    const processor = createLoraTrainingProcessor({
      logger,
      patchJobStatus,
      s3: {
        getClient: () => null,
        putBinaryObject: vi.fn(),
        getSignedGetUrl: vi.fn(),
      },
      fetchDataset: vi.fn(async () => ({ path: datasetPath })),
      spawn,
    });

    const job: { id: string; data: LoraTrainingJobData } = {
      id: 'queue-job-dry',
      data: {
        jobId: 'job-dry',
        payload: {
          dryRun: true,
          datasetId: 'ds-dry',
          config: {
            kohyaCommand: 'accelerate',
            workingDirectory: '/opt/kohya',
            learningRate: 0.0001,
          },
          kohyaArgs: ['--resolution=512'],
        },
      },
    };

    const result = await processor(job as any);

    expect(result.success).toBe(true);
    expect(result.command?.command).toBe('accelerate');
    expect(result.command?.args).toContain('train_network.py');
    expect(result.command?.cwd).toBe('/opt/kohya');
    expect(spawn).not.toHaveBeenCalled();

    const finalCall = patchJobStatus.mock.calls.find(
      ([, payload]) => payload?.status === 'succeeded'
    );
    expect(finalCall?.[1]?.result?.command?.command).toBe('accelerate');
    expect(finalCall?.[1]?.result?.progress?.stage).toBe('completed');
  });
});
