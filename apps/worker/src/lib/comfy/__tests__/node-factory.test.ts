/**
 * Node Factory Tests - BDD Test Suite
 * Tests for individual ComfyUI node creation functions
 *
 * Coverage: 24 BDD scenarios from comfyui-workflow-templates.feature
 * - CheckpointLoaderSimple node creation (3 scenarios)
 * - LoraLoader node creation (4 scenarios)
 * - CLIPTextEncode node creation (3 scenarios)
 * - KSampler node creation (8 scenarios)
 * - VAEDecode node creation (2 scenarios)
 * - SaveImage node creation (3 scenarios)
 * - Type safety enforcement (1 scenario)
 *
 * Status: RED (expected to fail - no implementation yet)
 */

import { describe, expect, it } from 'vitest';
import {
  createCheckpointLoaderNode,
  createLoraLoaderNode,
  createClipTextEncodeNode,
  createEmptyLatentImageNode,
  createKSamplerNode,
  createVaeDecodeNode,
  createSaveImageNode,
  generateSeed,
} from '../node-factory';
import type { ComfyNode, NodeConnection } from '../workflow-types';

// ==============================================================================
// FEATURE: Node Factory - CheckpointLoaderSimple
// ==============================================================================

describe('createCheckpointLoaderNode', () => {
  // BDD Scenario: Create CheckpointLoaderSimple with valid checkpoint
  it('should create CheckpointLoaderSimple with valid checkpoint name', () => {
    // Arrange
    const nodeId = '1';
    const checkpointName = 'realisticVisionV51.safetensors';

    // Act
    const node = createCheckpointLoaderNode({
      nodeId,
      checkpointName,
    });

    // Assert
    expect(node).toBeDefined();
    expect(node.class_type).toBe('CheckpointLoaderSimple');
    expect(node.inputs).toHaveProperty('ckpt_name');
    expect(node.inputs.ckpt_name).toBe('realisticVisionV51.safetensors');
  });

  // BDD Scenario: CheckpointLoader outputs are correctly defined
  it('should define correct output types for CheckpointLoader', () => {
    // Arrange
    const node = createCheckpointLoaderNode({
      nodeId: '1',
      checkpointName: 'model.safetensors',
    });

    // Act & Assert
    // Output slot 0 should be MODEL
    // Output slot 1 should be CLIP
    // Output slot 2 should be VAE
    // Note: This is implicit in ComfyUI - we verify by checking connections work
    expect(node.class_type).toBe('CheckpointLoaderSimple');
  });

  // BDD Scenario: Reject empty checkpoint name
  it('should throw error when checkpoint name is empty', () => {
    // Arrange
    const nodeId = '1';
    const emptyCheckpointName = '';

    // Act & Assert
    expect(() => {
      createCheckpointLoaderNode({
        nodeId,
        checkpointName: emptyCheckpointName,
      });
    }).toThrow('Checkpoint name cannot be empty');
  });
});

// ==============================================================================
// FEATURE: Node Factory - LoraLoader
// ==============================================================================

