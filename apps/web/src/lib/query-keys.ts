/**
 * Type-safe query key factory for TanStack Query
 *
 * This module provides a centralized query key factory following best practices
 * for cache invalidation and query organization. Keys are hierarchical and
 * designed for efficient partial invalidation.
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

/**
 * Query key factory for jobs
 *
 * Hierarchy:
 * - ['jobs'] - Root key, invalidate to clear all job queries
 * - ['jobs', 'list'] - List queries root
 * - ['jobs', 'list', filters] - Specific list query with filters
 * - ['jobs', 'detail'] - Detail queries root
 * - ['jobs', 'detail', id] - Specific job detail query
 */
export const queryKeys = {
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.jobs.lists(), filters] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
  },

  /**
   * Query key factory for datasets
   *
   * Hierarchy:
   * - ['datasets'] - Root key
   * - ['datasets', 'list'] - List queries root
   * - ['datasets', 'list', filters] - Specific list query
   * - ['datasets', 'detail'] - Detail queries root
   * - ['datasets', 'detail', id] - Specific dataset detail
   */
  datasets: {
    all: ['datasets'] as const,
    lists: () => [...queryKeys.datasets.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.datasets.lists(), filters] as const,
    details: () => [...queryKeys.datasets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.datasets.details(), id] as const,
  },

  /**
   * Query key factory for LoRA configurations
   *
   * Hierarchy:
   * - ['lora-configs'] - Root key
   * - ['lora-configs', 'list'] - List queries root
   * - ['lora-configs', 'list', filters] - Specific list query
   * - ['lora-configs', 'detail'] - Detail queries root
   * - ['lora-configs', 'detail', id] - Specific config detail
   */
  loraConfigs: {
    all: ['lora-configs'] as const,
    lists: () => [...queryKeys.loraConfigs.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.loraConfigs.lists(), filters] as const,
    details: () => [...queryKeys.loraConfigs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.loraConfigs.details(), id] as const,
  },

  /**
   * Query key factory for content plans
   *
   * Hierarchy:
   * - ['content-plans'] - Root key
   * - ['content-plans', 'list'] - List queries root
   * - ['content-plans', 'list', filters] - Specific list query
   * - ['content-plans', 'detail'] - Detail queries root
   * - ['content-plans', 'detail', id] - Specific plan detail
   */
  contentPlans: {
    all: ['content-plans'] as const,
    lists: () => [...queryKeys.contentPlans.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.contentPlans.lists(), filters] as const,
    details: () => [...queryKeys.contentPlans.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contentPlans.details(), id] as const,
  },

  /**
   * Query key factory for queue summaries
   *
   * Hierarchy:
   * - ['queues'] - Root key
   * - ['queues', 'summary'] - Queue summary query
   */
  queues: {
    all: ['queues'] as const,
    summary: () => [...queryKeys.queues.all, 'summary'] as const,
  },
} as const;

/**
 * Type-safe query key factory type
 *
 * Use this type to ensure query key consistency across the app.
 */
export type QueryKeys = typeof queryKeys;

/**
 * Example usage:
 *
 * ```typescript
 * // Invalidate all job queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
 *
 * // Invalidate all job list queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
 *
 * // Invalidate specific job detail
 * queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail('job_123') });
 *
 * // Use in a query
 * useQuery({
 *   queryKey: queryKeys.jobs.detail(jobId),
 *   queryFn: () => fetchJob(jobId)
 * });
 *
 * // Use in a list query with filters
 * useQuery({
 *   queryKey: queryKeys.jobs.list({ status: 'running' }),
 *   queryFn: () => fetchJobs({ status: 'running' })
 * });
 * ```
 */
