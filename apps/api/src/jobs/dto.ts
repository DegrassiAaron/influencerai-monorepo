import { QueueSummarySchema as SharedQueueSummarySchema } from '@influencerai/core-schemas';
import { z } from 'zod';

export const QueueSummarySchema = SharedQueueSummarySchema;

export type QueueSummaryDto = z.infer<typeof QueueSummarySchema>;

export const JobTypeSchema = z.enum(['content-generation', 'lora-training', 'video-generation']);

export const JobStatusSchema = z.enum(['pending', 'running', 'succeeded', 'failed', 'completed']);

const windowRegex = /^\d+(?:m|h|d)$/i;

export const JobSeriesQuerySchema = z.object({
  window: z
    .string()
    .trim()
    .toLowerCase()
    .regex(windowRegex, 'Invalid window format. Use values like 1h or 24h.')
    .optional()
    .default('24h'),
});

export type JobSeriesQuery = z.infer<typeof JobSeriesQuerySchema>;

export const CreateJobSchema = z.object({
  type: JobTypeSchema,
  payload: z.record(z.any()),
  priority: z.number().int().min(1).max(10).optional(),
});

export type CreateJobDto = z.infer<typeof CreateJobSchema>;

export const ListJobsQuerySchema = z.object({
  status: JobStatusSchema.optional(),
  type: JobTypeSchema.optional(),
  take: z.coerce.number().int().min(1).max(100).default(20).optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListJobsQuery = z.infer<typeof ListJobsQuerySchema>;

export const UpdateJobSchema = z.object({
  status: JobStatusSchema.optional(),
  result: z.any().optional(),
  costTok: z.number().int().nonnegative().optional(),
});

export type UpdateJobDto = z.infer<typeof UpdateJobSchema>;

export type JobStatus = z.infer<typeof JobStatusSchema>;
