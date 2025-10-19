/**
 * Workflow Validator Tests - BDD Test Suite
 * Tests for workflow structure and connection validation
 *
 * Coverage: 17 BDD scenarios from comfyui-workflow-templates.feature
 * - Workflow structure validation (7 scenarios)
 * - Node connection validation (6 scenarios)
 * - Validation error messages (4 scenarios)
 *
 * Status: RED (expected to fail - no implementation yet)
 */

import { describe, expect, it } from 'vitest';
import {
  validateWorkflow,
  validateConnections,
  validateWorkflowFull,
} from '../workflow-validator';
import type { ComfyWorkflow, ValidationResult } from '../workflow-validator';

// ==============================================================================
// FEATURE: Workflow Structure Validation
// ==============================================================================

describe('validateWorkflow - Structure', () => {
  // BDD Scenario: Validate correct workflow structure
  it('should validate workflow with correct structure', () => {
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
    const result = validateWorkflow(validWorkflow);

    // Assert
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.workflow).toEqual(validWorkflow);
    }
  });

  // BDD Scenario: Detect missing required node fields (class_type)
  it('should detect missing class_type field', () => {
    // Arrange
    const workflowWithoutClassType = {
      '1': {
        inputs: { ckpt_name: 'model.safetensors' },
      },
    } as unknown as ComfyWorkflow;

    // Act
    const result = validateWorkflow(workflowWithoutClassType);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("Node 1: Missing required field 'class_type'");
    }
  });

  // BDD Scenario: Detect missing required node inputs
  it('should detect missing required inputs for CheckpointLoaderSimple', () => {
    // Arrange
    const workflowWithMissingInput: ComfyWorkflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: {}, // Missing ckpt_name
      },
    };

    // Act
    const result = validateWorkflow(workflowWithMissingInput);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain("Node 1 (CheckpointLoaderSimple)");
      expect(result.errors[0]).toContain("Missing required input 'ckpt_name'");
    }
  });

  // BDD Scenario: Detect invalid node class_type
  it('should detect unknown class_type', () => {
    // Arrange
    const workflowWithInvalidClassType: ComfyWorkflow = {
      '1': {
        class_type: 'InvalidNodeType',
        inputs: {},
      },
    };

    // Act
    const result = validateWorkflow(workflowWithInvalidClassType);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain("Node 1: Unknown class_type 'InvalidNodeType'");
    }
  });

  // BDD Scenario: Validate empty workflow
  it('should reject empty workflow', () => {
    // Arrange
    const emptyWorkflow: ComfyWorkflow = {};

    // Act
    const result = validateWorkflow(emptyWorkflow);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toBe('Workflow must contain at least one node');
    }
  });

  // BDD Scenario: Validate workflow with all required node types
  it('should validate complete workflow with all essential nodes', () => {
    // Arrange
    const completeWorkflow: ComfyWorkflow = {
      '4': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '5': {
        class_type: 'EmptyLatentImage',
        inputs: { width: 512, height: 512, batch_size: 1 },
      },
      '6': {
        class_type: 'CLIPTextEncode',
        inputs: { text: 'positive', clip: ['4', 1] },
      },
      '7': {
        class_type: 'CLIPTextEncode',
        inputs: { text: 'negative', clip: ['4', 1] },
      },
      '3': {
        class_type: 'KSampler',
        inputs: {
          seed: 42,
          steps: 20,
          cfg: 7.0,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1.0,
          model: ['4', 0],
          positive: ['6', 0],
          negative: ['7', 0],
          latent_image: ['5', 0],
        },
      },
      '8': {
        class_type: 'VAEDecode',
        inputs: { samples: ['3', 0], vae: ['4', 2] },
      },
      '9': {
        class_type: 'SaveImage',
        inputs: { filename_prefix: 'ComfyUI', images: ['8', 0] },
      },
    };

    // Act
    const result = validateWorkflow(completeWorkflow);

    // Assert
    expect(result.valid).toBe(true);
  });

  // BDD Scenario: Detect missing critical nodes (SaveImage)
  it('should detect missing SaveImage node in workflow', () => {
    // Arrange
    const workflowWithoutSaveImage: ComfyWorkflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '2': {
        class_type: 'KSampler',
        inputs: {
          seed: 42,
          steps: 20,
          cfg: 7.0,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1.0,
          model: ['1', 0],
          positive: ['1', 1],
          negative: ['1', 1],
          latent_image: ['1', 0],
        },
      },
      // Missing SaveImage node
    };

    // Act
    const result = validateWorkflow(workflowWithoutSaveImage);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain('Workflow must contain a SaveImage node');
    }
  });
});

