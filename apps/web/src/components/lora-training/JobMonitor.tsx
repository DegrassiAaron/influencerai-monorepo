/**
 * @file JobMonitor.tsx
 * @description Main job monitoring container component
 *
 * Displays job status, progress, artifacts, and errors based on job state.
 * Implements real-time polling for running/pending jobs.
 */

'use client';

import * as React from 'react';
import { useJob } from '@influencerai/sdk';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { JobHeader } from './JobHeader';
import { JobProgress } from './JobProgress';
import { JobArtifacts } from './JobArtifacts';
import { JobError } from './JobError';
import { JobMetadata } from './JobMetadata';
import { AlertCircle } from 'lucide-react';

export interface JobMonitorProps {
  /** Job ID to monitor */
  jobId: string;
}

/**
 * Loading skeleton for job monitor
 */
function JobMonitorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-96" />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Error state for job monitor
 */
function JobMonitorError({ error, refetch }: { error: Error; refetch: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Failed to Load Job</h2>
        <p className="text-muted-foreground">
          {error.message || 'An error occurred while loading the job.'}
        </p>
      </div>
      <Button onClick={refetch} variant="default">
        Retry
      </Button>
    </div>
  );
}

/**
 * Waiting message for pending jobs
 */
function PendingJobMessage() {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-muted-foreground">
          Waiting to start... The job is queued and will begin processing soon.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * JobMonitor Component
 *
 * Main container for job monitoring that displays different views based on job status:
 * - pending/running → JobProgress with logs
 * - succeeded → JobProgress + JobArtifacts
 * - failed → JobError
 *
 * Implements automatic polling for active jobs.
 */
export function JobMonitor({ jobId }: JobMonitorProps) {
  const {
    data: job,
    isLoading,
    error,
    refetch,
  } = useJob(jobId, {
    polling: true,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-muted-foreground mb-8">Loading job...</p>
          <JobMonitorSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <JobMonitorError error={error || new Error('Job not found')} refetch={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <JobHeader job={job} />

        {/* Pending State */}
        {job.status === 'pending' && (
          <>
            <PendingJobMessage />
            <JobProgress job={job} showLogs={false} />
            <JobMetadata job={job} />
          </>
        )}

        {/* Running State */}
        {job.status === 'running' && (
          <>
            <JobProgress job={job} showLogs={true} />
            <JobMetadata job={job} />
          </>
        )}

        {/* Succeeded State */}
        {job.status === 'succeeded' && (
          <>
            <JobProgress job={job} showLogs={false} />
            <JobArtifacts job={job} refetch={refetch} />
            <JobMetadata job={job} />
          </>
        )}

        {/* Failed State */}
        {job.status === 'failed' && (
          <>
            <JobError job={job} />
            <JobMetadata job={job} />
          </>
        )}
      </div>
    </div>
  );
}
