/**
 * @file JobError.tsx
 * @description Error display component for failed jobs
 *
 * Displays error message, failed stage information, and retry button
 * that navigates to the wizard with pre-filled data.
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Job spec with dataset and config IDs
 */
interface JobSpec {
  datasetId?: string;
  configId?: string;
}

/**
 * Job type matching API response
 */
interface Job {
  id: string;
  name: string;
  status: string;
  progress: number;
  error: string | null;
  spec: JobSpec;
  createdAt: string;
  updatedAt: string;
}

export interface JobErrorProps {
  /** Failed job with error information */
  job: Job;
}

/**
 * JobError Component
 *
 * Displays error information for failed training jobs with options to retry.
 * Shows error message, progress at failure point, failure timestamp, and retry button.
 */
export function JobError({ job }: JobErrorProps) {
  const router = useRouter();

  const handleRetry = () => {
    // Navigate to wizard with pre-filled data from failed job
    const params = new URLSearchParams();
    if (job.spec.datasetId) {
      params.set('datasetId', job.spec.datasetId);
    }
    if (job.spec.configId) {
      params.set('configId', job.spec.configId);
    }

    router.push(`/dashboard/lora-training/new?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      <Alert variant="destructive" role="alert">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">Error</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm">{job.error || 'Training failed with an unknown error.'}</p>
        </AlertDescription>
      </Alert>

      {/* Progress at Failure */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Progress at Failure</h3>
          <span className="text-sm font-medium">{job.progress}%</span>
        </div>
        <Progress
          value={job.progress}
          aria-label="Training progress"
          aria-valuenow={job.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-destructive/20"
        />
      </div>

      {/* Failure Details */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h3 className="text-sm font-medium">Failure Details</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Job ID</span>
            <span className="font-mono">{job.id}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Failed At</span>
            <span>{format(new Date(job.updatedAt), 'PPpp')}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Started At</span>
            <span>{format(new Date(job.createdAt), 'PPpp')}</span>
          </div>
        </div>
      </div>

      {/* Retry Action */}
      <div className="flex justify-end">
        <Button onClick={handleRetry} variant="default" size="lg">
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry Training
        </Button>
      </div>
    </div>
  );
}
