/**
 * @file WizardFooter.tsx
 * @description Footer component for LoRA Training Wizard with navigation controls
 *
 * Provides Back, Next, and Start Training buttons with proper state management,
 * keyboard accessibility, and loading indicators.
 */

'use client';

import { Button } from '@/components/ui/button';
import type { WizardStep } from '@/types/lora-wizard';

export interface WizardFooterProps {
  /** Current wizard step (0-2) */
  currentStep: WizardStep;
  /** Whether the user can proceed to the next step */
  canProceed: boolean;
  /** Callback to navigate to the next step */
  onNext: () => void;
  /** Callback to navigate to the previous step */
  onPrev: () => void;
  /** Callback to submit the form (only shown on final step) */
  onSubmit: () => void;
  /** Whether the submit action is in progress */
  isSubmitting: boolean;
}

/**
 * Wizard footer component with navigation buttons
 *
 * Conditionally renders Back/Next or Back/Start Training buttons
 * based on the current step. Handles disabled states and loading indicators.
 *
 * @example
 * ```tsx
 * <WizardFooter
 *   currentStep={wizard.state.currentStep}
 *   canProceed={wizard.canProceed()}
 *   onNext={wizard.nextStep}
 *   onPrev={wizard.prevStep}
 *   onSubmit={handleSubmit}
 *   isSubmitting={createJobMutation.isPending}
 * />
 * ```
 */
export function WizardFooter({
  currentStep,
  canProceed,
  onNext,
  onPrev,
  onSubmit,
  isSubmitting,
}: WizardFooterProps) {
  const isFirstStep = currentStep === 0;
  const isFinalStep = currentStep === 2;

  return (
    <footer className="flex items-center justify-between border-t border-border bg-card pt-6">
      {!isFirstStep ? (
        <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
          Back
        </Button>
      ) : (
        <div />
      )}

      {isFinalStep ? (
        <Button onClick={onSubmit} disabled={isSubmitting || !canProceed}>
          {isSubmitting ? 'Creating Job...' : 'Start Training'}
        </Button>
      ) : (
        <Button onClick={onNext} disabled={!canProceed}>
          Next
        </Button>
      )}
    </footer>
  );
}
