import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './logger';
import { InfluencerAIClient } from '@influencerai/sdk';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const apiBaseUrl = process.env.API_BASE_URL || process.env.WORKER_API_URL || 'http://localhost:3001';
const api = new InfluencerAIClient(apiBaseUrl);

// Content generation worker
const contentWorker = new Worker(
  'content-generation',
  async (job) => {
    logger.info({ id: job.id, name: job.name, data: job.data }, 'Processing content-generation job');
    const jobId = (job.data as any)?.jobId as string | undefined;
    try {
      if (jobId) await api.updateJob(jobId, { status: 'running' });
    } catch (err) {
      logger.warn({ err, jobId }, 'Failed to PATCH job status to running');
    }

    // TODO: Implement job processing logic
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = { success: true, result: 'Job completed' };
    try {
      if (jobId) await api.updateJob(jobId, { status: 'succeeded', result });
    } catch (err) {
      logger.warn({ err, jobId }, 'Failed to PATCH job status to succeeded');
    }
    return result;
  },
  { connection, prefix: process.env.BULL_PREFIX }
);

// LoRA training worker
const loraWorker = new Worker(
  'lora-training',
  async (job) => {
    logger.info({ id: job.id, data: job.data }, 'Processing LoRA training job');
    const jobId = (job.data as any)?.jobId as string | undefined;
    try {
      if (jobId) await api.updateJob(jobId, { status: 'running' });
    } catch (err) {
      logger.warn({ err, jobId }, 'Failed to PATCH job status to running');
    }

    // TODO: Implement LoRA training logic
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = { success: true, result: 'Training completed' };
    try {
      if (jobId) await api.updateJob(jobId, { status: 'succeeded', result });
    } catch (err) {
      logger.warn({ err, jobId }, 'Failed to PATCH job status to succeeded');
    }
    return result;
  },
  { connection, prefix: process.env.BULL_PREFIX }
);

contentWorker.on('completed', (job) => {
  logger.info({ id: job.id }, 'Job completed successfully');
});

contentWorker.on('failed', (job, err) => {
  logger.error({ id: job?.id, err }, 'Job failed');
  const jobId = (job?.data as any)?.jobId as string | undefined;
  if (jobId) {
    api.updateJob(jobId, { status: 'failed', result: { message: err?.message, stack: (err as any)?.stack } as any }).catch((e) => {
      logger.warn({ e, jobId }, 'Failed to PATCH job status to failed');
    });
  }
});

loraWorker.on('completed', (job) => {
  logger.info({ id: job.id }, 'LoRA training job completed successfully');
});

loraWorker.on('failed', (job, err) => {
  logger.error({ id: job?.id, err }, 'LoRA training job failed');
  const jobId = (job?.data as any)?.jobId as string | undefined;
  if (jobId) {
    api.updateJob(jobId, { status: 'failed', result: { message: err?.message, stack: (err as any)?.stack } as any }).catch((e) => {
      logger.warn({ e, jobId }, 'Failed to PATCH job status to failed');
    });
  }
});

logger.info('Workers started and listening for jobs...');
