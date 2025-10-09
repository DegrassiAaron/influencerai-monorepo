import { Worker } from 'bullmq';
import type { Processor } from 'bullmq';
import Redis from 'ioredis';
import { spawn } from 'child_process';
import { logger as defaultLogger } from './logger';
import { InfluencerAIClient } from '@influencerai/sdk';
import type { JobResponse } from '@influencerai/sdk';
import { imageCaptionPrompt, videoScriptPrompt } from '@influencerai/prompts';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createLoraTrainingProcessor,
  type LoraTrainingJobData,
  type LoraTrainingResult,
} from './processors/loraTraining';
import {
  createContentGenerationProcessor,
  type ContentGenerationJobData,
  type ContentGenerationResult,
} from './processors/contentGeneration';
import {
  createVideoGenerationProcessor,
  type VideoGenerationJobData,
  type VideoGenerationResult,
} from './processors/videoGeneration';

// Lightweight HTTP helpers (aligned with API app)
class HTTPError extends Error {
  status: number;
  body?: unknown;
  url?: string;
  method?: string;
  constructor(message: string, opts: { status: number; body?: unknown; url?: string; method?: string }) {
    super(message);
    this.name = 'HTTPError';
    this.status = opts.status;
    this.body = opts.body;
    this.url = opts.url;
    this.method = opts.method;
  }
}

async function fetchWithTimeout(url: string, init: any = {}, timeoutMs = 60000): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url as any, { ...init, signal: controller.signal } as any);
    return res as any;
  } finally {
    clearTimeout(t);
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(header: string | null | undefined): number | null {
  if (!header) return null;
  const asInt = Number(header);
  if (!Number.isNaN(asInt) && asInt >= 0) return asInt * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

function shouldRetry(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function backoffDelay(attempt: number, baseMs = 250, jitterMs = 100): number {
  const base = baseMs * Math.pow(2, attempt - 1);
  const jitter = jitterMs > 0 ? Math.floor(Math.random() * jitterMs) : 0;
  return base + jitter;
}

async function safeReadBody(res: any) {
  try {
    const ct = (res.headers as any)?.get?.('content-type') || '';
    if (typeof ct === 'string' && ct.includes('application/json')) return await res.json();
    return await res.text();
  } catch {
    return null;
  }
}

async function callOpenRouter(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], opts?: { responseFormat?: 'json_object' | 'text' }): Promise<{ content: string; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }> {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const maxAttempts = Number(process.env.OPENROUTER_MAX_RETRIES || 3);
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS || 60000);
  const backoffBaseMs = Number(process.env.OPENROUTER_BACKOFF_BASE_MS || 250);
  const backoffJitterMs = Number(process.env.OPENROUTER_BACKOFF_JITTER_MS || 100);

  let attempt = 0;
  let lastErr: unknown = undefined;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'openrouter/auto',
            messages,
            ...(opts?.responseFormat ? { response_format: { type: opts.responseFormat } } : {}),
          }),
        },
        timeoutMs
      );

      if (!res.ok) {
        const status = (res as any).status ?? 500;
        const body = await safeReadBody(res);
        if (shouldRetry(status) && attempt < maxAttempts) {
          const ra = parseRetryAfter((res as any).headers?.get?.('Retry-After'));
          const delay = Math.max(ra ?? 0, backoffDelay(attempt, backoffBaseMs, backoffJitterMs));
          await sleep(delay);
          continue;
        }
        throw new HTTPError('OpenRouter request failed', { status, body, url, method: 'POST' });
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content as string | undefined;
      const usage = json?.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
      return { content: content ?? '', usage };
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await sleep(backoffDelay(attempt, backoffBaseMs, backoffJitterMs));
        continue;
      }
      throw err;
    }
  }
  if (lastErr) throw lastErr;
  return { content: '', usage: undefined };
}

// Minimal S3 helpers
type LoggerLike = Pick<typeof defaultLogger, 'info' | 'warn' | 'error'>;

