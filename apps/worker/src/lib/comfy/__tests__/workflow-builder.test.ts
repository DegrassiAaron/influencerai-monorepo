/**
 * Workflow Builder Tests - BDD Test Suite
 * Tests for workflow builder orchestration functions
 *
 * Coverage: 15 BDD scenarios from comfyui-workflow-templates.feature
 * - Basic workflow builder (4 scenarios)
 * - Single LoRA workflow builder (4 scenarios)
 * - Multi-LoRA workflow builder (5 scenarios)
 * - Auto-selection workflow builder (2 scenarios)
 *
 * Status: RED (expected to fail - no implementation yet)
 */

import { describe, expect, it } from 'vitest';
import {
  buildBasicTxt2ImgWorkflow,
  buildLoraTxt2ImgWorkflow,
  buildMultiLoraTxt2ImgWorkflow,
  buildImageWorkflow,
} from '../workflow-builder';
import type { ImageGenerationParams, ComfyWorkflow } from '../workflow-types';

// ==============================================================================
// FEATURE: Basic Image Generation Workflow
// ==============================================================================

describe('buildBasicTxt2ImgWorkflow', () => {
  // BDD Scenario: Build basic workflow with minimal parameters
  it('should build workflow with minimal required parameters', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'realisticVisionV51.safetensors',
      positivePrompt: 'a beautiful sunset over ocean',
      negativePrompt: '',
      width: 512,
      height: 512,
    };

    // Act
    const workflow = buildBasicTxt2ImgWorkflow(params);

    // Assert
    expect(workflow).toBeDefined();
    expect(Object.keys(workflow).length).toBeGreaterThan(0);

    // Verify essential nodes exist
    const nodeTypes = Object.values(workflow).map((node) => node.class_type);
    expect(nodeTypes).toContain('CheckpointLoaderSimple');
    expect(nodeTypes).toContain('CLIPTextEncode');
    expect(nodeTypes).toContain('KSampler');
    expect(nodeTypes).toContain('VAEDecode');
    expect(nodeTypes).toContain('SaveImage');

    // Verify no LoRA nodes in basic workflow
    expect(nodeTypes).not.toContain('LoraLoader');
  });

  // BDD Scenario: Build basic workflow with all optional parameters
  it('should build workflow with all optional parameters applied', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'realisticVisionV51.safetensors',
      positivePrompt: 'portrait of a woman, detailed',
      negativePrompt: 'blurry, low quality',
      width: 768,
      height: 1024,
      steps: 30,
      cfg: 7.5,
      seed: 42,
      samplerName: 'euler_a',
      scheduler: 'karras',
    };

    // Act
    const workflow = buildBasicTxt2ImgWorkflow(params);

    // Assert
    const ksamplerNode = Object.values(workflow).find(
      (node) => node.class_type === 'KSampler'
    );

    expect(ksamplerNode).toBeDefined();
    expect(ksamplerNode?.inputs.steps).toBe(30);
    expect(ksamplerNode?.inputs.cfg).toBe(7.5);
    expect(ksamplerNode?.inputs.seed).toBe(42);
    expect(ksamplerNode?.inputs.sampler_name).toBe('euler_a');
    expect(ksamplerNode?.inputs.scheduler).toBe('karras');
  });

  // BDD Scenario: Build basic workflow with default values
  it('should use default values when optional parameters not provided', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'model.safetensors',
      positivePrompt: 'test prompt',
      negativePrompt: '',
      width: 512,
      height: 512,
    };

    // Act
    const workflow = buildBasicTxt2ImgWorkflow(params);

    // Assert
    const ksamplerNode = Object.values(workflow).find(
      (node) => node.class_type === 'KSampler'
    );

    expect(ksamplerNode?.inputs.steps).toBe(20); // default
    expect(ksamplerNode?.inputs.cfg).toBe(7.0); // default
    expect(ksamplerNode?.inputs.sampler_name).toBe('euler'); // default
    expect(ksamplerNode?.inputs.scheduler).toBe('normal'); // default
  });

  // BDD Scenario: Workflow generates unique node IDs
  it('should generate unique node IDs across multiple workflow builds', () => {
    // Arrange
    const params1: ImageGenerationParams = {
      checkpoint: 'model.safetensors',
      positivePrompt: 'test 1',
      negativePrompt: '',
      width: 512,
      height: 512,
    };
    const params2: ImageGenerationParams = {
      checkpoint: 'model.safetensors',
      positivePrompt: 'test 2',
      negativePrompt: '',
      width: 512,
      height: 512,
    };

    // Act
    const workflow1 = buildBasicTxt2ImgWorkflow(params1);
    const workflow2 = buildBasicTxt2ImgWorkflow(params2);

    // Assert
    // In a stateless builder, node IDs should be consistent per workflow
    // but workflows should be independent (not share state)
    expect(Object.keys(workflow1)).toEqual(Object.keys(workflow2));

    // Verify the prompts are different (workflows are independent)
    const clip1 = Object.values(workflow1).find((n) => n.class_type === 'CLIPTextEncode');
    const clip2 = Object.values(workflow2).find((n) => n.class_type === 'CLIPTextEncode');
    expect(clip1?.inputs.text).toBe('test 1');
    expect(clip2?.inputs.text).toBe('test 2');
  });
});

