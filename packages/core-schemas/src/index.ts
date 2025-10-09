import { z } from 'zod';

// Queue summary
export const QueueSummarySchema = z.object({
  active: z.number().int().nonnegative(),
  waiting: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export type QueueSummary = z.infer<typeof QueueSummarySchema>;

// Job Specifications
export const JobSpecSchema = z.object({
  type: z.enum(['content-generation', 'lora-training', 'video-generation']),
  priority: z.number().min(0).max(10).default(5),
  payload: z.record(z.any()),
});

export type JobSpec = z.infer<typeof JobSpecSchema>;

// Content Plan
export const ContentPlanSchema = z.object({
  influencerId: z.string(),
  theme: z.string(),
  targetPlatforms: z.array(z.enum(['instagram', 'tiktok', 'youtube'])),
  posts: z.array(
    z.object({
      caption: z.string(),
      hashtags: z.array(z.string()),
      scheduledAt: z.string().datetime().optional(),
    })
  ),
  createdAt: z.string().datetime(),
});

export type ContentPlan = z.infer<typeof ContentPlanSchema>;

// Dataset Specification
export const DatasetSpecSchema = z.object({
  name: z.string(),
  kind: z.enum(['lora-training', 'reference']),
  path: z.string(),
  imageCount: z.number().int().positive(),
  captioned: z.boolean(),
  meta: z.record(z.any()).optional(),
});

export type DatasetSpec = z.infer<typeof DatasetSpecSchema>;

// LoRA Configuration
export const LoRAConfigSchema = z.object({
  modelName: z.string(),
  datasetPath: z.string(),
  outputPath: z.string(),
  epochs: z.number().int().positive().default(10),
  learningRate: z.number().positive().default(1e-4),
  batchSize: z.number().int().positive().default(1),
  resolution: z.number().int().positive().default(512),
  networkDim: z.number().int().positive().default(32),
  networkAlpha: z.number().int().positive().default(16),
});

export type LoRAConfig = z.infer<typeof LoRAConfigSchema>;