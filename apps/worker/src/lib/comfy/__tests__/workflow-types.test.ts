/**
 * Workflow Types Tests - BDD Test Suite
 * Tests for Zod schemas and TypeScript type definitions
 *
 * Coverage: 10 BDD scenarios from comfyui-workflow-templates.feature
 * - NodeConnection type validation (2 scenarios)
 * - ComfyNode schema validation (3 scenarios)
 * - ImageGenerationParams schema validation (3 scenarios)
 * - LoraConfig schema validation (2 scenarios)
 *
 * Status: RED (expected to fail - no implementation yet)
 */

import { describe, expect, it } from 'vitest';
import {
  NodeConnectionSchema,
  NodeInputSchema,
  ComfyNodeSchema,
  ComfyWorkflowSchema,
  LoraConfigSchema,
  ImageGenerationParamsSchema,
} from '../workflow-types';
import type {
  NodeConnection,
  NodeInput,
  ComfyNode,
  ComfyWorkflow,
  LoraConfig,
  ImageGenerationParams,
} from '../workflow-types';

// ==============================================================================
// FEATURE: NodeConnection Schema Validation
// ==============================================================================

describe('NodeConnectionSchema', () => {
  it('should validate valid node connection tuple', () => {
    // Arrange
    const validConnection: NodeConnection = ['1', 0];

    // Act
    const result = NodeConnectionSchema.safeParse(validConnection);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(['1', 0]);
    }
  });

  it('should reject invalid connection format', () => {
    // Arrange
    const invalidConnection = ['1']; // Missing output index

    // Act
    const result = NodeConnectionSchema.safeParse(invalidConnection);

    // Assert
    expect(result.success).toBe(false);
  });

  it('should reject non-string node ID', () => {
    // Arrange
    const invalidConnection = [1, 0]; // Node ID should be string

    // Act
    const result = NodeConnectionSchema.safeParse(invalidConnection);

    // Assert
    expect(result.success).toBe(false);
  });
});

// ==============================================================================
// FEATURE: NodeInput Schema Validation
// ==============================================================================

describe('NodeInputSchema', () => {
  it('should validate string input', () => {
    // Arrange
    const stringInput: NodeInput = 'test value';

    // Act
    const result = NodeInputSchema.safeParse(stringInput);

    // Assert
    expect(result.success).toBe(true);
  });

  it('should validate number input', () => {
    // Arrange
    const numberInput: NodeInput = 42;

    // Act
    const result = NodeInputSchema.safeParse(numberInput);

    // Assert
    expect(result.success).toBe(true);
  });

  it('should validate boolean input', () => {
    // Arrange
    const booleanInput: NodeInput = true;

    // Act
    const result = NodeInputSchema.safeParse(booleanInput);

    // Assert
    expect(result.success).toBe(true);
  });

  it('should validate connection tuple input', () => {
    // Arrange
    const connectionInput: NodeInput = ['1', 0];

    // Act
    const result = NodeInputSchema.safeParse(connectionInput);

    // Assert
    expect(result.success).toBe(true);
  });
});

// ==============================================================================
// FEATURE: ComfyNode Schema Validation
// ==============================================================================

describe('ComfyNodeSchema', () => {
  it('should validate valid ComfyNode structure', () => {
    // Arrange
    const validNode: ComfyNode = {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: 'model.safetensors',
      },
    };

    // Act
    const result = ComfyNodeSchema.safeParse(validNode);

    // Assert
    expect(result.success).toBe(true);
  });

  it('should reject node without class_type', () => {
    // Arrange
    const invalidNode = {
      inputs: { ckpt_name: 'model.safetensors' },
    };

    // Act
    const result = ComfyNodeSchema.safeParse(invalidNode);

    // Assert
    expect(result.success).toBe(false);
  });

  it('should reject node without inputs', () => {
    // Arrange
    const invalidNode = {
      class_type: 'CheckpointLoaderSimple',
    };

    // Act
    const result = ComfyNodeSchema.safeParse(invalidNode);

    // Assert
    expect(result.success).toBe(false);
  });

  it('should validate node with optional _meta field', () => {
    // Arrange
    const nodeWithMeta: ComfyNode = {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: 'model.safetensors' },
      _meta: { title: 'Base Model Loader' },
    };

    // Act
    const result = ComfyNodeSchema.safeParse(nodeWithMeta);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data._meta?.title).toBe('Base Model Loader');
    }
  });
});

