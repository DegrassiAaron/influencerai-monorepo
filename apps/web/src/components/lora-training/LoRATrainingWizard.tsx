/**
 * @file LoRATrainingWizard.tsx
 * @description Main wizard container for LoRA Training job creation
 *
 * Orchestrates the 3-step wizard flow for creating LoRA training jobs:
 * 1. Dataset selection
 * 2. Configuration and job naming
 * 3. Review and submission
 *
 * Uses useLoRAWizard hook for state management and useCreateJob mutation
 * for API integration. Handles navigation, validation, and error states.
 */

'use client';

import { useLoRAWizard } from '@/hooks/useLoRAWizard';
import { useCreateJob, type JobResponse } from '@influencerai/sdk/react';
import { WizardHeader } from './WizardHeader';
import { WizardFooter } from './WizardFooter';
import { DatasetSelector } from './steps/DatasetSelector';
import { LoRAConfigSelector } from './steps/LoRAConfigSelector';
import { ReviewSummary } from './steps/ReviewSummary';

export interface LoRATrainingWizardProps {
  /** Callback invoked when job is successfully created */
  onComplete?: (jobId: string) => void;
}

/**
 * Main LoRA Training Wizard component
 *
 * Provides a guided 3-step process for creating LoRA training jobs.
 * Manages state via useLoRAWizard hook and creates jobs via useCreateJob mutation.
 * Invokes onComplete callback with job ID after successful creation.
 *
 * @example
 * ```tsx
 * <LoRATrainingWizard
 *   onComplete={(jobId) => {
 *     router.push(`/lora-training/${jobId}`);
 *   }}
 * />
 * ```
 */
export function LoRATrainingWizard({ onComplete }: LoRATrainingWizardProps) {
  const wizard = useLoRAWizard();

  const createJobMutation = useCreateJob({
    onSuccess: (job: JobResponse) => {
      if (onComplete) {
        onComplete(job.id);
      }
    },
    onError: (error: Error) => {
      console.error('Failed to create job:', error);
    },
  });

  const handleSubmit = () => {
    if (!wizard.state.selectedDatasetId || !wizard.state.selectedConfigId) {
      return;
    }

    createJobMutation.mutate(
      {
        type: 'lora-training',
        name: wizard.state.jobName.trim(),
        spec: {
          datasetId: wizard.state.selectedDatasetId,
          configId: wizard.state.selectedConfigId,
        },
      },
      {
        onSuccess: (job: JobResponse) => {
          if (onComplete) {
            onComplete(job.id);
          }
        },
      }
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <WizardHeader currentStep={wizard.state.currentStep} />

      <section className="min-h-[400px] rounded-xl border border-border bg-card p-6 shadow-sm">
        {wizard.state.currentStep === 0 && (
          <DatasetSelector
            selectedId={wizard.state.selectedDatasetId}
            onSelect={wizard.setDataset}
          />
        )}

        {wizard.state.currentStep === 1 && (
          <LoRAConfigSelector
            selectedConfigId={wizard.state.selectedConfigId}
            jobName={wizard.state.jobName}
            onSelectConfig={wizard.setConfig}
            onSetJobName={wizard.setJobName}
          />
        )}

        {wizard.state.currentStep === 2 && (
          <ReviewSummary
            datasetId={wizard.state.selectedDatasetId!}
            configId={wizard.state.selectedConfigId!}
            jobName={wizard.state.jobName}
          />
        )}

        {createJobMutation.isError && (
          <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to create job: {createJobMutation.error?.message ?? 'Unknown error'}
            </p>
          </div>
        )}
      </section>

      <WizardFooter
        currentStep={wizard.state.currentStep}
        canProceed={wizard.canProceed()}
        onNext={wizard.nextStep}
        onPrev={wizard.prevStep}
        onSubmit={handleSubmit}
        isSubmitting={createJobMutation.isPending}
      />
    </div>
  );
}
