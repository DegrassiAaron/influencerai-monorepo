import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LoRATrainingWizard } from '../LoRATrainingWizard';
import {
  useDatasets,
  useDataset,
  useLoraConfigs,
  useLoraConfig,
  useCreateJob,
} from '@influencerai/sdk/react';

vi.mock('@influencerai/sdk/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@influencerai/sdk/react')>();
  return {
    ...actual,
    useDatasets: vi.fn(),
    useDataset: vi.fn(),
    useLoraConfigs: vi.fn(),
    useLoraConfig: vi.fn(),
    useCreateJob: vi.fn(),
  };
});

const mockedUseDatasets = vi.mocked(useDatasets);
const mockedUseDataset = vi.mocked(useDataset);
const mockedUseLoraConfigs = vi.mocked(useLoraConfigs);
const mockedUseLoraConfig = vi.mocked(useLoraConfig);
const mockedUseCreateJob = vi.mocked(useCreateJob);

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
] as const;

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
    description: 'High quality production training',
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
] as const;

function createMutationState(
  overrides: Partial<ReturnType<typeof mockedUseCreateJob>> & { mutate?: ReturnType<typeof vi.fn> } = {}
) {
  const mutate = overrides.mutate ?? vi.fn();
  return {
    mutate,
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: null,
    reset: vi.fn(),
    ...overrides,
  } as ReturnType<typeof mockedUseCreateJob> & { mutate: typeof mutate };
}

describe('LoRATrainingWizard', () => {
  let queryClient: QueryClient;
  let mutateSpy: ReturnType<typeof vi.fn>;

  function renderWizard(props?: Partial<ComponentProps<typeof LoRATrainingWizard>>) {
    return render(
      <QueryClientProvider client={queryClient}>
        <LoRATrainingWizard {...props} />
      </QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mutateSpy = vi.fn();
    mockedUseDatasets.mockReturnValue({
      data: mockDatasets,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    mockedUseDataset.mockReturnValue({
      data: mockDatasets[0],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    mockedUseLoraConfigs.mockReturnValue({
      data: mockConfigs,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    mockedUseLoraConfig.mockReturnValue({
      data: mockConfigs[0],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    mockedUseCreateJob.mockReturnValue(createMutationState({ mutate: mutateSpy }));
  });

  async function goToConfigStep(options: {
    user?: ReturnType<typeof userEvent.setup>;
    props?: Partial<ComponentProps<typeof LoRATrainingWizard>>;
  } = {}) {
    const user = options.user ?? userEvent.setup();
    renderWizard(options.props);
    const datasetButton = screen.getByRole('radio', { name: /influencer a dataset/i });
    await user.click(datasetButton);
    await waitFor(() => expect(datasetButton).toHaveAttribute('aria-pressed', 'true'));
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);
    await screen.findByRole('heading', { level: 2, name: /configure training/i });
    return user;
  }

  async function goToReviewStep(options: {
    user?: ReturnType<typeof userEvent.setup>;
    props?: Partial<ComponentProps<typeof LoRATrainingWizard>>;
  } = {}) {
    const user = await goToConfigStep(options);
    const configButton = screen.getByRole('radio', { name: /quick training/i });
    await user.click(configButton);
    const jobNameInput = screen.getByLabelText(/job name/i);
    await user.clear(jobNameInput);
    await user.type(jobNameInput, 'Production Training Run');
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);
    await screen.findByRole('heading', { level: 2, name: /review and start/i });
    return user;
  }

  it('renders dataset step by default and disables Next until a dataset is chosen', async () => {
    const user = userEvent.setup();
    renderWizard();

    expect(screen.getByRole('heading', { level: 2, name: /select dataset/i })).toBeInTheDocument();
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();

    const datasetButton = screen.getByRole('radio', { name: /influencer a dataset/i });
    await user.click(datasetButton);
    await waitFor(() => expect(nextButton).toBeEnabled());
  });

  it('advances to configuration step after selecting a dataset', async () => {
    await goToConfigStep();
    expect(screen.getByRole('heading', { level: 2, name: /configure training/i })).toBeInTheDocument();
  });

  it('requires both configuration and job name before enabling Next', async () => {
    const user = await goToConfigStep();
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();

    const configButton = screen.getByRole('radio', { name: /quick training/i });
    await user.click(configButton);
    expect(nextButton).toBeDisabled();

    const jobNameInput = screen.getByLabelText(/job name/i);
    await user.type(jobNameInput, 'Run 001');
    expect(nextButton).toBeEnabled();
  });

  it('renders the review summary with dataset and configuration details', async () => {
    await goToReviewStep();
    expect(screen.getByText('Production Training Run')).toBeInTheDocument();

    const datasetSection = within(screen.getByRole('heading', { level: 3, name: /^Dataset$/i }).parentElement!);
    expect(datasetSection.getByText(/50 images/i)).toBeInTheDocument();
    expect(datasetSection.getByText(/ready/i)).toBeInTheDocument();

    const configSection = within(screen.getByRole('heading', { level: 3, name: /^Configuration$/i }).parentElement!);
    expect(configSection.getByText(/10 epochs/i)).toBeInTheDocument();
    expect(configSection.getByText(/0\.0001/i)).toBeInTheDocument();
  });

  it('disables Start Training while the job is being created', async () => {
    mockedUseCreateJob.mockReturnValue(createMutationState({ isPending: true, mutate: mutateSpy }));
    await goToReviewStep();

    const startButton = screen.getByRole('button', { name: /creating job/i });
    expect(startButton).toBeDisabled();
  });

  it('shows a job creation error message when mutation fails', async () => {
    const error = new Error('Failed to create job');
    mockedUseCreateJob.mockReturnValue(
      createMutationState({
        mutate: (_input, options) => {
          options?.onError?.(error, _input, undefined);
        },
        isError: true,
        error,
      })
    );

    await goToReviewStep();
    expect(screen.getByText(/failed to create job: Failed to create job/i)).toBeInTheDocument();
  });

  it('invokes onComplete callback with the job id on success', async () => {
    mockedUseCreateJob.mockReturnValue(
      createMutationState({
        mutate: (input, options) => {
          options?.onSuccess?.({ id: 'job_789' } as any, input, undefined);
        },
      })
    );
    const onComplete = vi.fn();
    const user = await goToReviewStep({ props: { onComplete } });
    const startButton = screen.getByRole('button', { name: /start training/i });
    await user.click(startButton);
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('job_789'));
  });

  it('renders dataset loading and error states', () => {
    mockedUseDatasets.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWizard();
    expect(screen.getByText(/loading datasets/i)).toBeInTheDocument();

    mockedUseDatasets.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      refetch: vi.fn(),
    });
    renderWizard();
    expect(screen.getByText(/failed to load datasets: boom/i)).toBeInTheDocument();
  });

  it('shows empty-state message when no configurations are available', async () => {
    mockedUseLoraConfigs.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    await goToConfigStep();
    expect(screen.getByText(/no configurations available/i)).toBeInTheDocument();
  });
});
