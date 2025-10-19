/**
 * @file ReviewSummary.tsx
 * @description Step 2 - Review summary for LoRA Training Wizard
 *
 * Displays a comprehensive review of all selected options before
 * starting the training job. Fetches dataset and config details
 * to show complete information.
 */

'use client';

import { useDataset, useLoraConfig } from '@influencerai/sdk/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReviewSkeleton } from '../Skeletons';

export interface ReviewSummaryProps {
  /** Selected dataset ID */
  datasetId: string;
  /** Selected config ID */
  configId: string;
  /** Job name entered by user */
  jobName: string;
}

/**
 * Review summary step component
 *
 * Fetches full details of selected dataset and configuration,
 * and displays them in an organized summary format for final review
 * before submitting the training job.
 *
 * @example
 * ```tsx
 * <ReviewSummary
 *   datasetId={wizard.state.selectedDatasetId!}
 *   configId={wizard.state.selectedConfigId!}
 *   jobName={wizard.state.jobName}
 * />
 * ```
 */
export function ReviewSummary({ datasetId, configId, jobName }: ReviewSummaryProps) {
  const {
    data: dataset,
    isLoading: isLoadingDataset,
    isError: isDatasetError,
  } = useDataset(datasetId);

  const {
    data: config,
    isLoading: isLoadingConfig,
    isError: isConfigError,
  } = useLoraConfig(configId);

  const isLoading = isLoadingDataset || isLoadingConfig;
  const hasError = isDatasetError || isConfigError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Review and Start</h2>
        <ReviewSkeleton />
      </div>
    );
  }

  if (hasError || !dataset || !config) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Review and Start</h2>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load selection details. Please go back and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Review and Start</h2>
        <p className="text-sm text-muted-foreground">
          Review your selections below. When ready, click Start Training to begin the LoRA training
          process.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Job Name</h3>
          <Card>
            <CardContent className="pt-6">
              <p className="font-medium">{jobName}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Dataset</h3>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{dataset.name}</CardTitle>
              {dataset.description && <CardDescription>{dataset.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Images</span>
                <span className="font-medium">{dataset.imageCount} images</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={dataset.status === 'ready' ? 'default' : 'outline'}>
                  {dataset.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(dataset.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Configuration</h3>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{config.name}</CardTitle>
              {config.description && <CardDescription>{config.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Training Epochs</span>
                  <span className="font-medium">{config.epochs} epochs</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Network Rank (Dim)</span>
                  <span className="font-medium">{config.networkDim}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Network Alpha</span>
                  <span className="font-medium">{config.networkAlpha}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Learning Rate</span>
                  <span className="font-medium">{config.learningRate}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Training will begin immediately after you start the job. The
            process may take several hours depending on your dataset size and configuration. You can
            monitor progress on the job details page.
          </p>
        </div>
      </div>
    </div>
  );
}
