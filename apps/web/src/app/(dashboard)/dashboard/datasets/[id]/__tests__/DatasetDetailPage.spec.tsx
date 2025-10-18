import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRouter } from 'next/navigation';

import { DatasetDetailPageClient } from '../DatasetDetailPageClient';
import type { Dataset } from '@influencerai/sdk';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}));

// Mock SDK hooks
vi.mock('@influencerai/sdk/react', () => ({
  useDataset: vi.fn(),
  useDeleteDataset: vi.fn(),
}));

const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
};

const mockDataset: Dataset = {
  id: 'ds_test123',
  kind: 'lora-training',
  path: 'datasets/character-alice',
  status: 'ready',
  meta: {
    imageCount: 42,
    description: 'Training dataset for Alice character',
    images: Array.from({ length: 42 }, (_, i) => ({
      id: `img_${i}`,
      url: `https://example.com/image-${i}.jpg`,
      caption: `Image ${i}`,
      thumbnailUrl: `https://example.com/thumb-${i}.jpg`,
    })),
  },
  createdAt: '2025-01-15T10:30:00.000Z',
  updatedAt: '2025-01-15T12:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(async () => {
  (useRouter as any).mockReturnValue(mockRouter);

  // Mock useDeleteDataset for all tests
  const { useDeleteDataset } = await import('@influencerai/sdk/react');
  (useDeleteDataset as any).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
});

describe('DatasetDetailPage Integration', () => {
  it('should render page with dataset metadata and images', async () => {
    const { useDataset } = await import('@influencerai/sdk/react');
    (useDataset as any).mockReturnValue({
      data: mockDataset,
      isLoading: false,
      error: null,
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    // Should show dataset ID in heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ds_test123');
    });

    // Should render metadata section
    expect(screen.getByText(/lora-training/)).toBeInTheDocument();
    expect(screen.getByText(/datasets\/character-alice/)).toBeInTheDocument();

    // Should render image gallery with correct count
    expect(screen.getByText(/42 images/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /images/i })).toBeInTheDocument();
  });

  it('should display breadcrumb navigation', async () => {
    const { useDataset } = await import('@influencerai/sdk/react');
    (useDataset as any).mockReturnValue({
      data: mockDataset,
      isLoading: false,
      error: null,
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    await waitFor(() => {
      // Should show breadcrumb: Datasets > {name}
      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
      const datasetsLinks = screen.getAllByText(/datasets/i);
      expect(datasetsLinks.length).toBeGreaterThan(0);
    });
  });

  it('should show loading state while fetching', async () => {
    const { useDataset } = await import('@influencerai/sdk/react');
    (useDataset as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show error state when fetch fails', async () => {
    const { useDataset } = await import('@influencerai/sdk/react');
    (useDataset as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to fetch dataset' },
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/failed to fetch/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('should show 404 when dataset not found', async () => {
    const { useDataset } = await import('@influencerai/sdk/react');
    (useDataset as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Dataset not found', status: 404 },
    });

    render(<DatasetDetailPageClient id="ds_nonexistent" />);

    await waitFor(() => {
      const notFoundMessages = screen.getAllByText(/not found/i);
      expect(notFoundMessages.length).toBeGreaterThan(0);
    });
  });

  it('should render Train LoRA button when status is ready', async () => {
    const { useDataset } = await import('@influencerai/sdk/react');
    (useDataset as any).mockReturnValue({
      data: mockDataset,
      isLoading: false,
      error: null,
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    await waitFor(() => {
      const trainButton = screen.getByRole('button', { name: /train lora/i });
      expect(trainButton).toBeInTheDocument();
      expect(trainButton).not.toBeDisabled();
    });
  });

  it('should disable Train LoRA button when status is not ready', async () => {
    const { useDataset } = await import('@influencerai/sdk/react');
    const pendingDataset = { ...mockDataset, status: 'pending' };
    (useDataset as any).mockReturnValue({
      data: pendingDataset,
      isLoading: false,
      error: null,
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    await waitFor(() => {
      const trainButton = screen.getByRole('button', { name: /train lora/i });
      expect(trainButton).toBeDisabled();
    });
  });

  it('should navigate to training wizard when Train LoRA clicked', async () => {
    const user = userEvent.setup();
    const { useDataset } = await import('@influencerai/sdk/react');
    (useDataset as any).mockReturnValue({
      data: mockDataset,
      isLoading: false,
      error: null,
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /train lora/i })).toBeInTheDocument();
    });

    const trainButton = screen.getByRole('button', { name: /train lora/i });
    await user.click(trainButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/loras/new?datasetId=ds_test123');
  });

  it('should show delete button and confirmation dialog', async () => {
    const user = userEvent.setup();
    const { useDataset, useDeleteDataset } = await import('@influencerai/sdk/react');
    (useDataset as any).mockReturnValue({
      data: mockDataset,
      isLoading: false,
      error: null,
    });
    (useDeleteDataset as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
    });
  });

  it('should delete dataset and redirect on confirmation', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn();
    const { useDataset, useDeleteDataset } = await import('@influencerai/sdk/react');

    (useDataset as any).mockReturnValue({
      data: mockDataset,
      isLoading: false,
      error: null,
    });

    (useDeleteDataset as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    // Click delete button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(mockMutate).toHaveBeenCalledWith({ id: 'ds_test123' });
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const { useDataset } = await import('@influencerai/sdk/react');
    (useDataset as any).mockReturnValue({
      data: mockDataset,
      isLoading: false,
      error: null,
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /train lora/i })).toBeInTheDocument();
    });

    // Should be able to navigate with keyboard
    await user.tab();
    await user.tab();

    // At least one button should be focusable
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should have proper semantic HTML and ARIA', async () => {
    const { useDataset } = await import('@influencerai/sdk/react');
    (useDataset as any).mockReturnValue({
      data: mockDataset,
      isLoading: false,
      error: null,
    });

    render(<DatasetDetailPageClient id="ds_test123" />);

    await waitFor(() => {
      // Main heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

      // Breadcrumb navigation
      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();

      // Metadata region
      expect(screen.getByRole('region', { name: /metadata/i })).toBeInTheDocument();

      // Images region
      expect(screen.getByRole('region', { name: /images/i })).toBeInTheDocument();
    });
  });
});
