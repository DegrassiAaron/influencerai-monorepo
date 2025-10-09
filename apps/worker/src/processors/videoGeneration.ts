import type { Job, Processor } from 'bullmq';
import type { Logger } from 'pino';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import type { PatchJobStatus } from './contentGeneration';
import type { S3Helpers } from '../s3Helpers';
import type { FfmpegRunner } from '../ffmpeg';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type ComfyOutputAsset = {
  filename?: string;
  subfolder?: string;
  type?: string;
  url?: string;
};

export type VideoGenerationDependencies = {
  logger: Pick<Logger, 'info' | 'warn' | 'error'>;
  patchJobStatus: PatchJobStatus;
  s3: S3Helpers;
  comfy: {
    baseUrl: string;
    clientId: string;
    fetch: FetchLike;
    workflowPayload?: Record<string, unknown>;
    pollIntervalMs?: number;
    maxPollAttempts?: number;
  };
  ffmpeg: FfmpegRunner;
};

export type VideoGenerationPayload = {
  caption?: string;
  script?: string;
  persona?: unknown;
  context?: string;
  durationSec?: number;
};

export type VideoGenerationJobData = {
  jobId?: string;
  payload?: VideoGenerationPayload;
};

export type VideoGenerationResult = {
  success: true;
  comfyJobId: string;
  caption: string;
  script: string;
  context?: string;
  persona?: unknown;
  durationSec: number;
  videoKey?: string;
  videoUrl?: string;
};

