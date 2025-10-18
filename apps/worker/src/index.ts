import { Queue, Worker } from 'bullmq';
import type { Processor, Job } from 'bullmq';
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
import { startMonitoring } from './monitoring';
import { createFailureAlerter } from './alerts';
import {
  getClient as getS3Client,
  putTextObject as putTextObjectS3,
  putBinaryObject as putBinaryObjectS3,
  getSignedGetUrl as getSignedGetUrlS3,
  type S3Helpers,
} from './s3Helpers';
export type { S3Helpers } from './s3Helpers';
import { createMonitoringServer } from './monitoring';

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
  fetchDataset?: (
    datasetId: string
  ) => Promise<{ id?: string; path: string; meta?: Record<string, unknown> | null } | null>;
  fetchLoraConfig?: (
    configId: string
  ) => Promise<
    (Partial<Record<string, unknown>> & { modelName?: string; outputPath?: string }) | null
  >;
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

  const workerOptions = { connection, prefix: process.env.BULL_PREFIX };

  const contentWorker = new Worker<
    ContentGenerationJobData,
    ContentGenerationResult,
    'content-generation'
  >(
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
        const s3Client = s3.getClient(depLogger);
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
    workerOptions
  );

  const loraProcessor: Processor<LoraTrainingJobData, LoraTrainingResult, 'lora-training'> =
    createLoraTrainingProcessor({
      logger: depLogger,
      patchJobStatus,
      s3,
      fetchDataset,
      fetchLoraConfig,
    });

  const loraWorker = new Worker<LoraTrainingJobData, LoraTrainingResult, 'lora-training'>(
    'lora-training',
    loraProcessor,
    workerOptions
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

  const queueOptions = { connection, prefix: process.env.BULL_PREFIX };
  const contentQueue = new Queue('content-generation', queueOptions);
  const loraQueue = new Queue('lora-training', queueOptions);
  const videoQueue = new Queue('video-generation', queueOptions);

  const failureThreshold = Math.max(1, parseInt(process.env.ALERT_FAILURE_THRESHOLD || '3', 10));
  const failureAlerter = createFailureAlerter({
    logger: depLogger,
    threshold: failureThreshold,
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    fetchImpl: (url, init) => fetchWithTimeout(url, init, 5000),
  });

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
    workerOptions
  );

  const monitorUsername = process.env.WORKER_BULL_BOARD_USER;
  const monitorPassword = process.env.WORKER_BULL_BOARD_PASSWORD;
  const monitorPortValue = Number(process.env.WORKER_MONITOR_PORT ?? '');
  const monitorHost = process.env.WORKER_MONITOR_HOST || '0.0.0.0';
  const resolvedMonitorPort =
    Number.isFinite(monitorPortValue) && monitorPortValue > 0 ? monitorPortValue : 3031;
  const alertWebhookUrl = process.env.WORKER_ALERT_WEBHOOK_URL;
  const alertThresholdValue = Number(process.env.WORKER_ALERT_FAILURE_THRESHOLD ?? '');
  const resolvedAlertThreshold =
    Number.isFinite(alertThresholdValue) && alertThresholdValue > 0 ? alertThresholdValue : 3;

  let monitoring: ReturnType<typeof createMonitoringServer> | null = null;
  if (monitorUsername && monitorPassword) {
    monitoring = createMonitoringServer({
      logger: depLogger,
      queues: [
        { name: 'content-generation', queue: contentQueue },
        { name: 'lora-training', queue: loraQueue },
        { name: 'video-generation', queue: videoQueue },
      ],
      port: resolvedMonitorPort,
      host: monitorHost,
      auth: { username: monitorUsername, password: monitorPassword },
      webhook: alertWebhookUrl
        ? { url: alertWebhookUrl, consecutiveFailuresThreshold: resolvedAlertThreshold }
        : undefined,
    });

    monitoring.start().catch((err: unknown) => {
      depLogger.error({ err }, 'Failed to start monitoring server');
    });
  } else {
    depLogger.warn('Bull Board credentials not provided; monitoring server disabled');
  }

  const recordMonitoringCompletion = (queueName: string, job: Job | undefined) => {
    if (monitoring && job) {
      monitoring.recordCompletion(queueName, job);
    }
  };

  const recordMonitoringFailure = (queueName: string, job: Job | undefined, err: unknown) => {
    if (!monitoring) return;
    const jobIdentifier =
      (job?.id as string | undefined) ?? ((job?.data as any)?.jobId as string | undefined);
    monitoring
      .recordFailure(queueName, jobIdentifier, err)
      .catch((recordErr) =>
        depLogger.warn({ err: recordErr, queue: queueName }, 'Unable to record failure metrics')
      );
  };

  contentWorker.on('completed', (job) => {
    recordMonitoringCompletion('content-generation', job);
    depLogger.info({ id: job.id }, 'Job completed successfully');
    failureAlerter.resetFailures('content-generation');
  });

  contentWorker.on('failed', (job, err) => {
    recordMonitoringFailure('content-generation', job, err);
    depLogger.error({ id: job?.id, err }, 'Job failed');
    const jobId = (job?.data as any)?.jobId as string | undefined;
    if (jobId) {
      patchJobStatus(jobId, {
        status: 'failed',
        result: { message: (err as any)?.message, stack: (err as any)?.stack },
      }).catch(() => {});
    }
    void failureAlerter.handleFailure('content-generation', job, err);
  });

  loraWorker.on('completed', (job) => {
    recordMonitoringCompletion('lora-training', job);
    depLogger.info({ id: job.id }, 'LoRA training job completed successfully');
    failureAlerter.resetFailures('lora-training');
  });

  loraWorker.on('failed', (job, err) => {
    recordMonitoringFailure('lora-training', job, err);
    depLogger.error({ id: job?.id, err }, 'LoRA training job failed');
    const jobId = (job?.data as any)?.jobId as string | undefined;
    if (jobId) {
      patchJobStatus(jobId, {
        status: 'failed',
        result: { message: (err as any)?.message, stack: (err as any)?.stack },
      }).catch(() => {});
    }
    void failureAlerter.handleFailure('lora-training', job, err);
  });

  videoWorker.on('completed', (job) => {
    recordMonitoringCompletion('video-generation', job);
    depLogger.info({ id: job.id }, 'Video generation job completed successfully');
    failureAlerter.resetFailures('video-generation');
  });

  videoWorker.on('failed', (job, err) => {
    recordMonitoringFailure('video-generation', job, err);
    depLogger.error({ id: job?.id, err }, 'Video generation job failed');
    const jobId = (job?.data as any)?.jobId as string | undefined;
    if (jobId) {
      patchJobStatus(jobId, {
        status: 'failed',
        result: { message: (err as any)?.message, stack: (err as any)?.stack },
      }).catch(() => {});
    }
    void failureAlerter.handleFailure('video-generation', job, err);
  });

  const metricsPrefix = process.env.WORKER_METRICS_PREFIX || 'influencerai_worker_';
  const bullBoardPort = parseInt(process.env.BULL_BOARD_PORT || '3030', 10);
  const bullBoardHost = process.env.BULL_BOARD_HOST || '0.0.0.0';
  const bullBoardUser = process.env.BULL_BOARD_USER;
  const bullBoardPassword = process.env.BULL_BOARD_PASSWORD;

  void startMonitoring({
    logger: depLogger,
    queues: [
      { name: 'content-generation', queue: contentQueue, worker: contentWorker },
      { name: 'lora-training', queue: loraQueue, worker: loraWorker },
      { name: 'video-generation', queue: videoQueue, worker: videoWorker },
    ],
    metricsPrefix,
    bullBoard: {
      host: bullBoardHost,
      port: bullBoardPort,
      basicAuth:
        bullBoardUser && bullBoardPassword
          ? {
              username: bullBoardUser,
              password: bullBoardPassword,
            }
          : null,
    },
    alerts: {
      threshold: failureThreshold,
      webhookUrl: process.env.ALERT_WEBHOOK_URL,
    },
  }).catch((err: unknown) => {
    depLogger.error({ err }, 'Unable to start monitoring server');
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

  const apiBaseUrl =
    process.env.API_BASE_URL || process.env.WORKER_API_URL || 'http://localhost:3001';
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
