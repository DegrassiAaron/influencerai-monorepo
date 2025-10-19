import { z } from 'zod';

import { apiGet } from './api';

const JobStatusSchema = z.enum(['pending', 'running', 'succeeded', 'failed', 'completed']);

const JobTypeSchema = z.enum([
  'content-generation',
  'image-generation',
  'lora-training',
  'video-generation',
]);

const JobSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  type: JobTypeSchema,
  status: JobStatusSchema,
  payload: z.unknown().optional(),
  result: z.unknown().nullable().optional(),
  costTok: z.number().int().nonnegative().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const JobListSchema = z.array(JobSchema);

const ListJobsParamsSchema = z.object({
  status: JobStatusSchema.optional(),
  type: JobTypeSchema.optional(),
  take: z.number().int().min(1).max(100).optional(),
  skip: z.number().int().min(0).optional(),
});

export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobType = z.infer<typeof JobTypeSchema>;
export type JobRecord = z.infer<typeof JobSchema>;
export type ListJobsParams = z.infer<typeof ListJobsParamsSchema>;

function buildQueryString(params: ListJobsParams) {
  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (params.type) {
    searchParams.set('type', params.type);
  }

  if (typeof params.take === 'number') {
    searchParams.set('take', String(params.take));
  }

  if (typeof params.skip === 'number') {
    searchParams.set('skip', String(params.skip));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function listJobs(params: ListJobsParams = {}) {
  const parsedParams = ListJobsParamsSchema.parse(params);
  const queryString = buildQueryString(parsedParams);
  const response = await apiGet<unknown>(`/jobs${queryString}`);
  const parsedResponse = JobListSchema.safeParse(response);

  if (!parsedResponse.success) {
    throw new Error('Invalid response format while listing jobs');
  }

  return parsedResponse.data;
}
