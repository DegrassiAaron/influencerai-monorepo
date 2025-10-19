import type { Metadata } from 'next';

import { JobsDashboardPage } from '@/components/jobs/JobsDashboardPage';

export const metadata: Metadata = {
  title: 'Job Monitoring',
  description: 'Controlla lo stato dei job BullMQ in tempo reale.',
};

export default function JobsPage() {
  return <JobsDashboardPage />;
}
