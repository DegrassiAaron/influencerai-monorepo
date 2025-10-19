export { InfluencerAIProvider, useInfluencerAIClient } from './provider';
export type { InfluencerAIProviderProps } from './provider';
export { influencerAIQueryKeys } from './query-keys';
export type { InfluencerAIQueryKeys } from './query-keys';

// Re-export core types for convenience
export type {
  Dataset,
  JobResponse,
  QueueSummary,
  CreateDatasetInput,
  CreateDatasetResponse,
  ContentPlanEnvelope,
  ListDatasetsParams,
  LoraConfig,
  ListLoraConfigsParams,
} from '../types';
export type { JobSpec, ContentPlan, DatasetSpec, LoRAConfig } from '../core-schemas';
export {
  useJobs,
  useJob,
  useDatasets,
  useDataset,
  useQueuesSummary,
  useContentPlan,
  useCreateJob,
  useUpdateJob,
  useCreateDataset,
  useDeleteDataset,
  useCreateContentPlan,
  useLoraConfigs,
  useLoraConfig,
} from './hooks';
export type {
  UseJobsOptions,
  UseJobOptions,
  UseDatasetsOptions,
  UseDatasetOptions,
  UseQueuesSummaryOptions,
  UseContentPlanOptions,
  UseCreateJobOptions,
  UseUpdateJobOptions,
  UpdateJobVariables,
  UseCreateDatasetOptions,
  UseDeleteDatasetOptions,
  DeleteDatasetVariables,
  UseCreateContentPlanOptions,
  UseLoraConfigsOptions,
  UseLoraConfigOptions,
} from './hooks';
