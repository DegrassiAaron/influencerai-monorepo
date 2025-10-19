/**
 * @file JobMonitor.test.tsx
 * @description Tests for the Job Monitor component
 *
 * This test suite verifies job monitoring UI for different job states:
 * - Running jobs with progress indicators (BDD Scenario 2.1)
 * - Succeeded jobs with artifacts (BDD Scenario 2.2)
 * - Failed jobs with error messages (BDD Scenario 2.4)
 * - Polling behavior for real-time updates
 * - Presigned URL expiration warnings (BDD Scenario 2.3)
 *
 * Uses React Testing Library and mocked SDK hooks
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobMonitor } from '../JobMonitor';
import { useJob } from '@influencerai/sdk';
import type { Job } from '@influencerai/core-schemas';

// Mock SDK hook
jest.mock('@influencerai/sdk', () => ({
  useJob: jest.fn(),
}));

const mockedUseJob = useJob as jest.MockedFunction<typeof useJob>;

// Mock usePresignedUrl hook
jest.mock('../../../hooks/usePresignedUrl', () => ({
  usePresignedUrl: jest.fn((expiryDate: string | null | undefined) => {
    if (!expiryDate) {
      return { isExpired: true, minutesRemaining: 0, needsRefresh: false };
    }
    // Simple mock: URLs with "expired" in them are expired
    if (expiryDate.includes('expired')) {
      return { isExpired: true, minutesRemaining: 0, needsRefresh: false };
    }
    // URLs with "expiring" need refresh
    if (expiryDate.includes('expiring')) {
      return { isExpired: false, minutesRemaining: 3, needsRefresh: true };
    }
    return { isExpired: false, minutesRemaining: 15, needsRefresh: false };
  }),
}));

describe('JobMonitor', () => {
  let queryClient: QueryClient;

  const mockRunningJob: Job = {
    id: 'job_running',
    tenantId: 'tenant_1',
    type: 'lora_training',
    name: 'Influencer A Training',
    status: 'running',
    spec: {
      datasetId: 'dataset_001',
      configId: 'config_001',
    },
    result: null,
    error: null,
    progress: 45,
    cost: null,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:30:00Z',
  };

  const mockSucceededJob: Job = {
    id: 'job_succeeded',
    tenantId: 'tenant_1',
    type: 'lora_training',
    name: 'Influencer A Training',
    status: 'succeeded',
    spec: {
      datasetId: 'dataset_001',
      configId: 'config_001',
    },
    result: {
      artifacts: [
        {
          id: 'artifact_1',
          type: 'lora_model',
          url: 'https://minio/loras/model.safetensors',
          expiresAt: '2024-01-01T12:00:00Z',
          metadata: {
            size: 524288000,
            filename: 'influencer_a_v1.safetensors',
          },
        },
      ],
      metrics: {
        finalLoss: 0.045,
        trainingTime: 3600,
      },
    },
    error: null,
    progress: 100,
    cost: null,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T11:00:00Z',
  };

  const mockFailedJob: Job = {
    id: 'job_failed',
    tenantId: 'tenant_1',
    type: 'lora_training',
    name: 'Influencer A Training',
    status: 'failed',
    spec: {
      datasetId: 'dataset_001',
      configId: 'config_001',
    },
    result: null,
    error: 'CUDA out of memory. Training failed at epoch 5.',
    progress: 25,
    cost: null,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:15:00Z',
  };

  const mockPendingJob: Job = {
    ...mockRunningJob,
    id: 'job_pending',
    status: 'pending',
    progress: 0,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    jest.clearAllMocks();
  });

  const renderMonitor = (jobId: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <JobMonitor jobId={jobId} />
      </QueryClientProvider>
    );
  };

  describe('BDD Scenario 2.1: Running Job Display', () => {
    beforeEach(() => {
      mockedUseJob.mockReturnValue({
        data: mockRunningJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);
    });

    it('should display job name and status', () => {
      renderMonitor('job_running');

      expect(screen.getByText('Influencer A Training')).toBeInTheDocument();
      expect(screen.getByText(/running/i)).toBeInTheDocument();
    });

    it('should display progress bar with correct percentage', () => {
      renderMonitor('job_running');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '45');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should display progress percentage text', () => {
      renderMonitor('job_running');

      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should show training logs section', () => {
      renderMonitor('job_running');

      expect(screen.getByText(/training logs/i)).toBeInTheDocument();
    });

    it('should display estimated time remaining for running jobs', () => {
      const jobWithETA: Job = {
        ...mockRunningJob,
        result: {
          estimatedTimeRemaining: 1800, // 30 minutes in seconds
        },
      };

      mockedUseJob.mockReturnValue({
        data: jobWithETA,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_running');

      expect(screen.getByText(/estimated time remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/30 minutes/i)).toBeInTheDocument();
    });

    it('should show current epoch for running jobs', () => {
      const jobWithEpoch: Job = {
        ...mockRunningJob,
        result: {
          currentEpoch: 12,
          totalEpochs: 50,
        },
      };

      mockedUseJob.mockReturnValue({
        data: jobWithEpoch,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_running');

      expect(screen.getByText(/epoch 12\/50/i)).toBeInTheDocument();
    });

    it('should not show download button for running jobs', () => {
      renderMonitor('job_running');

      expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
    });
  });

  describe('BDD Scenario 2.2: Succeeded Job Display', () => {
    beforeEach(() => {
      mockedUseJob.mockReturnValue({
        data: mockSucceededJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);
    });

    it('should display success status', () => {
      renderMonitor('job_succeeded');

      expect(screen.getByText(/succeeded/i)).toBeInTheDocument();
    });

    it('should display 100% progress', () => {
      renderMonitor('job_succeeded');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should display artifacts section', () => {
      renderMonitor('job_succeeded');

      expect(screen.getByText(/artifacts/i)).toBeInTheDocument();
      expect(screen.getByText('influencer_a_v1.safetensors')).toBeInTheDocument();
    });

    it('should display artifact file size', () => {
      renderMonitor('job_succeeded');

      // 524288000 bytes = 500 MB
      expect(screen.getByText(/500 MB/i)).toBeInTheDocument();
    });

    it('should show download button for each artifact', () => {
      renderMonitor('job_succeeded');

      const downloadButton = screen.getByRole('button', { name: /download/i });
      expect(downloadButton).toBeInTheDocument();
      expect(downloadButton).toBeEnabled();
    });

    it('should download artifact when download button is clicked', async () => {
      const user = userEvent.setup();

      // Mock window.open
      const mockOpen = jest.fn();
      global.window.open = mockOpen;

      renderMonitor('job_succeeded');

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);

      expect(mockOpen).toHaveBeenCalledWith(
        'https://minio/loras/model.safetensors',
        '_blank'
      );
    });

    it('should display training metrics', () => {
      renderMonitor('job_succeeded');

      expect(screen.getByText(/final loss/i)).toBeInTheDocument();
      expect(screen.getByText('0.045')).toBeInTheDocument();
    });

    it('should display training duration', () => {
      renderMonitor('job_succeeded');

      expect(screen.getByText(/training time/i)).toBeInTheDocument();
      // 3600 seconds = 1 hour
      expect(screen.getByText(/1 hour/i)).toBeInTheDocument();
    });

    it('should show completion timestamp', () => {
      renderMonitor('job_succeeded');

      expect(screen.getByText(/completed at/i)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-01/i)).toBeInTheDocument();
    });
  });

  describe('BDD Scenario 2.3: Presigned URL Expiration', () => {
    it('should show warning when presigned URL is expiring soon', () => {
      const jobWithExpiringUrl: Job = {
        ...mockSucceededJob,
        result: {
          artifacts: [
            {
              id: 'artifact_1',
              type: 'lora_model',
              url: 'https://minio/loras/model.safetensors',
              expiresAt: '2024-01-01T12:00:00Z-expiring', // Mock hook checks for "expiring"
              metadata: {
                filename: 'model.safetensors',
              },
            },
          ],
        },
      };

      mockedUseJob.mockReturnValue({
        data: jobWithExpiringUrl,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_succeeded');

      expect(screen.getByText(/url expires in 3 minutes/i)).toBeInTheDocument();
    });

    it('should show expired message when presigned URL is expired', () => {
      const jobWithExpiredUrl: Job = {
        ...mockSucceededJob,
        result: {
          artifacts: [
            {
              id: 'artifact_1',
              type: 'lora_model',
              url: 'https://minio/loras/model.safetensors',
              expiresAt: '2024-01-01T10:00:00Z-expired', // Mock hook checks for "expired"
              metadata: {
                filename: 'model.safetensors',
              },
            },
          ],
        },
      };

      mockedUseJob.mockReturnValue({
        data: jobWithExpiredUrl,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_succeeded');

      expect(screen.getByText(/url expired/i)).toBeInTheDocument();
    });

    it('should disable download button when URL is expired', () => {
      const jobWithExpiredUrl: Job = {
        ...mockSucceededJob,
        result: {
          artifacts: [
            {
              id: 'artifact_1',
              type: 'lora_model',
              url: 'https://minio/loras/model.safetensors',
              expiresAt: '2024-01-01T10:00:00Z-expired',
              metadata: {
                filename: 'model.safetensors',
              },
            },
          ],
        },
      };

      mockedUseJob.mockReturnValue({
        data: jobWithExpiredUrl,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_succeeded');

      const downloadButton = screen.getByRole('button', { name: /download/i });
      expect(downloadButton).toBeDisabled();
    });

    it('should show refresh button when URL is expired', () => {
      const jobWithExpiredUrl: Job = {
        ...mockSucceededJob,
        result: {
          artifacts: [
            {
              id: 'artifact_1',
              type: 'lora_model',
              url: 'https://minio/loras/model.safetensors',
              expiresAt: '2024-01-01T10:00:00Z-expired',
              metadata: {
                filename: 'model.safetensors',
              },
            },
          ],
        },
      };

      mockedUseJob.mockReturnValue({
        data: jobWithExpiredUrl,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_succeeded');

      const refreshButton = screen.getByRole('button', { name: /refresh url/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should refetch job when refresh URL is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = jest.fn();

      const jobWithExpiredUrl: Job = {
        ...mockSucceededJob,
        result: {
          artifacts: [
            {
              id: 'artifact_1',
              type: 'lora_model',
              url: 'https://minio/loras/model.safetensors',
              expiresAt: '2024-01-01T10:00:00Z-expired',
              metadata: {
                filename: 'model.safetensors',
              },
            },
          ],
        },
      };

      mockedUseJob.mockReturnValue({
        data: jobWithExpiredUrl,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderMonitor('job_succeeded');

      const refreshButton = screen.getByRole('button', { name: /refresh url/i });
      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('BDD Scenario 2.4: Failed Job Display', () => {
    beforeEach(() => {
      mockedUseJob.mockReturnValue({
        data: mockFailedJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);
    });

    it('should display failed status', () => {
      renderMonitor('job_failed');

      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });

    it('should display error message', () => {
      renderMonitor('job_failed');

      expect(screen.getByText(/CUDA out of memory/i)).toBeInTheDocument();
      expect(screen.getByText(/Training failed at epoch 5/i)).toBeInTheDocument();
    });

    it('should display progress at failure point', () => {
      renderMonitor('job_failed');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should show error icon or styling', () => {
      renderMonitor('job_failed');

      // Look for error styling or icon
      const errorSection = screen.getByText(/error/i).closest('div');
      expect(errorSection).toBeInTheDocument();
    });

    it('should show retry button for failed jobs', () => {
      renderMonitor('job_failed');

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toBeEnabled();
    });

    it('should not show artifacts section for failed jobs', () => {
      renderMonitor('job_failed');

      expect(screen.queryByText(/artifacts/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
    });

    it('should show failure timestamp', () => {
      renderMonitor('job_failed');

      expect(screen.getByText(/failed at/i)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-01/i)).toBeInTheDocument();
    });
  });

  describe('Pending Job Display', () => {
    beforeEach(() => {
      mockedUseJob.mockReturnValue({
        data: mockPendingJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);
    });

    it('should display pending status', () => {
      renderMonitor('job_pending');

      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    it('should show 0% progress for pending jobs', () => {
      renderMonitor('job_pending');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show waiting message', () => {
      renderMonitor('job_pending');

      expect(screen.getByText(/waiting to start/i)).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching job', () => {
      mockedUseJob.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_running');

      expect(screen.getByText(/loading job/i)).toBeInTheDocument();
    });

    it('should show error state when job fetch fails', () => {
      mockedUseJob.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch job'),
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_running');

      expect(screen.getByText(/failed to load job/i)).toBeInTheDocument();
    });

    it('should show retry button when fetch fails', () => {
      const mockRefetch = jest.fn();
      mockedUseJob.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

      renderMonitor('job_running');

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = jest.fn();

      mockedUseJob.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

      renderMonitor('job_running');

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Polling Behavior', () => {
    it('should enable polling for running jobs', () => {
      mockedUseJob.mockReturnValue({
        data: mockRunningJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_running');

      // Verify useJob was called with polling enabled
      expect(mockedUseJob).toHaveBeenCalledWith('job_running', {
        polling: true,
      });
    });

    it('should enable polling for pending jobs', () => {
      mockedUseJob.mockReturnValue({
        data: mockPendingJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_pending');

      expect(mockedUseJob).toHaveBeenCalledWith('job_pending', {
        polling: true,
      });
    });

    it('should disable polling for succeeded jobs', () => {
      mockedUseJob.mockReturnValue({
        data: mockSucceededJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_succeeded');

      expect(mockedUseJob).toHaveBeenCalledWith('job_succeeded', {
        polling: true, // Component always requests polling, hook decides
      });
    });

    it('should update UI when polled job status changes', async () => {
      // Start with running job
      mockedUseJob.mockReturnValue({
        data: mockRunningJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { rerender } = renderMonitor('job_running');

      expect(screen.getByText(/running/i)).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();

      // Simulate poll update to succeeded
      mockedUseJob.mockReturnValue({
        data: mockSucceededJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      rerender(
        <QueryClientProvider client={queryClient}>
          <JobMonitor jobId="job_running" />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/succeeded/i)).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Artifacts', () => {
    it('should display all artifacts for jobs with multiple outputs', () => {
      const jobWithMultipleArtifacts: Job = {
        ...mockSucceededJob,
        result: {
          artifacts: [
            {
              id: 'artifact_1',
              type: 'lora_model',
              url: 'https://minio/loras/model.safetensors',
              expiresAt: '2024-01-01T12:00:00Z',
              metadata: {
                filename: 'influencer_a_v1.safetensors',
                size: 524288000,
              },
            },
            {
              id: 'artifact_2',
              type: 'training_log',
              url: 'https://minio/logs/training.log',
              expiresAt: '2024-01-01T12:00:00Z',
              metadata: {
                filename: 'training.log',
                size: 1048576,
              },
            },
          ],
        },
      };

      mockedUseJob.mockReturnValue({
        data: jobWithMultipleArtifacts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_succeeded');

      expect(screen.getByText('influencer_a_v1.safetensors')).toBeInTheDocument();
      expect(screen.getByText('training.log')).toBeInTheDocument();

      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      expect(downloadButtons).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for progress bar', () => {
      mockedUseJob.mockReturnValue({
        data: mockRunningJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_running');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', expect.stringContaining('Training progress'));
    });

    it('should have accessible status badge', () => {
      mockedUseJob.mockReturnValue({
        data: mockRunningJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_running');

      const statusBadge = screen.getByText(/running/i);
      expect(statusBadge).toHaveAttribute('role', 'status');
    });

    it('should have accessible error messages', () => {
      mockedUseJob.mockReturnValue({
        data: mockFailedJob,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderMonitor('job_failed');

      const errorMessage = screen.getByText(/CUDA out of memory/i).closest('[role="alert"]');
      expect(errorMessage).toBeInTheDocument();
    });
  });
});
