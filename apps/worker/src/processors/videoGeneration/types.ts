import type { Job } from 'bullmq';
import type { Logger } from 'pino';
import type { S3Client } from '@aws-sdk/client-s3';

import type { PatchJobStatus } from '../contentGeneration';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type S3ClientInfo = { client: S3Client; bucket: string };

export type S3Helper = {
  getClient: (logger?: Pick<Logger, 'info' | 'warn' | 'error'>) => S3ClientInfo | null;
  putBinaryObject: (
    client: S3Client,
    bucket: string,
    key: string,
    body: NodeJS.ReadableStream | Uint8Array | Buffer,
    contentType?: string
  ) => Promise<void>;
  putTextObject: (client: S3Client, bucket: string, key: string, content: string) => Promise<void>;
  getSignedGetUrl: (client: S3Client, bucket: string, key: string, expiresInSeconds?: number) => Promise<string>;
};

export type VideoGenerationDependencies = {
  logger: Pick<Logger, 'info' | 'warn' | 'error'>;
  patchJobStatus: PatchJobStatus;
  s3: S3Helper;
  comfy: {
    baseUrl: string;
    clientId: string;
    fetch: FetchLike;
    workflowPayload?: Record<string, unknown>;
    pollIntervalMs?: number;
    maxPollAttempts?: number;
  };
  ffmpeg: {
    aspectRatio: string;
    audioFilter: string;
    preset: string;
    run: (input: { inputPath: string; outputPath: string; aspectRatio: string; audioFilter: string; preset: string }) => Promise<void>;
  };
};

export type VideoGenerationPayload = {
  caption?: string;
  script?: string;
  persona?: unknown;
  context?: string;
  durationSec?: number;
};

export type VideoGenerationJobData = {
  jobId?: string;
  payload?: VideoGenerationPayload;
};

export type VideoGenerationResult = {
  success: true;
  comfyJobId: string;
  caption: string;
  script: string;
  context?: string;
  persona?: unknown;
  durationSec: number;
  videoKey?: string;
  videoUrl?: string;
};

export type VideoGenerationJob = Job<VideoGenerationJobData, VideoGenerationResult, 'video-generation'>;
