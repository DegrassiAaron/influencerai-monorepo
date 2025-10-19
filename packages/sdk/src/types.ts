import { z } from 'zod';
import { ContentPlanSchema } from './core-schemas';

export const JobResponseSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  status: z
    .enum(['pending', 'running', 'succeeded', 'failed', 'completed'])
    .or(z.string())
    .optional(),
  payload: z.unknown().optional(),
  result: z.unknown().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  priority: z.number().optional(),
  parentJobId: z.string().optional(),
  costTok: z.number().optional(),
});

export type JobResponse = z.infer<typeof JobResponseSchema>;

export const JobListSchema = z.array(JobResponseSchema);

export interface QueueSummary {
  active: number;
  waiting: number;
  failed: number;
}

export const DatasetSchema = z.object({
  id: z.string(),
  kind: z.string(),
  path: z.string(),
  status: z.string(),
  name: z.string(),
  description: z.string().optional(),
  imageCount: z.number().int(),
  meta: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type Dataset = z.infer<typeof DatasetSchema>;

export const DatasetListSchema = z.array(DatasetSchema);

/**
 * Query parameters for listing datasets
 */
export const ListDatasetsParamsSchema = z.object({
  status: z.string().optional(),
  kind: z.string().optional(),
  take: z.number().int().min(1).max(100).optional(),
  skip: z.number().int().min(0).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'kind', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListDatasetsParams = z.infer<typeof ListDatasetsParamsSchema>;

export const CreateDatasetInputSchema = z.object({
  kind: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1).optional(),
  meta: z.record(z.unknown()).optional(),
});

export type CreateDatasetInput = z.infer<typeof CreateDatasetInputSchema>;

export const DatasetCreationSchema = z.object({
  id: z.string(),
  uploadUrl: z.string().min(1),
  key: z.string(),
  bucket: z.string(),
});

export type CreateDatasetResponse = z.infer<typeof DatasetCreationSchema>;

export const ContentPlanEnvelopeSchema = z.object({
  id: z.string(),
  plan: ContentPlanSchema,
});

export type ContentPlanEnvelope = z.infer<typeof ContentPlanEnvelopeSchema>;

export const ContentPlanListSchema = z.array(ContentPlanEnvelopeSchema);

export const ListContentPlansParamsSchema = z.object({
  influencerId: z.string().min(1).optional(),
  take: z.number().int().min(1).max(100).optional(),
  skip: z.number().int().min(0).optional(),
});

export type ListContentPlansParams = z.infer<typeof ListContentPlansParamsSchema>;

/**
 * LoRA Configuration Schema
 *
 * Represents a LoRA training configuration with all hyperparameters.
 */
export const LoraConfigSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  modelName: z.string(),
  epochs: z.number().int(),
  learningRate: z.number(),
  batchSize: z.number().int(),
  resolution: z.number().int(),
  networkDim: z.number().int(),
  networkAlpha: z.number().int(),
  outputPath: z.string().optional(),
  meta: z.record(z.unknown()),
  isDefault: z.boolean(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type LoraConfig = z.infer<typeof LoraConfigSchema>;

export const LoraConfigListSchema = z.array(LoraConfigSchema);

/**
 * Query parameters for listing LoRA configurations
 */
export const ListLoraConfigsParamsSchema = z.object({
  isDefault: z.boolean().optional(),
  modelName: z.string().optional(),
  take: z.number().int().min(1).max(100).optional(),
  skip: z.number().int().min(0).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListLoraConfigsParams = z.infer<typeof ListLoraConfigsParamsSchema>;

/**
 * Input for creating a LoRA configuration
 */
export const CreateLoraConfigInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  modelName: z.string().min(1).max(50),
  epochs: z.number().int().min(1).max(1000).optional(),
  learningRate: z.number().min(0.000001).max(1).optional(),
  batchSize: z.number().int().min(1).max(64).optional(),
  resolution: z.number().int().min(128).max(2048).optional(),
  networkDim: z.number().int().min(1).max(512).optional(),
  networkAlpha: z.number().int().min(1).max(512).optional(),
  outputPath: z.string().max(255).optional(),
  meta: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

export type CreateLoraConfigInput = z.infer<typeof CreateLoraConfigInputSchema>;

/**
 * Input for updating a LoRA configuration (partial)
 */
export const UpdateLoraConfigInputSchema = CreateLoraConfigInputSchema.partial();

export type UpdateLoraConfigInput = z.infer<typeof UpdateLoraConfigInputSchema>;
