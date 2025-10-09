import type { Processor } from 'bullmq';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

import { createComfyClient } from './videoGeneration/comfyClient';
import type {
  VideoGenerationDependencies,
  VideoGenerationJob,
  VideoGenerationJobData,
  VideoGenerationPayload,
  VideoGenerationResult,
} from './videoGeneration/types';

export type {
  VideoGenerationDependencies,
  VideoGenerationJob,
  VideoGenerationJobData,
  VideoGenerationPayload,
  VideoGenerationResult,
} from './videoGeneration/types';

export type { S3Helper } from './videoGeneration/types';

export function createVideoGenerationProcessor(deps: VideoGenerationDependencies) {
  const comfyClient = createComfyClient(deps.comfy);

  const processor: Processor<VideoGenerationJobData, VideoGenerationResult, 'video-generation'> = async function process(
    job: VideoGenerationJob
  ) {
    const { logger, patchJobStatus, s3, ffmpeg } = deps;

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
      const comfyResult = await comfyClient.submitVideoJob({
        metadata,
        inputs: {
          caption,
          script,
          persona,
          personaText,
          context,
          durationSec,
        },
        logger,
      });

      comfyJobId = comfyResult.comfyJobId;

      tempDir = await mkdtemp(path.join(tmpdir(), 'video-generation-'));
      const rawPath = path.join(tempDir, 'raw.mp4');
      const processedPath = path.join(tempDir, 'processed.mp4');

      await writeFile(rawPath, comfyResult.buffer);

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
