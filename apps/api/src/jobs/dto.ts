import { z } from 'zod';

export const JobTypeSchema = z.enum(['content-generation', 'lora-training', 'video-generation']);

export const CreateJobSchema = z.object({
  type: JobTypeSchema,
  payload: z.record(z.any()),
  priority: z.number().int().min(1).max(10).optional(),
});

export type CreateJobDto = z.infer<typeof CreateJobSchema>;

export const ListJobsQuerySchema = z.object({
  status: z.string().min(1).optional(),
  type: JobTypeSchema.optional(),
  take: z.coerce.number().int().min(1).max(100).default(20).optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListJobsQuery = z.infer<typeof ListJobsQuerySchema>;

export const UpdateJobSchema = z.object({
  status: z.string().min(1).optional(),
  result: z.any().optional(),
  costTok: z.number().int().nonnegative().optional(),
});

export type UpdateJobDto = z.infer<typeof UpdateJobSchema>;
