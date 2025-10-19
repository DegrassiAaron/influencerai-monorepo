# ComfyUI Workflow Templates - DoD Mapping

## Overview

This document maps the BDD scenarios in `comfyui-workflow-templates.feature` to the Definition of Done (DoD) items in Issue #176.

## DoD Items from Issue #176

### ✅ DoD 1: Core workflow builder functions exist

**Location**: `apps/worker/src/lib/comfy/workflow-builder.ts`

**BDD Scenarios** (Feature: Basic Image Generation Workflow):
- ✅ Build basic workflow with minimal parameters
- ✅ Build basic workflow with all optional parameters
- ✅ Build basic workflow with default values
- ✅ Workflow generates unique node IDs

**BDD Scenarios** (Feature: Single LoRA Workflow):
- ✅ Build workflow with one LoRA at default strength
- ✅ Build workflow with one LoRA at custom strength
- ✅ Build workflow with LoRA using relative path
- ✅ LoRA workflow maintains all basic workflow features

**BDD Scenarios** (Feature: Multi-LoRA Workflow):
- ✅ Build workflow with two LoRAs stacked
- ✅ Build workflow with three LoRAs stacked
- ✅ Multi-LoRA with individual strength values
- ✅ Empty LoRA array falls back to basic workflow
- ✅ LoRA order is preserved in workflow

**BDD Scenarios** (Feature: Auto-Selection):
- ✅ Auto-select basic workflow when no LoRAs provided
- ✅ Auto-select LoRA workflow when LoRAs provided
- ✅ Auto-select handles undefined vs empty array

**Test Files**:
- `apps/worker/src/lib/comfy/__tests__/workflow-builder.spec.ts`

**Total Coverage**: 15 scenarios covering all workflow builder functions

---

### ✅ DoD 2: Workflow validation with clear errors

**Location**: `apps/worker/src/lib/comfy/workflow-validator.ts`

**BDD Scenarios** (Feature: Workflow Structure Validation):
- ✅ Validate correct workflow structure
- ✅ Detect missing required node fields
- ✅ Detect missing required node inputs
- ✅ Detect invalid node class_type
- ✅ Validate empty workflow
- ✅ Validate workflow with all required node types
- ✅ Detect missing critical nodes

**BDD Scenarios** (Feature: Workflow Connection Validation):
- ✅ Validate correct node references
- ✅ Detect reference to non-existent node
- ✅ Detect invalid output slot reference
- ✅ Validate connection type compatibility
- ✅ Detect circular dependencies
- ✅ Validate all connections in multi-LoRA workflow

**BDD Scenarios** (Feature: Workflow Validation Error Messages):
- ✅ Error message includes node ID and field name
- ✅ Error message includes expected vs actual values
- ✅ Multiple validation errors are accumulated
- ✅ Validation error includes path to nested field

**Test Files**:
- `apps/worker/src/lib/comfy/__tests__/workflow-validator.spec.ts`

**Total Coverage**: 17 scenarios covering validation with clear, actionable error messages

---

### ✅ DoD 3: Node factory with type-safe parameters

**Location**: `apps/worker/src/lib/comfy/node-factory.ts`

**BDD Scenarios** (Feature: Node Factory - CheckpointLoaderSimple):
- ✅ Create CheckpointLoaderSimple with valid checkpoint
- ✅ CheckpointLoader outputs are correctly defined
- ✅ Reject empty checkpoint name

**BDD Scenarios** (Feature: Node Factory - LoraLoader):
- ✅ Create LoraLoader with default strengths
- ✅ Create LoraLoader with custom strengths
- ✅ LoraLoader outputs are correctly defined
- ✅ Reject invalid strength values

**BDD Scenarios** (Feature: Node Factory - CLIPTextEncode):
- ✅ Create positive prompt encoder
- ✅ Create negative prompt encoder
- ✅ CLIPTextEncode output is CONDITIONING
- ✅ Allow empty prompt (edge case)

**BDD Scenarios** (Feature: Node Factory - KSampler):
- ✅ Create KSampler with all parameters
- ✅ KSampler with default values
- ✅ Validate steps range
- ✅ Validate CFG scale range
- ✅ Validate denoise range
- ✅ Validate sampler name enum
- ✅ KSampler outputs LATENT

**BDD Scenarios** (Feature: Node Factory - VAEDecode):
- ✅ Create VAEDecode node
- ✅ VAEDecode output is IMAGE

**BDD Scenarios** (Feature: Node Factory - SaveImage):
- ✅ Create SaveImage with default prefix
- ✅ Create SaveImage with custom prefix
- ✅ SaveImage has no outputs

**BDD Scenarios** (Feature: Node Factory - Type Safety):
- ✅ TypeScript enforces required parameters
- ✅ TypeScript enforces correct connection types
- ✅ TypeScript autocomplete suggests valid sampler names

**Test Files**:
- `apps/worker/src/lib/comfy/__tests__/node-factory.spec.ts`

**Total Coverage**: 24 scenarios covering all node types with type-safe parameters and validation

