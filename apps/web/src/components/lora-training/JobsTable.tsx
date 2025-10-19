/**
 * @file JobsTable.tsx
 * @description Job list table component with filtering, sorting, and pagination
 *
 * Displays all LoRA training jobs in a table with status badges, progress bars,
 * and action buttons. Supports real-time updates via TanStack Query.
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useJobs } from '@influencerai/sdk';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Eye, Download, MoreVertical, Trash2, FileText } from 'lucide-react';

export interface JobsTableFilters {
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  take?: number;
  skip?: number;
}

export interface JobsTableProps {
  /** Filter parameters for job list */
  filters?: JobsTableFilters;
}

/**
 * Get Badge variant based on job status
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'succeeded':
      return 'default';
    case 'failed':
      return 'destructive';
    case 'running':
      return 'default';
    case 'pending':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Skeleton rows for loading state
 */
function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-2 w-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-16" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

/**
 * Empty state when no jobs exist
 */
function EmptyState({ hasFilters, onClearFilters, onCreateNew }: {
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateNew: () => void;
}) {
  if (hasFilters) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">No jobs found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your filters to see more results.
        </p>
        <Button variant="outline" className="mt-4" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <p className="text-lg font-medium">No training jobs yet</p>
      <p className="text-sm text-muted-foreground mt-2">
        Create your first LoRA training job to get started.
      </p>
      <Button className="mt-4" onClick={onCreateNew}>
        Create Training Job
      </Button>
    </div>
  );
}

/**
 * JobsTable Component
 *
 * Displays all LoRA training jobs in a table with status, progress, and actions.
 * Supports filtering by status, sorting, and pagination.
 */
export function JobsTable({ filters = {} }: JobsTableProps) {
  const router = useRouter();

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useJobs({
    type: 'lora_training',
    status: filters.status,
    sortBy: filters.sortBy || 'createdAt',
    sortOrder: filters.sortOrder || 'desc',
    take: filters.take || 20,
    skip: filters.skip || 0,
  });

  const jobs = response?.data || [];
  const total = response?.total || 0;

  const handleView = (jobId: string) => {
    router.push(`/lora-training/${jobId}`);
  };

  const handleCreateNew = () => {
    router.push('/lora-training/new');
  };

  const handleClearFilters = () => {
    router.push('/lora-training');
  };

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <p className="text-lg font-medium text-destructive">Failed to load jobs</p>
            <p className="text-sm text-muted-foreground">
              {error.message || 'An error occurred while loading jobs.'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!isLoading && jobs.length === 0) {
    return (
      <EmptyState
        hasFilters={!!filters.status}
        onClearFilters={handleClearFilters}
        onCreateNew={handleCreateNew}
      />
    );
  }

  const hasFilters = !!filters.status;

  return (
    <div className="space-y-4">
      {/* Total Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? 'job' : 'jobs'}
        </p>

        {/* Filters - Status and Sort */}
        <div className="flex items-center space-x-4">
          {/* Status Filter */}
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => {
              const params = new URLSearchParams();
              if (value !== 'all') params.set('status', value);
              router.push(`/lora-training?${params.toString()}`);
            }}
          >
            <SelectTrigger className="w-[180px]" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">pending</SelectItem>
              <SelectItem value="running">running</SelectItem>
              <SelectItem value="succeeded">succeeded</SelectItem>
              <SelectItem value="failed">failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Dropdown */}
          <Select
            value={`${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('-');
              const params = new URLSearchParams();
              if (filters.status) params.set('status', filters.status);
              params.set('sortBy', sortBy);
              params.set('sortOrder', sortOrder);
              router.push(`/lora-training?${params.toString()}`);
            }}
          >
            <SelectTrigger className="w-[180px]" aria-label="Sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest first</SelectItem>
              <SelectItem value="createdAt-asc">Oldest first</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jobs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <TableSkeleton />
                <tr className="sr-only">
                  <td colSpan={5}>Loading jobs...</td>
                </tr>
              </>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  {/* Name */}
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <p>{job.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={getStatusVariant(job.status)}
                      data-status={job.status}
                      role="status"
                    >
                      {job.status}
                    </Badge>
                  </TableCell>

                  {/* Progress */}
                  <TableCell>
                    <div className="flex items-center space-x-2 min-w-[120px]">
                      {job.status === 'running' && (
                        <>
                          <Progress value={job.progress} className="flex-1" />
                          <span className="text-sm font-medium">{job.progress}%</span>
                        </>
                      )}
                      {job.status === 'succeeded' && (
                        <span className="text-sm font-medium">100%</span>
                      )}
                      {job.status === 'failed' && (
                        <span className="text-sm font-medium">{job.progress}%</span>
                      )}
                      {job.status === 'pending' && (
                        <span className="text-sm text-muted-foreground">0%</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Created */}
                  <TableCell>
                    <span className="text-sm">{format(new Date(job.createdAt), 'PP')}</span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(job.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>

                      {/* Action Menu */}
                      <Select>
                        <SelectTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="view" onSelect={() => handleView(job.id)}>
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              View details
                            </div>
                          </SelectItem>
                          <SelectItem value="logs">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              View logs
                            </div>
                          </SelectItem>
                          {job.status === 'succeeded' && (
                            <SelectItem value="download">
                              <div className="flex items-center">
                                <Download className="h-4 w-4 mr-2" />
                                Download artifacts
                              </div>
                            </SelectItem>
                          )}
                          {job.status === 'failed' && (
                            <SelectItem value="delete">
                              <div className="flex items-center text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
