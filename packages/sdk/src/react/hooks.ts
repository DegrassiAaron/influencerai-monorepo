import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  CreateDatasetInput,
  CreateDatasetResponse,
  Dataset,
  JobResponse,
  QueueSummary,
  ContentPlanEnvelope,
  ListDatasetsParams,
  LoraConfig,
  ListLoraConfigsParams,
} from '../types';
import type { JobSpec, ContentPlan } from '../core-schemas';
import type { ListJobsParams, UpdateJobInput } from '../index';
import type { APIError as InfluencerAIAPIError } from '../fetch-utils';
import { useInfluencerAIClient } from './provider';
import { influencerAIQueryKeys } from './query-keys';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, InfluencerAIAPIError>,
  'queryKey' | 'queryFn'
>;

type MutationOptions<TData, TVariables, TContext = unknown> = Omit<
  UseMutationOptions<TData, InfluencerAIAPIError, TVariables, TContext>,
  'mutationFn'
>;

type MutationSuccessHandler<TData, TVariables, TContext> = NonNullable<
  UseMutationOptions<TData, InfluencerAIAPIError, TVariables, TContext>['onSuccess']
>;

async function runMutationSuccess<TData, TVariables, TContext>(
  handler: MutationSuccessHandler<TData, TVariables, TContext> | undefined,
  data: TData,
  variables: TVariables,
  context: Parameters<MutationSuccessHandler<TData, TVariables, TContext>>[2],
  meta: UseMutationOptions<TData, InfluencerAIAPIError, TVariables, TContext>['meta']
) {
  if (!handler) {
    return;
  }
  const mutationContext = { meta } as Parameters<
    MutationSuccessHandler<TData, TVariables, TContext>
  >[3];
  await handler(data, variables, context, mutationContext);
}

export type UseJobsOptions = QueryOptions<JobResponse[]>;
export type UseJobOptions = QueryOptions<JobResponse>;
export type UseDatasetsOptions = QueryOptions<Dataset[]>;
export type UseDatasetOptions = QueryOptions<Dataset>;
export type UseQueuesSummaryOptions = QueryOptions<QueueSummary>;
export type UseContentPlanOptions = QueryOptions<ContentPlanEnvelope>;
export type UseCreateJobOptions<TContext = unknown> = MutationOptions<
  JobResponse,
  JobSpec,
  TContext
>;
export type UseCreateDatasetOptions<TContext = unknown> = MutationOptions<
  CreateDatasetResponse,
  CreateDatasetInput,
  TContext
>;
export type DeleteDatasetVariables = { id: string };
export type UseDeleteDatasetOptions<TContext = unknown> = MutationOptions<
  void,
  DeleteDatasetVariables,
  TContext
>;
export type UpdateJobVariables = { id: string; update: UpdateJobInput };
export type UseUpdateJobOptions<TContext = unknown> = MutationOptions<
  JobResponse,
  UpdateJobVariables,
  TContext
>;
export type UseCreateContentPlanOptions<TContext = unknown> = MutationOptions<
  ContentPlanEnvelope,
  Omit<ContentPlan, 'createdAt'>,
  TContext
>;

export function useJobs(
  filters?: ListJobsParams,
  options?: UseJobsOptions
): UseQueryResult<JobResponse[], InfluencerAIAPIError> {
  const client = useInfluencerAIClient();

  return useQuery<JobResponse[], InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.jobs.list(filters),
    queryFn: () => client.listJobs(filters ?? {}),
    ...options,
  });
}

/**
 * Extended options for useJob hook with polling support
 */
export interface UseJobOptionsExtended extends UseJobOptions {
  /** Enable automatic polling for active jobs (default: false) */
  polling?: boolean;
  /** Custom polling interval in milliseconds (default: 2000) */
  refetchInterval?: number;
}

/**
 * Fetches a single job by ID with optional polling support
 *
 * @param id - Job ID to fetch
 * @param options - Query options including polling configuration
 * @returns Query result containing the job
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data: job } = useJob('job_123');
 *
 * // With polling for active jobs
 * const { data: job } = useJob('job_123', {
 *   polling: true,
 *   refetchInterval: 2000  // Poll every 2 seconds
 * });
 *
 * // Polling automatically stops when job reaches terminal state
 * ```
 */
export function useJob(
  id: string,
  options?: UseJobOptionsExtended
): UseQueryResult<JobResponse, InfluencerAIAPIError> {
  const client = useInfluencerAIClient();
  const { polling, refetchInterval: customInterval, ...queryOptions } = options ?? {};

  return useQuery<JobResponse, InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.jobs.detail(id),
    queryFn: () => client.getJob(id),
    enabled: queryOptions?.enabled ?? Boolean(id),
    refetchOnWindowFocus: polling ? true : queryOptions?.refetchOnWindowFocus,
    refetchInterval: (query) => {
      // Only poll if polling is explicitly enabled
      if (!polling) {
        return false;
      }

      const job = query.state.data;
      if (!job) {
        return false;
      }

      // Poll active jobs (pending or running status)
      if (job.status === 'pending' || job.status === 'running') {
        return customInterval ?? 2000;
      }

      // Stop polling for terminal states (succeeded, failed, completed)
      return false;
    },
    ...queryOptions,
  });
}

