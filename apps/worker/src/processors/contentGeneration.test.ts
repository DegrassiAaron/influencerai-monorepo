import { describe, expect, it } from 'vitest';
import { createContentGenerationProcessor } from './contentGeneration';

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('content generation processor', () => {
  it('orchestrates caption, script, assets and child job', async () => {
    const openRouterResponses = [
      { content: ' caption one ', usage: { total_tokens: 10 } },
      { content: ' script one ', usage: { total_tokens: 20 } },
    ];
    const patchCalls: Array<{ id: string; data: Record<string, unknown> }> = [];
    const uploadCalls: Array<{ jobIdentifier: string; caption: string; script: string }> = [];
    let childJobPayload: Record<string, unknown> | undefined;

    const processor = createContentGenerationProcessor({
      logger: noopLogger,
      callOpenRouter: async () => {
        const next = openRouterResponses.shift();
        expect(next).toBeDefined();
        return next!;
      },
      patchJobStatus: async (id, data) => {
        patchCalls.push({ id, data });
      },
      createChildJob: async (input) => {
        childJobPayload = input as Record<string, unknown>;
        return { id: 'child-123' } as any;
      },
      uploadTextAssets: async (input) => {
        uploadCalls.push(input);
        return { captionUrl: 'https://example.com/caption', scriptUrl: 'https://example.com/script' };
      },
      prompts: {
        imageCaptionPrompt: (value) => `CAPTION_PROMPT:${value}`,
        videoScriptPrompt: (caption, duration) => `SCRIPT_PROMPT:${caption}:${duration}`,
      },
    });

    const result = await processor({
      id: 'queue-1',
      name: 'content-job',
      data: {
        jobId: 'job-1',
        payload: {
          personaText: 'persona',
          context: 'launch',
          durationSec: 45,
        },
      },
    } as any);

    expect(result.caption).toBe('caption one');
    expect(result.script).toBe('script one');
    expect(result.captionUrl).toBe('https://example.com/caption');
    expect(result.scriptUrl).toBe('https://example.com/script');
    expect(result.childJobId).toBe('child-123');

    expect(uploadCalls).toEqual([
      { jobIdentifier: 'job-1', caption: ' caption one ', script: ' script one ' },
    ]);

    expect(childJobPayload).toBeDefined();
    expect(childJobPayload).toEqual({
      parentJobId: 'job-1',
      caption: ' caption one ',
      script: ' script one ',
      persona: 'persona',
      context: 'launch',
      durationSec: 45,
    });

    expect(patchCalls).toHaveLength(2);
    expect(patchCalls[0]).toEqual({ id: 'job-1', data: { status: 'running' } });
    expect(patchCalls[1]).toEqual({
      id: 'job-1',
      data: {
        status: 'succeeded',
        result: {
          caption: 'caption one',
          script: 'script one',
          captionUrl: 'https://example.com/caption',
          scriptUrl: 'https://example.com/script',
          childJobId: 'child-123',
        },
        costTok: 30,
      },
    });
  });

  it('reports failure to API when OpenRouter fails', async () => {
    const patchCalls: Array<{ id: string; data: Record<string, unknown> }> = [];

    const processor = createContentGenerationProcessor({
      logger: noopLogger,
      callOpenRouter: async () => {
        throw new Error('rate limited');
      },
      patchJobStatus: async (id, data) => {
        patchCalls.push({ id, data });
      },
      prompts: {
        imageCaptionPrompt: (value) => `CAPTION_PROMPT:${value}`,
        videoScriptPrompt: (caption, duration) => `SCRIPT_PROMPT:${caption}:${duration}`,
      },
    });

    await expect(
      processor({
        id: 'queue-err',
        name: 'content-job',
        data: {
          jobId: 'job-err',
          payload: {
            personaText: 'persona',
          },
        },
      } as any)
    ).rejects.toThrow(/rate limited/);

    expect(patchCalls[0]).toEqual({ id: 'job-err', data: { status: 'running' } });
    expect(patchCalls[1]?.id).toBe('job-err');
    expect(patchCalls[1]?.data?.status).toBe('failed');
  });
});
