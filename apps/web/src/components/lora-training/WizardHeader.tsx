/**
 * @file WizardHeader.tsx
 * @description Header component for LoRA Training Wizard with step progress
 *
 * Displays wizard title, description, and visual step progress indicator
 * showing the current step and completion status of previous steps.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WizardStep } from '@/types/lora-wizard';

export interface WizardHeaderProps {
  /** Current wizard step (0-2) */
  currentStep: WizardStep;
}

const STEPS = [
  {
    title: 'Select Dataset',
    description: 'Choose the dataset for LoRA training',
  },
  {
    title: 'Configure Training',
    description: 'Select training parameters and name your job',
  },
  {
    title: 'Review & Start',
    description: 'Review your selections and start training',
  },
] as const;

/**
 * Wizard header component with step progress indicator
 *
 * Renders the wizard title and a visual progress indicator showing
 * the current step (1-3) with completed/active/pending states.
 *
 * @example
 * ```tsx
 * <WizardHeader currentStep={wizard.state.currentStep} />
 * ```
 */
export function WizardHeader({ currentStep }: WizardHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Create LoRA Training Job</h1>
        <p className="text-sm text-muted-foreground">
          Configure and launch a new LoRA training job. Follow the steps to select your dataset,
          configure training parameters, and start the training process.
        </p>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Step {currentStep + 1} of 3</span>
      </div>

      <ol className="flex flex-col gap-3 md:flex-row md:gap-4" aria-label="Wizard steps">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const stepNumber = (index + 1) as 1 | 2 | 3;

          return (
            <li
              key={step.title}
              className={cn(
                'flex-1 rounded-lg border p-3 transition-colors',
                isActive && 'border-primary bg-primary/5',
                isCompleted && 'border-green-500/30 bg-green-50/50',
                !isActive && !isCompleted && 'border-border'
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="flex items-center gap-2">
                <Badge
                  variant={isActive ? 'default' : isCompleted ? 'outline' : 'outline'}
                  className={cn(
                    isCompleted && 'border-green-500 bg-green-100 text-green-700',
                    isActive && 'bg-primary text-primary-foreground'
                  )}
                >
                  {isCompleted ? '✓' : stepNumber}
                </Badge>
                <span className={cn('text-sm font-medium', isActive && 'text-foreground')}>
                  {step.title}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
            </li>
          );
        })}
      </ol>
    </header>
  );
}
