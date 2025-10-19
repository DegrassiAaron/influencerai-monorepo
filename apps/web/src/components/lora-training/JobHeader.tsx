/**
 * @file JobHeader.tsx
 * @description Header component for job detail page
 *
 * Displays breadcrumb navigation, job name, and status badge.
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/**
 * Job type matching API response
 */
interface Job {
  id: string;
  name: string;
  status: string;
}

export interface JobHeaderProps {
  /** Job data for header display */
  job: Job;
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
 * Get status display text
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'Succeeded';
    case 'failed':
      return 'Failed';
    case 'running':
      return 'Running';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

/**
 * JobHeader Component
 *
 * Displays page header with breadcrumb navigation, job name, and status badge.
 */
export function JobHeader({ job }: JobHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/lora-training">LoRA Training</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{job.id}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Job Name and Status */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{job.name}</h1>
          <p className="text-sm text-muted-foreground">Job ID: {job.id}</p>
        </div>

        <Badge
          variant={getStatusVariant(job.status)}
          data-status={job.status}
          role="status"
          className="text-sm px-3 py-1"
        >
          {getStatusText(job.status)}
        </Badge>
      </div>
    </div>
  );
}