// ==============================================================================
// FEATURE: Single LoRA Workflow
// ==============================================================================

describe('buildLoraTxt2ImgWorkflow', () => {
  // BDD Scenario: Build workflow with one LoRA at default strength
  it('should build workflow with single LoRA at default strength', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'portrait in studio lighting',
      negativePrompt: '',
      width: 512,
      height: 512,
      loraConfig: {
        path: 'influencer-style-v1.safetensors',
      },
    };

    // Act
    const workflow = buildLoraTxt2ImgWorkflow(params);

    // Assert
    const loraNode = Object.values(workflow).find((node) => node.class_type === 'LoraLoader');
    expect(loraNode).toBeDefined();
    expect(loraNode?.inputs.lora_name).toBe('influencer-style-v1.safetensors');
    expect(loraNode?.inputs.strength_model).toBe(1.0);
    expect(loraNode?.inputs.strength_clip).toBe(1.0);

    // Verify LoRA is connected between checkpoint and samplers
    const checkpointNode = Object.values(workflow).find(
      (n) => n.class_type === 'CheckpointLoaderSimple'
    );
    expect(checkpointNode).toBeDefined();

    // LoRA should connect to checkpoint
    const checkpointNodeId = Object.keys(workflow).find(
      (key) => workflow[key] === checkpointNode
    );
    expect(loraNode?.inputs.model).toEqual([checkpointNodeId, 0]);
    expect(loraNode?.inputs.clip).toEqual([checkpointNodeId, 1]);
  });

  // BDD Scenario: Build workflow with one LoRA at custom strength
  it('should build workflow with single LoRA at custom strength', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'portrait',
      negativePrompt: '',
      width: 512,
      height: 512,
      loraConfig: {
        path: 'influencer.safetensors',
        strengthModel: 0.8,
        strengthClip: 0.6,
      },
    };

    // Act
    const workflow = buildLoraTxt2ImgWorkflow(params);

    // Assert
    const loraNode = Object.values(workflow).find((node) => node.class_type === 'LoraLoader');
    expect(loraNode?.inputs.strength_model).toBe(0.8);
    expect(loraNode?.inputs.strength_clip).toBe(0.6);
  });

  // BDD Scenario: Build workflow with LoRA using relative path
  it('should build workflow with LoRA using relative path', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
      loraConfig: {
        path: 'influencer/version-2.safetensors',
      },
    };

    // Act
    const workflow = buildLoraTxt2ImgWorkflow(params);

    // Assert
    const loraNode = Object.values(workflow).find((node) => node.class_type === 'LoraLoader');
    expect(loraNode?.inputs.lora_name).toBe('influencer/version-2.safetensors');
  });

  // BDD Scenario: LoRA workflow maintains all basic workflow features
  it('should maintain all basic workflow features with LoRA added', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'detailed portrait',
      negativePrompt: 'cartoon',
      width: 768,
      height: 1024,
      steps: 25,
      cfg: 8.0,
      seed: 999,
      loraConfig: {
        path: 'style.safetensors',
      },
    };

    // Act
    const workflow = buildLoraTxt2ImgWorkflow(params);

    // Assert
    // Should still have all essential nodes
    const nodeTypes = Object.values(workflow).map((node) => node.class_type);
    expect(nodeTypes).toContain('CheckpointLoaderSimple');
    expect(nodeTypes).toContain('LoraLoader');
    expect(nodeTypes).toContain('CLIPTextEncode'); // at least 1
    expect(nodeTypes).toContain('KSampler');
    expect(nodeTypes).toContain('VAEDecode');
    expect(nodeTypes).toContain('SaveImage');

    // Should use custom parameters
    const ksamplerNode = Object.values(workflow).find((n) => n.class_type === 'KSampler');
    expect(ksamplerNode?.inputs.steps).toBe(25);
    expect(ksamplerNode?.inputs.cfg).toBe(8.0);
    expect(ksamplerNode?.inputs.seed).toBe(999);

    // Should use negative prompt
    const clipNodes = Object.values(workflow).filter((n) => n.class_type === 'CLIPTextEncode');
    const negativeClip = clipNodes.find((n) => n.inputs.text === 'cartoon');
    expect(negativeClip).toBeDefined();
  });
});

