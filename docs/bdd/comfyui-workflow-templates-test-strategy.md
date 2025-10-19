# ComfyUI Workflow Templates - Test Strategy & Implementation Guide

## Overview

This document provides the test-first implementation strategy for Issue #176: ComfyUI workflow JSON templates for image generation with LoRA support.

## Test-First Implementation Order (RED-GREEN-REFACTOR)

### Phase 1: Node Factory Foundation (Days 1-2)

**Goal**: Establish the core building blocks with type safety and validation.

#### 1.1 CheckpointLoaderSimple Node (30 min)
**Priority**: CRITICAL - Foundation for all workflows

**RED Tests**:
```typescript
// apps/worker/src/lib/comfy/__tests__/node-factory.spec.ts
describe('createCheckpointLoaderNode', () => {
  it('should create node with valid checkpoint', () => {
    const node = createCheckpointLoaderNode('1', 'model.safetensors');
    expect(node.id).toBe('1');
    expect(node.class_type).toBe('CheckpointLoaderSimple');
    expect(node.inputs.ckpt_name).toBe('model.safetensors');
  });

  it('should throw on empty checkpoint name', () => {
    expect(() => createCheckpointLoaderNode('1', '')).toThrow('Checkpoint name cannot be empty');
  });
});
```

**GREEN**: Implement minimal `createCheckpointLoaderNode` function.

**REFACTOR**: Extract common node structure to base type.

**BDD Scenarios Covered**:
- ✅ Create CheckpointLoaderSimple with valid checkpoint
- ✅ CheckpointLoader outputs are correctly defined
- ✅ Reject empty checkpoint name

---

#### 1.2 CLIPTextEncode Node (20 min)
**Priority**: CRITICAL - Required for all workflows

**RED Tests**:
```typescript
describe('createCLIPTextEncodeNode', () => {
  it('should create positive prompt encoder', () => {
    const node = createCLIPTextEncodeNode('2', 'beautiful sunset', ['1', 1]);
    expect(node.inputs.text).toBe('beautiful sunset');
    expect(node.inputs.clip).toEqual(['1', 1]);
  });

  it('should allow empty prompt', () => {
    const node = createCLIPTextEncodeNode('2', '', ['1', 1]);
    expect(node.inputs.text).toBe('');
  });
});
```

**BDD Scenarios Covered**:
- ✅ Create positive prompt encoder
- ✅ Create negative prompt encoder
- ✅ Allow empty prompt (edge case)

---

#### 1.3 KSampler Node (45 min)
**Priority**: CRITICAL - Core generation logic

**RED Tests**:
```typescript
describe('createKSamplerNode', () => {
  it('should create KSampler with all parameters', () => {
    const config = {
      seed: 42,
      steps: 25,
      cfg: 7.5,
      sampler_name: 'euler_ancestral',
      scheduler: 'karras',
    };
    const node = createKSamplerNode('3', config, ['1', 0], ['2', 0], ['2', 0], latent);
    expect(node.inputs.steps).toBe(25);
    expect(node.inputs.cfg).toBe(7.5);
  });

  it('should use defaults for missing parameters', () => {
    const node = createKSamplerNode('3', {}, connections);
    expect(node.inputs.steps).toBe(20);
    expect(node.inputs.cfg).toBe(7.0);
    expect(node.inputs.seed).toBeGreaterThan(0);
  });

  it('should validate steps range', () => {
    expect(() => createKSamplerNode('3', { steps: 0 })).toThrow('steps must be >= 1');
    expect(() => createKSamplerNode('3', { steps: 151 })).toThrow('steps must be <= 150');
  });

  it('should validate cfg range', () => {
    expect(() => createKSamplerNode('3', { cfg: -1 })).toThrow('cfg must be >= 0');
    expect(() => createKSamplerNode('3', { cfg: 31 })).toThrow('cfg must be <= 30');
  });
});
```

**BDD Scenarios Covered**:
- ✅ Create KSampler with all parameters
- ✅ KSampler with default values
- ✅ Validate steps range
- ✅ Validate CFG scale range
- ✅ Validate sampler name enum

---

#### 1.4 VAEDecode and SaveImage Nodes (20 min)
**Priority**: HIGH - Required to complete basic workflow

