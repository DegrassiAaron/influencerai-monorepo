/**
 * ComfyUI Workflow Types and Schemas
 *
 * Defines TypeScript types and Zod schemas for ComfyUI workflows.
 * All types are inferred from Zod schemas for runtime validation.
 */

import { z } from 'zod';

// ==============================================================================
// Node Connection and Input Types
// ==============================================================================

/**
 * Node connection type: [node_id, output_index]
 * Used to connect outputs from one node to inputs of another
 */
export const NodeConnectionSchema = z.tuple([z.string(), z.number()]);
export type NodeConnection = z.infer<typeof NodeConnectionSchema>;

/**
 * Node input value - can be a direct value or a connection to another node
 */
export const NodeInputSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  NodeConnectionSchema,
]);
export type NodeInput = z.infer<typeof NodeInputSchema>;

// ==============================================================================
// ComfyUI Node and Workflow Types
// ==============================================================================

/**
 * ComfyUI node definition
 */
export const ComfyNodeSchema = z.object({
  class_type: z.string(),
  inputs: z.record(z.string(), NodeInputSchema),
  _meta: z.object({ title: z.string().optional() }).optional(),
});
export type ComfyNode = z.infer<typeof ComfyNodeSchema>;

/**
 * Full ComfyUI workflow - a record of node IDs to nodes
 */
export const ComfyWorkflowSchema = z.record(z.string(), ComfyNodeSchema);
export type ComfyWorkflow = z.infer<typeof ComfyWorkflowSchema>;

// ==============================================================================
// LoRA Configuration
// ==============================================================================

/**
 * LoRA configuration for a single LoRA
 */
export const LoraConfigSchema = z.object({
  path: z.string().min(1, 'LoRA path is required'),
  strengthModel: z.number().min(0).max(100).default(1.0),
  strengthClip: z.number().min(0).max(100).default(1.0),
});
export type LoraConfig = z.infer<typeof LoraConfigSchema>;

// ==============================================================================
// Image Generation Parameters
// ==============================================================================

/**
 * Image generation parameters for workflow building
 */
export const ImageGenerationParamsSchema = z.object({
  checkpoint: z.string().min(1, 'Checkpoint name is required'),
  positivePrompt: z.string().min(1, 'Positive prompt is required'),
  negativePrompt: z.string().default(''),
  width: z.number().int().multipleOf(8).min(256).max(2048),
  height: z.number().int().multipleOf(8).min(256).max(2048),
  seed: z.number().int().min(0).optional(),
  steps: z.number().int().min(1).max(150).default(20),
  cfg: z.number().min(1).max(30).default(7.0),
  samplerName: z
    .enum([
      'euler',
      'euler_a',
      'dpmpp_2m',
      'dpmpp_2m_sde',
      'ddim',
      'uni_pc',
      'heun',
      'lms',
    ])
    .default('euler'),
  scheduler: z
    .enum(['normal', 'karras', 'exponential', 'simple'])
    .default('normal'),
  loraConfig: LoraConfigSchema.optional(),
  multiLoraConfigs: z.array(LoraConfigSchema).max(5).optional(),
});
export type ImageGenerationParams = z.infer<typeof ImageGenerationParamsSchema>;
