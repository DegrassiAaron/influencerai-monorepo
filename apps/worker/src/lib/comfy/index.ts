/**
 * ComfyUI Workflow Templates - Public API
 *
 * Main entry point for ComfyUI workflow generation functionality.
 * Exports all public functions, types, and schemas.
 */

// ==============================================================================
// Type Definitions and Schemas
// ==============================================================================

export type {
  NodeConnection,
  NodeInput,
  ComfyNode,
  ComfyWorkflow,
  LoraConfig,
  ImageGenerationParams,
} from './workflow-types';

export {
  NodeConnectionSchema,
  NodeInputSchema,
  ComfyNodeSchema,
  ComfyWorkflowSchema,
  LoraConfigSchema,
  ImageGenerationParamsSchema,
} from './workflow-types';

// ==============================================================================
// Node Factory Functions
// ==============================================================================

export {
  createCheckpointLoaderNode,
  createLoraLoaderNode,
  createClipTextEncodeNode,
  createEmptyLatentImageNode,
  createKSamplerNode,
  createVaeDecodeNode,
  createSaveImageNode,
  generateSeed,
} from './node-factory';

// ==============================================================================
// Workflow Builders
// ==============================================================================

export {
  buildBasicTxt2ImgWorkflow,
  buildLoraTxt2ImgWorkflow,
  buildMultiLoraTxt2ImgWorkflow,
  buildImageWorkflow,
} from './workflow-builder';

// ==============================================================================
// Workflow Validation
// ==============================================================================

export type { ValidationResult } from './workflow-validator';

export {
  validateWorkflow,
  validateConnections,
  validateWorkflowFull,
} from './workflow-validator';

// ==============================================================================
// LoRA Path Resolution
// ==============================================================================

export {
  resolveLoraPath,
  validateLoraPath,
  validateLoraExtension,
  getLorasDirectory,
} from './lora-path-resolver';

// ==============================================================================
// Integration Helpers
// ==============================================================================

export type {
  ImageGenerationJobParams,
  ComfyClientConfig,
  SubmitWorkflowResult,
  SubmitAndWaitResult,
} from './integration';

export {
  buildWorkflowFromJobParams,
  submitWorkflowToComfyUI,
  createComfyImageClient,
} from './integration';
