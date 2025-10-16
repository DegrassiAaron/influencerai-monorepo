import type { ListJobsParams } from '../index';

const JOBS_ROOT = ['influencerai', 'jobs'] as const;
const DATASETS_ROOT = ['influencerai', 'datasets'] as const;
const QUEUES_ROOT = ['influencerai', 'queues'] as const;
const CONTENT_PLANS_ROOT = ['influencerai', 'content-plans'] as const;

function normalizeJobsFilters(filters?: ListJobsParams) {
  return [
    filters?.status ?? null,
    filters?.type ?? null,
    filters?.take ?? null,
    filters?.skip ?? null,
  ] as const;
}

export const influencerAIQueryKeys = {
  jobs: {
    root: JOBS_ROOT,
    list: (filters?: ListJobsParams) =>
      [...JOBS_ROOT, 'list', ...normalizeJobsFilters(filters)] as const,
    detail: (id: string) => [...JOBS_ROOT, 'detail', id] as const,
  },
  datasets: {
    root: DATASETS_ROOT,
    list: () => [...DATASETS_ROOT, 'list'] as const,
  },
  queues: {
    root: QUEUES_ROOT,
    summary: () => [...QUEUES_ROOT, 'summary'] as const,
  },
  contentPlans: {
    root: CONTENT_PLANS_ROOT,
    detail: (id: string) => [...CONTENT_PLANS_ROOT, 'detail', id] as const,
  },
} as const;

export type InfluencerAIQueryKeys = typeof influencerAIQueryKeys;
