/**
 * ComfyUI Workflow Builder
 *
 * Orchestrates node creation into complete workflows.
 * Supports basic, single-LoRA, and multi-LoRA workflows.
 */

import {
  createCheckpointLoaderNode,
  createLoraLoaderNode,
  createClipTextEncodeNode,
  createEmptyLatentImageNode,
  createKSamplerNode,
  createVaeDecodeNode,
  createSaveImageNode,
  generateSeed,
} from './node-factory';
import type { ComfyWorkflow, ImageGenerationParams } from './workflow-types';
import { ImageGenerationParamsSchema } from './workflow-types';

// ==============================================================================
// Basic Workflow (No LoRA)
// ==============================================================================

/**
 * Build a basic text-to-image workflow without LoRA
 */
export function buildBasicTxt2ImgWorkflow(
  params: ImageGenerationParams
): ComfyWorkflow {
  // Validate parameters
  const validated = ImageGenerationParamsSchema.parse(params);

  const seed = validated.seed ?? generateSeed();
  const steps = validated.steps;
  const cfg = validated.cfg;
  const samplerName = validated.samplerName;
  const scheduler = validated.scheduler;

  const workflow: ComfyWorkflow = {
    '4': createCheckpointLoaderNode({
      nodeId: '4',
      checkpointName: validated.checkpoint,
    }),
    '5': createEmptyLatentImageNode({
      nodeId: '5',
      width: validated.width,
      height: validated.height,
    }),
    '6': createClipTextEncodeNode({
      nodeId: '6',
      text: validated.positivePrompt,
      clipConnection: ['4', 1],
    }),
    '7': createClipTextEncodeNode({
      nodeId: '7',
      text: validated.negativePrompt,
      clipConnection: ['4', 1],
    }),
    '3': createKSamplerNode({
      nodeId: '3',
      seed,
      steps,
      cfg,
      samplerName,
      scheduler,
      denoise: 1.0,
      modelConnection: ['4', 0],
      positiveConnection: ['6', 0],
      negativeConnection: ['7', 0],
      latentConnection: ['5', 0],
    }),
    '8': createVaeDecodeNode({
      nodeId: '8',
      samplesConnection: ['3', 0],
      vaeConnection: ['4', 2],
    }),
    '9': createSaveImageNode({
      nodeId: '9',
      filenamePrefix: 'ComfyUI',
      imagesConnection: ['8', 0],
    }),
  };

  return workflow;
}

// ==============================================================================
// Single LoRA Workflow
// ==============================================================================

/**
 * Build text-to-image workflow with single LoRA
 */
export function buildLoraTxt2ImgWorkflow(
  params: ImageGenerationParams
): ComfyWorkflow {
  // Validate parameters
  const validated = ImageGenerationParamsSchema.parse(params);

  if (!validated.loraConfig) {
    throw new Error('loraConfig is required for LoRA workflow');
  }

  const seed = validated.seed ?? generateSeed();
  const steps = validated.steps;
  const cfg = validated.cfg;
  const samplerName = validated.samplerName;
  const scheduler = validated.scheduler;

  const workflow: ComfyWorkflow = {
    '4': createCheckpointLoaderNode({
      nodeId: '4',
      checkpointName: validated.checkpoint,
    }),
    '10': createLoraLoaderNode({
      nodeId: '10',
      loraName: validated.loraConfig.path,
      strengthModel: validated.loraConfig.strengthModel,
      strengthClip: validated.loraConfig.strengthClip,
      modelConnection: ['4', 0],
      clipConnection: ['4', 1],
    }),
    '5': createEmptyLatentImageNode({
      nodeId: '5',
      width: validated.width,
      height: validated.height,
    }),
    '6': createClipTextEncodeNode({
      nodeId: '6',
      text: validated.positivePrompt,
      clipConnection: ['10', 1], // Connect to LoRA CLIP output
    }),
    '7': createClipTextEncodeNode({
      nodeId: '7',
      text: validated.negativePrompt,
      clipConnection: ['10', 1], // Connect to LoRA CLIP output
    }),
    '3': createKSamplerNode({
      nodeId: '3',
      seed,
      steps,
      cfg,
      samplerName,
      scheduler,
      denoise: 1.0,
      modelConnection: ['10', 0], // Connect to LoRA MODEL output
      positiveConnection: ['6', 0],
      negativeConnection: ['7', 0],
      latentConnection: ['5', 0],
    }),
    '8': createVaeDecodeNode({
      nodeId: '8',
      samplesConnection: ['3', 0],
      vaeConnection: ['4', 2],
    }),
    '9': createSaveImageNode({
      nodeId: '9',
      filenamePrefix: 'ComfyUI',
      imagesConnection: ['8', 0],
    }),
  };

  return workflow;
}

