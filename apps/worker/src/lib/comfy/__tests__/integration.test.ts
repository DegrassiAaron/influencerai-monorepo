/**
 * ComfyUI Integration Tests - BDD Test Suite
 * Tests for integration with ComfyUI API and workflow submission
 *
 * Coverage: 12 BDD scenarios from comfyui-workflow-templates.feature
 * - Build workflow from job parameters (4 scenarios)
 * - Submit workflow to ComfyUI API (4 scenarios)
 * - Handle invalid job parameters (4 scenarios)
 *
 * Status: RED (expected to fail - no implementation yet)
 *
 * NOTE: These tests mock ComfyUI API. For real integration tests with
 * running ComfyUI instance, see integration.e2e.test.ts
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildWorkflowFromJobParams,
  submitWorkflowToComfyUI,
  createComfyImageClient,
} from '../integration';
import type { ImageGenerationJobParams } from '../types';

// ==============================================================================
// FEATURE: Build Workflow from Job Parameters
// ==============================================================================

describe('buildWorkflowFromJobParams', () => {
  // BDD Scenario: Build workflow from minimal job parameters
  it('should build valid workflow from minimal job parameters', () => {
    // Arrange
    const minimalParams: ImageGenerationJobParams = {
      prompt: 'portrait of a woman',
      checkpoint: 'realisticVisionV51.safetensors',
    };

    // Act
    const workflow = buildWorkflowFromJobParams(minimalParams);

    // Assert
    expect(workflow).toBeDefined();
    expect(typeof workflow).toBe('object');

    // Should be valid JSON serializable
    expect(() => JSON.stringify(workflow)).not.toThrow();

    // Should contain essential node types
    const nodeTypes = Object.values(workflow).map((node: any) => node.class_type);
    expect(nodeTypes).toContain('CheckpointLoaderSimple');
    expect(nodeTypes).toContain('KSampler');
    expect(nodeTypes).toContain('SaveImage');
  });

  // BDD Scenario: Build workflow from complete job parameters
  it('should build workflow from complete job parameters with all options', () => {
    // Arrange
    const completeParams: ImageGenerationJobParams = {
      prompt: 'detailed portrait, studio lighting',
      negativePrompt: 'blurry, distorted',
      checkpoint: 'realisticVisionV51.safetensors',
      width: 768,
      height: 1024,
      steps: 30,
      cfg: 7.5,
      seed: 12345,
      sampler: 'euler_a',
      scheduler: 'karras',
      loras: [
        {
          path: 'influencer-style.safetensors',
          strengthModel: 0.9,
          strengthClip: 0.8,
        },
      ],
    };

    // Act
    const workflow = buildWorkflowFromJobParams(completeParams);

    // Assert
    expect(workflow).toBeDefined();

    // Verify LoRA node is present
    const loraNodes = Object.values(workflow).filter(
      (node: any) => node.class_type === 'LoraLoader'
    );
    expect(loraNodes).toHaveLength(1);

    // Verify KSampler has correct parameters
    const ksamplerNode = Object.values(workflow).find(
      (node: any) => node.class_type === 'KSampler'
    );
    expect(ksamplerNode).toBeDefined();
    expect((ksamplerNode as any).inputs.steps).toBe(30);
    expect((ksamplerNode as any).inputs.cfg).toBe(7.5);
    expect((ksamplerNode as any).inputs.seed).toBe(12345);
  });

  // BDD Scenario: Build workflow with multiple LoRAs from job params
  it('should build workflow with multiple LoRAs in correct order', () => {
    // Arrange
    const paramsWithMultiLoras: ImageGenerationJobParams = {
      prompt: 'test',
      checkpoint: 'model.safetensors',
      loras: [
        { path: 'lora1.safetensors', strengthModel: 1.0 },
        { path: 'lora2.safetensors', strengthModel: 0.8 },
        { path: 'lora3.safetensors', strengthModel: 0.6 },
      ],
    };

    // Act
    const workflow = buildWorkflowFromJobParams(paramsWithMultiLoras);

    // Assert
    const loraNodes = Object.values(workflow).filter(
      (node: any) => node.class_type === 'LoraLoader'
    );
    expect(loraNodes).toHaveLength(3);

    // Verify LoRAs are in correct order
    const sortedLoras = Object.entries(workflow)
      .filter(([_, node]: any) => node.class_type === 'LoraLoader')
      .sort(([keyA], [keyB]) => parseInt(keyA) - parseInt(keyB))
      .map(([_, node]) => node);

    expect((sortedLoras[0] as any).inputs.lora_name).toBe('lora1.safetensors');
    expect((sortedLoras[1] as any).inputs.lora_name).toBe('lora2.safetensors');
    expect((sortedLoras[2] as any).inputs.lora_name).toBe('lora3.safetensors');
  });

  // BDD Scenario: Handle missing optional parameters with defaults
  it('should apply default values for missing optional parameters', () => {
    // Arrange
    const paramsWithDefaults: ImageGenerationJobParams = {
      prompt: 'test prompt',
      checkpoint: 'model.safetensors',
      // All optional params omitted
    };

    // Act
    const workflow = buildWorkflowFromJobParams(paramsWithDefaults);

    // Assert
    const ksamplerNode = Object.values(workflow).find(
      (node: any) => node.class_type === 'KSampler'
    );

    expect((ksamplerNode as any).inputs.steps).toBe(20); // default
    expect((ksamplerNode as any).inputs.cfg).toBe(7.0); // default
    expect((ksamplerNode as any).inputs.sampler_name).toBe('euler'); // default
    expect((ksamplerNode as any).inputs.scheduler).toBe('normal'); // default
    expect((ksamplerNode as any).inputs.seed).toBeGreaterThan(0); // random seed
  });
});

// ==============================================================================
// FEATURE: Submit Workflow to ComfyUI API
// ==============================================================================

describe('submitWorkflowToComfyUI', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  // BDD Scenario: Successfully submit workflow to ComfyUI
  it('should successfully submit workflow and return prompt_id', async () => {
    // Arrange
    const workflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ prompt_id: 'job-123' }),
    });

    // Act
    const result = await submitWorkflowToComfyUI(workflow, {
      baseUrl: 'http://localhost:8188',
      clientId: 'test-client',
      fetch: mockFetch,
    });

    // Assert
    expect(result.promptId).toBe('job-123');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8188/prompt',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  // BDD Scenario: Submit workflow and poll for completion
  it('should poll for completion and return output paths', async () => {
    // Arrange
    const workflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '9': {
        class_type: 'SaveImage',
        inputs: { filename_prefix: 'ComfyUI', images: ['8', 0] },
      },
    };

    // Mock /prompt response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ prompt_id: 'job-123' }),
    });

    // Mock /history response (first call - running)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'job-123': {
          status: { status_str: 'running' },
        },
      }),
    });

    // Mock /history response (second call - completed)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'job-123': {
          status: { status_str: 'success', completed: true },
          outputs: {
            '9': {
              images: [
                {
                  filename: 'ComfyUI_00001.png',
                  subfolder: '',
                  type: 'output',
                },
              ],
            },
          },
        },
      }),
    });

    // Act
    const client = createComfyImageClient({
      baseUrl: 'http://localhost:8188',
      clientId: 'test-client',
      fetch: mockFetch,
      pollIntervalMs: 10,
      maxPollAttempts: 5,
    });

    const result = await client.submitAndWait(workflow);

    // Assert
    expect(result.promptId).toBe('job-123');
    expect(result.status).toBe('success');
    expect(result.outputs).toBeDefined();
    expect(result.outputs['9']).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(3); // /prompt + 2x /history
  });

  // BDD Scenario: Handle ComfyUI API errors on submission
  it('should throw error when ComfyUI returns 400 Bad Request', async () => {
    // Arrange
    const invalidWorkflow = {}; // Invalid empty workflow

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'Invalid workflow structure',
    });

    // Act & Assert
    await expect(
      submitWorkflowToComfyUI(invalidWorkflow, {
        baseUrl: 'http://localhost:8188',
        clientId: 'test-client',
        fetch: mockFetch,
      })
    ).rejects.toThrow('ComfyUI API error: 400');
  });

  // BDD Scenario: Handle ComfyUI unavailable
  it('should throw error when ComfyUI is not reachable', async () => {
    // Arrange
    const workflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
    };

    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    // Act & Assert
    await expect(
      submitWorkflowToComfyUI(workflow, {
        baseUrl: 'http://localhost:9999',
        clientId: 'test-client',
        fetch: mockFetch,
      })
    ).rejects.toThrow('ComfyUI unreachable at http://localhost:9999');
  });

  // BDD Scenario: Retry submission on transient errors
  it('should retry submission on 503 Service Unavailable', async () => {
    // Arrange
    const workflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
    };

    // First request fails with 503
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    // Second request succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ prompt_id: 'job-456' }),
    });

    // Act
    const result = await submitWorkflowToComfyUI(workflow, {
      baseUrl: 'http://localhost:8188',
      clientId: 'test-client',
      fetch: mockFetch,
      retries: 3,
      retryDelayMs: 10,
    });

    // Assert
    expect(result.promptId).toBe('job-456');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ==============================================================================
// FEATURE: Handle Invalid Job Parameters
// ==============================================================================

describe('buildWorkflowFromJobParams - Validation', () => {
  // BDD Scenario: Reject job with missing required parameter (prompt)
  it('should throw error when prompt is missing', () => {
    // Arrange
    const paramsWithoutPrompt = {
      checkpoint: 'model.safetensors',
    } as any;

    // Act & Assert
    expect(() => {
      buildWorkflowFromJobParams(paramsWithoutPrompt);
    }).toThrow('Missing required parameter: prompt');
  });

  // BDD Scenario: Reject job with missing required parameter (checkpoint)
  it('should throw error when checkpoint is missing', () => {
    // Arrange
    const paramsWithoutCheckpoint = {
      prompt: 'test',
    } as any;

    // Act & Assert
    expect(() => {
      buildWorkflowFromJobParams(paramsWithoutCheckpoint);
    }).toThrow('Missing required parameter: checkpoint');
  });

  // BDD Scenario: Reject job with invalid parameter types
  it('should throw error when steps is not a number', () => {
    // Arrange
    const paramsWithInvalidType = {
      prompt: 'test',
      checkpoint: 'model.safetensors',
      steps: 'twenty', // Should be number
    } as any;

    // Act & Assert
    expect(() => {
      buildWorkflowFromJobParams(paramsWithInvalidType);
    }).toThrow('steps must be a number');
  });

  // BDD Scenario: Reject job with out-of-range values
  it('should throw error when cfg exceeds valid range', () => {
    // Arrange
    const paramsWithInvalidCfg = {
      prompt: 'test',
      checkpoint: 'model.safetensors',
      cfg: 50, // Exceeds max (30)
    };

    // Act & Assert
    expect(() => {
      buildWorkflowFromJobParams(paramsWithInvalidCfg);
    }).toThrow('cfg must be between 1 and 30');
  });

  // BDD Scenario: Reject job with invalid LoRA structure
  it('should throw error when LoRA config is missing path', () => {
    // Arrange
    const paramsWithInvalidLora = {
      prompt: 'test',
      checkpoint: 'model.safetensors',
      loras: [
        {
          strengthModel: 0.8, // Missing path
        },
      ],
    } as any;

    // Act & Assert
    expect(() => {
      buildWorkflowFromJobParams(paramsWithInvalidLora);
    }).toThrow('loras[0].path is required');
  });
});

// ==============================================================================
// FEATURE: Workflow Serialization for API Submission
// ==============================================================================

describe('Workflow Serialization', () => {
  // BDD Scenario: Serialize basic workflow to ComfyUI JSON format
  it('should serialize workflow to valid JSON matching ComfyUI format', () => {
    // Arrange
    const params: ImageGenerationJobParams = {
      prompt: 'test',
      checkpoint: 'model.safetensors',
    };

    // Act
    const workflow = buildWorkflowFromJobParams(params);
    const jsonString = JSON.stringify(workflow);
    const parsed = JSON.parse(jsonString);

    // Assert
    expect(typeof jsonString).toBe('string');
    expect(parsed).toEqual(workflow);

    // Verify structure matches ComfyUI format
    Object.entries(parsed).forEach(([nodeId, node]: [string, any]) => {
      expect(typeof nodeId).toBe('string');
      expect(node).toHaveProperty('class_type');
      expect(node).toHaveProperty('inputs');
      expect(typeof node.class_type).toBe('string');
      expect(typeof node.inputs).toBe('object');
    });
  });

  // BDD Scenario: Serialize multi-LoRA workflow maintains order
  it('should maintain LoRA order in serialized JSON', () => {
    // Arrange
    const params: ImageGenerationJobParams = {
      prompt: 'test',
      checkpoint: 'model.safetensors',
      loras: [
        { path: 'lora1.safetensors' },
        { path: 'lora2.safetensors' },
        { path: 'lora3.safetensors' },
      ],
    };

    // Act
    const workflow = buildWorkflowFromJobParams(params);
    const serialized = JSON.stringify(workflow);
    const deserialized = JSON.parse(serialized);

    // Assert
    const loraNodes = Object.entries(deserialized)
      .filter(([_, node]: any) => node.class_type === 'LoraLoader')
      .sort(([keyA], [keyB]) => parseInt(keyA) - parseInt(keyB))
      .map(([_, node]) => node);

    expect(loraNodes[0].inputs.lora_name).toBe('lora1.safetensors');
    expect(loraNodes[1].inputs.lora_name).toBe('lora2.safetensors');
    expect(loraNodes[2].inputs.lora_name).toBe('lora3.safetensors');
  });

  // BDD Scenario: Serialized workflow is idempotent
  it('should produce identical JSON on repeated serialization', () => {
    // Arrange
    const params: ImageGenerationJobParams = {
      prompt: 'test',
      checkpoint: 'model.safetensors',
    };

    // Act
    const workflow = buildWorkflowFromJobParams(params);
    const serialized1 = JSON.stringify(workflow);
    const serialized2 = JSON.stringify(workflow);

    // Assert
    expect(serialized1).toBe(serialized2);
  });
});
