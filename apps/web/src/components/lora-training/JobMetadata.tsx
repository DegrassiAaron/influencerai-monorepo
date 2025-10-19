/**
 * @file JobMetadata.tsx
 * @description Job metadata display component
 *
 * Displays dataset name, LoRA config name, timestamps, and duration for completed jobs.
 */

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataset, useLoraConfig } from '@influencerai/sdk';
import { format, formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

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
  spec: JobSpec;
  createdAt: string;
  updatedAt: string;
}

export interface JobMetadataProps {
  /** Job data to display metadata for */
  job: Job;
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * JobMetadata Component
 *
 * Displays job metadata including dataset name, config name, timestamps, and duration.
 * Fetches dataset and config data from API.
 */
export function JobMetadata({ job }: JobMetadataProps) {
  const { data: dataset, isLoading: datasetLoading } = useDataset(job.spec.datasetId || '', {
    enabled: !!job.spec.datasetId,
  });

  const { data: config, isLoading: configLoading } = useLoraConfig(job.spec.configId || '', {
    enabled: !!job.spec.configId,
  });

  // Calculate duration for completed jobs
  const duration =
    job.status === 'succeeded' || job.status === 'failed'
      ? differenceInSeconds(new Date(job.updatedAt), new Date(job.createdAt))
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Dataset */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Dataset</span>
          {datasetLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <span className="font-medium">{dataset?.name || job.spec.datasetId || 'N/A'}</span>
          )}
        </div>

        {/* LoRA Config */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">LoRA Configuration</span>
          {configLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <span className="font-medium">{config?.name || job.spec.configId || 'N/A'}</span>
          )}
        </div>

        {/* Created At */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Created</span>
          <span className="font-medium" title={format(new Date(job.createdAt), 'PPpp')}>
            {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Completed At (for succeeded jobs) */}
        {job.status === 'succeeded' && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completed At</span>
            <span className="font-medium">{format(new Date(job.updatedAt), 'PPpp')}</span>
          </div>
        )}

        {/* Failed At (for failed jobs) */}
        {job.status === 'failed' && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Failed At</span>
            <span className="font-medium">{format(new Date(job.updatedAt), 'PPpp')}</span>
          </div>
        )}

        {/* Duration */}
        {duration !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{formatDuration(duration)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
