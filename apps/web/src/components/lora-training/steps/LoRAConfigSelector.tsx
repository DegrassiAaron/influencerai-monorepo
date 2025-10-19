/**
 * @file LoRAConfigSelector.tsx
 * @description Step 1 - LoRA configuration and job naming for LoRA Training Wizard
 *
 * Fetches and displays available LoRA configurations for training.
 * Allows user to select a configuration and enter a job name.
 */

'use client';

import { useLoraConfigs, type LoraConfig } from '@influencerai/sdk/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfigCard } from '../ConfigCard';
import { ConfigListSkeleton } from '../Skeletons';

export interface LoRAConfigSelectorProps {
  /** Currently selected config ID */
  selectedConfigId: string | null;
  /** Current job name value */
  jobName: string;
  /** Callback when a config is selected */
  onSelectConfig: (id: string) => void;
  /** Callback when job name changes */
  onSetJobName: (name: string) => void;
}

/**
 * LoRA configuration selection step component
 *
 * Displays all available LoRA configurations and a job name input field.
 * Shows loading skeleton while fetching, error state on failure,
 * and empty state if no configurations are available.
 *
 * @example
 * ```tsx
 * <LoRAConfigSelector
 *   selectedConfigId={wizard.state.selectedConfigId}
 *   jobName={wizard.state.jobName}
 *   onSelectConfig={wizard.setConfig}
 *   onSetJobName={wizard.setJobName}
 * />
 * ```
 */
export function LoRAConfigSelector({
  selectedConfigId,
  jobName,
  onSelectConfig,
  onSetJobName,
}: LoRAConfigSelectorProps) {
  const { data: configs, isLoading, isError, error } = useLoraConfigs();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Configure Training</h2>
        <p className="text-sm text-muted-foreground">Loading configurations...</p>
        <ConfigListSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Configure Training</h2>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load configurations: {error?.message ?? 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  if (!configs || configs.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Configure Training</h2>
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No configurations available. Please create a LoRA configuration first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Configure Training</h2>
        <p className="text-sm text-muted-foreground">
          Select a training configuration and provide a name for this training job. The
          configuration determines training parameters like epochs, learning rate, and network
          architecture.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="jobName">Job Name</Label>
          <Input
            id="jobName"
            type="text"
            placeholder="e.g., My Influencer LoRA Training"
            value={jobName}
            onChange={(e) => onSetJobName(e.target.value)}
            className="max-w-xl"
          />
          <p className="text-xs text-muted-foreground">
            Provide a descriptive name to identify this training job.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Training Configuration</h3>
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            role="radiogroup"
            aria-label="Available LoRA configurations"
          >
            {configs.map((config: LoraConfig) => (
              <ConfigCard
                key={config.id}
                config={config}
                selected={config.id === selectedConfigId}
                onSelect={() => onSelectConfig(config.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
