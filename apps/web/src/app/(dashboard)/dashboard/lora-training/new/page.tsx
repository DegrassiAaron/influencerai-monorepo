/**
 * @file page.tsx
 * @description Page route for creating new LoRA training jobs
 *
 * Renders the LoRA Training Wizard and handles navigation to the job
 * details page after successful job creation.
 */

'use client';

import { useRouter } from 'next/navigation';
import { LoRATrainingWizard } from '@/components/lora-training/LoRATrainingWizard';

export default function NewLoRATrainingPage() {
  const router = useRouter();

  const handleComplete = (jobId: string) => {
    router.push(`/dashboard/lora-training/${jobId}`);
  };

  return <LoRATrainingWizard onComplete={handleComplete} />;
}