/**
 * Fetches a list of datasets with optional filtering and pagination
 *
 * @param params - Query parameters for filtering, pagination, and sorting
 * @param options - TanStack Query options
 * @returns Query result containing array of datasets
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data: datasets, isLoading } = useDatasets();
 *
 * // With pagination and filters
 * const { data: readyDatasets } = useDatasets({
 *   status: 'ready',
 *   take: 20,
 *   skip: 0,
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc'
 * });
 * ```
 */
export function useDatasets(
  params?: ListDatasetsParams,
  options?: UseDatasetsOptions
): UseQueryResult<Dataset[], InfluencerAIAPIError> {
  const client = useInfluencerAIClient();

  return useQuery<Dataset[], InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.datasets.list(params),
    queryFn: () => client.listDatasets(params ?? {}),
    ...options,
  });
}

/**
 * Fetches a single dataset by ID
 *
 * @param id - Dataset ID to fetch
 * @param options - TanStack Query options
 * @returns Query result containing the dataset
 *
 * @example
 * ```tsx
 * const { data: dataset, isLoading, error } = useDataset('ds_123');
 *
 * // With custom options
 * const { data } = useDataset('ds_123', {
 *   enabled: !!datasetId,
 *   refetchOnWindowFocus: false
 * });
 * ```
 */
export function useDataset(
  id: string,
  options?: UseDatasetOptions
): UseQueryResult<Dataset, InfluencerAIAPIError> {
  const client = useInfluencerAIClient();

  return useQuery<Dataset, InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.datasets.detail(id),
    queryFn: () => client.getDataset(id),
    enabled: options?.enabled ?? Boolean(id),
    ...options,
  });
}

export function useQueuesSummary(
  options?: UseQueuesSummaryOptions
): UseQueryResult<QueueSummary, InfluencerAIAPIError> {
  const client = useInfluencerAIClient();

  return useQuery<QueueSummary, InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.queues.summary(),
    queryFn: () => client.getQueuesSummary(),
    ...options,
  });
}

export function useContentPlan(
  id: string,
  options?: UseContentPlanOptions
): UseQueryResult<ContentPlanEnvelope, InfluencerAIAPIError> {
  const client = useInfluencerAIClient();

  return useQuery<ContentPlanEnvelope, InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.contentPlans.detail(id),
    queryFn: () => client.getContentPlan(id),
    enabled: options?.enabled ?? Boolean(id),
    ...options,
  });
}

export function useCreateJob<TContext = unknown>(
  options?: UseCreateJobOptions<TContext>
): UseMutationResult<JobResponse, InfluencerAIAPIError, JobSpec, TContext> {
  const client = useInfluencerAIClient();
  const queryClient = useQueryClient();
  const { onSuccess, meta, ...rest } = options ?? {};

  return useMutation<JobResponse, InfluencerAIAPIError, JobSpec, TContext>({
    mutationFn: (input) => client.createJob(input),
    async onSuccess(data, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: influencerAIQueryKeys.jobs.root }),
        queryClient.invalidateQueries({ queryKey: influencerAIQueryKeys.queues.root }),
      ]);
      await runMutationSuccess(onSuccess, data, variables, context, meta);
    },
    meta,
    ...rest,
  });
}

export function useUpdateJob<TContext = unknown>(
  options?: UseUpdateJobOptions<TContext>
): UseMutationResult<JobResponse, InfluencerAIAPIError, UpdateJobVariables, TContext> {
  const client = useInfluencerAIClient();
  const queryClient = useQueryClient();
  const { onSuccess, meta, ...rest } = options ?? {};

  return useMutation<JobResponse, InfluencerAIAPIError, UpdateJobVariables, TContext>({
    mutationFn: ({ id, update }) => client.updateJob(id, update),
    async onSuccess(data, variables, context) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: influencerAIQueryKeys.jobs.root }),
        queryClient.invalidateQueries({
          queryKey: influencerAIQueryKeys.jobs.detail(variables.id),
        }),
      ]);
      await runMutationSuccess(onSuccess, data, variables, context, meta);
    },
    meta,
    ...rest,
  });
}

export function useCreateDataset<TContext = unknown>(
  options?: UseCreateDatasetOptions<TContext>
): UseMutationResult<CreateDatasetResponse, InfluencerAIAPIError, CreateDatasetInput, TContext> {
  const client = useInfluencerAIClient();
  const queryClient = useQueryClient();
  const { onSuccess, meta, ...rest } = options ?? {};

  return useMutation<CreateDatasetResponse, InfluencerAIAPIError, CreateDatasetInput, TContext>({
    mutationFn: (input) => client.createDataset(input),
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({ queryKey: influencerAIQueryKeys.datasets.root });
      await runMutationSuccess(onSuccess, data, variables, context, meta);
    },
    meta,
    ...rest,
  });
}

