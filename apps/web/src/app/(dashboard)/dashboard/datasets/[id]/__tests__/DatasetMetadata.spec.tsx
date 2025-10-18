import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DatasetMetadata } from '../components/DatasetMetadata';
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
    resolution: '512x512',
    captionSource: 'manual',
  },
  createdAt: '2025-01-15T10:30:00.000Z',
  updatedAt: '2025-01-15T12:00:00.000Z',
};

describe('DatasetMetadata', () => {
  it('should render dataset name/ID as heading', () => {
    render(<DatasetMetadata dataset={mockDataset} />);

    // Should display dataset ID somewhere in the component
    expect(screen.getByText('ds_test123')).toBeInTheDocument();
  });

  it('should display all core dataset fields', () => {
    render(<DatasetMetadata dataset={mockDataset} />);

    // Core fields
    expect(screen.getByText(/kind/i)).toBeInTheDocument();
    expect(screen.getByText('lora-training')).toBeInTheDocument();

    expect(screen.getByText(/path/i)).toBeInTheDocument();
    expect(screen.getByText('datasets/character-alice')).toBeInTheDocument();

    expect(screen.getByText(/status/i)).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('should display metadata fields when available', () => {
    render(<DatasetMetadata dataset={mockDataset} />);

    // Metadata fields
    expect(screen.getByText(/image count/i)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();

    expect(screen.getByText(/description/i)).toBeInTheDocument();
    expect(screen.getByText(/Training dataset for Alice character/)).toBeInTheDocument();

    expect(screen.getByText(/resolution/i)).toBeInTheDocument();
    expect(screen.getByText('512x512')).toBeInTheDocument();
  });

  it('should display formatted timestamps', () => {
    render(<DatasetMetadata dataset={mockDataset} />);

    expect(screen.getByText(/created/i)).toBeInTheDocument();
    expect(screen.getByText(/updated/i)).toBeInTheDocument();

    // Should format dates in a human-readable way (multiple dates exist)
    const dates = screen.getAllByText(/2025/);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('should handle dataset without metadata gracefully', () => {
    const datasetNoMeta = { ...mockDataset, meta: undefined };
    render(<DatasetMetadata dataset={datasetNoMeta} />);

    // Should still render core fields
    expect(screen.getByText('ds_test123')).toBeInTheDocument();
    expect(screen.getByText('lora-training')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();

    // Should not crash or show undefined
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });

  it('should render status with appropriate badge variant', () => {
    const { rerender } = render(<DatasetMetadata dataset={mockDataset} />);

    // Ready status
    const readyBadge = screen.getByText('ready');
    expect(readyBadge).toBeInTheDocument();

    // Pending status
    const pendingDataset = { ...mockDataset, status: 'pending' };
    rerender(<DatasetMetadata dataset={pendingDataset} />);
    expect(screen.getByText('pending')).toBeInTheDocument();

    // Failed status
    const failedDataset = { ...mockDataset, status: 'failed' };
    rerender(<DatasetMetadata dataset={failedDataset} />);
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('should have proper semantic HTML structure', () => {
    render(<DatasetMetadata dataset={mockDataset} />);

    // Should use definition list for metadata
    const dl = screen.getByRole('list', { name: /dataset metadata/i });
    expect(dl).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA labels', () => {
    render(<DatasetMetadata dataset={mockDataset} />);

    // Component should have accessible name
    const section = screen.getByRole('region', { name: /metadata/i });
    expect(section).toBeInTheDocument();
  });
});
