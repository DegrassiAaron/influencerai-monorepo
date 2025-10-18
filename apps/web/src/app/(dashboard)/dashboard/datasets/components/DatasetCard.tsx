'use client';

import type { Dataset } from '@influencerai/sdk';
import { Calendar, Database, Folder, Image, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DatasetCardProps {
  dataset: Dataset;
  // eslint-disable-next-line no-unused-vars
  onDelete?: (id: string) => void;
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'brand'> = {
  ready: 'brand',
  pending: 'secondary',
  processing: 'secondary',
  failed: 'destructive',
};

export function DatasetCard({ dataset, onDelete }: DatasetCardProps) {
  const handleDelete = () => {
    if (onDelete) {
      onDelete(dataset.id);
    }
  };

  // Format date with fallback
  const formattedDate = dataset.createdAt
    ? new Date(dataset.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown date';

  // Extract metadata
  const imageCount = dataset.meta?.imageCount as number | undefined;
  const description = dataset.meta?.description as string | undefined;

  return (
    <article
      className="group relative flex flex-col"
      aria-label={`Dataset ${dataset.id}`}
    >
      <Card className="flex h-full flex-col border-border/60 bg-card/70 transition-all hover:border-brand-200 hover:shadow-md">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Database className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="line-clamp-1 text-base font-semibold">
                  {dataset.id}
                </CardTitle>
                <CardDescription className="mt-1 flex items-center gap-1 text-xs">
                  <Folder className="h-3 w-3" />
                  {dataset.path}
                </CardDescription>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={statusVariants[dataset.status] || 'default'} className="text-xs">
              {dataset.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {dataset.kind}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 pt-0">
          {description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
          )}

          <div className="mt-auto space-y-2 border-t border-border/40 pt-4">
            {imageCount !== undefined && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image className="h-4 w-4" />
                <span>{imageCount} images</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className={cn(
                'mt-2 w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive',
                'opacity-0 transition-opacity group-hover:opacity-100'
              )}
              aria-label={`Delete dataset ${dataset.id}`}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </CardContent>
      </Card>
    </article>
  );
}
