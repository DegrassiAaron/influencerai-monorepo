/**
 * Custom hook for LoRA Training Wizard state management
 *
 * Provides state and methods to control the multi-step LoRA training wizard,
 * including validation, navigation, and resource selection.
 *
 * @example
 * ```typescript
 * const wizard = useLoRAWizard();
 *
 * // Select dataset
 * wizard.setDataset('dataset_123');
 *
 * // Check if can proceed
 * if (wizard.canProceed()) {
 *   wizard.nextStep();
 * }
 *
 * // Select LoRA config
 * wizard.setLoraConfig('config_456');
 *
 * // Navigate to review
 * wizard.nextStep();
 * ```
 */

import { useState, useMemo, useCallback } from 'react';
import type { WizardState, WizardStep, WizardContext } from '@/types/lora-wizard';
import { INITIAL_WIZARD_STATE, STEP_VALIDATION } from '@/types/lora-wizard';

/**
 * Hook for managing LoRA training wizard state
 *
 * @param initialState - Optional initial wizard state
 * @returns Wizard context with state and control methods
 */
export function useLoRAWizard(initialState?: Partial<WizardState>): WizardContext {
  const [state, setState] = useState<WizardState>({
    ...INITIAL_WIZARD_STATE,
    ...initialState,
  });

  /**
   * Check if a specific step is valid
   *
   * @param step - Step to validate (0-2)
   * @returns True if step requirements are met
   */
  const isStepValid = useCallback(
    (step: WizardStep): boolean => {
      const validator = STEP_VALIDATION[step];
      return validator(state);
    },
    [state]
  );

  /**
   * Check if can proceed from current step
   *
   * @returns True if current step is valid
   */
  const canProceed = useCallback((): boolean => {
    return isStepValid(state.currentStep);
  }, [state.currentStep, isStepValid]);

  /**
   * Navigate to next step
   *
   * Only proceeds if current step is valid (max step: 2)
   */
  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep >= 2) return prev;

      // Only advance if current step is valid
      const validator = STEP_VALIDATION[prev.currentStep];
      if (!validator(prev)) return prev;

      return { ...prev, currentStep: (prev.currentStep + 1) as WizardStep };
    });
  }, []);

  /**
   * Navigate to previous step
   *
   * Decrements step (min step: 0)
   */
  const prevStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep <= 0) return prev;
      return { ...prev, currentStep: (prev.currentStep - 1) as WizardStep };
    });
  }, []);

  /**
   * Update selected dataset
   *
   * @param id - Dataset ID or null to clear
   */
  const setDataset = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedDatasetId: id }));
  }, []);

  /**
   * Update selected LoRA configuration
   *
   * @param id - LoRA config ID or null to clear
   */
  const setConfig = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedConfigId: id }));
  }, []);

  /**
   * Update job name
   *
   * @param name - Job name
   */
  const setJobName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, jobName: name }));
  }, []);

  /**
   * Reset wizard to initial state
   *
   * Clears all selections and returns to step 0
   */
  const reset = useCallback(() => {
    setState(INITIAL_WIZARD_STATE);
  }, []);

  // Memoize context to prevent unnecessary re-renders
  const context = useMemo<WizardContext>(
    () => ({
      state,
      nextStep,
      prevStep,
      setDataset,
      setConfig,
      setJobName,
      reset,
      isStepValid,
      canProceed,
    }),
    [state, nextStep, prevStep, setDataset, setConfig, setJobName, reset, isStepValid, canProceed]
  );

  return context;
}
