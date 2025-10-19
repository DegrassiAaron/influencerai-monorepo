/**
 * @file DatasetSelector.tsx
 * @description Step 0 - Dataset selection for LoRA Training Wizard
 *
 * Fetches and displays available datasets for LoRA training.
 * Allows user to select one dataset to proceed to the next step.
 */

'use client';

import { useDatasets, type Dataset } from '@influencerai/sdk/react';
import { DatasetCard } from '../DatasetCard';
import { DatasetListSkeleton } from '../Skeletons';

export interface DatasetSelectorProps {
  /** Currently selected dataset ID */
  selectedId: string | null;
  /** Callback when a dataset is selected */
  onSelect: (id: string) => void;
}

/**
 * Dataset selection step component
 *
 * Displays all available datasets filtered for LoRA training use.
 * Shows loading skeleton while fetching, error state on failure,
 * and empty state if no datasets are available.
 *
 * @example
 * ```tsx
 * <DatasetSelector
 *   selectedId={wizard.state.selectedDatasetId}
 *   onSelect={wizard.setDataset}
 * />
 * ```
 */
export function DatasetSelector({ selectedId, onSelect }: DatasetSelectorProps) {
  const { data: datasets, isLoading, isError, error } = useDatasets({ kind: 'lora-training' });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Select Dataset</h2>
        <p className="text-sm text-muted-foreground">Loading datasets...</p>
        <DatasetListSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Select Dataset</h2>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load datasets: {error?.message ?? 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  if (!datasets || datasets.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Select Dataset</h2>
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No datasets available. Please create a dataset first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Select Dataset</h2>
        <p className="text-sm text-muted-foreground">
          Choose the dataset containing images for LoRA training. The dataset should include
          properly captioned images of your target subject.
        </p>
      </div>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        role="radiogroup"
        aria-label="Available datasets"
      >
        {datasets.map((dataset: Dataset) => (
          <DatasetCard
            key={dataset.id}
            dataset={dataset}
            selected={dataset.id === selectedId}
            onSelect={() => onSelect(dataset.id)}
          />
        ))}
      </div>
    </div>
  );
}
