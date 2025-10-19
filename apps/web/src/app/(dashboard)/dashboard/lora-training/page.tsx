/**
 * @file page.tsx
 * @description LoRA Training Jobs list page route
 *
 * Server Component that renders the job list page.
 * Sets page metadata and renders LoRATrainingListPage client component.
 */

import type { Metadata } from 'next';
import { LoRATrainingListPage } from '@/components/lora-training/LoRATrainingListPage';

export const metadata: Metadata = {
  title: 'LoRA Training Jobs',
  description: 'Manage and monitor your LoRA model training jobs',
};

/**
 * LoRA Training Jobs List Page
 *
 * Displays all training jobs with filtering, sorting, and pagination.
 */
export default function LoRATrainingPage() {
  return <LoRATrainingListPage />;
}
