/**
 * @file LoRATrainingListPage.tsx
 * @description Main list page container for LoRA training jobs
 *
 * Displays job list with filters, sorting, and pagination.
 * Reads filter state from URL search params.
 */

'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { JobsTable } from './JobsTable';
import { Pagination } from './Pagination';
import { useJobs } from '@influencerai/sdk';
import { Plus } from 'lucide-react';

/**
 * Page Header Component
 */
function PageHeader({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">LoRA Training Jobs</h1>
        <p className="text-muted-foreground">
          Manage and monitor your LoRA model training jobs.
        </p>
      </div>

      <Button onClick={onCreateNew} size="lg">
        <Plus className="mr-2 h-4 w-4" />
        New Training Job
      </Button>
    </div>
  );
}

/**
 * LoRATrainingListPage Component
 *
 * Main list page for LoRA training jobs with filtering, sorting, and pagination.
 * Reads filters from URL search params for bookmarkable views.
 */
export function LoRATrainingListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse filters from URL
  const status = searchParams.get('status') || undefined;
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const skip = Number(searchParams.get('skip')) || 0;
  const take = Number(searchParams.get('take')) || 20;

  const filters = {
    status,
    sortBy,
    sortOrder,
    skip,
    take,
  };

  // Fetch jobs for pagination info
  const { data: response } = useJobs({
    type: 'lora_training',
    status,
    sortBy,
    sortOrder,
    take,
    skip,
  });

  const handleCreateNew = () => {
    router.push('/dashboard/lora-training/new');
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <PageHeader onCreateNew={handleCreateNew} />

      {/* Jobs Table with Filters */}
      <JobsTable filters={filters} />

      {/* Pagination */}
      {response && (
        <Pagination total={response.total} take={response.take} skip={response.skip} />
      )}
    </div>
  );
}
