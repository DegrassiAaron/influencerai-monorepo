/**
 * ComfyUI Integration Helpers
 *
 * Helper functions for integrating workflow builders with ComfyUI API clients.
 * Provides job parameter conversion and workflow submission utilities.
 */

import { buildImageWorkflow } from './workflow-builder';
import type { ComfyWorkflow, ImageGenerationParams } from './workflow-types';

// ==============================================================================
// Job Parameter Types
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
}

// ==============================================================================
// Workflow Building from Job Parameters
// ==============================================================================

/**
 * Build ComfyUI workflow from job parameters
 * Validates parameters and converts to ImageGenerationParams format
 */
export function buildWorkflowFromJobParams(
  params: ImageGenerationJobParams
): ComfyWorkflow {
  // Validate required parameters
  if (!params.prompt) {
    throw new Error('Missing required parameter: prompt');
  }
  if (!params.checkpoint) {
    throw new Error('Missing required parameter: checkpoint');
  }

  // Validate parameter types
  if (params.steps !== undefined && typeof params.steps !== 'number') {
    throw new Error('steps must be a number');
  }
  if (params.cfg !== undefined && typeof params.cfg !== 'number') {
    throw new Error('cfg must be a number');
  }
  if (params.seed !== undefined && typeof params.seed !== 'number') {
    throw new Error('seed must be a number');
  }
  if (params.width !== undefined && typeof params.width !== 'number') {
    throw new Error('width must be a number');
  }
  if (params.height !== undefined && typeof params.height !== 'number') {
    throw new Error('height must be a number');
  }

  // Validate parameter ranges
  if (params.cfg !== undefined && (params.cfg < 1 || params.cfg > 30)) {
    throw new Error('cfg must be between 1 and 30');
  }

  // Convert job params to ImageGenerationParams
  const imageParams: ImageGenerationParams = {
    checkpoint: params.checkpoint,
    positivePrompt: params.prompt,
    negativePrompt: params.negativePrompt || '',
    width: params.width || 512,
    height: params.height || 512,
    steps: params.steps,
    cfg: params.cfg,
    seed: params.seed,
    samplerName: params.sampler as any,
    scheduler: params.scheduler as any,
  };

  // Handle LoRA configuration
  if (params.loras && params.loras.length > 0) {
    // Validate LoRA configurations
    params.loras.forEach((lora, index) => {
      if (!lora.path) {
        throw new Error(`loras[${index}].path is required`);
      }
    });

    if (params.loras.length === 1) {
      imageParams.loraConfig = params.loras[0];
    } else {
      imageParams.multiLoraConfigs = params.loras;
    }
  }

  // Build and return workflow
  return buildImageWorkflow(imageParams);
}

// ==============================================================================
// ComfyUI API Client Configuration
// ==============================================================================

export interface ComfyClientConfig {
  baseUrl: string;
  clientId: string;
  fetch: typeof globalThis.fetch;
  retries?: number;
  retryDelayMs?: number;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export interface SubmitWorkflowResult {
  promptId: string;
}

export interface SubmitAndWaitResult {
  promptId: string;
  status: string;
  outputs?: Record<string, any>;
}

// ==============================================================================
// ComfyUI API Client Functions
// ==============================================================================

/**
 * Submit workflow to ComfyUI API
 * Handles retries on transient errors
 */
export async function submitWorkflowToComfyUI(
  workflow: ComfyWorkflow,
  config: ComfyClientConfig
): Promise<SubmitWorkflowResult> {
  const retries = config.retries || 0;
  const retryDelayMs = config.retryDelayMs || 1000;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await config.fetch(`${config.baseUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: workflow,
          client_id: config.clientId,
        }),
      });

      if (!response.ok) {
        // Retry on 503 Service Unavailable
        if (response.status === 503 && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          continue;
        }

        throw new Error(`ComfyUI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return { promptId: result.prompt_id };
    } catch (error: any) {
      lastError = error;

      // Check if it's a connection error
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
        throw new Error(`ComfyUI is not reachable at ${config.baseUrl}`);
      }

      // Retry on other errors if attempts remain
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Failed to submit workflow');
}

/**
 * Create a ComfyUI image client with high-level methods
 */
export function createComfyImageClient(config: ComfyClientConfig) {
  return {
    /**
     * Submit workflow and wait for completion
     */
    async submitAndWait(workflow: ComfyWorkflow): Promise<SubmitAndWaitResult> {
      // Submit workflow
      const { promptId } = await submitWorkflowToComfyUI(workflow, config);

      // Poll for completion
      const pollIntervalMs = config.pollIntervalMs || 1000;
      const maxPollAttempts = config.maxPollAttempts || 60;

      for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        const historyResponse = await config.fetch(`${config.baseUrl}/history/${promptId}`);
        if (!historyResponse.ok) {
          throw new Error(`Failed to fetch job status: ${historyResponse.status}`);
        }

        const history = await historyResponse.json();
        const jobHistory = history[promptId];

        if (!jobHistory) {
          continue; // Job not in history yet
        }

        const status = jobHistory.status?.status_str || 'unknown';

        if (status === 'success' || jobHistory.status?.completed) {
          return {
            promptId,
            status: 'success',
            outputs: jobHistory.outputs,
          };
        }

        if (status === 'error') {
          throw new Error(`ComfyUI job failed: ${jobHistory.status?.error || 'Unknown error'}`);
        }

        // Continue polling for 'running' or other statuses
      }

      throw new Error(`Job ${promptId} timed out after ${maxPollAttempts} poll attempts`);
    },
  };
}