**RED Tests**:
```typescript
describe('createVAEDecodeNode', () => {
  it('should create VAEDecode node', () => {
    const node = createVAEDecodeNode('4', ['3', 0], ['1', 2]);
    expect(node.inputs.samples).toEqual(['3', 0]);
    expect(node.inputs.vae).toEqual(['1', 2]);
  });
});

describe('createSaveImageNode', () => {
  it('should create SaveImage with default prefix', () => {
    const node = createSaveImageNode('5', ['4', 0]);
    expect(node.inputs.filename_prefix).toBe('ComfyUI');
  });

  it('should create SaveImage with custom prefix', () => {
    const node = createSaveImageNode('5', ['4', 0], 'influencer-portrait');
    expect(node.inputs.filename_prefix).toBe('influencer-portrait');
  });
});
```

**BDD Scenarios Covered**:
- ✅ Create VAEDecode node
- ✅ Create SaveImage with default prefix
- ✅ Create SaveImage with custom prefix

---

#### 1.5 LoraLoader Node (30 min)
**Priority**: CRITICAL - Core feature requirement

**RED Tests**:
```typescript
describe('createLoraLoaderNode', () => {
  it('should create LoraLoader with default strengths', () => {
    const loraConfig = { path: 'influencer-v1.safetensors' };
    const node = createLoraLoaderNode('2', loraConfig, ['1', 0], ['1', 1]);
    expect(node.inputs.lora_name).toBe('influencer-v1.safetensors');
    expect(node.inputs.strength_model).toBe(1.0);
    expect(node.inputs.strength_clip).toBe(1.0);
  });

  it('should create LoraLoader with custom strengths', () => {
    const loraConfig = {
      path: 'style.safetensors',
      strengthModel: 0.8,
      strengthClip: 0.6,
    };
    const node = createLoraLoaderNode('2', loraConfig, ['1', 0], ['1', 1]);
    expect(node.inputs.strength_model).toBe(0.8);
    expect(node.inputs.strength_clip).toBe(0.6);
  });

  it('should reject invalid strength values', () => {
    expect(() => createLoraLoaderNode('2', { path: 'lora.safetensors', strengthModel: -0.5 }))
      .toThrow('strength_model must be between 0 and 2');
    expect(() => createLoraLoaderNode('2', { path: 'lora.safetensors', strengthModel: 3.0 }))
      .toThrow('strength_model must be between 0 and 2');
  });
});
```

**BDD Scenarios Covered**:
- ✅ Create LoraLoader with default strengths
- ✅ Create LoraLoader with custom strengths
- ✅ Reject invalid strength values

---

### Phase 2: Workflow Builders (Days 2-3)

#### 2.1 Basic Workflow Builder (60 min)
**Priority**: CRITICAL - Happy path implementation

**RED Tests**:
```typescript
// apps/worker/src/lib/comfy/__tests__/workflow-builder.spec.ts
describe('buildBasicWorkflow', () => {
  it('should build workflow with minimal parameters', () => {
    const params = {
      prompt: 'beautiful sunset',
      checkpoint: 'model.safetensors',
    };
    const workflow = buildBasicWorkflow(params);

    expect(workflow['1'].class_type).toBe('CheckpointLoaderSimple');
    expect(workflow['2'].class_type).toBe('CLIPTextEncode'); // positive
    expect(workflow['3'].class_type).toBe('CLIPTextEncode'); // negative
    expect(workflow['4'].class_type).toBe('KSampler');
    expect(workflow['5'].class_type).toBe('VAEDecode');
    expect(workflow['6'].class_type).toBe('SaveImage');
  });

  it('should build workflow with all optional parameters', () => {
    const params = {
      prompt: 'portrait',
      negativePrompt: 'blurry',
      checkpoint: 'model.safetensors',
      width: 768,
      height: 1024,
      steps: 30,
      cfg: 7.5,
      seed: 42,
      sampler: 'euler_ancestral',
      scheduler: 'karras',
    };
    const workflow = buildBasicWorkflow(params);
    const ksampler = workflow['4'];

    expect(ksampler.inputs.steps).toBe(30);
    expect(ksampler.inputs.cfg).toBe(7.5);
    expect(ksampler.inputs.seed).toBe(42);
  });

  it('should use default values when not provided', () => {
    const params = {
      prompt: 'test',
      checkpoint: 'model.safetensors',
    };
    const workflow = buildBasicWorkflow(params);
    const ksampler = workflow['4'];

    expect(ksampler.inputs.steps).toBe(20);
    expect(ksampler.inputs.cfg).toBe(7.0);
  });

  it('should generate unique node IDs across workflows', () => {
    const workflow1 = buildBasicWorkflow({ prompt: 'test1', checkpoint: 'model.safetensors' });
    const workflow2 = buildBasicWorkflow({ prompt: 'test2', checkpoint: 'model.safetensors' });

    const ids1 = Object.keys(workflow1);
    const ids2 = Object.keys(workflow2);

    expect(ids1).not.toEqual(ids2);
  });
});
```