// ==============================================================================
// FEATURE: ComfyWorkflow Schema Validation
// ==============================================================================

describe('ComfyWorkflowSchema', () => {
  it('should validate workflow with multiple nodes', () => {
    // Arrange
    const validWorkflow: ComfyWorkflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: { text: 'test', clip: ['1', 1] },
      },
    };

    // Act
    const result = ComfyWorkflowSchema.safeParse(validWorkflow);

    // Assert
    expect(result.success).toBe(true);
  });

  it('should reject workflow with invalid node', () => {
    // Arrange
    const invalidWorkflow = {
      '1': {
        inputs: { ckpt_name: 'model.safetensors' }, // Missing class_type
      },
    };

    // Act
    const result = ComfyWorkflowSchema.safeParse(invalidWorkflow);

    // Assert
    expect(result.success).toBe(false);
  });
});

// ==============================================================================
// FEATURE: LoraConfig Schema Validation
// ==============================================================================

describe('LoraConfigSchema', () => {
  it('should validate LoRA config with only path', () => {
    // Arrange
    const config: LoraConfig = {
      path: 'influencer-v1.safetensors',
    };

    // Act
    const result = LoraConfigSchema.safeParse(config);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.strengthModel).toBe(1.0); // default
      expect(result.data.strengthClip).toBe(1.0); // default
    }
  });

  it('should validate LoRA config with custom strengths', () => {
    // Arrange
    const config: LoraConfig = {
      path: 'style.safetensors',
      strengthModel: 0.8,
      strengthClip: 0.6,
    };

    // Act
    const result = LoraConfigSchema.safeParse(config);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.strengthModel).toBe(0.8);
      expect(result.data.strengthClip).toBe(0.6);
    }
  });

  it('should reject empty path', () => {
    // Arrange
    const configWithEmptyPath = {
      path: '',
    };

    // Act
    const result = LoraConfigSchema.safeParse(configWithEmptyPath);

    // Assert
    expect(result.success).toBe(false);
  });

  it('should reject strength values outside valid range', () => {
    // Arrange
    const configWithInvalidStrength = {
      path: 'lora.safetensors',
      strengthModel: 101, // exceeds max (100)
    };

    // Act
    const result = LoraConfigSchema.safeParse(configWithInvalidStrength);

    // Assert
    expect(result.success).toBe(false);
  });
});

// ==============================================================================
// FEATURE: ImageGenerationParams Schema Validation
// ==============================================================================