---

### ✅ DoD 4: Zod schemas for runtime validation

**Location**: `apps/worker/src/lib/comfy/schemas.ts`

**BDD Scenarios** (Feature: Handle Invalid Job Parameters):
- ✅ Reject job with missing required parameter (prompt)
- ✅ Reject job with missing required parameter (checkpoint)
- ✅ Reject job with invalid parameter types
- ✅ Reject job with out-of-range values
- ✅ Reject job with invalid LoRA structure

**BDD Scenarios** (Implicitly covered by node factory validation):
- ✅ Validate steps range (1-150)
- ✅ Validate CFG scale range (0-30)
- ✅ Validate denoise range (0-1)
- ✅ Validate strength values (0-2)
- ✅ Validate sampler name enum

**Test Files**:
- `apps/worker/src/lib/comfy/__tests__/comfy-integration.spec.ts`
- `apps/worker/src/lib/comfy/__tests__/node-factory.spec.ts`

**Total Coverage**: 10+ scenarios with Zod schema validation at both job and node levels

---

### ✅ DoD 5: Integration with ComfyUI client

**Location**: `apps/worker/src/lib/comfy/comfy-client.ts`

**BDD Scenarios** (Feature: Build Workflow from Job Parameters):
- ✅ Build workflow from minimal job parameters
- ✅ Build workflow from complete job parameters
- ✅ Build workflow with multiple LoRAs from job params
- ✅ Handle missing optional parameters with defaults

**BDD Scenarios** (Feature: Submit Workflow to ComfyUI API):
- ✅ Successfully submit workflow to ComfyUI
- ✅ Submit workflow and poll for completion
- ✅ Handle ComfyUI API errors on submission
- ✅ Handle ComfyUI unavailable
- ✅ Retry submission on transient errors

**BDD Scenarios** (Feature: Workflow Serialization):
- ✅ Serialize basic workflow to ComfyUI JSON format
- ✅ Serialize multi-LoRA workflow maintains order
- ✅ Serialized workflow is idempotent

**Test Files**:
- `apps/worker/src/lib/comfy/__tests__/comfy-integration.spec.ts` (unit tests)
- `apps/worker/src/lib/comfy/__tests__/comfy-client.integration.spec.ts` (integration tests)

**Total Coverage**: 12 scenarios covering job parameter mapping, API submission, and serialization

---

### ✅ DoD 6: LoRA path resolution and validation

**Location**: `apps/worker/src/lib/comfy/lora-path-resolver.ts`

**BDD Scenarios** (Feature: LoRA Local File Path Resolution):
- ✅ Resolve absolute path to relative path
- ✅ Resolve nested subdirectory path
- ✅ Handle already relative path
- ✅ Handle Windows-style paths
- ✅ Preserve subdirectory structure in relative paths

**BDD Scenarios** (Feature: Handle Missing LoRA Files):
- ✅ Validate existing LoRA file
- ✅ Detect missing LoRA file
- ✅ Detect missing LoRA in subdirectory
- ✅ Validate all LoRAs before building workflow
- ✅ Skip validation when validation is disabled (performance)

**BDD Scenarios** (Feature: LoRA Path Configuration):
- ✅ Use default LoRA directory
- ✅ Use custom LoRA directory from environment
- ✅ Handle trailing slashes in directory path
- ✅ Resolve paths relative to custom directory

**BDD Scenarios** (Feature: LoRA File Extension Validation):
- ✅ Accept .safetensors extension
- ✅ Accept .pt extension (legacy)
- ✅ Accept .ckpt extension (legacy)
- ✅ Reject invalid extension
- ✅ Reject missing extension

**Test Files**:
- `apps/worker/src/lib/comfy/__tests__/lora-path-resolver.spec.ts`

**Total Coverage**: 18 scenarios covering path resolution, validation, and configuration

---

### ✅ DoD 7: Documentation and examples

**Deliverables**:
1. ✅ **BDD Scenarios**: `docs/bdd/comfyui-workflow-templates.feature` (80+ scenarios)
2. ✅ **Test Strategy**: `docs/bdd/comfyui-workflow-templates-test-strategy.md`
3. ✅ **DoD Mapping**: `docs/bdd/comfyui-workflow-templates-dod-mapping.md` (this file)
4. ✅ **Architecture**: `docs/architecture/comfyui-workflow-templates-architecture.md` (existing)
5. [ ] **README**: `apps/worker/src/lib/comfy/README.md` (to be created with code examples)
6. [ ] **API Documentation**: JSDoc comments in TypeScript files (to be added during implementation)

**README Example Structure**:
```markdown
# ComfyUI Workflow Templates

## Quick Start

### Basic Image Generation
```typescript
import { buildBasicWorkflow } from './workflow-builder';

const workflow = buildBasicWorkflow({
  prompt: 'portrait of a woman, detailed, 8k',
  checkpoint: 'realisticVisionV51.safetensors',
  width: 768,
  height: 1024,
  steps: 30,
  cfg: 7.5,
});
```

### Image Generation with LoRA
```typescript
import { buildLoRAWorkflow } from './workflow-builder';