// ==============================================================================
// FEATURE: Workflow Connection Validation
// ==============================================================================

describe('validateConnections', () => {
  // BDD Scenario: Validate correct node references
  it('should validate workflow with correct node references', () => {
    // Arrange
    const workflowWithValidConnections: ComfyWorkflow = {
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
    const result = validateConnections(workflowWithValidConnections);

    // Assert
    expect(result.valid).toBe(true);
  });

  // BDD Scenario: Detect reference to non-existent node
  it('should detect reference to non-existent node', () => {
    // Arrange
    const workflowWithInvalidReference: ComfyWorkflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: { text: 'test', clip: ['99', 1] }, // Node 99 doesn't exist
      },
    };

    // Act
    const result = validateConnections(workflowWithInvalidReference);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain("Node 2");
      expect(result.errors[0]).toContain("references non-existent node '99'");
    }
  });

  // BDD Scenario: Detect invalid output slot reference
  it('should detect invalid output slot reference', () => {
    // Arrange
    const workflowWithInvalidSlot: ComfyWorkflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: { text: 'test', clip: ['1', 999] }, // Invalid output slot
      },
    };

    // Act
    const result = validateConnections(workflowWithInvalidSlot);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain("Node 2");
      expect(result.errors[0]).toContain("Invalid output slot reference '999' for node '1'");
    }
  });

  // BDD Scenario: Validate connection type compatibility
  it('should detect type mismatch in connections', () => {
    // Arrange
    const workflowWithTypeMismatch: ComfyWorkflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: 'test',
          clip: ['1', 0], // Connecting MODEL (slot 0) to CLIP input
        },
      },
    };

    // Act
    const result = validateConnections(workflowWithTypeMismatch);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain('Type mismatch');
      expect(result.errors[0]).toContain('Cannot connect MODEL to CLIP input');
    }
  });

  // BDD Scenario: Detect circular dependencies
  it('should detect circular dependency in workflow', () => {
    // Arrange
    const workflowWithCircularDep: ComfyWorkflow = {
      '1': {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: 'lora.safetensors',
          strength_model: 1.0,
          strength_clip: 1.0,
          model: ['3', 0], // References node 3
          clip: ['3', 1],
        },
      },
      '2': {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: 'lora2.safetensors',
          strength_model: 1.0,
          strength_clip: 1.0,
          model: ['1', 0], // References node 1
          clip: ['1', 1],
        },
      },
      '3': {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: 'lora3.safetensors',
          strength_model: 1.0,
          strength_clip: 1.0,
          model: ['2', 0], // References node 2, creating cycle 1->2->3->1
          clip: ['2', 1],
        },
      },
    };

    // Act
    const result = validateConnections(workflowWithCircularDep);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain('Circular dependency detected');
    }
  });

  // BDD Scenario: Validate all connections in multi-LoRA workflow
  it('should validate all connections in multi-LoRA chain', () => {
    // Arrange
    const multiLoraWorkflow: ComfyWorkflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '10': {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: 'lora1.safetensors',
          strength_model: 1.0,
          strength_clip: 1.0,
          model: ['1', 0],
          clip: ['1', 1],
        },
      },
      '11': {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: 'lora2.safetensors',
          strength_model: 0.8,
          strength_clip: 0.8,
          model: ['10', 0], // Connects to previous LoRA
          clip: ['10', 1],
        },
      },
      '12': {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: 'lora3.safetensors',
          strength_model: 0.7,
          strength_clip: 0.7,
          model: ['11', 0], // Connects to previous LoRA
          clip: ['11', 1],
        },
      },
    };

    // Act
    const result = validateConnections(multiLoraWorkflow);

    // Assert
    expect(result.valid).toBe(true);
  });
});

