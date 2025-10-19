/**
 * Type definitions for the LoRA Training Wizard
 *
 * This module defines the state management types for the multi-step
 * LoRA training wizard, including validation rules and initial state.
 */

/**
 * Wizard step index (0-indexed)
 * - 0: Dataset Selection
 * - 1: LoRA Config Selection
 * - 2: Review & Submit
 */
export type WizardStep = 0 | 1 | 2;

/**
 * Wizard state interface
 *
 * Tracks the current step and selected resources for LoRA training.
 * State is validated at each step before allowing progression.
 */
export interface WizardState {
  /** Current wizard step (0-2) */
  currentStep: WizardStep;

  /** Selected dataset ID (required for all steps) */
  selectedDatasetId: string | null;

  /** Selected LoRA configuration ID (required for steps 1-2) */
  selectedConfigId: string | null;

  /** Job name (required for step 1+) */
  jobName: string;
}

/**
 * Wizard context interface for state management
 *
 * Provides methods to control wizard flow and update selected resources.
 */
export interface WizardContext {
  /** Current wizard state */
  state: WizardState;

  /** Navigate to next step (if current step is valid) */
  nextStep: () => void;

  /** Navigate to previous step */
  prevStep: () => void;

  /** Update selected dataset */
  setDataset: (id: string | null) => void;

  /** Update selected LoRA configuration */
  setConfig: (id: string | null) => void;

  /** Update job name */
  setJobName: (name: string) => void;

  /** Reset wizard to initial state */
  reset: () => void;

  /** Check if a specific step is valid */
  isStepValid: (step: WizardStep) => boolean;

  /** Check if can proceed from current step */
  canProceed: () => boolean;
}

/**
 * Initial wizard state
 *
 * All selections start as null, wizard begins at step 0.
 */
export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 0,
  selectedDatasetId: null,
  selectedConfigId: null,
  jobName: '',
};

/**
 * Step validation rules
 *
 * Defines the requirements for each wizard step:
 * - Step 0 (Dataset): Requires selectedDatasetId
 * - Step 1 (Config): Requires selectedDatasetId, selectedConfigId, and non-empty jobName
 * - Step 2 (Review): Requires selectedDatasetId, selectedConfigId, and non-empty jobName
 */
export const STEP_VALIDATION: Record<WizardStep, (state: WizardState) => boolean> = {
  0: (state) => state.selectedDatasetId !== null,
  1: (state) =>
    state.selectedDatasetId !== null &&
    state.selectedConfigId !== null &&
    state.jobName.trim().length > 0,
  2: (state) =>
    state.selectedDatasetId !== null &&
    state.selectedConfigId !== null &&
    state.jobName.trim().length > 0,
};