**BDD Scenarios Covered**:
- ✅ Build basic workflow with minimal parameters
- ✅ Build basic workflow with all optional parameters
- ✅ Build basic workflow with default values
- ✅ Workflow generates unique node IDs

---

#### 2.2 Single LoRA Workflow Builder (45 min)
**Priority**: HIGH - Core feature

**RED Tests**:
```typescript
describe('buildLoRAWorkflow - Single LoRA', () => {
  it('should build workflow with one LoRA at default strength', () => {
    const params = {
      prompt: 'portrait',
      checkpoint: 'base.safetensors',
      loras: [{ path: 'influencer-style-v1.safetensors' }],
    };
    const workflow = buildLoRAWorkflow(params);

    // Should have LoraLoader between checkpoint and samplers
    const loraNode = Object.values(workflow).find(n => n.class_type === 'LoraLoader');
    expect(loraNode).toBeDefined();
    expect(loraNode.inputs.strength_model).toBe(1.0);
  });

  it('should build workflow with one LoRA at custom strength', () => {
    const params = {
      prompt: 'portrait',
      checkpoint: 'base.safetensors',
      loras: [{ path: 'influencer.safetensors', strengthModel: 0.8, strengthClip: 0.6 }],
    };
    const workflow = buildLoRAWorkflow(params);

    const loraNode = Object.values(workflow).find(n => n.class_type === 'LoraLoader');
    expect(loraNode.inputs.strength_model).toBe(0.8);
    expect(loraNode.inputs.strength_clip).toBe(0.6);
  });
});
```

**BDD Scenarios Covered**:
- ✅ Build workflow with one LoRA at default strength
- ✅ Build workflow with one LoRA at custom strength
- ✅ LoRA workflow maintains all basic workflow features

---

#### 2.3 Multi-LoRA Workflow Builder (60 min)
**Priority**: HIGH - Complex feature

**RED Tests**:
```typescript
describe('buildLoRAWorkflow - Multi-LoRA', () => {
  it('should build workflow with two LoRAs stacked', () => {
    const params = {
      prompt: 'portrait',
      checkpoint: 'base.safetensors',
      loras: [
        { path: 'character.safetensors' },
        { path: 'style.safetensors' },
      ],
    };
    const workflow = buildLoRAWorkflow(params);

    const loraNodes = Object.values(workflow).filter(n => n.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(2);

    // Verify chaining: checkpoint -> lora1 -> lora2 -> samplers
    const lora1 = loraNodes[0];
    const lora2 = loraNodes[1];

    expect(lora1.inputs.model[0]).toBe('1'); // connects to checkpoint
    expect(lora2.inputs.model[0]).toBe(lora1.id); // connects to lora1
  });

  it('should build workflow with three LoRAs stacked', () => {
    const params = {
      prompt: 'portrait',
      checkpoint: 'base.safetensors',
      loras: [
        { path: 'char.safetensors' },
        { path: 'style.safetensors' },
        { path: 'light.safetensors' },
      ],
    };
    const workflow = buildLoRAWorkflow(params);

    const loraNodes = Object.values(workflow).filter(n => n.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(3);
  });

  it('should preserve LoRA order in workflow', () => {
    const params = {
      prompt: 'test',
      checkpoint: 'base.safetensors',
      loras: [
        { path: 'first.safetensors' },
        { path: 'second.safetensors' },
        { path: 'third.safetensors' },
      ],
    };
    const workflow = buildLoRAWorkflow(params);

    const loraNodes = Object.values(workflow)
      .filter(n => n.class_type === 'LoraLoader')
      .sort((a, b) => parseInt(a.id) - parseInt(b.id));

    expect(loraNodes[0].inputs.lora_name).toBe('first.safetensors');
    expect(loraNodes[1].inputs.lora_name).toBe('second.safetensors');
    expect(loraNodes[2].inputs.lora_name).toBe('third.safetensors');
  });

  it('should fall back to basic workflow when loras array is empty', () => {
    const params = {
      prompt: 'test',
      checkpoint: 'base.safetensors',
      loras: [],
    };
    const workflow = buildLoRAWorkflow(params);

    const loraNodes = Object.values(workflow).filter(n => n.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(0);
  });
});
```

**BDD Scenarios Covered**:
- ✅ Build workflow with two LoRAs stacked
- ✅ Build workflow with three LoRAs stacked
- ✅ Multi-LoRA with individual strength values
- ✅ Empty LoRA array falls back to basic workflow
- ✅ LoRA order is preserved in workflow

