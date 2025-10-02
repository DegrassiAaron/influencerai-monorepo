import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './logger';
import { InfluencerAIClient } from '@influencerai/sdk';
import { imageCaptionPrompt, videoScriptPrompt } from '@influencerai/prompts';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

type OpenRouterUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;

async function callOpenRouter(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], opts?: { responseFormat?: 'json_object' | 'text' }) {
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
      const usage: OpenRouterUsage = json?.usage;
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
function getS3Client(): { client: S3Client; bucket: string } | null {
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
    logger.warn({ e }, 'Unable to initialize S3 client');
    return null;
  }
}

async function putTextObjectS3(client: S3Client, bucket: string, key: string, content: string) {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(content, 'utf8'), ContentType: 'text/plain' })
  );
}

async function getSignedGetUrlS3(client: S3Client, bucket: string, key: string, expiresInSeconds = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
}

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const apiBaseUrl = process.env.API_BASE_URL || process.env.WORKER_API_URL || 'http://localhost:3001';
const api = new InfluencerAIClient(apiBaseUrl);

async function patchJobStatus(jobId: string, data: { status?: 'running' | 'succeeded' | 'failed' | 'completed'; result?: unknown; costTok?: number }) {
  const maxAttempts = 2;
  let lastErr: unknown = undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await api.updateJob(jobId, data);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
  }
  logger.warn({ err: lastErr, jobId, data }, 'Failed to PATCH job status after retries');
}

// Content generation worker
const contentWorker = new Worker(
  'content-generation',
  async (job) => {
    logger.info({ id: job.id, name: job.name, data: job.data }, 'Processing content-generation job');
    const jobId = (job.data as any)?.jobId as string | undefined;
    const payload = ((job.data as any)?.payload ?? {}) as Record<string, any>;
    if (jobId) await patchJobStatus(jobId, { status: 'running' });

    try {
      const persona = payload.persona ? JSON.stringify(payload.persona) : payload.personaText || '{}';
      const context = payload.context || payload.theme || 'general social post';
      const durationSec = Number(payload.durationSec || 15);

      // 1) Generate a caption via OpenRouter using our prompt helper
      const captionPrompt = imageCaptionPrompt(`Persona: ${persona}\nContext/Theme: ${context}`);
      const { content: caption, usage: usage1 } = await callOpenRouter(
        [
          { role: 'system', content: 'You generate concise, vivid social captions.' },
          { role: 'user', content: captionPrompt },
        ],
        { responseFormat: 'text' }
      );

      // 2) Generate a short script based on the caption
      const scriptPrompt = videoScriptPrompt(caption || 'A short engaging caption', durationSec);
      const { content: script, usage: usage2 } = await callOpenRouter(
        [
          { role: 'system', content: 'You write short timestamped scripts for short-form videos.' },
          { role: 'user', content: scriptPrompt },
        ],
        { responseFormat: 'text' }
      );

      // Aggregate token usage if available
      const totalTokens = (usage1?.total_tokens || 0) + (usage2?.total_tokens || 0);

      // 3) Create a child job for visual asset generation (e.g., video)
      let childJobId: string | undefined = undefined;
      try {
        const child = await api.createJob({
          type: 'video-generation',
          payload: {
            parentJobId: jobId,
            caption,
            script,
            persona: payload.persona ?? payload.personaText,
            context,
            durationSec,
          },
          priority: 5,
        } as any);
        childJobId = child?.id as string | undefined;
      } catch (e) {
        logger.warn({ e }, 'Failed to create child job for video-generation');
      }

      let captionUrl: string | undefined;
      let scriptUrl: string | undefined;
      try {
        const s3 = getS3Client();
        if (s3) {
          const { client, bucket } = s3;
          const idForKey = jobId || String(job.id);
          const baseKey = `content-generation/${idForKey}/`;
          const capKey = `${baseKey}caption.txt`;
          const scrKey = `${baseKey}script.txt`;
          await putTextObjectS3(client, bucket, capKey, caption || '');
          await putTextObjectS3(client, bucket, scrKey, script || '');
          captionUrl = await getSignedGetUrlS3(client, bucket, capKey, 24 * 3600);
          scriptUrl = await getSignedGetUrlS3(client, bucket, scrKey, 24 * 3600);
        }
      } catch (e) {
        logger.warn({ e }, 'S3 upload/presign failed');
      }

      const result = {
        caption: (caption || '').trim(),
        script: (script || '').trim(),
        captionUrl,
        scriptUrl,
        childJobId,
      };

      if (jobId) {
        await patchJobStatus(jobId, { status: 'succeeded', result, ...(totalTokens ? { costTok: totalTokens } : {}) });
      }
      return { success: true, ...result };
    } catch (err) {
      logger.error({ err }, 'content-generation processor error');
      if (jobId) {
        await patchJobStatus(jobId, {
          status: 'failed',
          result: { message: (err as any)?.message, stack: (err as any)?.stack },
        });
      }
      throw err;
    }
  },
  { connection, prefix: process.env.BULL_PREFIX }
);

// LoRA training worker
const loraWorker = new Worker(
  'lora-training',
  async (job) => {
    logger.info({ id: job.id, data: job.data }, 'Processing LoRA training job');
    const jobId = (job.data as any)?.jobId as string | undefined;
    if (jobId) await patchJobStatus(jobId, { status: 'running' });

    // TODO: Implement LoRA training logic
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = { success: true, result: 'Training completed' };
    if (jobId) await patchJobStatus(jobId, { status: 'succeeded', result });
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
    patchJobStatus(jobId, { status: 'failed', result: { message: (err as any)?.message, stack: (err as any)?.stack } }).catch(() => {});
  }
});

loraWorker.on('completed', (job) => {
  logger.info({ id: job.id }, 'LoRA training job completed successfully');
});

loraWorker.on('failed', (job, err) => {
  logger.error({ id: job?.id, err }, 'LoRA training job failed');
  const jobId = (job?.data as any)?.jobId as string | undefined;
  if (jobId) {
    patchJobStatus(jobId, { status: 'failed', result: { message: (err as any)?.message, stack: (err as any)?.stack } }).catch(() => {});
  }
});

logger.info('Workers started and listening for jobs...');
