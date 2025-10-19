/**
 * @file Pagination.tsx
 * @description Pagination controls for job list
 *
 * Displays page navigation with Previous/Next buttons and page info.
 * Updates URL search params on page change.
 */

'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  /** Total number of items */
  total: number;

  /** Number of items per page */
  take: number;

  /** Number of items to skip (offset) */
  skip: number;
}

/**
 * Pagination Component
 *
 * Displays pagination controls with Previous/Next buttons and page information.
 * Automatically updates URL search params when page changes.
 */
export function Pagination({ total, take, skip }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Calculate pagination values
  const currentPage = Math.floor(skip / take) + 1;
  const totalPages = Math.ceil(total / take);
  const hasPrevious = skip > 0;
  const hasNext = skip + take < total;
  const showingFrom = skip + 1;
  const showingTo = Math.min(skip + take, total);

  // Don't render pagination if everything fits on one page
  if (total <= take) {
    return null;
  }

  const handlePageChange = (newSkip: number) => {
    const params = new URLSearchParams(searchParams);
    if (newSkip > 0) {
      params.set('skip', String(newSkip));
    } else {
      params.delete('skip');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePrevious = () => {
    const newSkip = Math.max(0, skip - take);
    handlePageChange(newSkip);
  };

  const handleNext = () => {
    const newSkip = skip + take;
    handlePageChange(newSkip);
  };

  return (
    <div className="flex items-center justify-between px-2">
      {/* Page Info */}
      <div className="flex-1 text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-medium text-foreground">
          {showingFrom}-{showingTo}
        </span>{' '}
        of <span className="font-medium text-foreground">{total}</span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={!hasPrevious}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!hasNext}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
