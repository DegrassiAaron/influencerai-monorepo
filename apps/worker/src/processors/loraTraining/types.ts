import type { SpawnOptionsWithoutStdio } from 'node:child_process';
import type { LoRAConfig } from '@influencerai/core-schemas';
import type { S3Client } from '@aws-sdk/client-s3';

export type LoraTrainingJobData = {
  jobId?: string;
  payload?: Record<string, unknown>;
};

export type LoraTrainingResult = {
  success: boolean;
  message?: string;
  outputDir?: string;
  artifacts?: { key: string; url: string; filename: string }[];
  logs?: string[];
  command?: CommandPreview;
};

export type CommandPreview = {
  command: string;
  args: string[];
  cwd?: string | URL;
};

export type PatchJobStatusFn = (
  jobId: string,
  data: { status?: string; result?: unknown; costTok?: number }
) => Promise<unknown>;

export type LoraDatasetInfo = {
  id?: string;
  path: string;
  meta?: Record<string, unknown> | null;
};

export type LoraConfigInfo = Partial<LoRAConfig> & {
  id?: string;
  outputPath?: string;
  extraArgs?: string[];
  kohyaCommand?: string;
  workingDirectory?: string;
  env?: Record<string, string>;
  networkModule?: string;
  baseModel?: string;
  maxTrainSteps?: number;
  samplePrompts?: string[];
  timeoutMs?: number;
};

export type LoraTrainingPayload = {
  datasetPath?: string;
  datasetId?: string;
  dataset?: LoraDatasetInfo;
  config?: LoraConfigInfo;
  configId?: string;
  kohyaArgs?: string[];
  outputDir?: string;
  timeoutMs?: number;
  s3Prefix?: string;
  trainingName?: string;
  dryRun?: boolean;
};

export type LoraTrainingProcessorDeps = {
  logger: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  patchJobStatus: PatchJobStatusFn;
  s3: {
    getClient: () => { client: S3Client; bucket: string } | null;
    putBinaryObject: (
      client: S3Client,
      bucket: string,
      key: string,
      body: NodeJS.ReadableStream | Uint8Array | Buffer,
      contentType?: string
    ) => Promise<void>;
    getSignedGetUrl: (
      client: S3Client,
      bucket: string,
      key: string,
      expiresInSeconds?: number
    ) => Promise<string>;
  };
  fetchDataset?: (datasetId: string) => Promise<LoraDatasetInfo | null>;
  fetchLoraConfig?: (configId: string) => Promise<LoraConfigInfo | null>;
  spawn?: (
    command: string,
    args?: ReadonlyArray<string>,
    options?: SpawnOptionsWithoutStdio
  ) => ReturnType<typeof import('node:child_process').spawn>;
  now?: () => number;
};

export type TrainingProgress = {
  stage: 'initializing' | 'fetching-dataset' | 'running' | 'uploading' | 'completed' | 'failed';
  message?: string;
  step?: number;
  totalSteps?: number;
  percent?: number;
  source?: 'stdout' | 'stderr';
  logs?: string[];
};

export type ProgressState = {
  lastUpdate: number;
  pending?: TrainingProgress;
  timer?: NodeJS.Timeout | null;
  logs: string[];
};

export type KohyaCommandConfig = {
  command: string;
  args: string[];
  options: SpawnOptionsWithoutStdio;
};
