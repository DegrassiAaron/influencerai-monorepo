'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DatasetFilterValues {
  status?: string;
  kind?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'kind' | 'status';
  sortOrder?: 'asc' | 'desc';
}

interface DatasetFiltersProps {
  // eslint-disable-next-line no-unused-vars
  onFilterChange: (filters: DatasetFilterValues) => void;
  defaultValues?: DatasetFilterValues;
  className?: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ready', label: 'Ready' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
];

const KIND_OPTIONS = [
  { value: 'all', label: 'All Kinds' },
  { value: 'lora-training', label: 'LoRA Training' },
  { value: 'image-captioning', label: 'Image Captioning' },
  { value: 'fine-tuning', label: 'Fine-tuning' },
];

const SORT_BY_OPTIONS = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Updated Date' },
  { value: 'kind', label: 'Kind' },
  { value: 'status', label: 'Status' },
];

const SORT_ORDER_OPTIONS = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
];

export function DatasetFilters({
  onFilterChange,
  defaultValues = {},
  className,
}: DatasetFiltersProps) {
  const [status, setStatus] = useState(defaultValues.status || 'all');
  const [kind, setKind] = useState(defaultValues.kind || 'all');
  const [search, setSearch] = useState(defaultValues.search || '');
  const [sortBy, setSortBy] = useState<DatasetFilterValues['sortBy']>(
    defaultValues.sortBy || 'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<DatasetFilterValues['sortOrder']>(
    defaultValues.sortOrder || 'desc'
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const newFilters: DatasetFilterValues = {};

      if (status && status !== 'all') newFilters.status = status;
      if (kind && kind !== 'all') newFilters.kind = kind;
      if (search) newFilters.search = search;
      if (sortBy) newFilters.sortBy = sortBy;
      if (sortOrder) newFilters.sortOrder = sortOrder;

      onFilterChange(newFilters);
    }, 300);

    return () => clearTimeout(timer);
  }, [status, kind, search, sortBy, sortOrder, onFilterChange]);

  const handleClear = useCallback(() => {
    setStatus('all');
    setKind('all');
    setSearch('');
    setSortBy('createdAt');
    setSortOrder('desc');
    onFilterChange({});
  }, [onFilterChange]);

  const hasActiveFilters = (status !== 'all') || (kind !== 'all') || search;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status-filter" className="text-sm font-medium">
            Status
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              id="status-filter"
              aria-label="Filter by status"
              className="w-full"
            >
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kind Filter */}
        <div className="space-y-2">
          <Label htmlFor="kind-filter" className="text-sm font-medium">
            Kind
          </Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger
              id="kind-filter"
              aria-label="Filter by kind"
              className="w-full"
            >
              <SelectValue placeholder="All Kinds" />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label htmlFor="sort-by-filter" className="text-sm font-medium">
            Sort By
          </Label>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as DatasetFilterValues['sortBy'])}
          >
            <SelectTrigger
              id="sort-by-filter"
              aria-label="Sort by field"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_BY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Order */}
        <div className="space-y-2">
          <Label htmlFor="sort-order-filter" className="text-sm font-medium">
            Sort Order
          </Label>
          <Select
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value as DatasetFilterValues['sortOrder'])}
          >
            <SelectTrigger
              id="sort-order-filter"
              aria-label="Sort order"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_ORDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search datasets"
            className="pl-9"
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="default"
            onClick={handleClear}
            className="gap-2"
            aria-label="Clear all filters"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