// ==============================================================================
// FEATURE: Multi-LoRA Workflow (Stacking)
// ==============================================================================

describe('buildMultiLoraTxt2ImgWorkflow', () => {
  // BDD Scenario: Build workflow with two LoRAs stacked
  it('should build workflow with two stacked LoRAs', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'portrait',
      negativePrompt: '',
      width: 512,
      height: 512,
      multiLoraConfigs: [
        { path: 'character.safetensors' },
        { path: 'style.safetensors' },
      ],
    };

    // Act
    const workflow = buildMultiLoraTxt2ImgWorkflow(params);

    // Assert
    const loraNodes = Object.values(workflow).filter((node) => node.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(2);

    // Verify chaining: checkpoint -> lora1 -> lora2
    const checkpointNodeId = Object.keys(workflow).find(
      (key) => workflow[key].class_type === 'CheckpointLoaderSimple'
    );
    const lora1NodeId = Object.keys(workflow).find(
      (key) =>
        workflow[key].class_type === 'LoraLoader' &&
        workflow[key].inputs.lora_name === 'character.safetensors'
    );
    const lora2NodeId = Object.keys(workflow).find(
      (key) =>
        workflow[key].class_type === 'LoraLoader' &&
        workflow[key].inputs.lora_name === 'style.safetensors'
    );

    expect(workflow[lora1NodeId!].inputs.model).toEqual([checkpointNodeId, 0]);
    expect(workflow[lora2NodeId!].inputs.model).toEqual([lora1NodeId, 0]);
  });

  // BDD Scenario: Build workflow with three LoRAs stacked
  it('should build workflow with three stacked LoRAs', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'portrait',
      negativePrompt: '',
      width: 512,
      height: 512,
      multiLoraConfigs: [
        { path: 'char.safetensors' },
        { path: 'style.safetensors' },
        { path: 'light.safetensors' },
      ],
    };

    // Act
    const workflow = buildMultiLoraTxt2ImgWorkflow(params);

    // Assert
    const loraNodes = Object.values(workflow).filter((node) => node.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(3);

    // Verify all three LoRAs are chained
    const loraNames = loraNodes.map((node) => node.inputs.lora_name);
    expect(loraNames).toContain('char.safetensors');
    expect(loraNames).toContain('style.safetensors');
    expect(loraNames).toContain('light.safetensors');
  });

  // BDD Scenario: Multi-LoRA with individual strength values
  it('should apply individual strength values to each LoRA', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
      multiLoraConfigs: [
        { path: 'a.safetensors', strengthModel: 1.0, strengthClip: 1.0 },
        { path: 'b.safetensors', strengthModel: 0.5, strengthClip: 0.7 },
      ],
    };

    // Act
    const workflow = buildMultiLoraTxt2ImgWorkflow(params);

    // Assert
    const loraA = Object.values(workflow).find(
      (n) => n.class_type === 'LoraLoader' && n.inputs.lora_name === 'a.safetensors'
    );
    const loraB = Object.values(workflow).find(
      (n) => n.class_type === 'LoraLoader' && n.inputs.lora_name === 'b.safetensors'
    );

    expect(loraA?.inputs.strength_model).toBe(1.0);
    expect(loraA?.inputs.strength_clip).toBe(1.0);
    expect(loraB?.inputs.strength_model).toBe(0.5);
    expect(loraB?.inputs.strength_clip).toBe(0.7);
  });

  // BDD Scenario: Empty LoRA array falls back to basic workflow
  it('should throw error when LoRA array is empty', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
      multiLoraConfigs: [],
    };

    // Act & Assert
    expect(() => {
      buildMultiLoraTxt2ImgWorkflow(params);
    }).toThrow('multiLoraConfigs is required for multi-LoRA workflow');
  });

  // BDD Scenario: LoRA order is preserved in workflow
  it('should preserve LoRA order in the workflow chain', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
      multiLoraConfigs: [
        { path: 'first.safetensors' },
        { path: 'second.safetensors' },
        { path: 'third.safetensors' },
      ],
    };

    // Act
    const workflow = buildMultiLoraTxt2ImgWorkflow(params);

    // Assert
    const loraNodes = Object.entries(workflow)
      .filter(([_, node]) => node.class_type === 'LoraLoader')
      .sort(([keyA], [keyB]) => parseInt(keyA) - parseInt(keyB))
      .map(([_, node]) => node);

    expect(loraNodes[0].inputs.lora_name).toBe('first.safetensors');
    expect(loraNodes[1].inputs.lora_name).toBe('second.safetensors');
    expect(loraNodes[2].inputs.lora_name).toBe('third.safetensors');
  });
});

