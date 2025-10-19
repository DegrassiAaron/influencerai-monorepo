import type { Job, Processor } from 'bullmq';
import { createComfyImageClient, buildWorkflowFromJobParams } from '../lib/comfy/integration';
import type { WorkerLogger } from '../index';
import type { S3Helpers } from '../s3Helpers';

// ==============================================================================
// Type Definitions
// ==============================================================================

export interface ImageGenerationJobParams {
  prompt: string;
  negativePrompt?: string;
  checkpoint: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  sampler?: string;
  scheduler?: string;
  loras?: Array<{
    path: string;
    strengthModel?: number;
    strengthClip?: number;
  }>;
  influencerId: string;
}

export interface ImageGenerationJobData {
  jobId?: string;
  payload: ImageGenerationJobParams;
}

export interface ImageGenerationResult {
  success: boolean;
  comfyPromptId?: string;
  prompt: string;
  seed?: number;
  cfgScale?: number;
  steps?: number;
  loraUsed?: string[];
  s3Key?: string;
  s3Url?: string;
  assetId?: string;
}

export type ImageGenerationJob = Job<
  ImageGenerationJobData,
  ImageGenerationResult,
  'image-generation'
>;

export interface ImageGenerationDependencies {
  logger: WorkerLogger;
  patchJobStatus: (
    jobId: string,
    data: { status?: string; result?: any; error?: string }
  ) => Promise<void>;
  s3: S3Helpers;
  comfy: {
    baseUrl: string;
    clientId: string;
    fetch: typeof globalThis.fetch;
    pollIntervalMs?: number;
    maxPollAttempts?: number;
    retries?: number;
    retryDelayMs?: number;
  };
  createAsset?: (data: {
    jobId: string;
    type: string;
    url: string;
    meta: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  checkFileExists?: (path: string) => Promise<boolean>;
}

// ==============================================================================
// Processor Factory
// ==============================================================================

export function createImageGenerationProcessor(
  deps: ImageGenerationDependencies
): Processor<ImageGenerationJobData, ImageGenerationResult, 'image-generation'> {
  // Configure ComfyUI client with sensible defaults for retries
  const comfyConfig = {
    ...deps.comfy,
    retries: deps.comfy.retries ?? 2, // Default to 2 retries (3 total attempts)
    retryDelayMs: deps.comfy.retryDelayMs ?? 1000,
  };
  const comfyClient = createComfyImageClient(comfyConfig);

  const processor: Processor<
    ImageGenerationJobData,
    ImageGenerationResult,
    'image-generation'
  > = async function process(job: ImageGenerationJob) {
    const { logger, patchJobStatus, s3, comfy } = deps;

    logger.info(
      { id: job.id, name: job.name, data: job.data },
      'Processing image-generation job'
    );

    // Extract job data with defensive checks
    const jobData = job.data ?? {};
    const jobId = typeof jobData.jobId === 'string' ? jobData.jobId : undefined;
    const payload = (jobData.payload ?? {}) as ImageGenerationJobParams;

    // Extract and validate required fields
    const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
    const checkpoint = typeof payload.checkpoint === 'string' ? payload.checkpoint.trim() : '';
    const influencerId =
      typeof payload.influencerId === 'string' ? payload.influencerId.trim() : '';

    // Validate required fields BEFORE updating status to running
    if (!prompt || !checkpoint || !influencerId) {
      const err = new Error(
        'Image generation payload requires prompt, checkpoint, and influencerId'
      );
      if (jobId) {
        await patchJobStatus(jobId, {
          status: 'FAILED',
          error: err.message,
        });
      }
      throw err;
    }

    // Extract optional parameters
    const negativePrompt =
      typeof payload.negativePrompt === 'string' ? payload.negativePrompt : undefined;
    const width = typeof payload.width === 'number' ? payload.width : undefined;
    const height = typeof payload.height === 'number' ? payload.height : undefined;
    const steps = typeof payload.steps === 'number' ? payload.steps : undefined;
    const cfg = typeof payload.cfg === 'number' ? payload.cfg : undefined;
    const seed = typeof payload.seed === 'number' ? payload.seed : undefined;
    const sampler = typeof payload.sampler === 'string' ? payload.sampler : undefined;
    const scheduler = typeof payload.scheduler === 'string' ? payload.scheduler : undefined;
    const loras = Array.isArray(payload.loras) ? payload.loras : [];

    // Determine workflow type
    let workflowType: string;
    if (loras.length === 0) {
      workflowType = 'basic';
    } else if (loras.length === 1) {
      workflowType = 'single-lora';
    } else {
      workflowType = 'multi-lora';
    }

    // Build structured metadata for logging
    const metadata = {
      jobId,
      queueJobId: job.id,
      workflow_type: 'image-generation',
      lora_count: loras.length,
      influencerId,
      prompt: prompt.substring(0, 100), // Truncate for logging
    };

    let comfyPromptId: string | undefined;

    try {
      // LoRA file validation (if dependency provided) - BEFORE status update
      if (deps.checkFileExists && loras.length > 0) {
        for (const lora of loras) {
          const exists = await deps.checkFileExists(lora.path);
          if (!exists) {
            throw new Error(`LoRA file not found: ${lora.path}`);
          }
        }
        logger.info({ loraCount: loras.length }, 'LoRA files validated');
      }

      // Update job status to running AFTER validation
      if (jobId) {
        await patchJobStatus(jobId, { status: 'RUNNING' });
      }

      logger.info(
        { ...metadata, workflowType },
        'Starting image generation with ComfyUI'
      );

      // Build workflow from job parameters
      const workflow = buildWorkflowFromJobParams({
        prompt,
        negativePrompt,
        checkpoint,
        width,
        height,
        steps,
        cfg,
        seed,
        sampler,
        scheduler,
        loras,
      });

      logger.info({ workflowType, loraCount: loras.length }, 'Workflow built successfully');

      // Submit workflow to ComfyUI and wait for completion
      const comfyResult = await comfyClient.submitAndWait(workflow);
      comfyPromptId = comfyResult.promptId;

      logger.info(
        { comfyPromptId, status: comfyResult.status },
        'ComfyUI job completed'
      );

      // Extract image output information
      const outputs = comfyResult.outputs || {};

      // Find the image output (typically in 'SaveImage' or similar node)
      let imageInfo: { filename: string; subfolder?: string; type?: string } | undefined;

      for (const nodeOutputs of Object.values(outputs)) {
        if (Array.isArray(nodeOutputs) && nodeOutputs.length > 0) {
          const firstOutput = nodeOutputs[0];
          if (firstOutput && typeof firstOutput === 'object' && 'filename' in firstOutput) {
            imageInfo = firstOutput as any;
            break;
          }
        }
      }

      if (!imageInfo || !imageInfo.filename) {
        throw new Error('No image output found in ComfyUI result');
      }

      // Fetch image from ComfyUI
      const viewUrl = `${comfy.baseUrl}/view`;
      const params = new URLSearchParams({
        filename: imageInfo.filename,
        subfolder: imageInfo.subfolder || '',
        type: imageInfo.type || 'output',
      });

      logger.info({ filename: imageInfo.filename }, 'Downloading image from ComfyUI');

      const imageResponse = await comfy.fetch(`${viewUrl}?${params.toString()}`, undefined);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      logger.info({ size: imageBuffer.length }, 'Image downloaded successfully');

      // Extract metadata from workflow for result
      // The workflow builder may have set default values, extract them
      const actualSeed = seed ?? Math.floor(Math.random() * 1000000);
      const actualSteps = steps ?? 20;
      const actualCfg = cfg ?? 7.0;
      const loraUsed = loras.map((l) => l.path);

      // Upload to S3
      const s3ClientInfo = s3.getClient(logger);
      if (!s3ClientInfo) {
        throw new Error('S3 client unavailable');
      }

      const timestamp = Date.now();
      const s3Key = `${influencerId}/${timestamp}-${actualSeed}.png`;

      logger.info({ s3Key }, 'Uploading image to S3');

      await s3.putBinaryObject(
        s3ClientInfo.client,
        s3ClientInfo.bucket,
        s3Key,
        imageBuffer,
        'image/png'
      );

      const s3Url = await s3.getSignedGetUrl(
        s3ClientInfo.client,
        s3ClientInfo.bucket,
        s3Key,
        7 * 24 * 3600 // 7 days
      );

      logger.info({ s3Key, s3Url }, 'Image uploaded to S3 successfully');

      // Create asset record (if dependency provided)
      let assetId: string | undefined;
      if (deps.createAsset && jobId) {
        const asset = await deps.createAsset({
          jobId,
          type: 'image',
          url: s3Url,
          meta: {
            prompt,
            seed: actualSeed,
            cfgScale: actualCfg,
            steps: actualSteps,
            loraUsed,
            width: width ?? 512,
            height: height ?? 512,
            checkpoint,
            negativePrompt,
            sampler,
            scheduler,
          },
        });
        assetId = asset.id;

        logger.info({ assetId }, 'Asset created successfully');
      }

      // Build result
      const result: ImageGenerationResult = {
        success: true,
        comfyPromptId,
        prompt,
        seed: actualSeed,
        cfgScale: actualCfg,
        steps: actualSteps,
        loraUsed,
        s3Key,
        s3Url,
        assetId,
      };

      // Update job status to completed
      if (jobId) {
        await patchJobStatus(jobId, {
          status: 'COMPLETED',
          result,
        });
      }

      logger.info(
        { ...metadata, comfyPromptId, assetId },
        'Image generation completed successfully'
      );

      return result;
    } catch (err) {
      logger.error(
        { err, jobId, comfyPromptId, ...metadata },
        'image-generation processor error'
      );

      if (jobId) {
        await patchJobStatus(jobId, {
          status: 'FAILED',
          error: (err as any)?.message,
        });
      }

      throw err;
    }
  };

  return processor;
}