function getS3Client(logger: LoggerLike = defaultLogger): { client: S3Client; bucket: string } | null {
  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.S3_KEY || 'minio';
  const secretAccessKey = process.env.S3_SECRET || 'minio12345';
  const bucket = process.env.S3_BUCKET || 'assets';
  try {
    const client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
    return { client, bucket };
  } catch (e) {
    logger.warn({ err: e }, 'Unable to initialize S3 client');
    return null;
  }
}

async function putTextObjectS3(client: S3Client, bucket: string, key: string, content: string) {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(content, 'utf8'), ContentType: 'text/plain' })
  );
}

async function putBinaryObjectS3(
  client: S3Client,
  bucket: string,
  key: string,
  body: NodeJS.ReadableStream | Uint8Array | Buffer,
  contentType = 'application/octet-stream'
) {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
}

async function getSignedGetUrlS3(client: S3Client, bucket: string, key: string, expiresInSeconds = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
}

type LogFn = (...args: any[]) => void;

export type WorkerLogger = {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
};

type UpdateJobInput = Parameters<InfluencerAIClient['updateJob']>[1];
type CreateJobInput = Parameters<InfluencerAIClient['createJob']>[0];

export type WorkerApi = {
  updateJob: (jobId: string, data: UpdateJobInput) => Promise<unknown>;
  createJob: (input: CreateJobInput) => Promise<JobResponse>;
};

export type S3Helpers = {
  getClient: typeof getS3Client;
  putTextObject: typeof putTextObjectS3;
  putBinaryObject: typeof putBinaryObjectS3;
  getSignedGetUrl: typeof getSignedGetUrlS3;
};

export type WorkerDependencies = {
  logger: WorkerLogger;
  api: WorkerApi;
  connection: Redis;
  s3: S3Helpers;
  fetchDataset?: (datasetId: string) => Promise<{ id?: string; path: string; meta?: Record<string, unknown> | null } | null>;
  fetchLoraConfig?: (
    configId: string
  ) => Promise<Partial<Record<string, unknown>> & { modelName?: string; outputPath?: string } | null>;
};

type FfmpegRunner = {
  aspectRatio: string;
  audioFilter: string;
  preset: string;
  run: (input: { inputPath: string; outputPath: string; aspectRatio: string; audioFilter: string; preset: string }) => Promise<void>;
};

