import { Worker } from 'bullmq';
import type { Processor } from 'bullmq';
import Redis from 'ioredis';
import { logger as defaultLogger } from './logger';
import { InfluencerAIClient } from '@influencerai/sdk';
import type { JobResponse } from '@influencerai/sdk';
import { imageCaptionPrompt, videoScriptPrompt } from '@influencerai/prompts';
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
import { HTTPError, callOpenRouter, fetchWithTimeout, safeReadBody, sleep } from './httpClient';
import { createFfmpegRunner } from './ffmpeg';
import {
  getClient as getS3Client,
  putTextObject as putTextObjectS3,
  putBinaryObject as putBinaryObjectS3,
  getSignedGetUrl as getSignedGetUrlS3,
  type S3Helpers,
} from './s3Helpers';
export type { S3Helpers } from './s3Helpers';

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
