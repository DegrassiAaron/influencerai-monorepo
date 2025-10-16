import { describe, expect, it, vi } from 'vitest';
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

    const videoScriptPrompt = vi.fn((caption, duration) => `SCRIPT_PROMPT:${caption}:${duration}`);

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
        return {
          captionUrl: 'https://example.com/caption',
          scriptUrl: 'https://example.com/script',
        };
      },
      prompts: {
        imageCaptionPrompt: (value) => `CAPTION_PROMPT:${value}`,
        videoScriptPrompt,
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
      { jobIdentifier: 'job-1', caption: 'caption one', script: 'script one' },
    ]);

    expect(childJobPayload).toBeDefined();
    expect(childJobPayload).toEqual({
      parentJobId: 'job-1',
      caption: 'caption one',
      script: 'script one',
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

    expect(videoScriptPrompt).toHaveBeenCalledWith('caption one', 45);
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

  it('bubbles up error when caption result is empty and reports failure', async () => {
    const patchCalls: Array<{ id: string; data: Record<string, unknown> }> = [];
    const openRouterCalls: Array<{ messages: unknown; opts: unknown }> = [];

    const processor = createContentGenerationProcessor({
      logger: noopLogger,
      callOpenRouter: async (messages, opts) => {
        openRouterCalls.push({ messages, opts });
        return { content: '   ', usage: { total_tokens: 7 } } as any;
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
        id: 'queue-empty',
        name: 'content-job',
        data: {
          jobId: 'job-empty',
          payload: {
            persona: { name: 'Alex' },
            context: 'product teaser',
            durationSec: 30,
          },
        },
      } as any)
    ).rejects.toThrow(/caption generation returned empty content/i);

    expect(openRouterCalls).toHaveLength(1);
    expect(openRouterCalls[0]?.messages).toEqual([
      { role: 'system', content: 'You generate concise, vivid social captions.' },
      {
        role: 'user',
        content: 'CAPTION_PROMPT:Persona: {"name":"Alex"}\nContext/Theme: product teaser',
      },
    ]);
    expect(openRouterCalls[0]?.opts).toEqual({ responseFormat: 'text' });

    expect(patchCalls).toHaveLength(2);
    expect(patchCalls[0]).toEqual({ id: 'job-empty', data: { status: 'running' } });
    expect(patchCalls[1]?.id).toBe('job-empty');
    expect(patchCalls[1]?.data?.status).toBe('failed');
    expect(patchCalls[1]?.data?.result).toMatchObject({
      message: expect.stringMatching(/caption generation returned empty content/i),
    });
  });

  it('fails when script result is empty and reports failure without side effects', async () => {
    const patchCalls: Array<{ id: string; data: Record<string, unknown> }> = [];
    const openRouterCalls: Array<{ messages: unknown; opts: unknown }> = [];
    const uploadCalls: Array<unknown> = [];
    const childJobCalls: Array<unknown> = [];

    const processor = createContentGenerationProcessor({
      logger: noopLogger,
      callOpenRouter: async (messages, opts) => {
        openRouterCalls.push({ messages, opts });
        if (openRouterCalls.length === 1) {
          return { content: 'great caption', usage: { total_tokens: 11 } } as any;
        }
        return { content: '   ', usage: { total_tokens: 13 } } as any;
      },
      patchJobStatus: async (id, data) => {
        patchCalls.push({ id, data });
      },
      uploadTextAssets: async (input) => {
        uploadCalls.push(input);
        return {
          captionUrl: 'https://example.com/caption',
          scriptUrl: 'https://example.com/script',
        };
      },
      createChildJob: async (input) => {
        childJobCalls.push(input);
        return { id: 'child-xyz' } as any;
      },
      prompts: {
        imageCaptionPrompt: (value) => `CAPTION_PROMPT:${value}`,
        videoScriptPrompt: (caption, duration) => `SCRIPT_PROMPT:${caption}:${duration}`,
      },
    });

    await expect(
      processor({
        id: 'queue-script-empty',
        name: 'content-job',
        data: {
          jobId: 'job-script-empty',
          payload: {
            personaText: 'persona',
            context: 'product launch',
            durationSec: 60,
          },
        },
      } as any)
    ).rejects.toThrow(/script generation returned empty content/i);

    expect(openRouterCalls).toHaveLength(2);
    expect(openRouterCalls[0]?.messages).toEqual([
      { role: 'system', content: 'You generate concise, vivid social captions.' },
      { role: 'user', content: 'CAPTION_PROMPT:Persona: persona\nContext/Theme: product launch' },
    ]);
    expect(openRouterCalls[1]?.messages).toEqual([
      { role: 'system', content: 'You write short timestamped scripts for short-form videos.' },
      { role: 'user', content: 'SCRIPT_PROMPT:great caption:60' },
    ]);

    expect(patchCalls).toHaveLength(2);
    expect(patchCalls[0]).toEqual({ id: 'job-script-empty', data: { status: 'running' } });
    expect(patchCalls[1]).toEqual({
      id: 'job-script-empty',
      data: {
        status: 'failed',
        result: {
          message: 'Script generation returned empty content',
          stack: expect.any(String),
        },
      },
    });

    expect(uploadCalls).toHaveLength(0);
    expect(childJobCalls).toHaveLength(0);
  });
});
