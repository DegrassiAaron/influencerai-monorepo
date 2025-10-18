import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DatasetGrid } from '../components/DatasetGrid';
import type { Dataset } from '@influencerai/sdk';

afterEach(() => {
  cleanup();
});

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
  {
    id: 'ds_3',
    kind: 'lora-training',
    path: 'datasets/charlie',
    status: 'failed',
    createdAt: '2025-01-15T12:00:00.000Z',
    updatedAt: '2025-01-15T12:00:00.000Z',
  },
];

describe('DatasetGrid', () => {
  it('should render dataset cards in grid layout', () => {
    render(<DatasetGrid datasets={mockDatasets} />);

    // Should render all datasets
    expect(screen.getByText('ds_1')).toBeInTheDocument();
    expect(screen.getByText('ds_2')).toBeInTheDocument();
    expect(screen.getByText('ds_3')).toBeInTheDocument();
  });

  it('should apply responsive grid classes', () => {
    const { container } = render(<DatasetGrid datasets={mockDatasets} />);

    const grid = container.querySelector('[role="list"]');
    expect(grid).toHaveClass('grid');
    // Should have responsive columns (1 on mobile, 2 on tablet, 3 on desktop)
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('md:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-3');
  });

  it('should display empty state when no datasets', () => {
    render(<DatasetGrid datasets={[]} />);

    expect(screen.getByText(/no datasets found/i)).toBeInTheDocument();
    expect(screen.getByText(/create your first dataset/i)).toBeInTheDocument();
  });

  it('should pass onDelete handler to cards', () => {
    const onDelete = vi.fn();
    render(<DatasetGrid datasets={mockDatasets} onDelete={onDelete} />);

    // Cards should have delete buttons
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(3);
  });

  it('should have proper semantic HTML structure', () => {
    render(<DatasetGrid datasets={mockDatasets} />);

    // Should use list semantics
    expect(screen.getByRole('list')).toBeInTheDocument();

    // Each card should be a list item
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
  });

  it('should be accessible with screen readers', () => {
    render(<DatasetGrid datasets={mockDatasets} />);

    const grid = screen.getByRole('list');
    const ariaLabel = grid.getAttribute('aria-label');
    expect(ariaLabel?.toLowerCase()).toContain('datasets');
  });

  it('should handle loading state', () => {
    render(<DatasetGrid datasets={mockDatasets} isLoading={true} />);

    // Should show skeleton loaders
    expect(screen.getAllByRole('status', { name: /loading/i })).toHaveLength(3);
  });
});
