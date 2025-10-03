import type { Job } from 'bullmq';
import type { Logger } from 'pino';
import type { JobResponse } from '@influencerai/sdk';

export type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type CallOpenRouter = (
  messages: OpenRouterMessage[],
  opts?: { responseFormat?: 'json_object' | 'text' }
) => Promise<{ content: string; usage?: OpenRouterUsage }>;

export type PatchJobStatus = (
  jobId: string,
  data: { status?: 'running' | 'succeeded' | 'failed' | 'completed'; result?: unknown; costTok?: number }
) => Promise<void>;

export type UploadTextAssets = (
  input: {
    jobIdentifier: string;
    caption: string;
    script: string;
  }
) => Promise<{ captionUrl?: string; scriptUrl?: string }>;

export type CreateChildJob = (
  input: {
    parentJobId?: string;
    caption: string;
    script: string;
    persona: unknown;
    context: string;
    durationSec: number;
  }
) => Promise<JobResponse>;

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

export type ContentGenerationJob = Job<{
  jobId?: string;
  payload?: Record<string, unknown>;
}>;

export function createContentGenerationProcessor(deps: ContentGenerationDependencies) {
  return async function process(job: ContentGenerationJob) {
    const { logger, callOpenRouter, patchJobStatus, uploadTextAssets, createChildJob, prompts } = deps;
    logger.info({ id: job.id, name: job.name, data: job.data }, 'Processing content-generation job');

    const jobData = job.data ?? {};
    const jobId = typeof jobData.jobId === 'string' ? jobData.jobId : undefined;
    const payload = (jobData.payload ?? {}) as Record<string, any>;

    if (jobId) {
      await patchJobStatus(jobId, { status: 'running' });
    }

    try {
      const persona = payload.persona ? JSON.stringify(payload.persona) : payload.personaText || '{}';
      const context = (payload.context || payload.theme || 'general social post') as string;
      const durationSec = Number(payload.durationSec || 15);

      const captionPrompt = prompts.imageCaptionPrompt(`Persona: ${persona}\nContext/Theme: ${context}`);
      const captionResult = await callOpenRouter(
        [
          { role: 'system', content: 'You generate concise, vivid social captions.' },
          { role: 'user', content: captionPrompt },
        ],
        { responseFormat: 'text' }
      );

      const scriptPrompt = prompts.videoScriptPrompt(captionResult.content || 'A short engaging caption', durationSec);
      const scriptResult = await callOpenRouter(
        [
          { role: 'system', content: 'You write short timestamped scripts for short-form videos.' },
          { role: 'user', content: scriptPrompt },
        ],
        { responseFormat: 'text' }
      );

      const totalTokens = (captionResult.usage?.total_tokens || 0) + (scriptResult.usage?.total_tokens || 0);

      let childJobId: string | undefined;
      if (createChildJob) {
        try {
          const childJob = await createChildJob({
            parentJobId: jobId,
            caption: captionResult.content,
            script: scriptResult.content,
            persona: payload.persona ?? payload.personaText,
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
            caption: captionResult.content,
            script: scriptResult.content,
          });
          captionUrl = uploadResult.captionUrl;
          scriptUrl = uploadResult.scriptUrl;
        } catch (e) {
          logger.warn({ err: e }, 'S3 upload/presign failed');
        }
      }

      const result = {
        caption: (captionResult.content || '').trim(),
        script: (scriptResult.content || '').trim(),
        captionUrl,
        scriptUrl,
        childJobId,
      };

      if (jobId) {
        await patchJobStatus(jobId, {
          status: 'succeeded',
          result,
          ...(totalTokens ? { costTok: totalTokens } : {}),
        });
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
  };
}
