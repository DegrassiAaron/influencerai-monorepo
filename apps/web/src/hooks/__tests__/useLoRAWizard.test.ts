/**
 * @file useLoRAWizard.test.ts
 * @description Tests for the LoRA Training Wizard state management hook
 *
 * This test suite verifies the wizard state machine logic:
 * - Step navigation with validation
 * - Data selection (dataset, config)
 * - Validation rules per step
 * - Reset functionality
 *
 * BDD Mapping: Core state management for Scenarios 1.1, 1.2, 1.3
 */

import { renderHook, act } from '@testing-library/react';
import { useLoRAWizard } from '../useLoRAWizard';

describe('useLoRAWizard', () => {
  describe('Initial State', () => {
    it('should initialize with step 0 and empty state', () => {
      const { result } = renderHook(() => useLoRAWizard());

      expect(result.current.state).toEqual({
        currentStep: 0,
        selectedDatasetId: null,
        selectedConfigId: null,
        jobName: '',
      });
    });

    it('should have canProceed false on initial load', () => {
      const { result } = renderHook(() => useLoRAWizard());

      expect(result.current.canProceed()).toBe(false);
    });
  });

  describe('Step Navigation', () => {
    it('should advance to next step when data is valid', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe(1);
    });

    it('should not advance to next step when data is invalid', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        // No dataset selected
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe(0);
    });

    it('should go back to previous step', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe(1);

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.state.currentStep).toBe(0);
    });

    it('should not go below step 0', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.state.currentStep).toBe(0);
    });

    it('should not advance beyond step 2', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
        result.current.setJobName('Test Job');
        result.current.nextStep();
        result.current.nextStep(); // Try to go beyond step 2
      });

      expect(result.current.state.currentStep).toBe(2);
    });
  });

  describe('Dataset Selection (Step 0)', () => {
    it('should set selected dataset ID', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
      });

      expect(result.current.state.selectedDatasetId).toBe('dataset_001');
    });

    it('should allow changing dataset selection', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.setDataset('dataset_002');
      });

      expect(result.current.state.selectedDatasetId).toBe('dataset_002');
    });

    it('should enable canProceed when dataset is selected', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
      });

      expect(result.current.canProceed()).toBe(true);
    });

    it('should disable canProceed when dataset is cleared', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.setDataset(null);
      });

      expect(result.current.canProceed()).toBe(false);
    });
  });

  describe('Config Selection (Step 1)', () => {
    beforeEach(() => {
      // Helper to get to step 1
    });

    it('should set selected config ID', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
      });

      expect(result.current.state.selectedConfigId).toBe('config_001');
      expect(result.current.state.currentStep).toBe(1);
    });

    it('should set job name', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setJobName('My LoRA Training');
      });

      expect(result.current.state.jobName).toBe('My LoRA Training');
    });

    it('should enable canProceed when both config and job name are set', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
        result.current.setJobName('My LoRA Training');
      });

      expect(result.current.canProceed()).toBe(true);
    });

    it('should disable canProceed when config is missing', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setJobName('My LoRA Training');
        // Config not set
      });

      expect(result.current.canProceed()).toBe(false);
    });

    it('should disable canProceed when job name is empty', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
        // Job name not set
      });

      expect(result.current.canProceed()).toBe(false);
    });

    it('should disable canProceed when job name is only whitespace', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
        result.current.setJobName('   ');
      });

      expect(result.current.canProceed()).toBe(false);
    });
  });

  describe('Review Step (Step 2)', () => {
    it('should have all data available in review step', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
        result.current.setJobName('My LoRA Training');
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe(2);
      expect(result.current.state.selectedDatasetId).toBe('dataset_001');
      expect(result.current.state.selectedConfigId).toBe('config_001');
      expect(result.current.state.jobName).toBe('My LoRA Training');
    });

    it('should allow submitting when on review step with valid data', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
        result.current.setJobName('My LoRA Training');
        result.current.nextStep();
      });

      // canProceed should still be true on review step (for submit button)
      expect(result.current.canProceed()).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
        result.current.setJobName('My LoRA Training');
        result.current.nextStep();

        // Now reset
        result.current.reset();
      });

      expect(result.current.state).toEqual({
        currentStep: 0,
        selectedDatasetId: null,
        selectedConfigId: null,
        jobName: '',
      });
    });

    it('should reset canProceed to false', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.reset();
      });

      expect(result.current.canProceed()).toBe(false);
    });
  });

  describe('Validation Logic Edge Cases', () => {
    it('should preserve data when navigating back and forth', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
        result.current.setJobName('My LoRA Training');
        result.current.prevStep();
        result.current.nextStep();
      });

      expect(result.current.state.selectedConfigId).toBe('config_001');
      expect(result.current.state.jobName).toBe('My LoRA Training');
    });

    it('should validate based on current step', () => {
      const { result } = renderHook(() => useLoRAWizard());

      // Step 0: only need dataset
      act(() => {
        result.current.setDataset('dataset_001');
      });
      expect(result.current.canProceed()).toBe(true);

      // Step 1: need config + job name (dataset already set)
      act(() => {
        result.current.nextStep();
      });
      expect(result.current.canProceed()).toBe(false);

      act(() => {
        result.current.setConfig('config_001');
      });
      expect(result.current.canProceed()).toBe(false); // Still need job name

      act(() => {
        result.current.setJobName('Test');
      });
      expect(result.current.canProceed()).toBe(true);
    });

    it('should trim job name for validation', () => {
      const { result } = renderHook(() => useLoRAWizard());

      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
        result.current.setJobName('  Valid Name  ');
      });

      expect(result.current.canProceed()).toBe(true);
    });
  });

  describe('Complete User Flow', () => {
    it('should complete full wizard flow successfully', () => {
      const { result } = renderHook(() => useLoRAWizard());

      // Step 0: Select dataset
      act(() => {
        result.current.setDataset('dataset_001');
      });
      expect(result.current.state.currentStep).toBe(0);
      expect(result.current.canProceed()).toBe(true);

      // Advance to step 1
      act(() => {
        result.current.nextStep();
      });
      expect(result.current.state.currentStep).toBe(1);

      // Step 1: Select config and name
      act(() => {
        result.current.setConfig('config_001');
        result.current.setJobName('Production LoRA Training');
      });
      expect(result.current.canProceed()).toBe(true);

      // Advance to step 2 (review)
      act(() => {
        result.current.nextStep();
      });
      expect(result.current.state.currentStep).toBe(2);
      expect(result.current.canProceed()).toBe(true);

      // Verify all data is preserved
      expect(result.current.state.selectedDatasetId).toBe('dataset_001');
      expect(result.current.state.selectedConfigId).toBe('config_001');
      expect(result.current.state.jobName).toBe('Production LoRA Training');
    });

    it('should allow user to go back and change selections', () => {
      const { result } = renderHook(() => useLoRAWizard());

      // Complete wizard
      act(() => {
        result.current.setDataset('dataset_001');
        result.current.nextStep();
        result.current.setConfig('config_001');
        result.current.setJobName('Test');
        result.current.nextStep();
      });

      // Go back to step 0
      act(() => {
        result.current.prevStep();
        result.current.prevStep();
        result.current.setDataset('dataset_002'); // Change dataset
      });

      expect(result.current.state.selectedDatasetId).toBe('dataset_002');
      expect(result.current.state.selectedConfigId).toBe('config_001'); // Preserved
    });
  });
});
