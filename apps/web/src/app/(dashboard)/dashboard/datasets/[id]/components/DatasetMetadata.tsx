'use client';

import type { Dataset } from '@influencerai/sdk';
import { Calendar, FileText, Folder, ImageIcon, Package } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type DatasetMetadataProps = {
  dataset: Dataset;
};

const statusVariants: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline' | 'brand'
> = {
  ready: 'default',
  pending: 'secondary',
  processing: 'secondary',
  failed: 'destructive',
  error: 'destructive',
};

export function DatasetMetadata({ dataset }: DatasetMetadataProps) {
  const imageCount = dataset.meta?.imageCount as number | undefined;
  const description = dataset.meta?.description as string | undefined;
  const resolution = dataset.meta?.resolution as string | undefined;
  const captionSource = dataset.meta?.captionSource as string | undefined;

  return (
    <Card className="w-full" role="region" aria-label="Dataset metadata">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          Dataset Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl
          className="grid gap-4 sm:grid-cols-2"
          role="list"
          aria-label="Dataset metadata fields"
        >
          {/* Dataset ID */}
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">Dataset ID</dt>
            <dd className="text-sm">
              <h3 className="font-mono text-base font-semibold text-foreground">{dataset.id}</h3>
            </dd>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">Status</dt>
            <dd className="text-sm">
              <Badge variant={statusVariants[dataset.status] || 'outline'}>{dataset.status}</Badge>
            </dd>
          </div>

          {/* Kind */}
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Kind
            </dt>
            <dd className="text-sm text-foreground">{dataset.kind}</dd>
          </div>

          {/* Path */}
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Folder className="h-3.5 w-3.5" />
              Path
            </dt>
            <dd className="text-sm font-mono text-foreground">{dataset.path}</dd>
          </div>

          {/* Image Count */}
          {imageCount !== undefined && (
            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                Image Count
              </dt>
              <dd className="text-sm text-foreground">{imageCount}</dd>
            </div>
          )}

          {/* Resolution */}
          {resolution && (
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-medium text-muted-foreground">Resolution</dt>
              <dd className="text-sm text-foreground">{resolution}</dd>
            </div>
          )}

          {/* Caption Source */}
          {captionSource && (
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-medium text-muted-foreground">Caption Source</dt>
              <dd className="text-sm text-foreground">{captionSource}</dd>
            </div>
          )}

          {/* Created At */}
          {dataset.createdAt && (
            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Created
              </dt>
              <dd className="text-sm text-foreground">
                {new Date(dataset.createdAt).toLocaleString()}
              </dd>
            </div>
          )}

          {/* Updated At */}
          {dataset.updatedAt && (
            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Updated
              </dt>
              <dd className="text-sm text-foreground">
                {new Date(dataset.updatedAt).toLocaleString()}
              </dd>
            </div>
          )}

          {/* Description (full width) */}
          {description && (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">Description</dt>
              <dd className="text-sm leading-relaxed text-foreground">{description}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
