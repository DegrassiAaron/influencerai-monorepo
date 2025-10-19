/**
 * @file JobsTable.test.tsx
 * @description Tests for the Jobs Table component
 *
 * This test suite verifies job list display:
 * - Job list rendering with pagination (BDD Scenario 3.1)
 * - Status filtering (BDD Scenario 3.2)
 * - Sorting and navigation
 * - Empty states and error handling
 *
 * Uses React Testing Library and mocked SDK hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobsTable } from '../JobsTable';
import { useJobs } from '@influencerai/sdk';
import type { Job } from '@influencerai/core-schemas';

// Mock SDK hook
vi.mock('@influencerai/sdk', () => ({
  useJobs: vi.fn(),
}));

// Mock Next.js router
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/lora-training',
  query: {},
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/lora-training',
  useSearchParams: () => new URLSearchParams(),
}));

const mockedUseJobs = vi.mocked(useJobs);

describe('JobsTable', () => {
  let queryClient: QueryClient;

  const mockJobs: Job[] = [
    {
      id: 'job_001',
      tenantId: 'tenant_1',
      type: 'lora_training',
      name: 'Influencer A Training - Run 1',
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
            url: 'https://minio/loras/model1.safetensors',
            metadata: { filename: 'model1.safetensors' },
          },
        ],
      },
      error: null,
      progress: 100,
      cost: null,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T11:00:00Z',
    },
    {
      id: 'job_002',
      tenantId: 'tenant_1',
      type: 'lora_training',
      name: 'Influencer B Training - Run 1',
      status: 'running',
      spec: {
        datasetId: 'dataset_002',
        configId: 'config_001',
      },
      result: null,
      error: null,
      progress: 65,
      cost: null,
      createdAt: '2024-01-02T10:00:00Z',
      updatedAt: '2024-01-02T11:30:00Z',
    },
    {
      id: 'job_003',
      tenantId: 'tenant_1',
      type: 'lora_training',
      name: 'Influencer A Training - Run 2',
      status: 'failed',
      spec: {
        datasetId: 'dataset_001',
        configId: 'config_002',
      },
      result: null,
      error: 'Training failed: CUDA out of memory',
      progress: 30,
      cost: null,
      createdAt: '2024-01-03T10:00:00Z',
      updatedAt: '2024-01-03T10:45:00Z',
    },
    {
      id: 'job_004',
      tenantId: 'tenant_1',
      type: 'lora_training',
      name: 'Influencer C Training - Quick Test',
      status: 'pending',
      spec: {
        datasetId: 'dataset_003',
        configId: 'config_001',
      },
      result: null,
      error: null,
      progress: 0,
      cost: null,
      createdAt: '2024-01-04T10:00:00Z',
      updatedAt: '2024-01-04T10:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Default mock implementation
    mockedUseJobs.mockReturnValue({
      data: {
        data: mockJobs,
        total: mockJobs.length,
        take: 20,
        skip: 0,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.clearAllMocks();
  });

  const renderTable = (filters?: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <JobsTable filters={filters} />
      </QueryClientProvider>
    );
  };

  describe('BDD Scenario 3.1: Job List Display', () => {
    it('should render table with job data', () => {
      renderTable();

      expect(screen.getByText('Influencer A Training - Run 1')).toBeInTheDocument();
      expect(screen.getByText('Influencer B Training - Run 1')).toBeInTheDocument();
      expect(screen.getByText('Influencer A Training - Run 2')).toBeInTheDocument();
      expect(screen.getByText('Influencer C Training - Quick Test')).toBeInTheDocument();
    });

    it('should display table headers', () => {
      renderTable();

      expect(screen.getByText(/name/i)).toBeInTheDocument();
      expect(screen.getByText(/status/i)).toBeInTheDocument();
      expect(screen.getByText(/progress/i)).toBeInTheDocument();
      expect(screen.getByText(/created/i)).toBeInTheDocument();
      expect(screen.getByText(/actions/i)).toBeInTheDocument();
    });

    it('should display status badges with correct styling', () => {
      renderTable();

      const succeededBadge = screen.getByText('succeeded');
      const runningBadge = screen.getByText('running');
      const failedBadge = screen.getByText('failed');
      const pendingBadge = screen.getByText('pending');

      expect(succeededBadge).toBeInTheDocument();
      expect(runningBadge).toBeInTheDocument();
      expect(failedBadge).toBeInTheDocument();
      expect(pendingBadge).toBeInTheDocument();

      // Status badges should have specific classes or data attributes
      expect(succeededBadge).toHaveAttribute('data-status', 'succeeded');
      expect(runningBadge).toHaveAttribute('data-status', 'running');
      expect(failedBadge).toHaveAttribute('data-status', 'failed');
      expect(pendingBadge).toHaveAttribute('data-status', 'pending');
    });

    it('should display progress for each job', () => {
      renderTable();

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display formatted creation dates', () => {
      renderTable();

      // Should display relative or formatted dates
      expect(screen.getByText(/Jan 1, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 2, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 3, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 4, 2024/i)).toBeInTheDocument();
    });

    it('should display View button for each job', () => {
      renderTable();

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      expect(viewButtons).toHaveLength(mockJobs.length);
    });

    it('should navigate to job detail when View is clicked', async () => {
      const user = userEvent.setup();
      renderTable();

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      expect(mockPush).toHaveBeenCalledWith('/lora-training/job_001');
    });

    it('should display total count', () => {
      renderTable();

      expect(screen.getByText(/4 jobs/i)).toBeInTheDocument();
    });
  });

  describe('BDD Scenario 3.2: Status Filtering', () => {
    it('should render status filter dropdown', () => {
      renderTable();

      const filterButton = screen.getByRole('button', { name: /filter by status/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('should show all status options when filter is opened', async () => {
      const user = userEvent.setup();
      renderTable();

      const filterButton = screen.getByRole('button', { name: /filter by status/i });
      await user.click(filterButton);

      expect(screen.getByText(/all statuses/i)).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('succeeded')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('should filter jobs by running status', async () => {
      const user = userEvent.setup();

      const runningJobs = mockJobs.filter((j) => j.status === 'running');
      mockedUseJobs.mockReturnValue({
        data: {
          data: runningJobs,
          total: runningJobs.length,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable({ status: 'running' });

      expect(screen.getByText('Influencer B Training - Run 1')).toBeInTheDocument();
      expect(screen.queryByText('Influencer A Training - Run 1')).not.toBeInTheDocument();
      expect(screen.getByText(/1 job/i)).toBeInTheDocument();
    });

    it('should filter jobs by succeeded status', async () => {
      const succeededJobs = mockJobs.filter((j) => j.status === 'succeeded');
      mockedUseJobs.mockReturnValue({
        data: {
          data: succeededJobs,
          total: succeededJobs.length,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable({ status: 'succeeded' });

      expect(screen.getByText('Influencer A Training - Run 1')).toBeInTheDocument();
      expect(screen.queryByText('Influencer B Training - Run 1')).not.toBeInTheDocument();
    });

    it('should filter jobs by failed status', async () => {
      const failedJobs = mockJobs.filter((j) => j.status === 'failed');
      mockedUseJobs.mockReturnValue({
        data: {
          data: failedJobs,
          total: failedJobs.length,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable({ status: 'failed' });

      expect(screen.getByText('Influencer A Training - Run 2')).toBeInTheDocument();
      expect(screen.getByText(/1 job/i)).toBeInTheDocument();
    });

    it('should show all jobs when filter is cleared', async () => {
      const user = userEvent.setup();

      // Start with filtered view
      const { rerender } = renderTable({ status: 'running' });

      // Clear filter
      rerender(
        <QueryClientProvider client={queryClient}>
          <JobsTable filters={undefined} />
        </QueryClientProvider>
      );

      mockedUseJobs.mockReturnValue({
        data: {
          data: mockJobs,
          total: mockJobs.length,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      rerender(
        <QueryClientProvider client={queryClient}>
          <JobsTable filters={undefined} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/4 jobs/i)).toBeInTheDocument();
      });
    });

    it('should call useJobs with correct filter parameters', () => {
      renderTable({ status: 'running' });

      expect(mockedUseJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'lora_training',
          status: 'running',
        })
      );
    });
  });

  describe('Sorting', () => {
    it('should render sort dropdown', () => {
      renderTable();

      const sortButton = screen.getByRole('button', { name: /sort/i });
      expect(sortButton).toBeInTheDocument();
    });

    it('should show sort options when opened', async () => {
      const user = userEvent.setup();
      renderTable();

      const sortButton = screen.getByRole('button', { name: /sort/i });
      await user.click(sortButton);

      expect(screen.getByText(/newest first/i)).toBeInTheDocument();
      expect(screen.getByText(/oldest first/i)).toBeInTheDocument();
      expect(screen.getByText(/name a-z/i)).toBeInTheDocument();
      expect(screen.getByText(/name z-a/i)).toBeInTheDocument();
    });

    it('should sort by creation date descending (newest first)', () => {
      renderTable({ sortBy: 'createdAt', sortOrder: 'desc' });

      expect(mockedUseJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });

    it('should sort by creation date ascending (oldest first)', () => {
      renderTable({ sortBy: 'createdAt', sortOrder: 'asc' });

      expect(mockedUseJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'createdAt',
          sortOrder: 'asc',
        })
      );
    });

    it('should sort by name alphabetically', () => {
      renderTable({ sortBy: 'name', sortOrder: 'asc' });

      expect(mockedUseJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );
    });
  });

  describe('Pagination', () => {
    const manyJobs = Array.from({ length: 50 }, (_, i) => ({
      ...mockJobs[0],
      id: `job_${String(i).padStart(3, '0')}`,
      name: `Training Job ${i + 1}`,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    }));

    beforeEach(() => {
      mockedUseJobs.mockReturnValue({
        data: {
          data: manyJobs.slice(0, 20),
          total: 50,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);
    });

    it('should display pagination controls when there are more jobs than page size', () => {
      renderTable();

      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    });

    it('should show Next button when not on last page', () => {
      renderTable();

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).toBeEnabled();
    });

    it('should show Previous button when not on first page', () => {
      mockedUseJobs.mockReturnValue({
        data: {
          data: manyJobs.slice(20, 40),
          total: 50,
          take: 20,
          skip: 20,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable({ skip: 20 });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeInTheDocument();
      expect(prevButton).toBeEnabled();
    });

    it('should disable Previous button on first page', () => {
      renderTable({ skip: 0 });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('should disable Next button on last page', () => {
      mockedUseJobs.mockReturnValue({
        data: {
          data: manyJobs.slice(40, 50),
          total: 50,
          take: 20,
          skip: 40,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable({ skip: 40 });

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should call useJobs with correct pagination parameters', () => {
      renderTable({ skip: 20, take: 20 });

      expect(mockedUseJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );
    });

    it('should not show pagination when all jobs fit on one page', () => {
      mockedUseJobs.mockReturnValue({
        data: {
          data: mockJobs,
          total: mockJobs.length,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable();

      expect(screen.queryByText(/page/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching jobs', () => {
      mockedUseJobs.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable();

      expect(screen.getByText(/loading jobs/i)).toBeInTheDocument();
    });

    it('should show skeleton rows during loading', () => {
      mockedUseJobs.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable();

      // Should show skeleton placeholders
      const table = screen.getByRole('table');
      expect(within(table).getAllByRole('row').length).toBeGreaterThan(1);
    });

    it('should show error state when fetch fails', () => {
      mockedUseJobs.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch jobs'),
        refetch: jest.fn(),
      } as any);

      renderTable();

      expect(screen.getByText(/failed to load jobs/i)).toBeInTheDocument();
    });

    it('should show retry button when fetch fails', () => {
      const mockRefetch = vi.fn();
      mockedUseJobs.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

      renderTable();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call refetch when retry is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockedUseJobs.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

      renderTable();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no jobs exist', () => {
      mockedUseJobs.mockReturnValue({
        data: {
          data: [],
          total: 0,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable();

      expect(screen.getByText(/no training jobs yet/i)).toBeInTheDocument();
    });

    it('should show create button in empty state', () => {
      mockedUseJobs.mockReturnValue({
        data: {
          data: [],
          total: 0,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable();

      const createButton = screen.getByRole('button', { name: /create training job/i });
      expect(createButton).toBeInTheDocument();
    });

    it('should navigate to wizard when create button is clicked', async () => {
      const user = userEvent.setup();

      mockedUseJobs.mockReturnValue({
        data: {
          data: [],
          total: 0,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable();

      const createButton = screen.getByRole('button', { name: /create training job/i });
      await user.click(createButton);

      expect(mockPush).toHaveBeenCalledWith('/lora-training/new');
    });

    it('should show empty state when filter returns no results', () => {
      mockedUseJobs.mockReturnValue({
        data: {
          data: [],
          total: 0,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable({ status: 'running' });

      expect(screen.getByText(/no jobs found/i)).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
    });
  });

  describe('Row Actions', () => {
    it('should show action menu for each job', () => {
      renderTable();

      const actionButtons = screen.getAllByRole('button', { name: /actions/i });
      expect(actionButtons).toHaveLength(mockJobs.length);
    });

    it('should show menu items when action menu is opened', async () => {
      const user = userEvent.setup();
      renderTable();

      const actionButtons = screen.getAllByRole('button', { name: /actions/i });
      await user.click(actionButtons[0]);

      expect(screen.getByText(/view details/i)).toBeInTheDocument();
      expect(screen.getByText(/view logs/i)).toBeInTheDocument();
    });

    it('should show delete option for failed jobs', async () => {
      const user = userEvent.setup();
      renderTable();

      const actionButtons = screen.getAllByRole('button', { name: /actions/i });
      // Job at index 2 is failed
      await user.click(actionButtons[2]);

      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    it('should show download option for succeeded jobs', async () => {
      const user = userEvent.setup();
      renderTable();

      const actionButtons = screen.getAllByRole('button', { name: /actions/i });
      // Job at index 0 is succeeded
      await user.click(actionButtons[0]);

      expect(screen.getByText(/download artifacts/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table semantics', () => {
      renderTable();

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should have accessible status badges', () => {
      renderTable();

      const succeededBadge = screen.getByText('succeeded');
      expect(succeededBadge).toHaveAttribute('role', 'status');
    });

    it('should have accessible navigation buttons', () => {
      const manyJobs = Array.from({ length: 50 }, (_, i) => ({
        ...mockJobs[0],
        id: `job_${i}`,
      }));

      mockedUseJobs.mockReturnValue({
        data: {
          data: manyJobs.slice(0, 20),
          total: 50,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderTable();

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toHaveAttribute('aria-label', expect.stringContaining('Next page'));
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderTable();

      const firstViewButton = screen.getAllByRole('button', { name: /view/i })[0];
      firstViewButton.focus();

      expect(firstViewButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('should update table when jobs data changes', async () => {
      const { rerender } = renderTable();

      expect(screen.getByText('Influencer A Training - Run 1')).toBeInTheDocument();

      // Simulate data update
      const updatedJobs = [
        ...mockJobs,
        {
          ...mockJobs[0],
          id: 'job_005',
          name: 'New Training Job',
          createdAt: new Date().toISOString(),
        },
      ];

      mockedUseJobs.mockReturnValue({
        data: {
          data: updatedJobs,
          total: updatedJobs.length,
          take: 20,
          skip: 0,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      rerender(
        <QueryClientProvider client={queryClient}>
          <JobsTable />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('New Training Job')).toBeInTheDocument();
        expect(screen.getByText(/5 jobs/i)).toBeInTheDocument();
      });
    });
  });
});