---

#### 2.4 Auto-Selection Workflow Builder (20 min)
**Priority**: MEDIUM - Developer convenience

**RED Tests**:
```typescript
describe('buildWorkflow - Auto-selection', () => {
  it('should auto-select basic workflow when no LoRAs provided', () => {
    const params = { prompt: 'test', checkpoint: 'base.safetensors' };
    const workflow = buildWorkflow(params);

    const loraNodes = Object.values(workflow).filter(n => n.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(0);
  });

  it('should auto-select LoRA workflow when LoRAs provided', () => {
    const params = {
      prompt: 'test',
      checkpoint: 'base.safetensors',
      loras: [{ path: 'style.safetensors' }],
    };
    const workflow = buildWorkflow(params);

    const loraNodes = Object.values(workflow).filter(n => n.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(1);
  });

  it('should treat undefined loras as no LoRAs', () => {
    const params = { prompt: 'test', checkpoint: 'base.safetensors', loras: undefined };
    const workflow = buildWorkflow(params);

    const loraNodes = Object.values(workflow).filter(n => n.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(0);
  });
});
```

**BDD Scenarios Covered**:
- ✅ Auto-select basic workflow when no LoRAs provided
- ✅ Auto-select LoRA workflow when LoRAs provided
- ✅ Auto-select handles undefined vs empty array

---

### Phase 3: Workflow Validation (Day 4)

#### 3.1 Structure Validation (60 min)
**Priority**: HIGH - Prevents runtime errors

**RED Tests**:
```typescript
// apps/worker/src/lib/comfy/__tests__/workflow-validator.spec.ts
describe('validateWorkflow - Structure', () => {
  it('should validate correct workflow structure', () => {
    const workflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: { text: 'test', clip: ['1', 1] },
      },
    };

    expect(() => validateWorkflow(workflow)).not.toThrow();
  });

  it('should detect missing class_type', () => {
    const workflow = {
      '1': { inputs: { ckpt_name: 'model.safetensors' } },
    };

    expect(() => validateWorkflow(workflow)).toThrow("Node 1: Missing required field 'class_type'");
  });

  it('should detect missing required inputs', () => {
    const workflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: {},
      },
    };

    expect(() => validateWorkflow(workflow)).toThrow("Node 1 (CheckpointLoaderSimple): Missing required input 'ckpt_name'");
  });

  it('should detect unknown class_type', () => {
    const workflow = {
      '1': {
        class_type: 'InvalidNodeType',
        inputs: {},
      },
    };

    expect(() => validateWorkflow(workflow)).toThrow("Node 1: Unknown class_type 'InvalidNodeType'");
  });

  it('should reject empty workflow', () => {
    expect(() => validateWorkflow({})).toThrow('Workflow must contain at least one node');
  });
});
```

**BDD Scenarios Covered**:
- ✅ Validate correct workflow structure
- ✅ Detect missing required node fields
- ✅ Detect missing required node inputs
- ✅ Detect invalid node class_type
- ✅ Validate empty workflow

---

#### 3.2 Connection Validation (45 min)
**Priority**: HIGH - Prevents workflow execution errors

**RED Tests**:
```typescript
describe('validateWorkflow - Connections', () => {
  it('should validate correct node references', () => {
    const workflow = {
      '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'model.safetensors' } },
      '2': { class_type: 'CLIPTextEncode', inputs: { text: 'test', clip: ['1', 1] } },
    };

    expect(() => validateWorkflow(workflow)).not.toThrow();
  });

  it('should detect reference to non-existent node', () => {
    const workflow = {
      '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'model.safetensors' } },
      '2': { class_type: 'CLIPTextEncode', inputs: { text: 'test', clip: ['99', 1] } },
    };

    expect(() => validateWorkflow(workflow)).toThrow("Node 2: References non-existent node '99'");
  });

  it('should detect invalid output slot reference', () => {
    const workflow = {
      '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'model.safetensors' } },
      '2': { class_type: 'CLIPTextEncode', inputs: { text: 'test', clip: ['1', 999] } },
    };

    expect(() => validateWorkflow(workflow)).toThrow("Node 2: Invalid output slot reference '999' for node '1'");
  });
});
```

**BDD Scenarios Covered**:
- ✅ Validate correct node references
- ✅ Detect reference to non-existent node
- ✅ Detect invalid output slot reference

---

### Phase 4: LoRA Path Resolution (Day 4)

#### 4.1 Path Resolution (30 min)
**Priority**: MEDIUM - Environment-specific

