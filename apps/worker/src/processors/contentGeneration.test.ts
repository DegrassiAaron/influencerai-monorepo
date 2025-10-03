import test from 'node:test';
import assert from 'node:assert/strict';
import { createContentGenerationProcessor } from './contentGeneration';

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

test('content generation processor orchestrates caption, script, assets and child job', async () => {
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
      assert.ok(next, 'expected open router calls');
      return next;
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

  assert.equal(result.caption, 'caption one');
  assert.equal(result.script, 'script one');
  assert.equal(result.captionUrl, 'https://example.com/caption');
  assert.equal(result.scriptUrl, 'https://example.com/script');
  assert.equal(result.childJobId, 'child-123');

  assert.deepEqual(uploadCalls, [
    { jobIdentifier: 'job-1', caption: ' caption one ', script: ' script one ' },
  ]);

  assert.ok(childJobPayload);
  assert.deepEqual(childJobPayload, {
    parentJobId: 'job-1',
    caption: ' caption one ',
    script: ' script one ',
    persona: 'persona',
    context: 'launch',
    durationSec: 45,
  });

  assert.equal(patchCalls.length, 2);
  assert.deepEqual(patchCalls[0], { id: 'job-1', data: { status: 'running' } });
  assert.deepEqual(patchCalls[1], {
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

test('content generation processor reports failure to API when OpenRouter fails', async () => {
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

  await assert.rejects(
    () =>
      processor({
        id: 'queue-err',
        name: 'content-job',
        data: {
          jobId: 'job-err',
          payload: {
            personaText: 'persona',
          },
        },
      } as any),
    /rate limited/
  );

  assert.deepEqual(patchCalls[0], { id: 'job-err', data: { status: 'running' } });
  assert.equal(patchCalls[1]?.id, 'job-err');
  assert.equal(patchCalls[1]?.data?.status, 'failed');
});
