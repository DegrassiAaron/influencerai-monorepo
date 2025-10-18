'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataset, useDeleteDataset } from '@influencerai/sdk/react';
import { AlertTriangle, ChevronLeft, Trash2, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { DatasetMetadata } from './components/DatasetMetadata';
import { ImageGallery, type GalleryImage } from './components/ImageGallery';

export type DatasetDetailPageClientProps = {
  id: string;
};

export function DatasetDetailPageClient({ id }: DatasetDetailPageClientProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch dataset
  const { data: dataset, isLoading, error } = useDataset(id);

  // Delete mutation
  const deleteDataset = useDeleteDataset({
    onSuccess: () => {
      router.push('/dashboard/datasets');
    },
  });

  // Handlers
  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    deleteDataset.mutate({ id });
    setDeleteDialogOpen(false);
  }, [id, deleteDataset]);

  const handleTrainLoRAClick = useCallback(() => {
    router.push(`/dashboard/loras/new?datasetId=${id}`);
  }, [id, router]);

  const handleBackClick = useCallback(() => {
    router.push('/dashboard/datasets');
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackClick}>
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Back to datasets</span>
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Loading...</h1>
        </div>
        <div className="flex-1 animate-pulse space-y-4">
          <div className="h-48 rounded-lg bg-muted/20" />
          <div className="h-64 rounded-lg bg-muted/20" />
        </div>
      </div>
    );
  }

  // Error state - 404
  if (error && (error as any).status === 404) {
    return (
      <div className="flex h-full flex-col gap-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackClick}>
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Back to datasets</span>
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Dataset not found</h1>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Not found</CardTitle>
            </div>
            <CardDescription>
              The dataset with ID {id} could not be found. It may have been deleted or you may not
              have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackClick} variant="outline">
              Back to datasets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - other errors
  if (error) {
    return (
      <div className="flex h-full flex-col gap-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackClick}>
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Back to datasets</span>
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Error loading dataset</h1>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Failed to fetch dataset</CardTitle>
            </div>
            <CardDescription>{error.message || 'An unknown error occurred'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackClick} variant="outline">
              Back to datasets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data (shouldn't happen but defensive)
  if (!dataset) {
    return null;
  }

  // Extract images from metadata
  const images: GalleryImage[] = (dataset.meta?.images as GalleryImage[] | undefined) || [];

  // Check if ready for training
  const isReadyForTraining = dataset.status === 'ready';

  return (
    <>
      <div className="flex h-full flex-col gap-8">
        {/* Header with breadcrumb and actions */}
        <header className="space-y-4">
          {/* Breadcrumb Navigation */}
          <Breadcrumb role="navigation" aria-label="Breadcrumb navigation">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/datasets">Datasets</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{dataset.id}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Page Title and Actions */}
          <div className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Badge variant="brand" className="bg-brand-100 text-brand-700">
                Dataset
              </Badge>
              <h1 className="text-3xl font-semibold text-foreground">{dataset.id}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                View and manage this training dataset. Use the actions below to train a LoRA model
                or delete the dataset.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleDeleteClick}
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button
                onClick={handleTrainLoRAClick}
                disabled={!isReadyForTraining}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Train LoRA
              </Button>
            </div>
          </div>
        </header>

        {/* Metadata Section */}
        <section>
          <DatasetMetadata dataset={dataset} />
        </section>

        {/* Images Section */}
        <section>
          <ImageGallery images={images} datasetId={dataset.id} />
        </section>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete dataset {dataset.id}? This action cannot be undone and
              will remove all associated training data.
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