**RED Tests**:
```typescript
// apps/worker/src/lib/comfy/__tests__/lora-path-resolver.spec.ts
describe('resolveLoraPath', () => {
  it('should resolve absolute path to relative path', () => {
    const path = '/app/ComfyUI/models/loras/influencer-v1.safetensors';
    const resolved = resolveLoraPath(path);
    expect(resolved).toBe('influencer-v1.safetensors');
  });

  it('should resolve nested subdirectory path', () => {
    const path = '/app/ComfyUI/models/loras/characters/influencer/v2.safetensors';
    const resolved = resolveLoraPath(path);
    expect(resolved).toBe('characters/influencer/v2.safetensors');
  });

  it('should handle already relative path', () => {
    const path = 'style-lora.safetensors';
    const resolved = resolveLoraPath(path);
    expect(resolved).toBe('style-lora.safetensors');
  });

  it('should preserve subdirectory structure in relative paths', () => {
    const path = 'characters/female/influencer.safetensors';
    const resolved = resolveLoraPath(path);
    expect(resolved).toBe('characters/female/influencer.safetensors');
  });
});
```

**BDD Scenarios Covered**:
- ✅ Resolve absolute path to relative path
- ✅ Resolve nested subdirectory path
- ✅ Handle already relative path
- ✅ Preserve subdirectory structure in relative paths

---

#### 4.2 Missing File Detection (30 min)
**Priority**: HIGH - Prevents ComfyUI errors

**RED Tests**:
```typescript
describe('validateLoraPath', () => {
  beforeEach(() => {
    // Mock file system
    jest.mock('fs');
  });

  it('should validate existing LoRA file', () => {
    fs.existsSync.mockReturnValue(true);
    expect(() => validateLoraPath('influencer-v1.safetensors')).not.toThrow();
  });

  it('should detect missing LoRA file', () => {
    fs.existsSync.mockReturnValue(false);
    expect(() => validateLoraPath('nonexistent.safetensors'))
      .toThrow('LoRA file not found: nonexistent.safetensors');
  });

  it('should detect missing LoRA in subdirectory', () => {
    fs.existsSync.mockReturnValue(false);
    expect(() => validateLoraPath('characters/missing.safetensors'))
      .toThrow('LoRA file not found: characters/missing.safetensors');
  });
});
```

**BDD Scenarios Covered**:
- ✅ Validate existing LoRA file
- ✅ Detect missing LoRA file
- ✅ Detect missing LoRA in subdirectory

---

#### 4.3 File Extension Validation (15 min)
**Priority**: LOW - Simple validation

**RED Tests**:
```typescript
describe('validateLoraExtension', () => {
  it('should accept .safetensors extension', () => {
    expect(() => validateLoraExtension('model.safetensors')).not.toThrow();
  });

  it('should accept .pt extension (legacy)', () => {
    expect(() => validateLoraExtension('model.pt')).not.toThrow();
  });

  it('should accept .ckpt extension (legacy)', () => {
    expect(() => validateLoraExtension('model.ckpt')).not.toThrow();
  });

  it('should reject invalid extension', () => {
    expect(() => validateLoraExtension('model.txt'))
      .toThrow('Invalid LoRA file extension. Must be .safetensors, .pt, or .ckpt');
  });

  it('should reject missing extension', () => {
    expect(() => validateLoraExtension('model'))
      .toThrow('Invalid LoRA file extension');
  });
});
```

**BDD Scenarios Covered**:
- ✅ Accept .safetensors extension
- ✅ Accept .pt extension (legacy)
- ✅ Accept .ckpt extension (legacy)
- ✅ Reject invalid extension
- ✅ Reject missing extension

---

### Phase 5: ComfyUI Integration (Day 5)

#### 5.1 Build Workflow from Job Parameters (45 min)
**Priority**: HIGH - Integration point