export type VideoGenerationJob = Job<VideoGenerationJobData, VideoGenerationResult, 'video-generation'>;

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_ATTEMPTS = 120;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function cloneWorkflowPayload(payload?: Record<string, unknown>) {
  if (!payload) return undefined;
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

function attachPromptMetadata(
  base: Record<string, unknown> | undefined,
  metadata: Record<string, unknown>,
  inputs: Record<string, unknown>
) {
  const prompt = base ? { ...base } : {};
  const existingInputs = (prompt.inputs as Record<string, unknown> | undefined) ?? {};
  prompt.inputs = { ...existingInputs, ...inputs };

  const extraData = (prompt.extra_data as Record<string, unknown> | undefined) ?? {};
  const existingMeta = (extraData.metadata as Record<string, unknown> | undefined) ?? {};
  extraData.metadata = { ...existingMeta, ...metadata };
  prompt.extra_data = extraData;

  return prompt;
}

function extractVideoAsset(history: any): ComfyOutputAsset | null {
  const outputs = history?.outputs;
  if (!outputs || typeof outputs !== 'object') return null;

  const outputArrays = Object.values(outputs).filter(Array.isArray) as ComfyOutputAsset[][];
  for (const arr of outputArrays) {
    for (const entry of arr) {
      if (!entry || typeof entry !== 'object') continue;
      if (entry.type === 'video' || entry.type === 'output' || entry.url || (entry.filename && entry.filename.endsWith('.mp4'))) {
        return entry;
      }
    }
  }
  return null;
}

function buildAssetUrl(baseUrl: string, asset: ComfyOutputAsset): string {
  if (asset.url) {
    const trimmed = asset.url.trim();
    if (/^https?:/i.test(trimmed)) return trimmed;
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${base}/${trimmed.replace(/^\//, '')}`;
  }

  const filename = asset.filename;
  if (!filename) {
    throw new Error('ComfyUI output is missing filename');
  }
  const subfolder = asset.subfolder ?? '';
  const type = asset.type ?? 'output';
  const url = new URL('/view', baseUrl);
  url.searchParams.set('filename', filename);
  url.searchParams.set('subfolder', subfolder);
  url.searchParams.set('type', type);
  return url.toString();
}

function parseHistoryState(history: any) {
  if (!history || typeof history !== 'object') {
    return { state: 'running' as const };
  }

  const status = history.status ?? history;
  const statusText = typeof status?.status === 'string' ? status.status.toLowerCase() : undefined;
  const completed = status?.completed === true || statusText === 'completed' || statusText === 'success';
  const failed = statusText === 'error' || statusText === 'failed' || statusText === 'cancelled' || status?.failed === true;
  const error = status?.error ?? status?.err ?? status?.message;

  if (failed) {
    return { state: 'failed' as const, error: typeof error === 'string' ? error : 'ComfyUI job failed' };
  }

  if (completed) {
    return { state: 'succeeded' as const };
  }

  if (typeof error === 'string' && error.trim()) {
    return { state: 'failed' as const, error };
  }

  return { state: 'running' as const };
}

export function createVideoGenerationProcessor(deps: VideoGenerationDependencies) {
  const processor: Processor<VideoGenerationJobData, VideoGenerationResult, 'video-generation'> = async function process(
    job: VideoGenerationJob
  ) {
    const { logger, patchJobStatus, s3, comfy, ffmpeg } = deps;

    logger.info({ id: job.id, name: job.name, data: job.data }, 'Processing video-generation job');

    const jobData = job.data ?? {};
    const jobId = typeof jobData.jobId === 'string' ? jobData.jobId : undefined;
    const payload = (jobData.payload ?? {}) as VideoGenerationPayload;

    const caption = typeof payload.caption === 'string' ? payload.caption.trim() : '';
    const script = typeof payload.script === 'string' ? payload.script.trim() : '';
    const context = typeof payload.context === 'string' ? payload.context : undefined;
    const persona = payload.persona;
    const personaText =
      typeof payload.persona === 'string'
        ? payload.persona
        : payload.persona
        ? JSON.stringify(payload.persona)
        : undefined;
    const durationCandidate = Number(payload.durationSec ?? 0);
    const durationSec = Number.isFinite(durationCandidate) && durationCandidate > 0 ? durationCandidate : 15;

    if (!caption || !script) {
      const err = new Error('Video generation payload requires caption and script');
      if (jobId) {
        await patchJobStatus(jobId, {
          status: 'failed',
          result: { message: err.message },
        });
      }
      throw err;
    }

    if (jobId) {
      await patchJobStatus(jobId, { status: 'running' });
    }

    const pollIntervalMs = comfy.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const maxPollAttempts = comfy.maxPollAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const fetchFn = comfy.fetch;
    const metadata = {
      jobId,
      queueJobId: job.id,
      caption,
      script,
      persona: personaText ?? persona,
      context,
      durationSec,
    };

    let comfyJobId: string | undefined;
    let tempDir: string | undefined;

    try {
      const promptPayload = attachPromptMetadata(
        cloneWorkflowPayload(comfy.workflowPayload),
        metadata,
        {
          caption,
          script,
          persona,
          personaText,
          context,
          durationSec,
        }
      );

      const requestBody = {
        client_id: comfy.clientId,
        prompt: promptPayload,
      } as Record<string, unknown>;

      logger.info({ jobId, comfyRequest: { clientId: comfy.clientId } }, 'Submitting ComfyUI prompt');

      const res = await fetchFn(`${comfy.baseUrl.replace(/\/$/, '')}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`ComfyUI prompt failed with status ${res.status}`);
      }

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      comfyJobId =
        (json?.prompt_id as string | undefined) || (json?.id as string | undefined) || (json?.job_id as string | undefined);

      if (!comfyJobId) {
        throw new Error('ComfyUI prompt response missing job identifier');
      }

      logger.info({ jobId, comfyJobId }, 'ComfyUI prompt accepted');

      let attempt = 0;
      let finalHistory: any = null;

      while (attempt < maxPollAttempts) {
        attempt += 1;
        const historyRes = await fetchFn(`${comfy.baseUrl.replace(/\/$/, '')}/history/${encodeURIComponent(comfyJobId)}`);
        if (historyRes.status === 404) {
          await sleep(pollIntervalMs);
          continue;
        }

        if (!historyRes.ok) {
          throw new Error(`ComfyUI history request failed with status ${historyRes.status}`);
        }

        let historyJson: any;
        try {
          historyJson = await historyRes.json();
        } catch (err) {
          logger.warn({ err }, 'Unable to parse ComfyUI history response');
          await sleep(pollIntervalMs);
          continue;
        }

        const historyEntry = historyJson?.[comfyJobId] ?? historyJson;
        finalHistory = historyEntry;
        const state = parseHistoryState(historyEntry);

        logger.info({ jobId, comfyJobId, attempt, state: state.state }, 'Polled ComfyUI job');

        if (state.state === 'failed') {
          throw new Error(state.error || 'ComfyUI job failed');
        }

        if (state.state === 'succeeded') {
          break;
        }

        await sleep(pollIntervalMs);
      }

      if (!finalHistory) {
        throw new Error('Timed out waiting for ComfyUI job history');
      }

      const finalState = parseHistoryState(finalHistory);
      if (finalState.state !== 'succeeded') {
        throw new Error('ComfyUI job did not complete successfully');
      }

      const asset = extractVideoAsset(finalHistory);
      if (!asset) {
        throw new Error('ComfyUI history did not contain a video output');
      }

      const assetUrl = buildAssetUrl(comfy.baseUrl, asset);
      logger.info({ jobId, comfyJobId, assetUrl }, 'Downloading ComfyUI video output');

      const downloadRes = await fetchFn(assetUrl);
      if (!downloadRes.ok) {
        throw new Error(`Failed to download ComfyUI output (${downloadRes.status})`);
      }

      const arrayBuffer = await downloadRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      tempDir = await mkdtemp(path.join(tmpdir(), 'video-generation-'));
      const rawPath = path.join(tempDir, 'raw.mp4');
      const processedPath = path.join(tempDir, 'processed.mp4');

      await writeFile(rawPath, buffer);

      await ffmpeg.run({
        inputPath: rawPath,
        outputPath: processedPath,
        aspectRatio: ffmpeg.aspectRatio,
        audioFilter: ffmpeg.audioFilter,
        preset: ffmpeg.preset,
      });

      const processedBuffer = await readFile(processedPath);

      const s3ClientInfo = s3.getClient(logger);
      let videoKey: string | undefined;
      let videoUrl: string | undefined;

      if (s3ClientInfo) {
        const jobIdentifier = jobId || String(job.id);
        const baseKey = `video-generation/${jobIdentifier}/`;
        videoKey = `${baseKey}final.mp4`;
        await s3.putBinaryObject(s3ClientInfo.client, s3ClientInfo.bucket, videoKey, processedBuffer, 'video/mp4');
        try {
          videoUrl = await s3.getSignedGetUrl(s3ClientInfo.client, s3ClientInfo.bucket, videoKey, 7 * 24 * 3600);
        } catch (err) {
          logger.warn({ err }, 'Failed to generate signed URL for video');
        }
      } else {
        logger.warn('S3 client unavailable, skipping upload of video output');
      }

      const result: VideoGenerationResult = {
        success: true,
        comfyJobId,
        caption,
        script,
        context,
        persona,
        durationSec,
        videoKey,
        videoUrl,
      };

      if (jobId) {
        const { success: _success, ...jobResult } = result;
        void _success;
        await patchJobStatus(jobId, { status: 'succeeded', result: jobResult });
      }

      return result;
    } catch (err) {
      logger.error({ err, jobId, comfyJobId }, 'video-generation processor error');
      if (jobId) {
        await patchJobStatus(jobId, {
          status: 'failed',
          result: { message: (err as any)?.message, stack: (err as any)?.stack },
        });
      }
      throw err;
    } finally {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  };

  return processor;
}
