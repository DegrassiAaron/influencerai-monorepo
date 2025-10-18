import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DatasetCard } from '../components/DatasetCard';
import type { Dataset } from '@influencerai/sdk';

afterEach(() => {
  cleanup();
});

const mockDataset: Dataset = {
  id: 'ds_test123',
  kind: 'lora-training',
  path: 'datasets/character-alice',
  status: 'ready',
  meta: {
    imageCount: 42,
    description: 'Training dataset for Alice character',
  },
  createdAt: '2025-01-15T10:30:00.000Z',
  updatedAt: '2025-01-15T12:00:00.000Z',
};

describe('DatasetCard', () => {
  it('should render dataset information correctly', () => {
    render(<DatasetCard dataset={mockDataset} />);

    // Should display dataset ID
    expect(screen.getByText('ds_test123')).toBeInTheDocument();

    // Should display kind
    expect(screen.getByText('lora-training')).toBeInTheDocument();

    // Should display path
    expect(screen.getByText('datasets/character-alice')).toBeInTheDocument();

    // Should display status badge
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('should render metadata when available', () => {
    render(<DatasetCard dataset={mockDataset} />);

    // Should display image count from metadata
    expect(screen.getByText(/42/)).toBeInTheDocument();

    // Should display description from metadata
    expect(screen.getByText(/Training dataset for Alice character/)).toBeInTheDocument();
  });

  it('should render with different status variants', () => {
    const pendingDataset = { ...mockDataset, status: 'pending' };
    const { rerender } = render(<DatasetCard dataset={pendingDataset} />);

    expect(screen.getByText('pending')).toBeInTheDocument();

    const failedDataset = { ...mockDataset, status: 'failed' };
    rerender(<DatasetCard dataset={failedDataset} />);

    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('should handle dataset without metadata gracefully', () => {
    const datasetNoMeta = { ...mockDataset, meta: undefined };
    render(<DatasetCard dataset={datasetNoMeta} />);

    // Should still render core information
    expect(screen.getByText('ds_test123')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('should call onDelete when delete button clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<DatasetCard dataset={mockDataset} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockDataset.id);
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<DatasetCard dataset={mockDataset} onDelete={onDelete} />);

    // Verify delete button exists
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();

    // Tab to the button and press Enter
    await user.tab();
    await user.keyboard('{Enter}');

    expect(onDelete).toHaveBeenCalledWith(mockDataset.id);
  });

  it('should display formatted dates', () => {
    render(<DatasetCard dataset={mockDataset} />);

    // Should format dates in a human-readable way
    // We don't check exact format as it may vary by locale
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it('should have proper ARIA labels for accessibility', () => {
    render(<DatasetCard dataset={mockDataset} />);

    // Card should have proper role
    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('ds_test123'));
  });
});