function buildAspectRatioFilter(aspectRatio: string): string {
  const [wStr, hStr] = aspectRatio.split(':');
  const width = Number(wStr);
  const height = Number(hStr);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "scale=-2:1080:force_original_aspect_ratio=decrease,setsar=1";
  }
  const ratio = width / height;
  let targetWidth: number;
  let targetHeight: number;
  if (ratio >= 1) {
    targetWidth = 1920;
    targetHeight = Math.round(targetWidth / ratio);
  } else {
    targetHeight = 1920;
    targetWidth = Math.round(targetHeight * ratio);
  }
  targetWidth = Math.max(2, Math.round(targetWidth / 2) * 2);
  targetHeight = Math.max(2, Math.round(targetHeight / 2) * 2);
  return `scale=${targetWidth}:-2:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
}

function createFfmpegRunner(logger: WorkerLogger): FfmpegRunner {
  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  const aspectRatio = process.env.FFMPEG_ASPECT_RATIO || '9:16';
  const audioFilter = process.env.FFMPEG_AUDIO_FILTER || 'loudnorm=I=-16:TP=-1.5:LRA=11';
  const preset = process.env.FFMPEG_VIDEO_PRESET || 'medium';

  return {
    aspectRatio,
    audioFilter,
    preset,
    run: ({ inputPath, outputPath, aspectRatio: ar, audioFilter: af, preset: pr }) =>
      new Promise<void>((resolve, reject) => {
        const args = [
          '-y',
          '-i',
          inputPath,
          '-vf',
          buildAspectRatioFilter(ar),
          '-af',
          af,
          '-c:v',
          'libx264',
          '-preset',
          pr,
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          outputPath,
        ];

        logger.info({ args }, 'Running FFmpeg post-processing');

        const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';

        proc.stderr?.on('data', (chunk) => {
          stderr += chunk.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            if (stderr.trim()) {
              logger.info({ stderr: stderr.trim() }, 'FFmpeg completed with diagnostics');
            }
            resolve();
          } else {
            logger.error({ code, stderr: stderr.trim() }, 'FFmpeg failed');
            reject(new Error(`FFmpeg exited with code ${code ?? -1}`));
          }
        });

        proc.on('error', (err) => {
          logger.error({ err }, 'Unable to start FFmpeg');
          reject(err);
        });
      }),
  };
}

export function createWorkers(deps: WorkerDependencies) {
  const { logger: depLogger, api, connection, s3, fetchDataset, fetchLoraConfig } = deps;

  async function patchJobStatus(jobId: string, data: UpdateJobInput) {
    const maxAttempts = 2;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await api.updateJob(jobId, data);
        return;
      } catch (err) {
        lastErr = err;
        if (attempt < maxAttempts) {
          await sleep(200 * attempt);
        }
      }
    }

    depLogger.warn({ err: lastErr, jobId, data }, 'Failed to PATCH job status after retries');
  }

  const contentWorker = new Worker<ContentGenerationJobData, ContentGenerationResult, 'content-generation'>(
    'content-generation',
    createContentGenerationProcessor({
      logger: depLogger,
      callOpenRouter,
      patchJobStatus,
      createChildJob: async ({ parentJobId, caption, script, persona, context, durationSec }) =>
        api.createJob({
          type: 'video-generation',
          payload: {
            parentJobId,
            caption,
            script,
            persona,
            context,
            durationSec,
          },
          priority: 5,
        }),
      uploadTextAssets: async ({ jobIdentifier, caption, script }) => {
        const s3Client = s3.getClient();
        if (!s3Client) return {};
        const { client, bucket } = s3Client;
        const baseKey = `content-generation/${jobIdentifier}/`;
        const captionKey = `${baseKey}caption.txt`;
        const scriptKey = `${baseKey}script.txt`;
        await s3.putTextObject(client, bucket, captionKey, caption || '');
        await s3.putTextObject(client, bucket, scriptKey, script || '');
        const captionUrl = await s3.getSignedGetUrl(client, bucket, captionKey, 24 * 3600);
        const scriptUrl = await s3.getSignedGetUrl(client, bucket, scriptKey, 24 * 3600);
        return { captionUrl, scriptUrl };
      },
      prompts: { imageCaptionPrompt, videoScriptPrompt },
    }),
    { connection, prefix: process.env.BULL_PREFIX }
  );

  const loraProcessor: Processor<LoraTrainingJobData, LoraTrainingResult, 'lora-training'> = createLoraTrainingProcessor({
    logger: depLogger,
    patchJobStatus,
    s3,
    fetchDataset,
    fetchLoraConfig,
  });

  const loraWorker = new Worker<LoraTrainingJobData, LoraTrainingResult, 'lora-training'>(
    'lora-training',
    loraProcessor,
    { connection, prefix: process.env.BULL_PREFIX }
  );

  const comfyBaseUrl = process.env.COMFYUI_API_URL || 'http://127.0.0.1:8188';
  const comfyClientId = process.env.COMFYUI_CLIENT_ID || 'influencerai-worker';
  const comfyTimeoutMs = Number(process.env.COMFYUI_TIMEOUT_MS || 120000);
  const comfyPollIntervalMs = Number(process.env.COMFYUI_POLL_INTERVAL_MS || 5000);
  const comfyMaxPollAttempts = Number(process.env.COMFYUI_MAX_POLL_ATTEMPTS || 120);

  let workflowPayload: Record<string, unknown> | undefined;
  if (process.env.COMFYUI_VIDEO_WORKFLOW_JSON) {
    try {
      workflowPayload = JSON.parse(process.env.COMFYUI_VIDEO_WORKFLOW_JSON);
    } catch (err) {
      depLogger.warn({ err }, 'Invalid COMFYUI_VIDEO_WORKFLOW_JSON value; ignoring');
    }
  }

  const ffmpegRunner = createFfmpegRunner(depLogger);

  const videoWorker = new Worker<VideoGenerationJobData, VideoGenerationResult, 'video-generation'>(
    'video-generation',
    createVideoGenerationProcessor({
      logger: depLogger,
      patchJobStatus,
      s3,
      comfy: {
        baseUrl: comfyBaseUrl,
        clientId: comfyClientId,
        fetch: (url: string, init?: RequestInit) => fetchWithTimeout(url, init, comfyTimeoutMs),
        workflowPayload,
        pollIntervalMs: comfyPollIntervalMs,
        maxPollAttempts: comfyMaxPollAttempts,
      },
      ffmpeg: ffmpegRunner,
    }),
    { connection, prefix: process.env.BULL_PREFIX }
  );

  contentWorker.on('completed', (job) => {
    depLogger.info({ id: job.id }, 'Job completed successfully');
  });

  contentWorker.on('failed', (job, err) => {
    depLogger.error({ id: job?.id, err }, 'Job failed');
    const jobId = (job?.data as any)?.jobId as string | undefined;
    if (jobId) {
      patchJobStatus(jobId, { status: 'failed', result: { message: (err as any)?.message, stack: (err as any)?.stack } }).catch(
        () => {}
      );
    }
  });

  loraWorker.on('completed', (job) => {
    depLogger.info({ id: job.id }, 'LoRA training job completed successfully');
  });

  loraWorker.on('failed', (job, err) => {
    depLogger.error({ id: job?.id, err }, 'LoRA training job failed');
    const jobId = (job?.data as any)?.jobId as string | undefined;
    if (jobId) {
      patchJobStatus(jobId, { status: 'failed', result: { message: (err as any)?.message, stack: (err as any)?.stack } }).catch(
        () => {}
      );
    }
  });

  videoWorker.on('completed', (job) => {
    depLogger.info({ id: job.id }, 'Video generation job completed successfully');
  });

  videoWorker.on('failed', (job, err) => {
    depLogger.error({ id: job?.id, err }, 'Video generation job failed');
    const jobId = (job?.data as any)?.jobId as string | undefined;
    if (jobId) {
      patchJobStatus(jobId, { status: 'failed', result: { message: (err as any)?.message, stack: (err as any)?.stack } }).catch(
        () => {}
      );
    }
  });

  depLogger.info('Workers started and listening for jobs...');

  return { contentWorker, loraWorker, videoWorker };
}

if (process.env.NODE_ENV !== 'test') {
  const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
  });

  const apiBaseUrl = process.env.API_BASE_URL || process.env.WORKER_API_URL || 'http://localhost:3001';
  const api = new InfluencerAIClient(apiBaseUrl);
  const logger = defaultLogger;

  createWorkers({
    logger,
    api: {
      updateJob: (jobId, data) => api.updateJob(jobId, data),
      createJob: (input) => api.createJob(input) as Promise<JobResponse>,
    },
    connection,
    s3: {
      getClient: getS3Client,
      putTextObject: putTextObjectS3,
      putBinaryObject: putBinaryObjectS3,
      getSignedGetUrl: getSignedGetUrlS3,
    },
    fetchDataset: async (datasetId: string) => {
      try {
        const res = await fetchWithTimeout(`${apiBaseUrl}/datasets/${datasetId}`);
        if (!res.ok) {
          throw new HTTPError('Failed to fetch dataset', {
            status: (res as any).status ?? 500,
            body: await safeReadBody(res),
            url: `${apiBaseUrl}/datasets/${datasetId}`,
            method: 'GET',
          });
        }
        const data = await res.json();
        if (!data || typeof data.path !== 'string') {
          throw new Error('Invalid dataset response');
        }
        return data;
      } catch (err) {
        logger.warn({ err, datasetId }, 'Unable to fetch dataset for LoRA training');
        throw err;
      }
    },
    fetchLoraConfig: async (configId: string) => {
      try {
        const url = `${apiBaseUrl}/lora-configs/${configId}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) {
          throw new HTTPError('Failed to fetch LoRA config', {
            status: (res as any).status ?? 500,
            body: await safeReadBody(res),
            url,
            method: 'GET',
          });
        }
        const data = await res.json();
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid LoRA config response');
        }
        return data as any;
      } catch (err) {
        logger.warn({ err, configId }, 'Unable to fetch LoRA config');
        throw err;
      }
    },
  });
}
