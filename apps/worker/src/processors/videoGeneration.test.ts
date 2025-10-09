import { describe, expect, it, vi } from 'vitest';
import { createVideoGenerationProcessor } from './videoGeneration';
import { promises as fs } from 'fs';

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function createResponse(body: BodyInit, init?: ResponseInit) {
  return new Response(body, init);
}

describe('video-generation processor', () => {
  it('calls ComfyUI, runs ffmpeg, uploads to S3 and patches status', async () => {
    const patchCalls: Array<{ id: string; data: Record<string, unknown> }> = [];
    const uploaded: Array<{ key: string; body: Buffer; contentType?: string }> = [];
    let historyCalls = 0;
    const fetchSpy = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith('/prompt')) {
        expect(init?.method).toBe('POST');
        const body = init?.body as string;
        const parsed = JSON.parse(body);
        expect(parsed.prompt.inputs.caption).toBe('Caption');
        expect(parsed.prompt.inputs.script).toBe('Script');
        return createResponse(JSON.stringify({ prompt_id: 'job-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (input.includes('/history/job-123')) {
        historyCalls += 1;
        if (historyCalls === 1) {
          return createResponse(JSON.stringify({ job: { status: { status: 'running' } } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return createResponse(
          JSON.stringify({
            'job-123': {
              status: { status: 'completed', completed: true },
              outputs: {
                video: [
                  {
                    filename: 'output.mp4',
                    subfolder: 'videos',
                    type: 'output',
                  },
                ],
              },
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (input.includes('/view')) {
        return createResponse(Buffer.from('raw-video'), { status: 200 });
      }
      throw new Error(`Unexpected fetch ${input}`);
    });

    const processor = createVideoGenerationProcessor({
      logger: noopLogger,
      patchJobStatus: async (id, data) => {
        patchCalls.push({ id, data });
      },
      s3: {
        getClient: () => ({ client: {}, bucket: 'bucket' }),
        putBinaryObject: async (_client, _bucket, key, body, contentType) => {
          const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body as Uint8Array);
          uploaded.push({ key, body: buffer, contentType });
        },
        putTextObject: async () => {},
        getSignedGetUrl: async (_client, _bucket, key) => `https://example.com/${key}`,
      },
      comfy: {
        baseUrl: 'http://localhost:8188',
        clientId: 'test-client',
        fetch: fetchSpy,
        pollIntervalMs: 1,
        maxPollAttempts: 5,
      },
      ffmpeg: {
        aspectRatio: '9:16',
        audioFilter: 'loudnorm',
        preset: 'medium',
        run: async ({ inputPath, outputPath }) => {
          const data = await fs.readFile(inputPath);
          await fs.writeFile(outputPath, Buffer.concat([data, Buffer.from('-processed')]));
        },
      },
    });

    const result = await processor({
      id: 'queue-1',
      name: 'video-job',
      data: {
        jobId: 'job-1',
        payload: {
          caption: ' Caption ',
          script: ' Script ',
          context: 'launch',
          durationSec: 30,
          persona: { name: 'Ava' },
        },
      },
    } as any);

    expect(result.success).toBe(true);
    expect(result.videoUrl).toBe('https://example.com/video-generation/job-1/final.mp4');
    expect(uploaded).toHaveLength(1);
    expect(uploaded[0]?.key).toBe('video-generation/job-1/final.mp4');
    expect(uploaded[0]?.body.toString()).toContain('processed');
    expect(patchCalls.map((c) => c.data.status)).toEqual(['running', 'succeeded']);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('reports ComfyUI failures via patchJobStatus', async () => {
    const patchCalls: Array<{ id: string; data: Record<string, unknown> }> = [];
    const fetchSpy = vi.fn(async (input: string) => {
      if (input.endsWith('/prompt')) {
        return createResponse(JSON.stringify({ prompt_id: 'job-err' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (input.includes('/history/job-err')) {
        return createResponse(
          JSON.stringify({
            'job-err': {
              status: { status: 'error', error: 'Out of memory' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Unexpected fetch');
    });

    const processor = createVideoGenerationProcessor({
      logger: noopLogger,
      patchJobStatus: async (id, data) => {
        patchCalls.push({ id, data });
      },
      s3: {
        getClient: () => null,
        putBinaryObject: async () => {
          throw new Error('Should not upload');
        },
        putTextObject: async () => {},
        getSignedGetUrl: async () => '',
      },
      comfy: {
        baseUrl: 'http://localhost:8188',
        clientId: 'test-client',
        fetch: fetchSpy,
        pollIntervalMs: 1,
        maxPollAttempts: 2,
      },
      ffmpeg: {
        aspectRatio: '9:16',
        audioFilter: 'loudnorm',
        preset: 'medium',
        run: async () => {
          throw new Error('Should not run ffmpeg');
        },
      },
    });

    await expect(
      processor({
        id: 'queue-err',
        name: 'video-job',
        data: {
          jobId: 'job-err',
          payload: {
            caption: 'caption',
            script: 'script',
          },
        },
      } as any)
    ).rejects.toThrow(/Out of memory/);

    expect(patchCalls).toHaveLength(2);
    expect(patchCalls[0]).toEqual({ id: 'job-err', data: { status: 'running' } });
    expect(patchCalls[1]?.data?.status).toBe('failed');
  });
});