// ==============================================================================
// Multi-LoRA Workflow
// ==============================================================================

/**
 * Build text-to-image workflow with multiple stacked LoRAs
 */
export function buildMultiLoraTxt2ImgWorkflow(
  params: ImageGenerationParams
): ComfyWorkflow {
  // Validate parameters
  const validated = ImageGenerationParamsSchema.parse(params);

  if (!validated.multiLoraConfigs || validated.multiLoraConfigs.length === 0) {
    throw new Error('multiLoraConfigs is required for multi-LoRA workflow');
  }

  if (validated.multiLoraConfigs.length > 5) {
    throw new Error('Maximum 5 LoRAs supported (stability limit)');
  }

  const seed = validated.seed ?? generateSeed();
  const steps = validated.steps;
  const cfg = validated.cfg;
  const samplerName = validated.samplerName;
  const scheduler = validated.scheduler;

  const workflow: ComfyWorkflow = {
    '4': createCheckpointLoaderNode({
      nodeId: '4',
      checkpointName: validated.checkpoint,
    }),
  };

  // Chain LoRA loaders
  let currentModelConnection: [string, number] = ['4', 0];
  let currentClipConnection: [string, number] = ['4', 1];

  validated.multiLoraConfigs.forEach((loraConfig, index) => {
    const nodeId = String(10 + index); // Node IDs: 10, 11, 12, ...

    workflow[nodeId] = createLoraLoaderNode({
      nodeId,
      loraName: loraConfig.path,
      strengthModel: loraConfig.strengthModel,
      strengthClip: loraConfig.strengthClip,
      modelConnection: currentModelConnection,
      clipConnection: currentClipConnection,
    });

    // Update connections for next LoRA or downstream nodes
    currentModelConnection = [nodeId, 0];
    currentClipConnection = [nodeId, 1];
  });

  // Add remaining nodes, connected to last LoRA output
  workflow['5'] = createEmptyLatentImageNode({
    nodeId: '5',
    width: validated.width,
    height: validated.height,
  });

  workflow['6'] = createClipTextEncodeNode({
    nodeId: '6',
    text: validated.positivePrompt,
    clipConnection: currentClipConnection,
  });

  workflow['7'] = createClipTextEncodeNode({
    nodeId: '7',
    text: validated.negativePrompt,
    clipConnection: currentClipConnection,
  });

  workflow['3'] = createKSamplerNode({
    nodeId: '3',
    seed,
    steps,
    cfg,
    samplerName,
    scheduler,
    denoise: 1.0,
    modelConnection: currentModelConnection,
    positiveConnection: ['6', 0],
    negativeConnection: ['7', 0],
    latentConnection: ['5', 0],
  });

  workflow['8'] = createVaeDecodeNode({
    nodeId: '8',
    samplesConnection: ['3', 0],
    vaeConnection: ['4', 2],
  });

  workflow['9'] = createSaveImageNode({
    nodeId: '9',
    filenamePrefix: 'ComfyUI',
    imagesConnection: ['8', 0],
  });

  return workflow;
}

// ==============================================================================
// Auto-Selection Workflow Builder
// ==============================================================================

/**
 * Auto-select workflow builder based on parameters
 * Chooses the appropriate builder function based on LoRA configuration
 */
export function buildImageWorkflow(params: ImageGenerationParams): ComfyWorkflow {
  if (params.multiLoraConfigs && params.multiLoraConfigs.length > 0) {
    return buildMultiLoraTxt2ImgWorkflow(params);
  }

  if (params.loraConfig) {
    return buildLoraTxt2ImgWorkflow(params);
  }

  return buildBasicTxt2ImgWorkflow(params);
}
