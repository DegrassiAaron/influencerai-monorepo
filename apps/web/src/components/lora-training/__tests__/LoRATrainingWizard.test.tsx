/**
 * @file LoRATrainingWizard.test.tsx
 * @description Tests for the LoRA Training Wizard component
 *
 * This test suite verifies the complete user flow through the wizard:
 * - Step 1: Dataset selection (BDD Scenario 1.1)
 * - Step 2: Configuration selection (BDD Scenario 1.2)
 * - Step 3: Review and submit (BDD Scenario 1.3)
 * - Navigation and validation
 * - Job creation on submit
 *
 * Uses React Testing Library with user-event for realistic interactions
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoRATrainingWizard } from '../LoRATrainingWizard';
import { useDatasets, useLoraConfigs, useCreateJob } from '@influencerai/sdk';

// Mock SDK hooks
jest.mock('@influencerai/sdk', () => ({
  useDatasets: jest.fn(),
  useLoraConfigs: jest.fn(),
  useCreateJob: jest.fn(),
}));

const mockedUseDatasets = useDatasets as jest.MockedFunction<typeof useDatasets>;
const mockedUseLoraConfigs = useLoraConfigs as jest.MockedFunction<
  typeof useLoraConfigs
>;
const mockedUseCreateJob = useCreateJob as jest.MockedFunction<
  typeof useCreateJob
>;

describe('LoRATrainingWizard', () => {
  let queryClient: QueryClient;

  const mockDatasets = [
    {
      id: 'dataset_001',
      name: 'Influencer A Dataset',
      description: 'Training images for Influencer A',
      imageCount: 50,
      status: 'ready',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'dataset_002',
      name: 'Influencer B Dataset',
      description: 'Training images for Influencer B',
      imageCount: 30,
      status: 'ready',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  const mockConfigs = [
    {
      id: 'config_001',
      tenantId: 'tenant_1',
      name: 'Quick Training',
      description: 'Fast training for testing',
      modelName: 'sd15',
      epochs: 10,
      learningRate: 0.0001,
      batchSize: 1,
      resolution: 512,
      networkDim: 32,
      networkAlpha: 16,
      meta: {},
      isDefault: false,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'config_002',
      tenantId: 'tenant_1',
      name: 'Production Training',
      description: 'High-quality production training',
      modelName: 'sd15',
      epochs: 50,
      learningRate: 0.00005,
      batchSize: 2,
      resolution: 768,
      networkDim: 64,
      networkAlpha: 32,
      meta: {},
      isDefault: false,
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  const mockCreateJobMutate = jest.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Default mock implementations
    mockedUseDatasets.mockReturnValue({
      data: mockDatasets,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockedUseLoraConfigs.mockReturnValue({
      data: mockConfigs,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockedUseCreateJob.mockReturnValue({
      mutate: mockCreateJobMutate,
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: null,
      reset: jest.fn(),
    } as any);

    jest.clearAllMocks();
  });

  const renderWizard = (onComplete?: (jobId: string) => void) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <LoRATrainingWizard onComplete={onComplete} />
      </QueryClientProvider>
    );
  };

  describe('BDD Scenario 1.1: Dataset Selection (Step 0)', () => {
    it('should render dataset selection step initially', () => {
      renderWizard();

      expect(screen.getByText(/select dataset/i)).toBeInTheDocument();
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    it('should display available datasets from API', () => {
      renderWizard();

      expect(screen.getByText('Influencer A Dataset')).toBeInTheDocument();
      expect(screen.getByText('Influencer B Dataset')).toBeInTheDocument();
      expect(screen.getByText('50 images')).toBeInTheDocument();
      expect(screen.getByText('30 images')).toBeInTheDocument();
    });

    it('should show loading state while fetching datasets', () => {
      mockedUseDatasets.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWizard();

      expect(screen.getByText(/loading datasets/i)).toBeInTheDocument();
    });

    it('should show error state when dataset fetch fails', () => {
      mockedUseDatasets.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch datasets'),
        refetch: jest.fn(),
      } as any);

      renderWizard();

      expect(screen.getByText(/failed to load datasets/i)).toBeInTheDocument();
    });

    it('should allow selecting a dataset', async () => {
      const user = userEvent.setup();
      renderWizard();

      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      expect(datasetCard).toBeInTheDocument();

      await user.click(datasetCard!);

      // Card should have selected styling (aria-pressed or data-selected)
      expect(datasetCard).toHaveAttribute('aria-pressed', 'true');
    });

    it('should disable Next button when no dataset is selected', () => {
      renderWizard();

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when dataset is selected', async () => {
      const user = userEvent.setup();
      renderWizard();

      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      await user.click(datasetCard!);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeEnabled();
    });

    it('should not show Back button on first step', () => {
      renderWizard();

      const backButton = screen.queryByRole('button', { name: /back/i });
      expect(backButton).not.toBeInTheDocument();
    });

    it('should allow changing dataset selection', async () => {
      const user = userEvent.setup();
      renderWizard();

      const dataset1 = screen.getByText('Influencer A Dataset').closest('button');
      const dataset2 = screen.getByText('Influencer B Dataset').closest('button');

      await user.click(dataset1!);
      expect(dataset1).toHaveAttribute('aria-pressed', 'true');

      await user.click(dataset2!);
      expect(dataset1).toHaveAttribute('aria-pressed', 'false');
      expect(dataset2).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('BDD Scenario 1.2: Configuration Selection (Step 1)', () => {
    const advanceToStep1 = async () => {
      const user = userEvent.setup();
      renderWizard();

      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      await user.click(datasetCard!);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
    };

    it('should advance to config selection after selecting dataset', async () => {
      await advanceToStep1();

      expect(screen.getByText(/configure training/i)).toBeInTheDocument();
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });

    it('should display available LoRA configs from API', async () => {
      await advanceToStep1();

      expect(screen.getByText('Quick Training')).toBeInTheDocument();
      expect(screen.getByText('Production Training')).toBeInTheDocument();
      expect(screen.getByText('10 epochs')).toBeInTheDocument();
      expect(screen.getByText('50 epochs')).toBeInTheDocument();
    });

    it('should show job name input field', async () => {
      await advanceToStep1();

      const jobNameInput = screen.getByLabelText(/job name/i);
      expect(jobNameInput).toBeInTheDocument();
      expect(jobNameInput).toHaveValue('');
    });

    it('should allow entering job name', async () => {
      const user = userEvent.setup();
      await advanceToStep1();

      const jobNameInput = screen.getByLabelText(/job name/i);
      await user.type(jobNameInput, 'My First LoRA Training');

      expect(jobNameInput).toHaveValue('My First LoRA Training');
    });

    it('should allow selecting a config', async () => {
      const user = userEvent.setup();
      await advanceToStep1();

      const configCard = screen.getByText('Quick Training').closest('button');
      await user.click(configCard!);

      expect(configCard).toHaveAttribute('aria-pressed', 'true');
    });

    it('should disable Next button when config or job name is missing', async () => {
      const user = userEvent.setup();
      await advanceToStep1();

      let nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();

      // Select config but no name
      const configCard = screen.getByText('Quick Training').closest('button');
      await user.click(configCard!);
      expect(nextButton).toBeDisabled();

      // Enter name but deselect config
      await user.click(configCard!); // Deselect
      const jobNameInput = screen.getByLabelText(/job name/i);
      await user.type(jobNameInput, 'Test Job');
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when both config and job name are set', async () => {
      const user = userEvent.setup();
      await advanceToStep1();

      const configCard = screen.getByText('Quick Training').closest('button');
      await user.click(configCard!);

      const jobNameInput = screen.getByLabelText(/job name/i);
      await user.type(jobNameInput, 'Test Job');

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeEnabled();
    });

    it('should show Back button on step 1', async () => {
      await advanceToStep1();

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toBeEnabled();
    });

    it('should go back to dataset selection when Back is clicked', async () => {
      const user = userEvent.setup();
      await advanceToStep1();

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(screen.getByText(/select dataset/i)).toBeInTheDocument();
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    it('should preserve dataset selection when going back and forth', async () => {
      const user = userEvent.setup();
      await advanceToStep1();

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      // Dataset should still be selected
      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      expect(datasetCard).toHaveAttribute('aria-pressed', 'true');
    });

    it('should not allow submitting with whitespace-only job name', async () => {
      const user = userEvent.setup();
      await advanceToStep1();

      const configCard = screen.getByText('Quick Training').closest('button');
      await user.click(configCard!);

      const jobNameInput = screen.getByLabelText(/job name/i);
      await user.type(jobNameInput, '   ');

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('BDD Scenario 1.3: Review and Submit (Step 2)', () => {
    const advanceToStep2 = async () => {
      const user = userEvent.setup();
      renderWizard();

      // Step 0: Select dataset
      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      await user.click(datasetCard!);
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 1: Select config and enter name
      const configCard = screen.getByText('Quick Training').closest('button');
      await user.click(configCard!);
      const jobNameInput = screen.getByLabelText(/job name/i);
      await user.type(jobNameInput, 'Production Training Run');
      await user.click(screen.getByRole('button', { name: /next/i }));
    };

    it('should advance to review step after completing config', async () => {
      await advanceToStep2();

      expect(screen.getByText(/review and start/i)).toBeInTheDocument();
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
    });

    it('should display selected dataset information', async () => {
      await advanceToStep2();

      expect(screen.getByText(/dataset/i)).toBeInTheDocument();
      expect(screen.getByText('Influencer A Dataset')).toBeInTheDocument();
      expect(screen.getByText('50 images')).toBeInTheDocument();
    });

    it('should display selected config information', async () => {
      await advanceToStep2();

      expect(screen.getByText(/configuration/i)).toBeInTheDocument();
      expect(screen.getByText('Quick Training')).toBeInTheDocument();
      expect(screen.getByText(/10 epochs/i)).toBeInTheDocument();
    });

    it('should display entered job name', async () => {
      await advanceToStep2();

      expect(screen.getByText(/job name/i)).toBeInTheDocument();
      expect(screen.getByText('Production Training Run')).toBeInTheDocument();
    });

    it('should show Start Training button instead of Next', async () => {
      await advanceToStep2();

      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start training/i })).toBeInTheDocument();
    });

    it('should show Back button on review step', async () => {
      await advanceToStep2();

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toBeEnabled();
    });

    it('should allow going back to config step from review', async () => {
      const user = userEvent.setup();
      await advanceToStep2();

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(screen.getByText(/configure training/i)).toBeInTheDocument();
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });

    it('should create job when Start Training is clicked', async () => {
      const user = userEvent.setup();
      mockCreateJobMutate.mockImplementation((data, options) => {
        options?.onSuccess?.({ id: 'job_123' } as any, data, undefined);
      });

      await advanceToStep2();

      const startButton = screen.getByRole('button', { name: /start training/i });
      await user.click(startButton);

      expect(mockCreateJobMutate).toHaveBeenCalledWith(
        {
          type: 'lora-training',
          name: 'Production Training Run',
          spec: {
            datasetId: 'dataset_001',
            configId: 'config_001',
          },
        },
        expect.any(Object)
      );
    });

    it('should call onComplete callback with job ID after successful creation', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn();
      mockCreateJobMutate.mockImplementation((data, options) => {
        options?.onSuccess?.({ id: 'job_123' } as any, data, undefined);
      });

      render(
        <QueryClientProvider client={queryClient}>
          <LoRATrainingWizard onComplete={onComplete} />
        </QueryClientProvider>
      );

      // Complete wizard
      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      await user.click(datasetCard!);
      await user.click(screen.getByRole('button', { name: /next/i }));

      const configCard = screen.getByText('Quick Training').closest('button');
      await user.click(configCard!);
      const jobNameInput = screen.getByLabelText(/job name/i);
      await user.type(jobNameInput, 'Test Job');
      await user.click(screen.getByRole('button', { name: /next/i }));

      const startButton = screen.getByRole('button', { name: /start training/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith('job_123');
      });
    });

    it('should disable Start Training button while creating job', async () => {
      const user = userEvent.setup();
      mockedUseCreateJob.mockReturnValue({
        mutate: mockCreateJobMutate,
        mutateAsync: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
        data: null,
        reset: jest.fn(),
      } as any);

      await advanceToStep2();

      const startButton = screen.getByRole('button', { name: /start training/i });
      expect(startButton).toBeDisabled();
    });

    it('should show error message when job creation fails', async () => {
      const user = userEvent.setup();
      mockCreateJobMutate.mockImplementation((data, options) => {
        options?.onError?.(new Error('Failed to create job'), data, undefined);
      });

      mockedUseCreateJob.mockReturnValue({
        mutate: mockCreateJobMutate,
        mutateAsync: jest.fn(),
        isPending: false,
        isError: true,
        error: new Error('Failed to create job'),
        data: null,
        reset: jest.fn(),
      } as any);

      await advanceToStep2();

      const startButton = screen.getByRole('button', { name: /start training/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create job/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Validation', () => {
    it('should maintain step indicator accuracy throughout wizard', async () => {
      const user = userEvent.setup();
      renderWizard();

      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();

      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      await user.click(datasetCard!);
      await user.click(screen.getByRole('button', { name: /next/i }));

      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();

      const configCard = screen.getByText('Quick Training').closest('button');
      await user.click(configCard!);
      const jobNameInput = screen.getByLabelText(/job name/i);
      await user.type(jobNameInput, 'Test');
      await user.click(screen.getByRole('button', { name: /next/i }));

      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
    });

    it('should preserve all selections when navigating back through all steps', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Complete all steps
      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      await user.click(datasetCard!);
      await user.click(screen.getByRole('button', { name: /next/i }));

      const configCard = screen.getByText('Quick Training').closest('button');
      await user.click(configCard!);
      const jobNameInput = screen.getByLabelText(/job name/i);
      await user.type(jobNameInput, 'Test Job');
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Go back to step 1
      await user.click(screen.getByRole('button', { name: /back/i }));
      expect(screen.getByLabelText(/job name/i)).toHaveValue('Test Job');
      const configCardAgain = screen.getByText('Quick Training').closest('button');
      expect(configCardAgain).toHaveAttribute('aria-pressed', 'true');

      // Go back to step 0
      await user.click(screen.getByRole('button', { name: /back/i }));
      const datasetCardAgain = screen.getByText('Influencer A Dataset').closest('button');
      expect(datasetCardAgain).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for step indicator', () => {
      renderWizard();

      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    it('should use aria-pressed for selectable cards', async () => {
      const user = userEvent.setup();
      renderWizard();

      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      expect(datasetCard).toHaveAttribute('aria-pressed', 'false');

      await user.click(datasetCard!);
      expect(datasetCard).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have accessible form labels', async () => {
      const user = userEvent.setup();
      renderWizard();

      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      await user.click(datasetCard!);
      await user.click(screen.getByRole('button', { name: /next/i }));

      const jobNameInput = screen.getByLabelText(/job name/i);
      expect(jobNameInput).toHaveAttribute('id');
    });

    it('should support keyboard navigation for dataset selection', async () => {
      const user = userEvent.setup();
      renderWizard();

      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      datasetCard?.focus();
      expect(datasetCard).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(datasetCard).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no datasets available', () => {
      mockedUseDatasets.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWizard();

      expect(screen.getByText(/no datasets available/i)).toBeInTheDocument();
    });

    it('should show empty state when no configs available', async () => {
      const user = userEvent.setup();
      mockedUseLoraConfigs.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderWizard();

      const datasetCard = screen.getByText('Influencer A Dataset').closest('button');
      await user.click(datasetCard!);
      await user.click(screen.getByRole('button', { name: /next/i }));

      expect(screen.getByText(/no configurations available/i)).toBeInTheDocument();
    });
  });
});
