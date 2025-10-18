'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDatasets, useDeleteDataset } from '@influencerai/sdk/react';
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { DatasetFilters, type DatasetFilterValues } from './components/DatasetFilters';
import { DatasetGrid } from './components/DatasetGrid';

const DEFAULT_PAGE_SIZE = 20;

export function DatasetsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);

  // Parse URL params
  const filterParams = useMemo(() => {
    const params: Record<string, string | number> = {};

    const status = searchParams.get('status');
    if (status) params.status = status;

    const kind = searchParams.get('kind');
    if (kind) params.kind = kind;

    const search = searchParams.get('search');
    if (search) params.search = search;

    const sortBy = searchParams.get('sortBy');
    if (sortBy) params.sortBy = sortBy;

    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder) params.sortOrder = sortOrder;

    const skip = searchParams.get('skip');
    if (skip) params.skip = parseInt(skip, 10);

    const take = searchParams.get('take');
    if (take) params.take = parseInt(take, 10);

    return params;
  }, [searchParams]);

  // Fetch datasets
  const {
    data: datasets,
    isLoading,
    error,
    refetch,
  } = useDatasets({
    ...filterParams,
    take: (filterParams.take as number) || DEFAULT_PAGE_SIZE,
    skip: (filterParams.skip as number) || 0,
  });

  // Delete mutation
  const deleteDataset = useDeleteDataset({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setDatasetToDelete(null);
    },
  });

  // Update URL params
  const updateFilters = useCallback(
    (filters: DatasetFilterValues) => {
      const params = new URLSearchParams(searchParams);

      // Clear all filter params first
      params.delete('status');
      params.delete('kind');
      params.delete('search');
      params.delete('sortBy');
      params.delete('sortOrder');
      params.delete('skip');

      // Set new filter params
      if (filters.status) params.set('status', filters.status);
      if (filters.kind) params.set('kind', filters.kind);
      if (filters.search) params.set('search', filters.search);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const url = `${pathname}?${params.toString()}`;
      router.push(url);
    },
    [pathname, router, searchParams]
  );

  // Pagination
  const currentPage = Math.floor(((filterParams.skip as number) || 0) / DEFAULT_PAGE_SIZE) + 1;
  const hasNextPage = datasets && datasets.length === DEFAULT_PAGE_SIZE;
  const hasPrevPage = currentPage > 1;

  const goToNextPage = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    const newSkip = ((filterParams.skip as number) || 0) + DEFAULT_PAGE_SIZE;
    params.set('skip', newSkip.toString());
    params.set('take', DEFAULT_PAGE_SIZE.toString());
    router.push(`${pathname}?${params.toString()}`);
  }, [filterParams.skip, pathname, router, searchParams]);

  const goToPrevPage = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    const newSkip = Math.max(0, ((filterParams.skip as number) || 0) - DEFAULT_PAGE_SIZE);
    params.set('skip', newSkip.toString());
    params.set('take', DEFAULT_PAGE_SIZE.toString());
    router.push(`${pathname}?${params.toString()}`);
  }, [filterParams.skip, pathname, router, searchParams]);

  // Delete handler
  const handleDeleteClick = useCallback((id: string) => {
    setDatasetToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (datasetToDelete) {
      deleteDataset.mutate({ id: datasetToDelete });
    }
  }, [datasetToDelete, deleteDataset]);

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-6">
          <div className="space-y-2">
            <Badge variant="brand" className="bg-brand-100 text-brand-700">
              Datasets
            </Badge>
            <h1 className="text-3xl font-semibold text-foreground">Training Datasets</h1>
          </div>
        </header>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Failed to fetch datasets</CardTitle>
            </div>
            <CardDescription>{error.message || 'An unknown error occurred'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge variant="brand" className="bg-brand-100 text-brand-700">
              Datasets
            </Badge>
            <h1 className="text-3xl font-semibold text-foreground">Training Datasets</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Manage image datasets for LoRA training and character development. Upload, organize,
              and prepare training data for consistent influencer appearances.
            </p>
          </div>
          <Button className="gap-2" onClick={() => router.push('/dashboard/datasets/new')}>
            <Plus className="h-4 w-4" />
            Create Dataset
          </Button>
        </header>

        <section>
          <DatasetFilters
            onFilterChange={updateFilters}
            defaultValues={{
              status: filterParams.status as string,
              kind: filterParams.kind as string,
              search: filterParams.search as string,
              sortBy: filterParams.sortBy as DatasetFilterValues['sortBy'],
              sortOrder: filterParams.sortOrder as DatasetFilterValues['sortOrder'],
            }}
          />
        </section>

        <section className="flex-1">
          <DatasetGrid
            datasets={datasets || []}
            isLoading={isLoading}
            onDelete={handleDeleteClick}
          />
        </section>

        {/* Pagination */}
        {(hasNextPage || hasPrevPage) && (
          <footer className="flex items-center justify-between border-t border-border/60 pt-6">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} {hasNextPage && '• More available'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={!hasPrevPage}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={!hasNextPage}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dataset? This action cannot be undone and will
              remove all associated training data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteDataset.isPending}
            >
              {deleteDataset.isPending ? 'Deleting...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
