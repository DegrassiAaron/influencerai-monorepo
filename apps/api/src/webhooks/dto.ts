import { z } from 'zod';
import {
  CreatePipelineExecutionSchema,
  UpdatePipelineProgressSchema,
} from '../pipelines/dto';

export const PipelineStartWebhookSchema = CreatePipelineExecutionSchema;
export type PipelineStartWebhookDto = z.infer<typeof PipelineStartWebhookSchema>;

export const PipelineProgressWebhookSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  executionId: z
    .string()
    .min(1, 'Execution ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Execution ID must be alphanumeric with hyphens/underscores'),
  updates: UpdatePipelineProgressSchema.refine(
    (value) => Object.keys(value).length > 0,
    'At least one field must be provided in updates'
  ),
});
export type PipelineProgressWebhookDto = z.infer<typeof PipelineProgressWebhookSchema>;