describe('createLoraLoaderNode', () => {
  // BDD Scenario: Create LoraLoader with default strengths
  it('should create LoraLoader with default strength values (1.0)', () => {
    // Arrange
    const nodeId = '2';
    const loraName = 'influencer-v1.safetensors';
    const modelConnection: NodeConnection = ['1', 0];
    const clipConnection: NodeConnection = ['1', 1];

    // Act
    const node = createLoraLoaderNode({
      nodeId,
      loraName,
      strengthModel: 1.0,
      strengthClip: 1.0,
      modelConnection,
      clipConnection,
    });

    // Assert
    expect(node.class_type).toBe('LoraLoader');
    expect(node.inputs.lora_name).toBe('influencer-v1.safetensors');
    expect(node.inputs.strength_model).toBe(1.0);
    expect(node.inputs.strength_clip).toBe(1.0);
    expect(node.inputs.model).toEqual(['1', 0]);
    expect(node.inputs.clip).toEqual(['1', 1]);
  });

  // BDD Scenario: Create LoraLoader with custom strengths
  it('should create LoraLoader with custom strength values', () => {
    // Arrange
    const nodeId = '3';
    const loraName = 'style.safetensors';
    const strengthModel = 0.8;
    const strengthClip = 0.6;
    const modelConnection: NodeConnection = ['2', 0];
    const clipConnection: NodeConnection = ['2', 1];

    // Act
    const node = createLoraLoaderNode({
      nodeId,
      loraName,
      strengthModel,
      strengthClip,
      modelConnection,
      clipConnection,
    });

    // Assert
    expect(node.inputs.strength_model).toBe(0.8);
    expect(node.inputs.strength_clip).toBe(0.6);
  });

  // BDD Scenario: LoraLoader outputs are correctly defined
  it('should define correct output types for LoraLoader', () => {
    // Arrange & Act
    const node = createLoraLoaderNode({
      nodeId: '2',
      loraName: 'test.safetensors',
      strengthModel: 1.0,
      strengthClip: 1.0,
      modelConnection: ['1', 0],
      clipConnection: ['1', 1],
    });

    // Assert
    // Output slot 0 should be MODEL
    // Output slot 1 should be CLIP
    expect(node.class_type).toBe('LoraLoader');
  });

  // BDD Scenario: Reject invalid strength values (negative)
  it('should throw error when strength_model is negative', () => {
    // Arrange
    const invalidStrengthModel = -0.5;

    // Act & Assert
    expect(() => {
      createLoraLoaderNode({
        nodeId: '2',
        loraName: 'lora.safetensors',
        strengthModel: invalidStrengthModel,
        strengthClip: 1.0,
        modelConnection: ['1', 0],
        clipConnection: ['1', 1],
      });
    }).toThrow('strength_model must be between -100 and 100');
  });

  // BDD Scenario: Reject invalid strength values (too high)
  it('should throw error when strength_model exceeds maximum', () => {
    // Arrange
    const invalidStrengthModel = 101;

    // Act & Assert
    expect(() => {
      createLoraLoaderNode({
        nodeId: '2',
        loraName: 'lora.safetensors',
        strengthModel: invalidStrengthModel,
        strengthClip: 1.0,
        modelConnection: ['1', 0],
        clipConnection: ['1', 1],
      });
    }).toThrow('strength_model must be between -100 and 100');
  });
});

// ==============================================================================
// FEATURE: Node Factory - CLIPTextEncode
// ==============================================================================

describe('createClipTextEncodeNode', () => {
  // BDD Scenario: Create positive prompt encoder
  it('should create CLIPTextEncode node with positive prompt', () => {
    // Arrange
    const nodeId = '4';
    const text = 'beautiful sunset, detailed, 8k';
    const clipConnection: NodeConnection = ['1', 1];

    // Act
    const node = createClipTextEncodeNode({
      nodeId,
      text,
      clipConnection,
    });

    // Assert
    expect(node.class_type).toBe('CLIPTextEncode');
    expect(node.inputs.text).toBe('beautiful sunset, detailed, 8k');
    expect(node.inputs.clip).toEqual(['1', 1]);
  });

  // BDD Scenario: Create negative prompt encoder
  it('should create CLIPTextEncode node with negative prompt', () => {
    // Arrange
    const nodeId = '5';
    const negativePrompt = 'blurry, low quality, distorted';
    const clipConnection: NodeConnection = ['1', 1];

    // Act
    const node = createClipTextEncodeNode({
      nodeId,
      text: negativePrompt,
      clipConnection,
    });

    // Assert
    expect(node.inputs.text).toBe('blurry, low quality, distorted');
  });

  // BDD Scenario: Allow empty prompt (edge case)
  it('should allow empty prompt string', () => {
    // Arrange
    const nodeId = '4';
    const emptyText = '';
    const clipConnection: NodeConnection = ['1', 1];

    // Act
    const node = createClipTextEncodeNode({
      nodeId,
      text: emptyText,
      clipConnection,
    });

    // Assert
    expect(node.inputs.text).toBe('');
  });
});

// ==============================================================================
// FEATURE: Node Factory - KSampler
// ==============================================================================

