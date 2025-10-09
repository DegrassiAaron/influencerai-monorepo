import { spawn as defaultSpawn, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { createReadStream, existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import type { Processor } from 'bullmq';
import type { LoRAConfig } from '@influencerai/core-schemas';
import type { S3Client } from '@aws-sdk/client-s3';

export type LoraTrainingJobData = {
  jobId?: string;
  payload?: Record<string, unknown>;
};

export type LoraTrainingResult = {
  success: boolean;
  message?: string;
  outputDir?: string;
  artifacts?: { key: string; url: string; filename: string }[];
  logs?: string[];
};

export type PatchJobStatusFn = (
  jobId: string,
  data: { status?: string; result?: unknown; costTok?: number }
) => Promise<unknown>;

export type LoraDatasetInfo = {
  id?: string;
  path: string;
  meta?: Record<string, unknown> | null;
};

export type LoraConfigInfo = Partial<LoRAConfig> & {
  id?: string;
  outputPath?: string;
  extraArgs?: string[];
  kohyaCommand?: string;
  workingDirectory?: string;
  env?: Record<string, string>;
  networkModule?: string;
  baseModel?: string;
  maxTrainSteps?: number;
  samplePrompts?: string[];
  timeoutMs?: number;
};

export type LoraTrainingPayload = {
  datasetPath?: string;
  datasetId?: string;
  dataset?: LoraDatasetInfo;
  config?: LoraConfigInfo;
  configId?: string;
  kohyaArgs?: string[];
  outputDir?: string;
  timeoutMs?: number;
  s3Prefix?: string;
  trainingName?: string;
};

export type LoraTrainingProcessorDeps = {
  logger: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
  patchJobStatus: PatchJobStatusFn;
  s3: {
    getClient: () => { client: S3Client; bucket: string } | null;
    putBinaryObject: (
      client: S3Client,
      bucket: string,
      key: string,
      body: NodeJS.ReadableStream | Uint8Array | Buffer,
      contentType?: string
    ) => Promise<void>;
    getSignedGetUrl: (client: S3Client, bucket: string, key: string, expiresInSeconds?: number) => Promise<string>;
  };
  fetchDataset?: (datasetId: string) => Promise<LoraDatasetInfo | null>;
  fetchLoraConfig?: (configId: string) => Promise<LoraConfigInfo | null>;
  spawn?: typeof defaultSpawn;
  now?: () => number;
};

type ProgressState = {
  lastUpdate: number;
  pending?: TrainingProgress;
  timer?: NodeJS.Timeout | null;
  logs: string[];
};

type TrainingProgress = {
  stage: 'initializing' | 'fetching-dataset' | 'running' | 'uploading' | 'completed' | 'failed';
  message?: string;
  step?: number;
  totalSteps?: number;
  percent?: number;
  source?: 'stdout' | 'stderr';
  logs?: string[];
};

const DEFAULT_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 hours
const PROGRESS_INTERVAL_MS = 1000;
const SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 3600; // 7 days

function coercePayload(payload: Record<string, unknown> | undefined): LoraTrainingPayload {
  if (!payload || typeof payload !== 'object') return {};
  return payload as LoraTrainingPayload;
}

async function resolveDataset(
  payload: LoraTrainingPayload,
  deps: Pick<LoraTrainingProcessorDeps, 'fetchDataset'>
): Promise<LoraDatasetInfo> {
  if (payload.dataset && typeof payload.dataset.path === 'string') return payload.dataset;
  if (typeof payload.datasetPath === 'string' && payload.datasetPath.length > 0) {
    return { path: payload.datasetPath };
  }
  if (payload.config?.datasetPath) {
    return { path: payload.config.datasetPath };
  }
  if (payload.datasetId && deps.fetchDataset) {
    const result = await deps.fetchDataset(payload.datasetId);
    if (result) return result;
  }
  throw new Error('Unable to determine dataset path for LoRA training');
}

async function resolveConfig(
  payload: LoraTrainingPayload,
  dataset: LoraDatasetInfo,
  deps: Pick<LoraTrainingProcessorDeps, 'fetchLoraConfig'>
): Promise<LoraConfigInfo> {
  if (payload.config) return { ...payload.config, datasetPath: payload.config.datasetPath ?? dataset.path };
  if (payload.configId && deps.fetchLoraConfig) {
    const cfg = await deps.fetchLoraConfig(payload.configId);
    if (cfg) return { ...cfg, datasetPath: cfg.datasetPath ?? dataset.path };
  }
  return { datasetPath: dataset.path };
}

function buildKohyaCommand(
  payload: LoraTrainingPayload,
  dataset: LoraDatasetInfo,
  config: LoraConfigInfo,
  outputDir: string
): { command: string; args: string[]; options: SpawnOptionsWithoutStdio } {
  const baseCommand = config.kohyaCommand || 'accelerate';
  const args: string[] = [];

  if (baseCommand === 'accelerate') {
    args.push('launch');
    args.push('train_network.py');
  }

  const cliArgs: string[] = payload.kohyaArgs ? [...payload.kohyaArgs] : [];
  const datasetPath = config.datasetPath || dataset.path;
  const modelPath = config.baseModel || config.modelName;

  const ensureArg = (flag: string, value?: string | number) => {
    if (!value && value !== 0) return;
    const formatted = typeof value === 'number' ? value.toString() : value;
    if (!cliArgs.some((arg) => arg.startsWith(`${flag}=`) || arg === flag)) {
      if (flag.includes('=')) {
        cliArgs.push(flag.replace(/=.*/, `=${formatted}`));
      } else {
        cliArgs.push(`${flag}=${formatted}`);
      }
    }
  };

  ensureArg('--train_data_dir', datasetPath);
  ensureArg('--output_dir', outputDir);
  ensureArg('--network_module', config.networkModule || 'networks.lora');
  ensureArg('--learning_rate', config.learningRate);
  ensureArg('--lr', config.learningRate);
  ensureArg('--max_train_epochs', config.epochs);
  ensureArg('--train_batch_size', config.batchSize);
  ensureArg('--resolution', config.resolution);
  ensureArg('--network_dim', config.networkDim);
  ensureArg('--network_alpha', config.networkAlpha);
  ensureArg('--max_train_steps', config.maxTrainSteps);
  ensureArg('--pretrained_model_name_or_path', modelPath);

  if (Array.isArray(config.extraArgs)) {
    cliArgs.push(...config.extraArgs);
  }

  const options: SpawnOptionsWithoutStdio = {
    cwd: config.workingDirectory || payload.config?.workingDirectory || process.cwd(),
    env: { ...process.env, ...(config.env || {}) },
    stdio: 'pipe',
  };

  return { command: baseCommand, args: [...args, ...cliArgs], options };
}

function scheduleProgress(
  progress: TrainingProgress,
  jobId: string | undefined,
  deps: LoraTrainingProcessorDeps,
  state: ProgressState
) {
  if (!jobId) return;
  const now = deps.now ? deps.now() : Date.now();
  const send = (payload: TrainingProgress) => {
    state.lastUpdate = now;
    deps
      .patchJobStatus(jobId, { status: 'running', result: { progress: payload } })
      .catch((err) => deps.logger.warn({ err, jobId }, 'Failed to update LoRA job progress'));
  };

  state.logs.push(progress.message || '');
  if (state.logs.length > 50) state.logs.splice(0, state.logs.length - 50);

  if (now - state.lastUpdate >= PROGRESS_INTERVAL_MS) {
    send({ ...progress, logs: undefined });
    state.pending = undefined;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    return;
  }

  state.pending = progress;
  if (!state.timer) {
    const delay = Math.max(0, PROGRESS_INTERVAL_MS - (now - state.lastUpdate));
    state.timer = setTimeout(() => {
      if (state.pending) send(state.pending);
      state.pending = undefined;
      state.timer = null;
    }, delay);
  }
}

function parseProgressFromLine(line: string): Pick<TrainingProgress, 'step' | 'totalSteps' | 'percent'> {
  const stepMatch = line.match(/step\s*(\d+)\s*(?:\/|of)\s*(\d+)/i);
  if (stepMatch) {
    const current = Number(stepMatch[1]);
    const total = Number(stepMatch[2]);
    const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : undefined;
    return { step: current, totalSteps: total, percent };
  }
  const percentMatch = line.match(/(\d{1,3})%/);
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    return { percent: Math.min(100, percent) };
  }
  return {};
}

async function waitForProcess(
  child: ReturnType<typeof defaultSpawn>,
  timeoutMs: number,
  onTimeout: () => void
): Promise<number> {
  if (!child) return Promise.reject(new Error('Failed to spawn kohya_ss process'));
  const timer = setTimeout(() => {
    onTimeout();
  }, timeoutMs);

  try {
    const [code] = (await once(child, 'close')) as [number, NodeJS.Signals | null];
    return code ?? 0;
  } finally {
    clearTimeout(timer);
  }
}

function collectLogs(buffers: string[]): string[] {
  return buffers.filter((line) => line && line.trim().length > 0).slice(-200);
}

async function uploadSafetensors(
  outputDir: string,
  s3Deps: LoraTrainingProcessorDeps['s3'],
  keyPrefix: string
): Promise<{ key: string; url: string; filename: string }[]> {
  const clientInfo = s3Deps.getClient();
  if (!clientInfo) return [];
  const files = await fs.readdir(outputDir);
  const safetensors = files.filter((name) => name.endsWith('.safetensors'));
  const uploads: { key: string; url: string; filename: string }[] = [];

  for (const filename of safetensors) {
    const absolute = path.resolve(outputDir, filename);
    const key = `${keyPrefix}${filename}`;
    await s3Deps.putBinaryObject(clientInfo.client, clientInfo.bucket, key, createReadStream(absolute));
    const url = await s3Deps.getSignedGetUrl(clientInfo.client, clientInfo.bucket, key, SIGNED_URL_EXPIRY_SECONDS);
    uploads.push({ key, url, filename });
  }

  return uploads;
}

export function createLoraTrainingProcessor(
  deps: LoraTrainingProcessorDeps
): Processor<LoraTrainingJobData, LoraTrainingResult, 'lora-training'> {
  const spawn = deps.spawn ?? defaultSpawn;

  return async (job) => {
    deps.logger.info({ id: job.id, data: job.data }, 'Processing LoRA training job');
    const jobData = job.data ?? {};
    const jobId = typeof jobData.jobId === 'string' ? jobData.jobId : undefined;
    const payload = coercePayload(jobData.payload as Record<string, unknown> | undefined);

    if (jobId) {
      await deps.patchJobStatus(jobId, { status: 'running', result: { progress: { stage: 'initializing' } } });
    }

    const progressState: ProgressState = { lastUpdate: deps.now ? deps.now() : Date.now(), logs: [] };

    try {
      scheduleProgress({ stage: 'fetching-dataset', message: 'Resolving dataset path' }, jobId, deps, progressState);
      const dataset = await resolveDataset(payload, deps);

      scheduleProgress({ stage: 'fetching-dataset', message: `Dataset resolved at ${dataset.path}` }, jobId, deps, progressState);
      const config = await resolveConfig(payload, dataset, deps);

      const resolvedOutputDir = path.resolve(
        config.outputPath || payload.outputDir || `data/loras/${payload.trainingName || jobId || Date.now()}`
      );
      if (!existsSync(resolvedOutputDir)) {
        await fs.mkdir(resolvedOutputDir, { recursive: true });
      }

      const command = buildKohyaCommand(payload, dataset, config, resolvedOutputDir);
      deps.logger.info(
        {
          jobId,
          command: command.command,
          args: command.args,
          options: { cwd: command.options.cwd },
        },
        'Launching kohya_ss process'
      );

      const child = spawn(command.command, command.args, command.options);
      const buffers: string[] = [];

      const handleLine = (source: 'stdout' | 'stderr', chunk: Buffer | string) => {
        const data = chunk.toString();
        const lines = data.split(/\r?\n/);
        for (const line of lines) {
          if (!line) continue;
          const progress = parseProgressFromLine(line);
          const message = line.trim();
          buffers.push(message);
          deps.logger.info({ jobId, source, line: message }, 'kohya_ss output');
          scheduleProgress(
            {
              stage: 'running',
              message,
              source,
              ...progress,
            },
            jobId,
            deps,
            progressState
          );
        }
      };

      child.stdout?.on('data', (chunk) => handleLine('stdout', chunk));
      child.stderr?.on('data', (chunk) => handleLine('stderr', chunk));

      const timeoutMs = payload.timeoutMs || config.timeoutMs || DEFAULT_TIMEOUT_MS;
      const exitCode = await waitForProcess(child, timeoutMs, () => {
        deps.logger.warn({ jobId }, 'LoRA training timed out, attempting graceful shutdown');
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000);
        scheduleProgress({ stage: 'failed', message: 'LoRA training timed out' }, jobId, deps, progressState);
      });

      if (exitCode !== 0) {
        throw new Error(`kohya_ss exited with code ${exitCode}`);
      }

      scheduleProgress({ stage: 'uploading', message: 'Uploading artifacts to storage' }, jobId, deps, progressState);
      const s3Prefix = payload.s3Prefix || `lora-training/${jobId || Date.now()}/`;
      const artifacts = await uploadSafetensors(resolvedOutputDir, deps.s3, s3Prefix);

      if (jobId) {
        await deps.patchJobStatus(jobId, {
          status: 'succeeded',
          result: {
            progress: { stage: 'completed', percent: 100, message: 'Training completed', logs: collectLogs(buffers) },
            outputDir: resolvedOutputDir,
            artifacts,
          },
        });
      }

      return {
        success: true,
        message: 'Training completed',
        outputDir: resolvedOutputDir,
        artifacts,
        logs: collectLogs(buffers),
      } satisfies LoraTrainingResult;
    } catch (err) {
      deps.logger.error({ err, jobId }, 'LoRA training job failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (jobId) {
        await deps.patchJobStatus(jobId, {
          status: 'failed',
          result: {
            message,
            progress: { stage: 'failed', message },
          },
        });
      }
      throw err;
    } finally {
      if (progressState.timer) {
        clearTimeout(progressState.timer);
      }
    }
  };
}
