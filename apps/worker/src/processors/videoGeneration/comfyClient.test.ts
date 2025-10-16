import { describe, expect, it, vi } from 'vitest';

import { createComfyClient } from './comfyClient';

describe('createComfyClient', () => {
  it('submits prompts, merges metadata and handles nested history payloads', async () => {
    const workflowPayload = {
      inputs: { style: 'cinematic' },
      extra_data: { metadata: { workflow: 'custom' } },
    };

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const requestBodies: unknown[] = [];
    let historyCalls = 0;

    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith('/prompt')) {
        const body = init?.body as string;
        requestBodies.push(JSON.parse(body));
        return new Response(JSON.stringify({ prompt_id: 'job-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (input.includes('/history/job-123')) {
        historyCalls += 1;
        if (historyCalls === 1) {
          return new Response(
            JSON.stringify({ history: { 'job-123': { status: { status: 'running' } } } }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        return new Response(
          JSON.stringify({
            history: {
              'job-123': {
                status: { status: 'completed', completed: true },
                outputs: {
                  video: [
                    {
                      filename: 'result.mp4',
                      subfolder: 'videos',
                      type: 'video',
                    },
                  ],
                },
              },
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (input.startsWith('http://127.0.0.1:8188/view')) {
        return new Response(Buffer.from('processed-video'));
      }

      throw new Error(`Unexpected fetch call: ${input}`);
    });

    const client = createComfyClient({
      baseUrl: 'http://127.0.0.1:8188',
      clientId: 'worker',
      fetch: fetchMock,
      workflowPayload,
      pollIntervalMs: 1,
      maxPollAttempts: 3,
    });

    const result = await client.submitVideoJob({
      metadata: { jobId: 'job-1', request: 'video-generation' },
      inputs: { caption: 'Caption', script: 'Script' },
      logger,
    });

    expect(result.comfyJobId).toBe('job-123');
    expect(result.assetUrl).toContain('/view?');
    expect(result.buffer.toString()).toBe('processed-video');

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const assetRequestUrl = fetchMock.mock.calls.at(-1)?.[0] as string | undefined;
    expect(assetRequestUrl).toContain("/view?filename=result.mp4");
    const promptRequest = requestBodies[0] as any;
    expect(promptRequest.client_id).toBe('worker');
    expect(promptRequest.prompt.inputs).toMatchObject({
      caption: 'Caption',
      script: 'Script',
      style: 'cinematic',
    });
    expect(promptRequest.prompt.extra_data.metadata).toMatchObject({
      jobId: 'job-1',
      request: 'video-generation',
      workflow: 'custom',
    });

    expect(workflowPayload).toEqual({
      inputs: { style: 'cinematic' },
      extra_data: { metadata: { workflow: 'custom' } },
    });
  });
});