/**
 * Deletes a dataset and invalidates related queries
 *
 * @param options - TanStack Query mutation options
 * @returns Mutation result for deleting a dataset
 *
 * @example
 * ```tsx
 * const deleteDataset = useDeleteDataset({
 *   onSuccess: () => {
 *     toast.success('Dataset deleted successfully');
 *     navigate('/datasets');
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed to delete: ${error.message}`);
 *   }
 * });
 *
 * // Use in a component
 * <Button onClick={() => deleteDataset.mutate({ id: 'ds_123' })}>
 *   Delete
 * </Button>
 *
 * // Or with async/await
 * try {
 *   await deleteDataset.mutateAsync({ id: 'ds_123' });
 * } catch (error) {
 *   console.error('Delete failed:', error);
 * }
 * ```
 */
export function useDeleteDataset<TContext = unknown>(
  options?: UseDeleteDatasetOptions<TContext>
): UseMutationResult<void, InfluencerAIAPIError, DeleteDatasetVariables, TContext> {
  const client = useInfluencerAIClient();
  const queryClient = useQueryClient();
  const { onSuccess, meta, ...rest } = options ?? {};

  return useMutation<void, InfluencerAIAPIError, DeleteDatasetVariables, TContext>({
    mutationFn: ({ id }) => client.deleteDataset(id),
    async onSuccess(data, variables, context) {
      // Invalidate both list and detail queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: influencerAIQueryKeys.datasets.root }),
        queryClient.invalidateQueries({
          queryKey: influencerAIQueryKeys.datasets.detail(variables.id),
        }),
      ]);
      await runMutationSuccess(onSuccess, data, variables, context, meta);
    },
    meta,
    ...rest,
  });
}

export function useCreateContentPlan<TContext = unknown>(
  options?: UseCreateContentPlanOptions<TContext>
): UseMutationResult<
  ContentPlanEnvelope,
  InfluencerAIAPIError,
  Omit<ContentPlan, 'createdAt'>,
  TContext
> {
  const client = useInfluencerAIClient();
  const queryClient = useQueryClient();
  const { onSuccess, meta, ...rest } = options ?? {};

  return useMutation<
    ContentPlanEnvelope,
    InfluencerAIAPIError,
    Omit<ContentPlan, 'createdAt'>,
    TContext
  >({
    mutationFn: (input) => client.createContentPlan(input),
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({ queryKey: influencerAIQueryKeys.contentPlans.root });
      await runMutationSuccess(onSuccess, data, variables, context, meta);
    },
    meta,
    ...rest,
  });
}

// LoRA Config Hooks

export type UseLoraConfigsOptions = QueryOptions<LoraConfig[]>;
export type UseLoraConfigOptions = QueryOptions<LoraConfig>;

/**
 * Fetches a list of LoRA configurations with optional filtering and pagination
 *
 * @param params - Query parameters for filtering, pagination, and sorting
 * @param options - TanStack Query options
 * @returns Query result containing array of LoRA configurations
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data: configs, isLoading } = useLoraConfigs();
 *
 * // Get default config
 * const { data: defaultConfig } = useLoraConfigs({ isDefault: true, take: 1 });
 *
 * // With pagination and sorting
 * const { data: configs } = useLoraConfigs({
 *   modelName: 'sd15',
 *   take: 20,
 *   skip: 0,
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc'
 * });
 * ```
 */
export function useLoraConfigs(
  params?: ListLoraConfigsParams,
  options?: UseLoraConfigsOptions
): UseQueryResult<LoraConfig[], InfluencerAIAPIError> {
  const client = useInfluencerAIClient();

  return useQuery<LoraConfig[], InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.loraConfigs.list(params),
    queryFn: () => client.listLoraConfigs(params ?? {}),
    ...options,
  });
}

/**
 * Fetches a single LoRA configuration by ID
 *
 * @param id - LoRA configuration ID to fetch
 * @param options - TanStack Query options
 * @returns Query result containing the LoRA configuration
 *
 * @example
 * ```tsx
 * const { data: config, isLoading, error } = useLoraConfig('lc_123');
 *
 * // With custom options
 * const { data } = useLoraConfig('lc_123', {
 *   enabled: !!configId,
 *   refetchOnWindowFocus: false
 * });
 * ```
 */
export function useLoraConfig(
  id: string,
  options?: UseLoraConfigOptions
): UseQueryResult<LoraConfig, InfluencerAIAPIError> {
  const client = useInfluencerAIClient();

  return useQuery<LoraConfig, InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.loraConfigs.detail(id),
    queryFn: () => client.getLoraConfig(id),
    enabled: options?.enabled ?? Boolean(id),
    ...options,
  });
}