describe('ImageGenerationParamsSchema', () => {
  it('should validate minimal required parameters', () => {
    // Arrange
    const minimalParams: ImageGenerationParams = {
      checkpoint: 'model.safetensors',
      positivePrompt: 'test prompt',
      negativePrompt: '',
      width: 512,
      height: 512,
    };

    // Act
    const result = ImageGenerationParamsSchema.safeParse(minimalParams);

    // Assert
    expect(result.success).toBe(true);
  });

  it('should validate complete parameters with all options', () => {
    // Arrange
    const completeParams: ImageGenerationParams = {
      checkpoint: 'realisticVisionV51.safetensors',
      positivePrompt: 'detailed portrait',
      negativePrompt: 'blurry, low quality',
      width: 768,
      height: 1024,
      seed: 42,
      steps: 30,
      cfg: 7.5,
      samplerName: 'euler_a',
      scheduler: 'karras',
      loraConfig: {
        path: 'influencer.safetensors',
        strengthModel: 0.9,
        strengthClip: 0.8,
      },
    };

    // Act
    const result = ImageGenerationParamsSchema.safeParse(completeParams);

    // Assert
    expect(result.success).toBe(true);
  });

  it('should reject parameters with missing checkpoint', () => {
    // Arrange
    const paramsWithoutCheckpoint = {
      positivePrompt: 'test',
      width: 512,
      height: 512,
    };

    // Act
    const result = ImageGenerationParamsSchema.safeParse(paramsWithoutCheckpoint);

    // Assert
    expect(result.success).toBe(false);
  });

  it('should reject parameters with missing positive prompt', () => {
    // Arrange
    const paramsWithoutPrompt = {
      checkpoint: 'model.safetensors',
      width: 512,
      height: 512,
    };

    // Act
    const result = ImageGenerationParamsSchema.safeParse(paramsWithoutPrompt);

    // Assert
    expect(result.success).toBe(false);
  });

  it('should reject width not multiple of 8', () => {
    // Arrange
    const paramsWithInvalidWidth = {
      checkpoint: 'model.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 513, // not multiple of 8
      height: 512,
    };

    // Act
    const result = ImageGenerationParamsSchema.safeParse(paramsWithInvalidWidth);

    // Assert
    expect(result.success).toBe(false);
  });

  it('should reject height not multiple of 8', () => {
    // Arrange
    const paramsWithInvalidHeight = {
      checkpoint: 'model.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 517, // not multiple of 8
    };

    // Act
    const result = ImageGenerationParamsSchema.safeParse(paramsWithInvalidHeight);

    // Assert
    expect(result.success).toBe(false);
  });

  it('should apply default values for optional parameters', () => {
    // Arrange
    const paramsWithDefaults = {
      checkpoint: 'model.safetensors',
      positivePrompt: 'test',
      width: 512,
      height: 512,
    };

    // Act
    const result = ImageGenerationParamsSchema.safeParse(paramsWithDefaults);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.negativePrompt).toBe('');
      expect(result.data.steps).toBe(20);
      expect(result.data.cfg).toBe(7.0);
      expect(result.data.samplerName).toBe('euler');
      expect(result.data.scheduler).toBe('normal');
    }
  });

  it('should validate multi-LoRA configuration', () => {
    // Arrange
    const paramsWithMultiLora: ImageGenerationParams = {
      checkpoint: 'model.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
      multiLoraConfigs: [
        { path: 'lora1.safetensors', strengthModel: 1.0 },
        { path: 'lora2.safetensors', strengthModel: 0.8 },
      ],
    };

    // Act
    const result = ImageGenerationParamsSchema.safeParse(paramsWithMultiLora);

    // Assert
    expect(result.success).toBe(true);
  });

  it('should reject more than 5 LoRAs in multiLoraConfigs', () => {
    // Arrange
    const paramsWithTooManyLoras = {
      checkpoint: 'model.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
      multiLoraConfigs: [
        { path: 'lora1.safetensors' },
        { path: 'lora2.safetensors' },
        { path: 'lora3.safetensors' },
        { path: 'lora4.safetensors' },
        { path: 'lora5.safetensors' },
        { path: 'lora6.safetensors' }, // exceeds limit
      ],
    };

    // Act
    const result = ImageGenerationParamsSchema.safeParse(paramsWithTooManyLoras);

    // Assert
    expect(result.success).toBe(false);
  });
});

// ==============================================================================
// FEATURE: Type Guards and Type Inference
// ==============================================================================

describe('Type Guards', () => {
  it('should infer TypeScript type from Zod schema', () => {
    // Arrange
    const params = {
      checkpoint: 'model.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
    };

    // Act
    const result = ImageGenerationParamsSchema.safeParse(params);

    // Assert
    if (result.success) {
      // Type inference check - TypeScript should know the type
      const typedData: ImageGenerationParams = result.data;
      expect(typedData.checkpoint).toBe('model.safetensors');
    }
  });
});