**RED Tests**:
```typescript
// apps/worker/src/lib/comfy/__tests__/comfy-integration.spec.ts
describe('buildWorkflowFromJobParams', () => {
  it('should build workflow from minimal job parameters', () => {
    const params = {
      prompt: 'portrait of a woman',
      checkpoint: 'realisticVisionV51.safetensors',
    };

    const workflow = buildWorkflowFromJobParams(params);
    expect(workflow).toBeDefined();
    expect(() => validateWorkflow(workflow)).not.toThrow();
  });

  it('should build workflow from complete job parameters', () => {
    const params = {
      prompt: 'detailed portrait, studio lighting',
      negativePrompt: 'blurry, distorted',
      checkpoint: 'realisticVisionV51.safetensors',
      width: 768,
      height: 1024,
      steps: 30,
      cfg: 7.5,
      seed: 12345,
      sampler: 'euler_ancestral',
      scheduler: 'karras',
      loras: [
        { path: 'influencer-style.safetensors', strengthModel: 0.9, strengthClip: 0.8 },
      ],
    };

    const workflow = buildWorkflowFromJobParams(params);
    const loraNodes = Object.values(workflow).filter(n => n.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(1);
  });

  it('should throw on missing required parameter (prompt)', () => {
    const params = { checkpoint: 'model.safetensors' };
    expect(() => buildWorkflowFromJobParams(params))
      .toThrow('Missing required parameter: prompt');
  });

  it('should throw on missing required parameter (checkpoint)', () => {
    const params = { prompt: 'test' };
    expect(() => buildWorkflowFromJobParams(params))
      .toThrow('Missing required parameter: checkpoint');
  });

  it('should throw on invalid parameter types', () => {
    const params = {
      prompt: 'test',
      checkpoint: 'model.safetensors',
      steps: 'twenty',
    };
    expect(() => buildWorkflowFromJobParams(params))
      .toThrow('steps must be a number');
  });
});
```

**BDD Scenarios Covered**:
- ✅ Build workflow from minimal job parameters
- ✅ Build workflow from complete job parameters
- ✅ Reject job with missing required parameter (prompt)
- ✅ Reject job with missing required parameter (checkpoint)
- ✅ Reject job with invalid parameter types

---

#### 5.2 Submit Workflow to ComfyUI (60 min - INTEGRATION TEST)
**Priority**: HIGH - Real API interaction

**Integration Tests** (requires running ComfyUI):
```typescript
// apps/worker/src/lib/comfy/__tests__/comfy-client.integration.spec.ts
describe('ComfyUI Client Integration', () => {
  let comfyClient: ComfyUIClient;

  beforeAll(() => {
    comfyClient = new ComfyUIClient('http://localhost:8188');
  });

  it('should successfully submit workflow to ComfyUI', async () => {
    const workflow = buildBasicWorkflow({
      prompt: 'test image',
      checkpoint: 'realisticVisionV51.safetensors',
    });

    const promptId = await comfyClient.submitWorkflow(workflow);
    expect(promptId).toBeTruthy();
    expect(typeof promptId).toBe('string');
  }, 30000);

  it('should handle ComfyUI API errors on submission', async () => {
    const invalidWorkflow = { /* invalid structure */ };

    await expect(comfyClient.submitWorkflow(invalidWorkflow))
      .rejects.toThrow('ComfyUI API error');
  });

  it('should handle ComfyUI unavailable', async () => {
    const offlineClient = new ComfyUIClient('http://localhost:9999');
    const workflow = buildBasicWorkflow({ prompt: 'test', checkpoint: 'model.safetensors' });

    await expect(offlineClient.submitWorkflow(workflow))
      .rejects.toThrow('ComfyUI is not reachable');
  });
});
```

**BDD Scenarios Covered**:
- ✅ Successfully submit workflow to ComfyUI
- ✅ Handle ComfyUI API errors on submission
- ✅ Handle ComfyUI unavailable

---

## Acceptance Criteria Mapping to BDD Scenarios

### DoD 1: Core workflow builder functions exist
**Location**: `apps/worker/src/lib/comfy/workflow-builder.ts`

| BDD Scenario | Coverage |
|---|---|
| Build basic workflow with minimal parameters | ✅ |
| Build basic workflow with all optional parameters | ✅ |
| Build workflow with one LoRA at default strength | ✅ |
| Build workflow with two/three LoRAs stacked | ✅ |
| Auto-select basic/LoRA workflow | ✅ |

**Tests**: 15+ scenarios in `workflow-builder.spec.ts`

---

### DoD 2: Workflow validation with clear errors
**Location**: `apps/worker/src/lib/comfy/workflow-validator.ts`

| BDD Scenario | Coverage |
|---|---|
| Validate correct workflow structure | ✅ |
| Detect missing class_type, inputs | ✅ |
| Detect reference to non-existent node | ✅ |
| Detect invalid output slot reference | ✅ |
| Multiple validation errors accumulated | ✅ |

**Tests**: 10+ scenarios in `workflow-validator.spec.ts`

---

### DoD 3: Node factory with type-safe parameters
**Location**: `apps/worker/src/lib/comfy/node-factory.ts`

