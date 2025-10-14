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
  meta: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Dataset = z.infer<typeof DatasetSchema>;

export const DatasetListSchema = z.array(DatasetSchema);

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
