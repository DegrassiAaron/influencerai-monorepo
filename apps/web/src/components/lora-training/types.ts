/**
 * Type definitions for LoRA Training UI components
 *
 * This module defines the props interfaces for all LoRA training wizard
 * components, ensuring type safety across the component tree.
 */

import type { WizardContext } from '@/types/lora-wizard';
import type { JobProgress, JobArtifact, JobStatus } from '@/types/job-progress';

/**
 * Props for the main LoRA Training Wizard component
 */
export interface LoRATrainingWizardProps {
  /** Callback when training job is successfully submitted */
  onJobSubmitted?: (jobId: string) => void;

  /** Callback when wizard is cancelled/closed */
  onCancel?: () => void;

  /** Optional initial dataset ID to preselect */
  initialDatasetId?: string;

  /** Optional initial LoRA config ID to preselect */
  initialLoraConfigId?: string;
}

/**
 * Props for the Dataset Selector component (Step 0)
 */
export interface DatasetSelectorProps {
  /** Wizard context for state management */
  wizard: WizardContext;

  /** Currently selected dataset ID */
  selectedDatasetId: string | null;

  /** Callback when dataset is selected */
  onSelectDataset: (datasetId: string) => void;
}

/**
 * Props for the LoRA Config Selector component (Step 1)
 */
export interface LoRAConfigSelectorProps {
  /** Wizard context for state management */
  wizard: WizardContext;

  /** Currently selected LoRA config ID */
  selectedLoraConfigId: string | null;

  /** Callback when LoRA config is selected */
  onSelectLoraConfig: (configId: string) => void;

  /** ID of the selected dataset (for context display) */
  datasetId: string;
}

/**
 * Props for the Review Summary component (Step 2)
 */
export interface ReviewSummaryProps {
  /** Wizard context for state management */
  wizard: WizardContext;

  /** Selected dataset ID */
  datasetId: string;

  /** Selected LoRA config ID */
  loraConfigId: string;

  /** Callback when user confirms and submits */
  onSubmit: () => Promise<void>;

  /** Whether submission is in progress */
  isSubmitting: boolean;
}

/**
 * Props for the Job Monitor component
 *
 * Displays real-time job progress and handles job completion/failure.
 */
export interface JobMonitorProps {
  /** Job ID to monitor */
  jobId: string;

  /** Enable polling for job updates (default: true) */
  enablePolling?: boolean;

  /** Polling interval in milliseconds (default: 2000) */
  pollingInterval?: number;

  /** Callback when job completes successfully */
  onJobComplete?: (jobId: string) => void;

  /** Callback when job fails */
  onJobFailed?: (jobId: string, error: string) => void;

  /** Show detailed logs (default: false) */
  showLogs?: boolean;
}

/**
 * Props for the Job Progress component
 *
 * Displays progress bar, stage information, and logs.
 */
export interface JobProgressProps {
  /** Current job status */
  status: JobStatus;

  /** Progress information (if job is running) */
  progress?: JobProgress;

  /** Show progress percentage (default: true) */
  showPercentage?: boolean;

  /** Show current stage (default: true) */
  showStage?: boolean;

  /** Show execution logs (default: false) */
  showLogs?: boolean;

  /** Maximum number of log lines to display (default: 50) */
  maxLogLines?: number;
}

/**
 * Props for the Job Artifacts component
 *
 * Displays downloadable artifacts with presigned URL handling.
 */
export interface JobArtifactsProps {
  /** Job ID */
  jobId: string;

  /** List of job artifacts */
  artifacts: JobArtifact[];

  /** Callback when artifact download is initiated */
  onDownload?: (artifactId: string) => void;

  /** Show artifact metadata (size, type, etc.) */
  showMetadata?: boolean;

  /** Show expiry warnings for presigned URLs */
  showExpiryWarnings?: boolean;

  /** Callback when presigned URL needs refresh */
  onRequestRefresh?: (artifactId: string) => void;
}
