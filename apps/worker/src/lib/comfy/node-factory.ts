/**
 * ComfyUI Node Factory
 *
 * Factory functions for creating individual ComfyUI nodes with type-safe inputs.
 * Each function creates a specific node type with validation.
 */

import type { ComfyNode, NodeConnection } from './workflow-types';

// ==============================================================================
// Checkpoint Loader Node
// ==============================================================================

/**
 * Create a CheckpointLoaderSimple node
 * Outputs: [0] MODEL, [1] CLIP, [2] VAE
 */
export function createCheckpointLoaderNode(params: {
  nodeId: string;
  checkpointName: string;
}): ComfyNode {
  if (!params.checkpointName || params.checkpointName.trim() === '') {
    throw new Error('Checkpoint name cannot be empty');
  }

  return {
    class_type: 'CheckpointLoaderSimple',
    inputs: {
      ckpt_name: params.checkpointName,
    },
  };
}

// ==============================================================================
// LoRA Loader Node
// ==============================================================================

/**
 * Create a LoraLoader node
 * Outputs: [0] MODEL, [1] CLIP
 */
export function createLoraLoaderNode(params: {
  nodeId: string;
  loraName: string;
  strengthModel: number;
  strengthClip: number;
  modelConnection: NodeConnection;
  clipConnection: NodeConnection;
}): ComfyNode {
  // Validate strength ranges (valid range is 0-100)
  if (params.strengthModel < 0 || params.strengthModel > 100) {
    throw new Error('strength_model must be between -100 and 100');
  }
  if (params.strengthClip < 0 || params.strengthClip > 100) {
    throw new Error('strength_clip must be between -100 and 100');
  }

  return {
    class_type: 'LoraLoader',
    inputs: {
      lora_name: params.loraName,
      strength_model: params.strengthModel,
      strength_clip: params.strengthClip,
      model: params.modelConnection,
      clip: params.clipConnection,
    },
  };
}

// ==============================================================================
// CLIP Text Encode Node
// ==============================================================================

/**
 * Create a CLIPTextEncode node for prompt encoding
 * Outputs: [0] CONDITIONING
 */
export function createClipTextEncodeNode(params: {
  nodeId: string;
  text: string;
  clipConnection: NodeConnection;
}): ComfyNode {
  return {
    class_type: 'CLIPTextEncode',
    inputs: {
      text: params.text,
      clip: params.clipConnection,
    },
  };
}

// ==============================================================================
// Empty Latent Image Node
// ==============================================================================

/**
 * Create an EmptyLatentImage node
 * Outputs: [0] LATENT
 */
export function createEmptyLatentImageNode(params: {
  nodeId: string;
  width: number;
  height: number;
  batchSize?: number;
}): ComfyNode {
  return {
    class_type: 'EmptyLatentImage',
    inputs: {
      width: params.width,
      height: params.height,
      batch_size: params.batchSize ?? 1,
    },
  };
}

// ==============================================================================
// KSampler Node
// ==============================================================================

/**
 * Create a KSampler node
 * Outputs: [0] LATENT
 */
export function createKSamplerNode(params: {
  nodeId: string;
  seed: number;
  steps: number;
  cfg: number;
  samplerName: string;
  scheduler: string;
  denoise: number;
  modelConnection: NodeConnection;
  positiveConnection: NodeConnection;
  negativeConnection: NodeConnection;
  latentConnection: NodeConnection;
}): ComfyNode {
  // Validate steps
  if (params.steps < 1) {
    throw new Error('steps must be >= 1');
  }
  if (params.steps > 150) {
    throw new Error('steps must be <= 150');
  }

  // Validate CFG
  if (params.cfg < 1) {
    throw new Error('cfg must be >= 1');
  }
  if (params.cfg > 30) {
    throw new Error('cfg must be <= 30');
  }

  // Validate denoise
  if (params.denoise < 0 || params.denoise > 1) {
    throw new Error('denoise must be between 0 and 1');
  }

  return {
    class_type: 'KSampler',
    inputs: {
      seed: params.seed,
      steps: params.steps,
      cfg: params.cfg,
      sampler_name: params.samplerName,
      scheduler: params.scheduler,
      denoise: params.denoise,
      model: params.modelConnection,
      positive: params.positiveConnection,
      negative: params.negativeConnection,
      latent_image: params.latentConnection,
    },
  };
}

// ==============================================================================
// VAE Decode Node
// ==============================================================================

/**
 * Create a VAEDecode node
 * Outputs: [0] IMAGE
 */
export function createVaeDecodeNode(params: {
  nodeId: string;
  samplesConnection: NodeConnection;
  vaeConnection: NodeConnection;
}): ComfyNode {
  return {
    class_type: 'VAEDecode',
    inputs: {
      samples: params.samplesConnection,
      vae: params.vaeConnection,
    },
  };
}

// ==============================================================================
// Save Image Node
// ==============================================================================

/**
 * Create a SaveImage node (terminal node - no outputs)
 */
export function createSaveImageNode(params: {
  nodeId: string;
  filenamePrefix: string;
  imagesConnection: NodeConnection;
}): ComfyNode {
  return {
    class_type: 'SaveImage',
    inputs: {
      filename_prefix: params.filenamePrefix,
      images: params.imagesConnection,
    },
  };
}

// ==============================================================================
// Helper Functions
// ==============================================================================

/**
 * Generate a random seed for image generation
 * Returns a random integer between 1 and 2^31-1 (max signed int32)
 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647) + 1;
}
