import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatasetsPageClient } from '../DatasetsPageClient';
import type { Dataset } from '@influencerai/sdk';

// Mock next/navigation
const mockPush = vi.fn();
const mockUseSearchParams = vi.fn();
const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockUseSearchParams(),
  usePathname: () => mockUsePathname(),
}));

// Mock SDK hooks
const mockUseDatasets = vi.fn();
const mockUseDeleteDataset = vi.fn();

vi.mock('@influencerai/sdk/react', () => ({
  useDatasets: (params: any) => mockUseDatasets(params),
  useDeleteDataset: () => mockUseDeleteDataset(),
}));

const mockDatasets: Dataset[] = [
  {
    id: 'ds_1',
    kind: 'lora-training',
    path: 'datasets/alice',
    status: 'ready',
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
  },
  {
    id: 'ds_2',
    kind: 'image-captioning',
    path: 'datasets/bob',
    status: 'pending',
    createdAt: '2025-01-15T11:00:00.000Z',
    updatedAt: '2025-01-15T11:00:00.000Z',
  },
];

function TestWrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('DatasetsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/dashboard/datasets');

    mockUseDatasets.mockReturnValue({
      data: mockDatasets,
      isLoading: false,
      error: null,
    });

    mockUseDeleteDataset.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should render datasets page with grid view', () => {
    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    // Should render page title
    expect(screen.getByRole('heading', { name: /training datasets/i })).toBeInTheDocument();

    // Should render filters
    expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();

    // Should render dataset cards
    expect(screen.getByText('ds_1')).toBeInTheDocument();
    expect(screen.getByText('ds_2')).toBeInTheDocument();
  });

  it('should filter datasets by status via URL params', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('status=ready'));

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    // Should call useDatasets with status filter
    expect(mockUseDatasets).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ready', take: 20, skip: 0 })
    );
  });

  it('should filter datasets by kind via URL params', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('kind=lora-training'));

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    expect(mockUseDatasets).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'lora-training', take: 20, skip: 0 })
    );
  });

  it('should handle pagination via URL params', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('skip=20&take=20'));

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    expect(mockUseDatasets).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 })
    );
  });

  it('should update URL when filters change', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    // Click to open status select
    const statusSelect = screen.getByLabelText(/filter by status/i);
    await user.click(statusSelect);

    // Click the "Ready" option
    const readyOption = await screen.findByRole('option', { name: /^ready$/i });
    await user.click(readyOption);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('status=ready')
      );
    });
  });

  it('should display loading state', () => {
    mockUseDatasets.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    // Should show skeleton loaders
    expect(screen.getAllByRole('status', { name: /loading/i })).toBeTruthy();
  });

  it('should display error state', () => {
    mockUseDatasets.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch datasets'),
    });

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: /failed to fetch datasets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should display empty state when no datasets', () => {
    mockUseDatasets.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    expect(screen.getByText(/no datasets found/i)).toBeInTheDocument();
  });

  it('should handle dataset deletion', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();

    mockUseDeleteDataset.mockReturnValue({
      mutate,
      isPending: false,
    });

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    // Should show confirmation dialog
    expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(mutate).toHaveBeenCalledWith({ id: 'ds_1' });
  });

  it('should have create dataset button', () => {
    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    const createButton = screen.getByRole('button', { name: /create dataset/i });
    expect(createButton).toBeInTheDocument();
  });

  it('should display pagination controls when needed', () => {
    // Mock 45 datasets to trigger pagination
    const manyDatasets = Array.from({ length: 45 }, (_, i) => ({
      ...mockDatasets[0],
      id: `ds_${i}`,
    }));

    mockUseDatasets.mockReturnValue({
      data: manyDatasets.slice(0, 20),
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
  });

  it('should handle sort by change', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    // Click to open sort by select
    const sortBySelect = screen.getByLabelText(/sort by field/i);
    await user.click(sortBySelect);

    // Click the "Updated Date" option (different from default)
    const updatedDateOption = await screen.findByRole('option', { name: /updated date/i });
    await user.click(updatedDateOption);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=updatedAt')
      );
    });
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DatasetsPageClient />
      </TestWrapper>
    );

    // Tab through interactive elements
    // First tab goes to "Create Dataset" button in header
    await user.tab();
    expect(screen.getByRole('button', { name: /create dataset/i })).toHaveFocus();

    // Second tab goes to status filter
    await user.tab();
    expect(screen.getByLabelText(/filter by status/i)).toHaveFocus();

    // Third tab goes to kind filter
    await user.tab();
    expect(screen.getByLabelText(/filter by kind/i)).toHaveFocus();
  });
});
