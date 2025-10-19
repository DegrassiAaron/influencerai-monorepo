import type { ListJobsParams, ListDatasetsParams, ListLoraConfigsParams } from '../index';

const JOBS_ROOT = ['influencerai', 'jobs'] as const;
const DATASETS_ROOT = ['influencerai', 'datasets'] as const;
const QUEUES_ROOT = ['influencerai', 'queues'] as const;
const CONTENT_PLANS_ROOT = ['influencerai', 'content-plans'] as const;
const LORA_CONFIGS_ROOT = ['influencerai', 'lora-configs'] as const;

function normalizeJobsFilters(filters?: ListJobsParams) {
  return [
    filters?.status ?? null,
    filters?.type ?? null,
    filters?.take ?? null,
    filters?.skip ?? null,
  ] as const;
}

/**
 * Normalizes dataset filter parameters into a stable query key format
 *
 * @param params - Optional dataset query parameters
 * @returns Normalized tuple of filter values for cache key stability
 */
function normalizeDatasetsFilters(params?: ListDatasetsParams) {
  return [
    params?.status ?? null,
    params?.kind ?? null,
    params?.take ?? null,
    params?.skip ?? null,
    params?.sortBy ?? null,
    params?.sortOrder ?? null,
  ] as const;
}

/**
 * Normalizes LoRA config filter parameters into a stable query key format
 *
 * @param params - Optional LoRA config query parameters
 * @returns Normalized tuple of filter values for cache key stability
 */
function normalizeLoraConfigsFilters(params?: ListLoraConfigsParams) {
  return [
    params?.isDefault ?? null,
    params?.modelName ?? null,
    params?.take ?? null,
    params?.skip ?? null,
    params?.sortBy ?? null,
    params?.sortOrder ?? null,
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
    list: (params?: ListDatasetsParams) =>
      [...DATASETS_ROOT, 'list', ...normalizeDatasetsFilters(params)] as const,
    detail: (id: string) => [...DATASETS_ROOT, 'detail', id] as const,
  },
  queues: {
    root: QUEUES_ROOT,
    summary: () => [...QUEUES_ROOT, 'summary'] as const,
  },
  contentPlans: {
    root: CONTENT_PLANS_ROOT,
    detail: (id: string) => [...CONTENT_PLANS_ROOT, 'detail', id] as const,
  },
  loraConfigs: {
    root: LORA_CONFIGS_ROOT,
    list: (params?: ListLoraConfigsParams) =>
      [...LORA_CONFIGS_ROOT, 'list', ...normalizeLoraConfigsFilters(params)] as const,
    detail: (id: string) => [...LORA_CONFIGS_ROOT, 'detail', id] as const,
  },
} as const;

export type InfluencerAIQueryKeys = typeof influencerAIQueryKeys;
