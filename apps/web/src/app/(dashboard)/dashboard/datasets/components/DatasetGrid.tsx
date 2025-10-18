'use client';

import type { Dataset } from '@influencerai/sdk';
import { Database } from 'lucide-react';

import { DatasetCard } from './DatasetCard';

interface DatasetGridProps {
  datasets: Dataset[];
  isLoading?: boolean;
  // eslint-disable-next-line no-unused-vars
  onDelete?: (id: string) => void;
}

function DatasetCardSkeleton() {
  return (
    <div
      className="rounded-lg border border-border/60 bg-card/70 p-6"
      role="status"
      aria-label="Loading dataset"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Database className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">No datasets found</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Create your first dataset to start training LoRA models or processing images for your
          virtual influencers.
        </p>
      </div>
    </div>
  );
}

export function DatasetGrid({ datasets, isLoading = false, onDelete }: DatasetGridProps) {
  if (isLoading) {
    return (
      <ul
        role="list"
        aria-label="Loading datasets"
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <DatasetCardSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  if (datasets.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul
      role="list"
      aria-label="Datasets grid"
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      {datasets.map((dataset) => (
        <li key={dataset.id}>
          <DatasetCard dataset={dataset} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}
