/**
 * @file DatasetCard.tsx
 * @description Reusable card component for displaying and selecting datasets
 *
 * Provides a selectable card with dataset information including name,
 * image count, and creation date. Supports keyboard navigation and
 * ARIA accessibility.
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Dataset } from '@influencerai/sdk';

export interface DatasetCardProps {
  /** Dataset data to display */
  dataset: Dataset;
  /** Whether this dataset is currently selected */
  selected: boolean;
  /** Callback when dataset is selected */
  onSelect: () => void;
}

/**
 * Selectable card component for displaying dataset information
 *
 * Renders as a button with radio semantics for accessibility.
 * Shows dataset name, image count, and creation date.
 *
 * @example
 * ```tsx
 * <DatasetCard
 *   dataset={dataset}
 *   selected={selectedId === dataset.id}
 *   onSelect={() => setSelectedId(dataset.id)}
 * />
 * ```
 */
export function DatasetCard({ dataset, selected, onSelect }: DatasetCardProps) {
  const formattedDate = dataset.createdAt
    ? new Date(dataset.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <button
      type="button"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'w-full text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected && 'ring-2 ring-primary'
      )}
      aria-pressed={selected}
      role="radio"
      aria-checked={selected}
    >
      <Card
        className={cn(
          'h-full transition-colors hover:border-primary/50',
          selected && 'border-primary bg-primary/5'
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{dataset.name}</CardTitle>
            {selected && (
              <Badge variant="default" className="shrink-0">
                Selected
              </Badge>
            )}
          </div>
          {dataset.description && (
            <CardDescription className="line-clamp-2">{dataset.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Images</span>
            <span className="font-medium">{dataset.imageCount} images</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">{formattedDate}</span>
          </div>
          {dataset.status && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={dataset.status === 'ready' ? 'default' : 'outline'}>
                {dataset.status}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}