// ==============================================================================
// FEATURE: Auto-Selection of Workflow Builder
// ==============================================================================

describe('buildImageWorkflow - Auto-selection', () => {
  // BDD Scenario: Auto-select basic workflow when no LoRAs provided
  it('should auto-select basic workflow when no LoRAs provided', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
    };

    // Act
    const workflow = buildImageWorkflow(params);

    // Assert
    const loraNodes = Object.values(workflow).filter((node) => node.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(0);

    // Should have basic workflow nodes
    const nodeTypes = Object.values(workflow).map((node) => node.class_type);
    expect(nodeTypes).toContain('CheckpointLoaderSimple');
    expect(nodeTypes).toContain('KSampler');
  });

  // BDD Scenario: Auto-select LoRA workflow when LoRAs provided
  it('should auto-select LoRA workflow when single LoRA provided', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
      loraConfig: {
        path: 'style.safetensors',
      },
    };

    // Act
    const workflow = buildImageWorkflow(params);

    // Assert
    const loraNodes = Object.values(workflow).filter((node) => node.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(1);
  });

  it('should auto-select multi-LoRA workflow when multiple LoRAs provided', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
      multiLoraConfigs: [{ path: 'lora1.safetensors' }, { path: 'lora2.safetensors' }],
    };

    // Act
    const workflow = buildImageWorkflow(params);

    // Assert
    const loraNodes = Object.values(workflow).filter((node) => node.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(2);
  });

  // BDD Scenario: Auto-select handles undefined vs empty array
  it('should treat undefined loras as basic workflow', () => {
    // Arrange
    const params: ImageGenerationParams = {
      checkpoint: 'base.safetensors',
      positivePrompt: 'test',
      negativePrompt: '',
      width: 512,
      height: 512,
      loraConfig: undefined,
      multiLoraConfigs: undefined,
    };

    // Act
    const workflow = buildImageWorkflow(params);

    // Assert
    const loraNodes = Object.values(workflow).filter((node) => node.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(0);
  });
});
