/**
 * @file page.tsx
 * @description Job monitoring page route
 *
 * Server Component that renders the job detail/monitoring page.
 * Extracts jobId from params and passes to JobMonitor client component.
 */

import type { Metadata } from 'next';
import { JobMonitor } from '@/components/lora-training/JobMonitor';

export const metadata: Metadata = {
  title: 'Job Details',
  description: 'Monitor LoRA training job progress and status',
};

interface PageProps {
  params: {
    jobId: string;
  };
}

/**
 * Job Monitoring Page
 *
 * Displays real-time job status, progress, logs, and artifacts.
 * Implements auto-polling for active jobs.
 */
export default function JobMonitorPage({ params }: PageProps) {
  return <JobMonitor jobId={params.jobId} />;
}