| BDD Scenario | Coverage |
|---|---|
| Create CheckpointLoaderSimple with validation | ✅ |
| Create LoraLoader with strength validation | ✅ |
| Create KSampler with range validation | ✅ |
| Create CLIPTextEncode, VAEDecode, SaveImage | ✅ |
| TypeScript enforces required parameters | ✅ |

**Tests**: 20+ scenarios in `node-factory.spec.ts`

---

### DoD 4: Zod schemas for runtime validation
**Location**: `apps/worker/src/lib/comfy/schemas.ts`

| BDD Scenario | Coverage |
|---|---|
| Reject job with invalid parameter types | ✅ |
| Reject job with out-of-range values | ✅ |
| Reject job with invalid LoRA structure | ✅ |
| Validate steps, cfg, denoise ranges | ✅ |

**Tests**: Covered by `buildWorkflowFromJobParams` tests

---

### DoD 5: Integration with ComfyUI client
**Location**: `apps/worker/src/lib/comfy/comfy-client.ts`

| BDD Scenario | Coverage |
|---|---|
| Build workflow from minimal job parameters | ✅ |
| Build workflow from complete job parameters | ✅ |
| Submit workflow to ComfyUI API | ✅ (integration) |
| Handle ComfyUI API errors | ✅ (integration) |
| Serialize workflow to JSON correctly | ✅ |

**Tests**: 5+ unit tests + 3+ integration tests

---

### DoD 6: LoRA path resolution and validation
**Location**: `apps/worker/src/lib/comfy/lora-path-resolver.ts`

| BDD Scenario | Coverage |
|---|---|
| Resolve absolute path to relative path | ✅ |
| Handle nested subdirectory paths | ✅ |
| Detect missing LoRA files | ✅ |
| Validate file extensions | ✅ |
| Use custom LoRA directory from env | ✅ |

**Tests**: 10+ scenarios in `lora-path-resolver.spec.ts`

---

### DoD 7: Documentation and examples
**Location**: `docs/architecture/comfyui-workflow-templates-architecture.md`

| BDD Scenario | Coverage |
|---|---|
| README with usage examples | ✅ |
| Architecture documentation | ✅ (existing) |
| API documentation (JSDoc) | ✅ (via TypeScript) |

**Deliverables**: README.md with code examples

---

### DoD 8: Test coverage
**Target**: 100% coverage for workflow builder, 90%+ overall

| Test Type | Files | Coverage Target |
|---|---|---|
| Unit tests | node-factory.spec.ts | 100% |
| Unit tests | workflow-builder.spec.ts | 100% |
| Unit tests | workflow-validator.spec.ts | 100% |
| Unit tests | lora-path-resolver.spec.ts | 95% |
| Integration tests | comfy-client.integration.spec.ts | 80% |

**Total BDD Scenarios**: 80+ scenarios covering all features

---

## Testing Strategy: Unit vs Integration

### Unit Tests
**Location**: `apps/worker/src/lib/comfy/__tests__/*.spec.ts`

**Characteristics**:
- Fast (< 1ms per test)
- No external dependencies
- Mock file system, HTTP clients
- Test individual functions in isolation
- Run on every commit (CI/CD)

**Coverage**:
- ✅ Node factory functions
- ✅ Workflow builders (buildBasicWorkflow, buildLoRAWorkflow)
- ✅ Workflow validation (structure, connections)
- ✅ LoRA path resolution (with mocked fs)
- ✅ Parameter validation (Zod schemas)

**Run Command**:
```bash
pnpm --filter worker test
```

---

### Integration Tests
**Location**: `apps/worker/src/lib/comfy/__tests__/*.integration.spec.ts`

**Characteristics**:
- Slow (seconds per test)
- Requires running ComfyUI instance
- Real HTTP requests
- Real file system access
- Run before deployment only

**Coverage**:
- ✅ Submit workflow to ComfyUI API
- ✅ Poll for workflow completion
- ✅ Handle ComfyUI errors
- ✅ Retry logic on transient failures
- ✅ End-to-end workflow execution

**Prerequisites**:
```bash
# Start ComfyUI in Docker
docker compose -f infra/docker-compose.yml up -d comfyui

# Ensure models are downloaded
docker exec comfyui python download_models.py
```

**Run Command**:
```bash
COMFYUI_URL=http://localhost:8188 pnpm --filter worker test:integration
```

---

### E2E Tests (Future)
**Location**: `apps/api/test/content-generation.e2e-spec.ts`

**Characteristics**:
- Full stack: API → Worker → ComfyUI
- Tests BullMQ job processing
- Tests database persistence
- Tests S3 upload
- Run before major releases