describe('createKSamplerNode', () => {
  // BDD Scenario: Create KSampler with all parameters
  it('should create KSampler with all parameters specified', () => {
    // Arrange
    const nodeId = '6';
    const seed = 42;
    const steps = 25;
    const cfg = 7.5;
    const samplerName = 'euler_a';
    const scheduler = 'karras';
    const denoise = 1.0;
    const modelConnection: NodeConnection = ['4', 0];
    const positiveConnection: NodeConnection = ['6', 0];
    const negativeConnection: NodeConnection = ['7', 0];
    const latentConnection: NodeConnection = ['5', 0];

    // Act
    const node = createKSamplerNode({
      nodeId,
      seed,
      steps,
      cfg,
      samplerName,
      scheduler,
      denoise,
      modelConnection,
      positiveConnection,
      negativeConnection,
      latentConnection,
    });

    // Assert
    expect(node.class_type).toBe('KSampler');
    expect(node.inputs.seed).toBe(42);
    expect(node.inputs.steps).toBe(25);
    expect(node.inputs.cfg).toBe(7.5);
    expect(node.inputs.sampler_name).toBe('euler_a');
    expect(node.inputs.scheduler).toBe('karras');
    expect(node.inputs.denoise).toBe(1.0);
  });

  // BDD Scenario: KSampler with default values
  it('should use default values when parameters not provided', () => {
    // Arrange
    const connections = {
      modelConnection: ['4', 0] as NodeConnection,
      positiveConnection: ['6', 0] as NodeConnection,
      negativeConnection: ['7', 0] as NodeConnection,
      latentConnection: ['5', 0] as NodeConnection,
    };

    // Act
    const node = createKSamplerNode({
      nodeId: '6',
      seed: generateSeed(),
      steps: 20, // default
      cfg: 7.0, // default
      samplerName: 'euler', // default
      scheduler: 'normal', // default
      denoise: 1.0, // default
      ...connections,
    });

    // Assert
    expect(node.inputs.steps).toBe(20);
    expect(node.inputs.cfg).toBe(7.0);
    expect(node.inputs.sampler_name).toBe('euler');
    expect(node.inputs.scheduler).toBe('normal');
    expect(node.inputs.denoise).toBe(1.0);
  });

  // BDD Scenario: Validate steps range (minimum)
  it('should throw error when steps is less than 1', () => {
    // Arrange
    const invalidSteps = 0;

    // Act & Assert
    expect(() => {
      createKSamplerNode({
        nodeId: '6',
        seed: 42,
        steps: invalidSteps,
        cfg: 7.0,
        samplerName: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
        modelConnection: ['1', 0],
        positiveConnection: ['2', 0],
        negativeConnection: ['3', 0],
        latentConnection: ['4', 0],
      });
    }).toThrow('steps must be >= 1');
  });

  // BDD Scenario: Validate steps range (maximum)
  it('should throw error when steps exceeds 150', () => {
    // Arrange
    const invalidSteps = 151;

    // Act & Assert
    expect(() => {
      createKSamplerNode({
        nodeId: '6',
        seed: 42,
        steps: invalidSteps,
        cfg: 7.0,
        samplerName: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
        modelConnection: ['1', 0],
        positiveConnection: ['2', 0],
        negativeConnection: ['3', 0],
        latentConnection: ['4', 0],
      });
    }).toThrow('steps must be <= 150');
  });

  // BDD Scenario: Validate CFG scale range (minimum)
  it('should throw error when cfg is negative', () => {
    // Arrange
    const invalidCfg = -1;

    // Act & Assert
    expect(() => {
      createKSamplerNode({
        nodeId: '6',
        seed: 42,
        steps: 20,
        cfg: invalidCfg,
        samplerName: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
        modelConnection: ['1', 0],
        positiveConnection: ['2', 0],
        negativeConnection: ['3', 0],
        latentConnection: ['4', 0],
      });
    }).toThrow('cfg must be >= 1');
  });

  // BDD Scenario: Validate CFG scale range (maximum)
  it('should throw error when cfg exceeds 30', () => {
    // Arrange
    const invalidCfg = 31;

    // Act & Assert
    expect(() => {
      createKSamplerNode({
        nodeId: '6',
        seed: 42,
        steps: 20,
        cfg: invalidCfg,
        samplerName: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
        modelConnection: ['1', 0],
        positiveConnection: ['2', 0],
        negativeConnection: ['3', 0],
        latentConnection: ['4', 0],
      });
    }).toThrow('cfg must be <= 30');
  });

  // BDD Scenario: Validate denoise range
  it('should throw error when denoise exceeds valid range', () => {
    // Arrange
    const invalidDenoise = 1.5;

    // Act & Assert
    expect(() => {
      createKSamplerNode({
        nodeId: '6',
        seed: 42,
        steps: 20,
        cfg: 7.0,
        samplerName: 'euler',
        scheduler: 'normal',
        denoise: invalidDenoise,
        modelConnection: ['1', 0],
        positiveConnection: ['2', 0],
        negativeConnection: ['3', 0],
        latentConnection: ['4', 0],
      });
    }).toThrow('denoise must be between 0 and 1');
  });

  // BDD Scenario: KSampler outputs LATENT
  it('should define correct output type for KSampler', () => {
    // Arrange & Act
    const node = createKSamplerNode({
      nodeId: '3',
      seed: 42,
      steps: 20,
      cfg: 7.0,
      samplerName: 'euler',
      scheduler: 'normal',
      denoise: 1.0,
      modelConnection: ['1', 0],
      positiveConnection: ['2', 0],
      negativeConnection: ['3', 0],
      latentConnection: ['4', 0],
    });

    // Assert
    // Output slot 0 should be LATENT
    expect(node.class_type).toBe('KSampler');
  });
});

