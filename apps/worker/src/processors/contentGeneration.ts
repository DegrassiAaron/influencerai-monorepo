import type { Job, Processor } from 'bullmq';
import type { Logger } from 'pino';
import type { JobResponse } from '@influencerai/sdk';
import type { CallOpenRouter } from '../httpClient';

export type PatchJobStatus = (
  jobId: string,
  data: {
    status?: 'running' | 'succeeded' | 'failed' | 'completed';
    result?: unknown;
    costTok?: number;
  }
) => Promise<void>;

export type UploadTextAssets = (input: {
  jobIdentifier: string;
  caption: string;
  script: string;
}) => Promise<{ captionUrl?: string; scriptUrl?: string }>;

export type CreateChildJob = (input: {
  parentJobId?: string;
  caption: string;
  script: string;
  persona: unknown;
  context: string;
  durationSec: number;
}) => Promise<JobResponse>;

export type PromptHelpers = {
  imageCaptionPrompt: (input: string) => string;
  videoScriptPrompt: (caption: string, durationSec: number) => string;
};

export interface ContentGenerationDependencies {
  logger: Pick<Logger, 'info' | 'warn' | 'error'>;
  callOpenRouter: CallOpenRouter;
  patchJobStatus: PatchJobStatus;
  uploadTextAssets?: UploadTextAssets;
  createChildJob?: CreateChildJob;
  prompts: PromptHelpers;
}

export type ContentGenerationJobData = {
  jobId?: string;
  payload?: Record<string, unknown>;
};

export type ContentGenerationResult = {
  success: true;
  caption: string;
  script: string;
  captionUrl?: string;
  scriptUrl?: string;
  childJobId?: string;
};

export type ContentGenerationJob = Job<
  ContentGenerationJobData,
  ContentGenerationResult,
  'content-generation'
>;

export function createContentGenerationProcessor(deps: ContentGenerationDependencies) {
  const processor: Processor<
    ContentGenerationJobData,
    ContentGenerationResult,
    'content-generation'
  > = async function process(job: ContentGenerationJob) {
    const { logger, callOpenRouter, patchJobStatus, uploadTextAssets, createChildJob, prompts } =
      deps;
    logger.info(
      { id: job.id, name: job.name, data: job.data },
      'Processing content-generation job'
    );

    const jobData = job.data ?? {};
    const jobId = typeof jobData.jobId === 'string' ? jobData.jobId : undefined;
    const payload = (jobData.payload ?? {}) as Record<string, unknown>;

    if (jobId) {
      await patchJobStatus(jobId, { status: 'running' });
    }

    try {
      const personaValue = payload.persona;
      const personaText = payload.personaText;
      const persona = personaValue
        ? JSON.stringify(personaValue)
        : typeof personaText === 'string'
          ? personaText
          : '{}';
      const contextSource = payload.context ?? payload.theme ?? 'general social post';
      const context = typeof contextSource === 'string' ? contextSource : 'general social post';
      const durationSource = payload.durationSec;
      const durationSec =
        typeof durationSource === 'number' ? durationSource : Number(durationSource ?? 15);

      const captionPrompt = prompts.imageCaptionPrompt(
        `Persona: ${persona}\nContext/Theme: ${context}`
      );
      const captionResult = await callOpenRouter(
        [
          { role: 'system', content: 'You generate concise, vivid social captions.' },
          { role: 'user', content: captionPrompt },
        ],
        { responseFormat: 'text' }
      );

      const caption = (captionResult.content ?? '').trim();
      if (!caption) {
        throw new Error('Caption generation returned empty content');
      }

      const scriptPrompt = prompts.videoScriptPrompt(caption, durationSec);
      const scriptResult = await callOpenRouter(
        [
          { role: 'system', content: 'You write short timestamped scripts for short-form videos.' },
          { role: 'user', content: scriptPrompt },
        ],
        { responseFormat: 'text' }
      );

      const script = (scriptResult.content ?? '').trim();
      if (!script) {
        throw new Error('Script generation returned empty content');
      }

      const totalTokens =
        (captionResult.usage?.total_tokens || 0) + (scriptResult.usage?.total_tokens || 0);

      let childJobId: string | undefined;
      if (createChildJob) {
        try {
          const childJob = await createChildJob({
            parentJobId: jobId,
            caption,
            script,
            persona: personaValue ?? personaText,
            context,
            durationSec,
          });
          childJobId = childJob?.id;
        } catch (e) {
          logger.warn({ err: e }, 'Failed to create child job for video-generation');
        }
      }

      let captionUrl: string | undefined;
      let scriptUrl: string | undefined;
      if (uploadTextAssets) {
        try {
          const uploadResult = await uploadTextAssets({
            jobIdentifier: jobId || String(job.id),
            caption,
            script,
          });
          captionUrl = uploadResult.captionUrl;
          scriptUrl = uploadResult.scriptUrl;
        } catch (e) {
          logger.warn({ err: e }, 'S3 upload/presign failed');
        }
      }

      const result: ContentGenerationResult = {
        success: true,
        caption,
        script,
        captionUrl,
        scriptUrl,
        childJobId,
      };

      if (jobId) {
        const { success: _success, ...jobResult } = result;
        void _success;
        await patchJobStatus(jobId, {
          status: 'succeeded',
          result: jobResult,
          ...(totalTokens ? { costTok: totalTokens } : {}),
        });
      }

      return result;
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
  };

  return processor;
}