**Coverage**:
- ✅ POST /jobs/content-generation
- ✅ Job enqueued and processed by worker
- ✅ Workflow submitted to ComfyUI
- ✅ Image saved to MinIO
- ✅ Asset record created in database
- ✅ Job status updated to "completed"

---

## Implementation Checklist

### Pre-Implementation
- [x] Architecture design completed
- [x] BDD scenarios written (this document)
- [x] Test strategy defined
- [ ] Review BDD scenarios with team

### Phase 1: Node Factory (Day 1-2)
- [ ] Create `node-factory.spec.ts` with RED tests
- [ ] Implement `createCheckpointLoaderNode`
- [ ] Implement `createCLIPTextEncodeNode`
- [ ] Implement `createKSamplerNode` with validation
- [ ] Implement `createVAEDecodeNode`
- [ ] Implement `createSaveImageNode`
- [ ] Implement `createLoraLoaderNode` with validation
- [ ] All node factory tests GREEN

### Phase 2: Workflow Builders (Day 2-3)
- [ ] Create `workflow-builder.spec.ts` with RED tests
- [ ] Implement `buildBasicWorkflow`
- [ ] Implement `buildLoRAWorkflow` (single LoRA)
- [ ] Implement `buildLoRAWorkflow` (multi-LoRA stacking)
- [ ] Implement `buildWorkflow` (auto-selection)
- [ ] All workflow builder tests GREEN

### Phase 3: Workflow Validation (Day 4)
- [ ] Create `workflow-validator.spec.ts` with RED tests
- [ ] Implement structure validation
- [ ] Implement connection validation
- [ ] Implement error message accumulation
- [ ] All validation tests GREEN

### Phase 4: LoRA Path Resolution (Day 4)
- [ ] Create `lora-path-resolver.spec.ts` with RED tests
- [ ] Implement `resolveLoraPath`
- [ ] Implement `validateLoraPath` (file existence)
- [ ] Implement `validateLoraExtension`
- [ ] Handle environment variable for custom directory
- [ ] All path resolution tests GREEN

### Phase 5: ComfyUI Integration (Day 5)
- [ ] Create `comfy-integration.spec.ts` with RED tests
- [ ] Implement `buildWorkflowFromJobParams`
- [ ] Implement Zod schemas for parameter validation
- [ ] Create `comfy-client.integration.spec.ts`
- [ ] Implement ComfyUI HTTP client
- [ ] Implement workflow submission
- [ ] Implement retry logic
- [ ] All integration tests GREEN

### Final Steps
- [ ] Achieve 100% test coverage on core modules
- [ ] Write README.md with usage examples
- [ ] Update issue #176 DoD items
- [ ] Code review
- [ ] Merge to main

---

## Confidence Ratings

**Problem understanding**: 9/10
- Clear requirements from architecture design
- Well-defined scope and acceptance criteria
- Minor uncertainty around ComfyUI API edge cases

**Option feasibility**: 9/10
- TDD approach is proven for this type of work
- All scenarios are testable
- Some integration tests may be flaky (network issues)

**Outcome prediction**: 8/10
- High confidence in unit test success
- Integration tests depend on ComfyUI stability
- Test coverage goals are achievable

**Overall recommendation**: 9/10
- This test-first approach will catch bugs early
- BDD scenarios provide clear specification
- Phased implementation reduces risk

---

## Contingencies

### What could go wrong

1. **ComfyUI API changes during development**
   - **Early warning**: Integration tests fail
   - **Fallback**: Pin ComfyUI Docker image version, update specs

2. **Test execution time too slow**
   - **Early warning**: Unit tests take > 5 seconds
   - **Fallback**: Mock more aggressively, parallelize tests

3. **Zod validation too strict for real-world params**
   - **Early warning**: Valid workflows rejected
   - **Fallback**: Relax validation, add override flags

4. **LoRA path resolution breaks on Windows**
   - **Early warning**: Path tests fail on Windows CI
   - **Fallback**: Use `path.join()` and `path.sep`, test both platforms

### Decision checkpoints

- **After Phase 1 (Node Factory)**: Are types providing value? Adjust if too verbose
- **After Phase 3 (Validation)**: Is validation catching real errors? Adjust strictness
- **After Phase 5 (Integration)**: Are integration tests stable? Consider retry/timeout tuning

---

## Next Steps

1. **Review this document** with team/stakeholders
2. **Start Phase 1** with RED tests for `createCheckpointLoaderNode`
3. **Follow TDD cycle** strictly: RED → GREEN → REFACTOR
4. **Update issue #176** DoD items as each phase completes
5. **Deploy to staging** after all tests pass
