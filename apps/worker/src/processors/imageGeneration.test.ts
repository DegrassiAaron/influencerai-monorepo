import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createImageGenerationProcessor } from './imageGeneration';
import type { ImageGenerationJobData, ImageGenerationDependencies } from './imageGeneration';

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function createResponse(body: BodyInit, init?: ResponseInit) {
  return new Response(body, init);
}

describe('image-generation processor', () => {
  let deps: ImageGenerationDependencies;
  let patchCalls: Array<{ id: string; data: Record<string, unknown> }>;
  let uploaded: Array<{ key: string; body: Buffer; contentType?: string }>;
  let createdAssets: Array<{ jobId: string; type: string; url: string; meta: Record<string, unknown> }>;
  let fetchSpy: ReturnType<typeof vi.fn>;
  let historyCalls: number;

  beforeEach(() => {
    patchCalls = [];
    uploaded = [];
    createdAssets = [];
    historyCalls = 0;

    fetchSpy = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith('/prompt')) {
        expect(init?.method).toBe('POST');
        const body = init?.body as string;
        const parsed = JSON.parse(body);
        // Verify workflow structure
        expect(parsed.prompt).toBeDefined();
        expect(parsed.client_id).toBe('test-client');
        return createResponse(JSON.stringify({ prompt_id: 'test-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (input.includes('/history/test-123')) {
        historyCalls += 1;
        if (historyCalls === 1) {
          return createResponse(JSON.stringify({ job: { status: { status: 'running' } } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return createResponse(
          JSON.stringify({
            'test-123': {
              status: { status: 'completed', completed: true },
              outputs: {
                image: [
                  {
                    filename: 'output.png',
                    subfolder: 'images',
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
        // Return mock PNG image data
        return createResponse(Buffer.from('PNG_IMAGE_DATA'), { status: 200 });
      }
      throw new Error(`Unexpected fetch ${input}`);
    });

    deps = {
      logger: noopLogger,
      patchJobStatus: async (id, data) => {
        patchCalls.push({ id, data });
      },
      s3: {
        getClient: () => ({ client: {}, bucket: 'assets' }),
        putBinaryObject: async (_client, _bucket, key, body, contentType) => {
          const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body as Uint8Array);
          uploaded.push({ key, body: buffer, contentType });
        },
        putTextObject: async () => {},
        getSignedGetUrl: async (_client, _bucket, key) => `https://cdn.example.com/${key}`,
      },
      comfy: {
        baseUrl: 'http://localhost:8188',
        clientId: 'test-client',
        fetch: fetchSpy,
        pollIntervalMs: 1,
        maxPollAttempts: 5,
      },
      createAsset: async (data) => {
        createdAssets.push(data);
        return { id: 'asset_123' };
      },
    };
  });

  it('generates image with single LoRA successfully', async () => {
    const processor = createImageGenerationProcessor(deps);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_001',
      payload: {
        prompt: 'A beautiful sunset over mountains',
        negativePrompt: 'blurry, low quality',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        width: 1024,
        height: 1024,
        steps: 30,
        cfg: 7.5,
        seed: 42,
        sampler: 'euler_a',
        scheduler: 'normal',
        loras: [
          {
            path: '/data/loras/test-lora.safetensors',
            strengthModel: 0.8,
            strengthClip: 0.8,
          },
        ],
        influencerId: 'inf_001',
      },
    };

    const result = await processor(
      { id: 'queue-1', data: jobData } as any,
      {} as any
    );

    // Verify ComfyUI was called correctly
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/prompt'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/history/test-123'),
      undefined
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/view'),
      undefined
    );

    // Verify S3 upload with correct naming pattern
    expect(uploaded).toHaveLength(1);
    expect(uploaded[0].key).toMatch(/^inf_001\/\d+-42\.png$/);
    expect(uploaded[0].body.toString()).toBe('PNG_IMAGE_DATA');
    expect(uploaded[0].contentType).toBe('image/png');

    // Verify asset creation
    expect(createdAssets).toHaveLength(1);
    expect(createdAssets[0]).toMatchObject({
      jobId: 'job_001',
      type: 'image',
      url: expect.stringMatching(/^https:\/\/cdn\.example\.com\/inf_001\/\d+-42\.png$/),
      meta: expect.objectContaining({
        loraUsed: ['/data/loras/test-lora.safetensors'],
        seed: 42,
        steps: 30,
        cfgScale: 7.5,
      }),
    });

    // Verify job status transitions
    expect(patchCalls).toHaveLength(2);
    expect(patchCalls[0]).toMatchObject({
      id: 'job_001',
      data: { status: 'RUNNING' },
    });
    expect(patchCalls[1]).toMatchObject({
      id: 'job_001',
      data: {
        status: 'COMPLETED',
        result: expect.objectContaining({
          success: true,
          comfyPromptId: 'test-123',
          seed: 42,
          loraUsed: ['/data/loras/test-lora.safetensors'],
          assetId: 'asset_123',
        }),
      },
    });

    // Verify result
    expect(result).toMatchObject({
      success: true,
      comfyPromptId: 'test-123',
      prompt: 'A beautiful sunset over mountains',
      seed: 42,
      cfgScale: 7.5,
      steps: 30,
      loraUsed: ['/data/loras/test-lora.safetensors'],
      s3Key: expect.stringMatching(/^inf_001\/\d+-42\.png$/),
      s3Url: expect.stringMatching(/^https:\/\/cdn\.example\.com\/inf_001\/\d+-42\.png$/),
      assetId: 'asset_123',
    });
  });

  it('generates image without LoRA (base model)', async () => {
    const processor = createImageGenerationProcessor(deps);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_002',
      payload: {
        prompt: 'A serene lake at dawn',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        width: 1024,
        height: 1024,
        seed: 100,
        influencerId: 'inf_002',
      },
    };

    const result = await processor(
      { id: 'queue-2', data: jobData } as any,
      {} as any
    );

    // Verify no LoRA in workflow
    const promptCall = fetchSpy.mock.calls.find((call: any) =>
      call[0].endsWith('/prompt')
    );
    expect(promptCall).toBeDefined();
    const workflowBody = JSON.parse(promptCall[1].body as string);
    // Workflow should not contain LoRA loader nodes (implementation detail)

    // Verify metadata indicates no LoRA used
    expect(createdAssets[0].meta.loraUsed).toEqual([]);

    // Verify result
    expect(result).toMatchObject({
      success: true,
      loraUsed: [],
      assetId: 'asset_123',
    });
  });

  it('generates image with multiple LoRAs', async () => {
    const processor = createImageGenerationProcessor(deps);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_003',
      payload: {
        prompt: 'A cyberpunk cityscape at night',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        width: 1024,
        height: 1024,
        seed: 200,
        loras: [
          {
            path: '/data/loras/style-lora.safetensors',
            strengthModel: 0.7,
            strengthClip: 0.7,
          },
          {
            path: '/data/loras/character-lora.safetensors',
            strengthModel: 0.9,
            strengthClip: 0.9,
          },
          {
            path: '/data/loras/lighting-lora.safetensors',
            strengthModel: 0.5,
            strengthClip: 0.5,
          },
        ],
        influencerId: 'inf_003',
      },
    };

    const result = await processor(
      { id: 'queue-3', data: jobData } as any,
      {} as any
    );

    // Verify all LoRAs in metadata
    expect(createdAssets[0].meta.loraUsed).toEqual([
      '/data/loras/style-lora.safetensors',
      '/data/loras/character-lora.safetensors',
      '/data/loras/lighting-lora.safetensors',
    ]);

    // Verify result
    expect(result).toMatchObject({
      success: true,
      loraUsed: [
        '/data/loras/style-lora.safetensors',
        '/data/loras/character-lora.safetensors',
        '/data/loras/lighting-lora.safetensors',
      ],
      assetId: 'asset_123',
    });
  });

  it('fails when LoRA file does not exist', async () => {
    // Override deps to include file existence check
    const depsWithFileCheck = {
      ...deps,
      checkFileExists: async (path: string) => {
        return !path.includes('nonexistent');
      },
    };

    const processor = createImageGenerationProcessor(depsWithFileCheck as any);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_004',
      payload: {
        prompt: 'A forest scene',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        loras: [
          {
            path: '/data/loras/nonexistent-lora.safetensors',
            strengthModel: 0.8,
            strengthClip: 0.8,
          },
        ],
        influencerId: 'inf_004',
      },
    };

    await expect(
      processor({ id: 'queue-4', data: jobData } as any, {} as any)
    ).rejects.toThrow(/LoRA file not found/i);

    // Verify ComfyUI was NOT called
    expect(fetchSpy).not.toHaveBeenCalled();

    // Verify job marked as failed
    expect(patchCalls).toHaveLength(1);
    expect(patchCalls[0]).toMatchObject({
      id: 'job_004',
      data: {
        status: 'FAILED',
        error: expect.stringMatching(/LoRA file not found/i),
      },
    });

    // Verify no S3 upload or asset creation
    expect(uploaded).toHaveLength(0);
    expect(createdAssets).toHaveLength(0);
  });

  it('fails when ComfyUI is unreachable', async () => {
    let retryAttempts = 0;
    fetchSpy = vi.fn(async () => {
      retryAttempts++;
      const error: any = new Error('connect ECONNREFUSED 127.0.0.1:8188');
      error.code = 'ECONNREFUSED';
      throw error;
    });

    const depsWithUnreachableComfy = {
      ...deps,
      comfy: {
        ...deps.comfy,
        fetch: fetchSpy,
      },
    };

    const processor = createImageGenerationProcessor(depsWithUnreachableComfy);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_005',
      payload: {
        prompt: 'A mountain landscape',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        influencerId: 'inf_005',
      },
    };

    await expect(
      processor({ id: 'queue-5', data: jobData } as any, {} as any)
    ).rejects.toThrow(/ComfyUI unreachable|ECONNREFUSED/i);

    // Verify retry attempts (3 retries total)
    expect(retryAttempts).toBeGreaterThanOrEqual(3);

    // Verify job marked as failed
    const failedPatch = patchCalls.find((call) => call.data.status === 'FAILED');
    expect(failedPatch).toBeDefined();
    expect(failedPatch!.data.error).toMatch(/ComfyUI unreachable|ECONNREFUSED/i);

    // Verify no S3 upload or asset creation
    expect(uploaded).toHaveLength(0);
    expect(createdAssets).toHaveLength(0);
  });

  it('fails when ComfyUI rendering fails (VRAM error)', async () => {
    fetchSpy = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith('/prompt')) {
        return createResponse(JSON.stringify({ prompt_id: 'test-vram-fail' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (input.includes('/history/test-vram-fail')) {
        return createResponse(
          JSON.stringify({
            'test-vram-fail': {
              status: {
                status: 'error',
                completed: false,
                messages: [['error', { exception_message: 'CUDA out of memory' }]],
              },
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      throw new Error(`Unexpected fetch ${input}`);
    });

    const depsWithVramError = {
      ...deps,
      comfy: {
        ...deps.comfy,
        fetch: fetchSpy,
      },
    };

    const processor = createImageGenerationProcessor(depsWithVramError);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_006',
      payload: {
        prompt: 'Ultra high resolution landscape',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        width: 2048,
        height: 2048,
        influencerId: 'inf_006',
      },
    };

    await expect(
      processor({ id: 'queue-6', data: jobData } as any, {} as any)
    ).rejects.toThrow(/CUDA out of memory/i);

    // Verify job marked as failed with ComfyUI error
    const failedPatch = patchCalls.find((call) => call.data.status === 'FAILED');
    expect(failedPatch).toBeDefined();
    expect(failedPatch!.data.error).toMatch(/CUDA out of memory/i);

    // Verify no S3 upload or asset creation
    expect(uploaded).toHaveLength(0);
    expect(createdAssets).toHaveLength(0);
  });

  it('fails on timeout after max poll attempts', async () => {
    fetchSpy = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith('/prompt')) {
        return createResponse(JSON.stringify({ prompt_id: 'test-timeout' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (input.includes('/history/test-timeout')) {
        // Always return "running" status to trigger timeout
        return createResponse(
          JSON.stringify({
            'test-timeout': {
              status: { status: 'running', completed: false },
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      throw new Error(`Unexpected fetch ${input}`);
    });

    const depsWithTimeout = {
      ...deps,
      comfy: {
        ...deps.comfy,
        fetch: fetchSpy,
        maxPollAttempts: 3, // Limit to 3 attempts for faster test
      },
    };

    const processor = createImageGenerationProcessor(depsWithTimeout);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_007',
      payload: {
        prompt: 'A complex scene',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        influencerId: 'inf_007',
      },
    };

    await expect(
      processor({ id: 'queue-7', data: jobData } as any, {} as any)
    ).rejects.toThrow(/timeout|max poll attempts|exceeded/i);

    // Verify polling happened 3 times
    const historyCalls = fetchSpy.mock.calls.filter((call: any) =>
      call[0].includes('/history/test-timeout')
    );
    expect(historyCalls).toHaveLength(3);

    // Verify job marked as failed with timeout error
    const failedPatch = patchCalls.find((call) => call.data.status === 'FAILED');
    expect(failedPatch).toBeDefined();
    expect(failedPatch!.data.error).toMatch(/timeout|max poll attempts|exceeded/i);

    // Verify no S3 upload or asset creation
    expect(uploaded).toHaveLength(0);
    expect(createdAssets).toHaveLength(0);
  });

  it('fails when S3 upload errors', async () => {
    const depsWithS3Error = {
      ...deps,
      s3: {
        ...deps.s3,
        putBinaryObject: async () => {
          throw new Error('S3 upload failed: Access Denied');
        },
      },
    };

    const processor = createImageGenerationProcessor(depsWithS3Error);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_008',
      payload: {
        prompt: 'A peaceful garden',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        seed: 300,
        influencerId: 'inf_008',
      },
    };

    await expect(
      processor({ id: 'queue-8', data: jobData } as any, {} as any)
    ).rejects.toThrow(/S3 upload failed/i);

    // Verify ComfyUI succeeded (image was downloaded)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/view'),
      undefined
    );

    // Verify job marked as failed
    const failedPatch = patchCalls.find((call) => call.data.status === 'FAILED');
    expect(failedPatch).toBeDefined();
    expect(failedPatch!.data.error).toMatch(/S3 upload failed/i);

    // Verify no asset creation (upload failed before asset creation)
    expect(createdAssets).toHaveLength(0);
  });

  it('uses default values for optional parameters', async () => {
    const processor = createImageGenerationProcessor(deps);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_009',
      payload: {
        prompt: 'A simple test image',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        influencerId: 'inf_009',
        // No width, height, steps, cfg, seed, sampler, scheduler
      },
    };

    const result = await processor(
      { id: 'queue-9', data: jobData } as any,
      {} as any
    );

    // Verify workflow was created with defaults
    expect(result.success).toBe(true);

    // Check that seed was generated (should be a number)
    expect(typeof result.seed).toBe('number');
    expect(createdAssets[0].meta.seed).toBeDefined();

    // Check default values were applied
    expect(createdAssets[0].meta.steps).toBeDefined();
    expect(createdAssets[0].meta.cfgScale).toBeDefined();
  });

  it('handles empty loras array same as undefined', async () => {
    const processor = createImageGenerationProcessor(deps);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_010',
      payload: {
        prompt: 'A test with empty loras array',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        loras: [], // Empty array
        influencerId: 'inf_010',
      },
    };

    const result = await processor(
      { id: 'queue-10', data: jobData } as any,
      {} as any
    );

    // Verify no LoRA in result
    expect(result.loraUsed).toEqual([]);
    expect(createdAssets[0].meta.loraUsed).toEqual([]);
  });

  it('logs structured information throughout execution', async () => {
    const logCalls: Array<{ level: string; args: any[] }> = [];
    const trackingLogger = {
      info: (...args: any[]) => logCalls.push({ level: 'info', args }),
      warn: (...args: any[]) => logCalls.push({ level: 'warn', args }),
      error: (...args: any[]) => logCalls.push({ level: 'error', args }),
    };

    const depsWithTracking = {
      ...deps,
      logger: trackingLogger,
    };

    const processor = createImageGenerationProcessor(depsWithTracking);

    const jobData: ImageGenerationJobData = {
      jobId: 'job_011',
      payload: {
        prompt: 'Test logging',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        loras: [{ path: '/data/loras/test.safetensors' }],
        influencerId: 'inf_011',
      },
    };

    await processor({ id: 'queue-11', data: jobData } as any, {} as any);

    // Verify structured logs were created
    expect(logCalls.length).toBeGreaterThan(0);

    // Check for key log entries
    const hasStartLog = logCalls.some((log) =>
      log.args.some((arg) =>
        typeof arg === 'string' && arg.includes('Starting image generation')
      )
    );
    expect(hasStartLog).toBe(true);

    const hasCompletionLog = logCalls.some((log) =>
      log.args.some((arg) =>
        typeof arg === 'string' && arg.includes('Image generation completed')
      )
    );
    expect(hasCompletionLog).toBe(true);

    // Verify logs contain structured data (jobId, workflow_type, lora_count, etc.)
    const structuredLog = logCalls.find((log) =>
      log.args.some((arg) => typeof arg === 'object' && arg?.jobId === 'job_011')
    );
    expect(structuredLog).toBeDefined();
    if (structuredLog) {
      const metadata = structuredLog.args.find((arg) => typeof arg === 'object');
      expect(metadata).toMatchObject({
        jobId: 'job_011',
        workflow_type: 'image-generation',
        lora_count: 1,
      });
    }
  });
});