// ==============================================================================
// FEATURE: Node Factory - EmptyLatentImage
// ==============================================================================

describe('createEmptyLatentImageNode', () => {
  it('should create EmptyLatentImage with width and height', () => {
    // Arrange
    const nodeId = '5';
    const width = 768;
    const height = 1024;

    // Act
    const node = createEmptyLatentImageNode({
      nodeId,
      width,
      height,
    });

    // Assert
    expect(node.class_type).toBe('EmptyLatentImage');
    expect(node.inputs.width).toBe(768);
    expect(node.inputs.height).toBe(1024);
    expect(node.inputs.batch_size).toBe(1); // default
  });

  it('should allow custom batch size', () => {
    // Arrange
    const batchSize = 4;

    // Act
    const node = createEmptyLatentImageNode({
      nodeId: '5',
      width: 512,
      height: 512,
      batchSize,
    });

    // Assert
    expect(node.inputs.batch_size).toBe(4);
  });
});

// ==============================================================================
// FEATURE: Node Factory - VAEDecode
// ==============================================================================

describe('createVaeDecodeNode', () => {
  // BDD Scenario: Create VAEDecode node
  it('should create VAEDecode with correct connections', () => {
    // Arrange
    const nodeId = '7';
    const samplesConnection: NodeConnection = ['6', 0];
    const vaeConnection: NodeConnection = ['1', 2];

    // Act
    const node = createVaeDecodeNode({
      nodeId,
      samplesConnection,
      vaeConnection,
    });

    // Assert
    expect(node.class_type).toBe('VAEDecode');
    expect(node.inputs.samples).toEqual(['6', 0]);
    expect(node.inputs.vae).toEqual(['1', 2]);
  });

  // BDD Scenario: VAEDecode output is IMAGE
  it('should define correct output type for VAEDecode', () => {
    // Arrange & Act
    const node = createVaeDecodeNode({
      nodeId: '7',
      samplesConnection: ['6', 0],
      vaeConnection: ['1', 2],
    });

    // Assert
    // Output slot 0 should be IMAGE
    expect(node.class_type).toBe('VAEDecode');
  });
});

// ==============================================================================
// FEATURE: Node Factory - SaveImage
// ==============================================================================

describe('createSaveImageNode', () => {
  // BDD Scenario: Create SaveImage with default prefix
  it('should create SaveImage with default filename prefix', () => {
    // Arrange
    const nodeId = '8';
    const imagesConnection: NodeConnection = ['7', 0];

    // Act
    const node = createSaveImageNode({
      nodeId,
      filenamePrefix: 'ComfyUI', // default
      imagesConnection,
    });

    // Assert
    expect(node.class_type).toBe('SaveImage');
    expect(node.inputs.filename_prefix).toBe('ComfyUI');
    expect(node.inputs.images).toEqual(['7', 0]);
  });

  // BDD Scenario: Create SaveImage with custom prefix
  it('should create SaveImage with custom filename prefix', () => {
    // Arrange
    const nodeId = '8';
    const customPrefix = 'influencer-portrait';
    const imagesConnection: NodeConnection = ['7', 0];

    // Act
    const node = createSaveImageNode({
      nodeId,
      filenamePrefix: customPrefix,
      imagesConnection,
    });

    // Assert
    expect(node.inputs.filename_prefix).toBe('influencer-portrait');
  });

  // BDD Scenario: SaveImage has no outputs
  it('should define SaveImage as terminal node with no outputs', () => {
    // Arrange & Act
    const node = createSaveImageNode({
      nodeId: '8',
      filenamePrefix: 'ComfyUI',
      imagesConnection: ['7', 0],
    });

    // Assert
    expect(node.class_type).toBe('SaveImage');
    // SaveImage is a terminal node - no outputs to validate
  });
});

// ==============================================================================
// FEATURE: Helper Functions
// ==============================================================================

describe('generateSeed', () => {
  it('should generate a random positive integer seed', () => {
    // Act
    const seed = generateSeed();

    // Assert
    expect(seed).toBeGreaterThan(0);
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeLessThanOrEqual(2147483647); // Max int32
  });

  it('should generate different seeds on subsequent calls', () => {
    // Act
    const seed1 = generateSeed();
    const seed2 = generateSeed();

    // Assert
    expect(seed1).not.toBe(seed2);
  });
});