const workflow = buildLoRAWorkflow({
  prompt: 'portrait in studio lighting',
  checkpoint: 'base.safetensors',
  loras: [
    { path: 'influencer-style-v1.safetensors', strengthModel: 0.9 },
    { path: 'lighting-enhancement.safetensors', strengthModel: 0.7 },
  ],
});
```

### Auto-Selection
```typescript
import { buildWorkflow } from './workflow-builder';

// Automatically selects basic or LoRA workflow based on params
const workflow = buildWorkflow(jobParams);
```

## API Reference
[Generated from JSDoc]
```

**Test Files**:
- No specific test file (documentation deliverable)

**Total Coverage**: Comprehensive documentation across 5 documents

---

### ✅ DoD 8: Test coverage ≥ 90%

**Test Coverage Strategy**:

| Module | Unit Tests | Integration Tests | Coverage Target | Scenarios |
|--------|------------|-------------------|-----------------|-----------|
| `node-factory.ts` | ✅ | ❌ | 100% | 24 |
| `workflow-builder.ts` | ✅ | ❌ | 100% | 15 |
| `workflow-validator.ts` | ✅ | ❌ | 100% | 17 |
| `lora-path-resolver.ts` | ✅ | ❌ | 95% | 18 |
| `schemas.ts` | ✅ | ❌ | 100% | 10 |
| `comfy-client.ts` | ✅ | ✅ | 90% | 12 |

**Total BDD Scenarios**: 96 scenarios

**Test Breakdown**:
- **Unit tests**: 84 scenarios (covers all logic without external dependencies)
- **Integration tests**: 12 scenarios (requires running ComfyUI instance)

**Coverage Commands**:
```bash
# Run all unit tests with coverage
pnpm --filter worker test --coverage

# Run integration tests (requires ComfyUI)
COMFYUI_URL=http://localhost:8188 pnpm --filter worker test:integration

# Coverage report location
apps/worker/coverage/lcov-report/index.html
```

**Coverage Assertion**:
```json
// apps/worker/jest.config.js
{
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    },
    "./src/lib/comfy/": {
      "branches": 95,
      "functions": 95,
      "lines": 95,
      "statements": 95
    }
  }
}
```

**Test Files**:
- `apps/worker/src/lib/comfy/__tests__/node-factory.spec.ts`
- `apps/worker/src/lib/comfy/__tests__/workflow-builder.spec.ts`
- `apps/worker/src/lib/comfy/__tests__/workflow-validator.spec.ts`
- `apps/worker/src/lib/comfy/__tests__/lora-path-resolver.spec.ts`
- `apps/worker/src/lib/comfy/__tests__/comfy-integration.spec.ts`
- `apps/worker/src/lib/comfy/__tests__/comfy-client.integration.spec.ts`

**Total Coverage**: 90%+ overall, 95%+ on core modules

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total BDD Scenarios** | 96 |
| **DoD Items** | 8 |
| **Test Files** | 6 |
| **Features in BDD File** | 20 |
| **Scenarios per DoD Item (avg)** | 12 |
| **Coverage Target** | 90-100% |

## Implementation Progress Tracking

Use this checklist to track DoD completion as you implement:

- [ ] **DoD 1**: Core workflow builder functions exist
  - [ ] All 15 workflow builder scenarios pass
  - [ ] Functions exported from `workflow-builder.ts`

- [ ] **DoD 2**: Workflow validation with clear errors
  - [ ] All 17 validation scenarios pass
  - [ ] Error messages are actionable

- [ ] **DoD 3**: Node factory with type-safe parameters
  - [ ] All 24 node factory scenarios pass
  - [ ] TypeScript types enforce correctness

- [ ] **DoD 4**: Zod schemas for runtime validation
  - [ ] All 10 parameter validation scenarios pass
  - [ ] Schemas exported from `schemas.ts`

- [ ] **DoD 5**: Integration with ComfyUI client
  - [ ] All 12 integration scenarios pass
  - [ ] Client can submit workflows to ComfyUI

- [ ] **DoD 6**: LoRA path resolution and validation
  - [ ] All 18 path resolution scenarios pass
  - [ ] Works on both Linux and Windows

- [ ] **DoD 7**: Documentation and examples
  - [ ] README.md with usage examples
  - [ ] JSDoc comments on all public functions

- [ ] **DoD 8**: Test coverage ≥ 90%
  - [ ] Unit test coverage report shows ≥ 90%
  - [ ] Integration tests pass with running ComfyUI
  - [ ] Coverage thresholds enforced in Jest config

---

## Next Steps

1. **Review BDD scenarios** with team/stakeholders
2. **Start TDD implementation** following the test strategy in `comfyui-workflow-templates-test-strategy.md`
3. **Update this checklist** as each DoD item is completed
4. **Update Issue #176** with progress and links to test results
5. **Close issue** when all DoD items are checked off
