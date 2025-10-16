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

export function useJob(
  id: string,
  options?: UseJobOptions
): UseQueryResult<JobResponse, InfluencerAIAPIError> {
  const client = useInfluencerAIClient();

  return useQuery<JobResponse, InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.jobs.detail(id),
    queryFn: () => client.getJob(id),
    enabled: options?.enabled ?? Boolean(id),
    ...options,
  });
}

export function useDatasets(
  options?: UseDatasetsOptions
): UseQueryResult<Dataset[], InfluencerAIAPIError> {
  const client = useInfluencerAIClient();

  return useQuery<Dataset[], InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.datasets.list(),
    queryFn: () => client.listDatasets(),
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