// ==============================================================================
// FEATURE: Workflow Validation Error Messages
// ==============================================================================

describe('validateWorkflow - Error Messages', () => {
  // BDD Scenario: Error message includes node ID and field name
  it('should include node ID and field name in error message', () => {
    // Arrange
    const workflow: ComfyWorkflow = {
      '5': {
        class_type: 'CheckpointLoaderSimple',
        inputs: {}, // Missing ckpt_name
      },
    };

    // Act
    const result = validateWorkflow(workflow);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain('Node 5');
      expect(result.errors[0]).toContain("Missing required input 'ckpt_name'");
    }
  });

  // BDD Scenario: Error message includes expected vs actual values
  it('should show expected vs actual values in error', () => {
    // Arrange
    const workflow: ComfyWorkflow = {
      '3': {
        class_type: 'KSampler',
        inputs: {
          seed: 42,
          steps: -5, // Invalid - must be >= 1
          cfg: 7.0,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1.0,
          model: ['1', 0],
          positive: ['2', 0],
          negative: ['3', 0],
          latent_image: ['4', 0],
        },
      },
    };

    // Act
    const result = validateWorkflow(workflow);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain('Node 3 (KSampler)');
      expect(result.errors[0]).toContain("Field 'steps' must be >= 1, got -5");
    }
  });

  // BDD Scenario: Multiple validation errors are accumulated
  it('should accumulate multiple validation errors', () => {
    // Arrange
    const workflowWithMultipleErrors = {
      '1': {
        // Missing class_type
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: { text: 'test', clip: ['99', 1] }, // Invalid reference
      },
      '3': {
        class_type: 'CheckpointLoaderSimple',
        inputs: {}, // Missing required input
      },
    } as unknown as ComfyWorkflow;

    // Act
    const result = validateWorkflow(workflowWithMultipleErrors);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      expect(result.errors.some((e) => e.includes('Missing required field'))).toBe(true);
      expect(result.errors.some((e) => e.includes('References non-existent node'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Missing required input'))).toBe(true);
    }
  });

  // BDD Scenario: Validation error includes path to nested field
  it('should include path to nested field in error message', () => {
    // Arrange
    const workflowWithNestedError: ComfyWorkflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: { text: 'test', clip: ['99', 1] },
      },
    };

    // Act
    const result = validateConnections(workflowWithNestedError);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain('Node 2');
      expect(result.errors[0]).toContain('inputs.clip');
      expect(result.errors[0]).toContain("references non-existent node '99'");
    }
  });
});

// ==============================================================================
// FEATURE: Comprehensive Workflow Validation
// ==============================================================================

describe('validateWorkflowFull', () => {
  // BDD Scenario: Full validation runs all checks
  it('should run both structure and connection validation', () => {
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
      '9': {
        class_type: 'SaveImage',
        inputs: { filename_prefix: 'ComfyUI', images: ['2', 0] },
      },
    };

    // Act
    const result = validateWorkflowFull(validWorkflow);

    // Assert
    expect(result.valid).toBe(true);
  });

  it('should fail on first validation stage if structure invalid', () => {
    // Arrange
    const invalidStructure = {
      '1': {
        inputs: { ckpt_name: 'model.safetensors' }, // Missing class_type
      },
    } as unknown as ComfyWorkflow;

    // Act
    const result = validateWorkflowFull(invalidStructure);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain("Missing required field 'class_type'");
    }
  });

  it('should proceed to connection validation if structure valid', () => {
    // Arrange
    const workflowWithBadConnection: ComfyWorkflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: { text: 'test', clip: ['99', 1] }, // Invalid connection
      },
      '9': {
        class_type: 'SaveImage',
        inputs: { filename_prefix: 'ComfyUI', images: ['2', 0] },
      },
    };

    // Act
    const result = validateWorkflowFull(workflowWithBadConnection);

    // Assert
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain("References non-existent node '99'");
    }
  });
});
