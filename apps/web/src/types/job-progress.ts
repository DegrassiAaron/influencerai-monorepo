/**
 * Type definitions for job progress tracking and artifact handling
 *
 * This module defines types for real-time job monitoring, progress updates,
 * and presigned URL artifact management.
 */

/**
 * Job progress information
 *
 * Tracks the current progress of a running job with stage information
 * and execution logs.
 */
export interface JobProgress {
  /** Progress percentage (0-100) */
  percent: number;

  /** Current execution stage (e.g., "Initializing", "Training", "Saving") */
  stage: string;

  /** Execution logs (array of log lines) */
  logs: string[];

  /** Estimated time remaining in seconds (optional) */
  estimatedSecondsRemaining?: number;

  /** Current epoch/iteration (optional) */
  currentEpoch?: number;

  /** Total epochs/iterations (optional) */
  totalEpochs?: number;
}

/**
 * Job artifact with presigned URL
 *
 * Represents a generated artifact (e.g., .safetensors file) with a
 * time-limited presigned URL for download.
 */
export interface JobArtifact {
  /** Artifact ID */
  id: string;

  /** Artifact filename */
  filename: string;

  /** File size in bytes */
  sizeBytes: number;

  /** MIME type */
  mimeType: string;

  /** Presigned download URL */
  presignedUrl: string;

  /** URL expiration timestamp (ISO 8601) */
  expiresAt: string;

  /** Artifact type (e.g., "lora", "checkpoint", "log") */
  type: string;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;
}

/**
 * Job status discriminated union
 *
 * Represents the possible states of a job with type-safe status values.
 */
export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

/**
 * Type guard to check if job is in active state
 */
export function isJobActive(status: JobStatus): boolean {
  return status === 'pending' || status === 'running';
}

/**
 * Type guard to check if job is in terminal state
 */
export function isJobTerminal(status: JobStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}
