import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import type { SpawnOptionsWithoutStdio } from 'node:child_process';
import type {
  KohyaCommandConfig,
  LoraConfigInfo,
  LoraDatasetInfo,
  LoraTrainingPayload,
  LoraTrainingProcessorDeps,
  ProgressState,
  TrainingProgress,
  CommandPreview,
} from './types';

export const DEFAULT_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 hours
const PROGRESS_INTERVAL_MS = 1000;
const PROGRESS_LOG_HISTORY_LIMIT = 50;
const PROGRESS_PATCH_LOG_LIMIT = 20;
const SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 3600; // 7 days

export function coercePayload(payload: Record<string, unknown> | undefined): LoraTrainingPayload {
  if (!payload || typeof payload !== 'object') return {};
  return payload as LoraTrainingPayload;
}

export async function resolveDataset(
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

export async function resolveConfig(
  payload: LoraTrainingPayload,
  dataset: LoraDatasetInfo,
  deps: Pick<LoraTrainingProcessorDeps, 'fetchLoraConfig'>
): Promise<LoraConfigInfo> {
  if (payload.config)
    return { ...payload.config, datasetPath: payload.config.datasetPath ?? dataset.path };
  if (payload.configId && deps.fetchLoraConfig) {
    const cfg = await deps.fetchLoraConfig(payload.configId);
    if (cfg) return { ...cfg, datasetPath: cfg.datasetPath ?? dataset.path };
  }
  return { datasetPath: dataset.path };
}

export function buildKohyaCommand(
  payload: LoraTrainingPayload,
  dataset: LoraDatasetInfo,
  config: LoraConfigInfo,
  outputDir: string
): KohyaCommandConfig {
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

export function createCommandPreview(command: KohyaCommandConfig): CommandPreview {
  return {
    command: command.command,
    args: [...command.args],
    cwd: command.options.cwd,
  };
}

export function scheduleProgress(
  progress: TrainingProgress,
  jobId: string | undefined,
  deps: LoraTrainingProcessorDeps,
  state: ProgressState
) {
  if (!jobId) return;
  const getNow = () => (deps.now ? deps.now() : Date.now());
  const appendLog = (message: string | undefined) => {
    if (!message) return;
    state.logs.push(message);
    if (state.logs.length > PROGRESS_LOG_HISTORY_LIMIT) {
      state.logs.splice(0, state.logs.length - PROGRESS_LOG_HISTORY_LIMIT);
    }
  };
  const collectProgressLogs = () => state.logs.filter(Boolean).slice(-PROGRESS_PATCH_LOG_LIMIT);
  const send = (payload: TrainingProgress) => {
    const sentAt = getNow();
    state.lastUpdate = sentAt;
    const logs = collectProgressLogs();
    const progressPayload = logs.length ? { ...payload, logs } : { ...payload };
    deps
      .patchJobStatus(jobId, { status: 'running', result: { progress: progressPayload } })
      .catch((err) => deps.logger.warn({ err, jobId }, 'Failed to update LoRA job progress'));
  };

  appendLog(progress.message);
  const now = getNow();

  if (now - state.lastUpdate >= PROGRESS_INTERVAL_MS) {
    send(progress);
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

export function parseProgressFromLine(
  line: string
): Pick<TrainingProgress, 'step' | 'totalSteps' | 'percent'> {
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

export async function waitForProcess(
  child: ReturnType<typeof import('node:child_process').spawn>,
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

export function collectLogs(buffers: string[]): string[] {
  return buffers.filter((line) => line && line.trim().length > 0).slice(-200);
}

export async function uploadSafetensors(
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
    await s3Deps.putBinaryObject(
      clientInfo.client,
      clientInfo.bucket,
      key,
      createReadStream(absolute)
    );
    const signedUrl = await s3Deps.getSignedGetUrl(
      clientInfo.client,
      clientInfo.bucket,
      key,
      SIGNED_URL_EXPIRY_SECONDS
    );
    if (!signedUrl) {
      throw new Error('Unable to generate signed URL for LoRA artifact upload');
    }
    const normalizedUrl = String(signedUrl);
    uploads.push({ key, url: normalizedUrl, filename });
  }

  return uploads;
}
