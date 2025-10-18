import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DatasetFilters } from '../components/DatasetFilters';

afterEach(() => {
  cleanup();
});

describe('DatasetFilters', () => {
  it('should render all filter controls', () => {
    render(<DatasetFilters onFilterChange={vi.fn()} />);

    // Should have status filter
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();

    // Should have kind filter
    expect(screen.getByLabelText(/kind/i)).toBeInTheDocument();

    // Should have search input
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();

    // Should have sort controls
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sort order/i)).toBeInTheDocument();
  });

  it('should call onFilterChange when status is selected', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<DatasetFilters onFilterChange={onFilterChange} />);

    // Click to open the select
    const statusSelect = screen.getByLabelText(/filter by status/i);
    await user.click(statusSelect);

    // Click the "Ready" option
    const readyOption = await screen.findByRole('option', { name: /ready/i });
    await user.click(readyOption);

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' })
      );
    });
  });

  it('should call onFilterChange when kind is selected', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<DatasetFilters onFilterChange={onFilterChange} />);

    // Click to open the select
    const kindSelect = screen.getByLabelText(/filter by kind/i);
    await user.click(kindSelect);

    // Click the "LoRA Training" option
    const loraOption = await screen.findByRole('option', { name: /lora training/i });
    await user.click(loraOption);

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'lora-training' })
      );
    });
  });

  it('should debounce search input', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<DatasetFilters onFilterChange={onFilterChange} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'test');

    // Should not call immediately
    expect(onFilterChange).not.toHaveBeenCalled();

    // Should call after debounce delay (300ms typical)
    await waitFor(
      () => {
        expect(onFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'test' })
        );
      },
      { timeout: 500 }
    );
  });

  it('should handle sort by change', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<DatasetFilters onFilterChange={onFilterChange} />);

    // Click to open the select
    const sortBySelect = screen.getByLabelText(/sort by field/i);
    await user.click(sortBySelect);

    // Click the "Updated Date" option (different from default)
    const updatedDateOption = await screen.findByRole('option', { name: /updated date/i });
    await user.click(updatedDateOption);

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'updatedAt' })
      );
    });
  });

  it('should handle sort order toggle', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<DatasetFilters onFilterChange={onFilterChange} />);

    // Click to open the select
    const sortOrderSelect = screen.getByLabelText(/sort order/i);
    await user.click(sortOrderSelect);

    // Click the "Ascending" option (different from default "desc")
    const ascOption = await screen.findByRole('option', { name: /ascending/i });
    await user.click(ascOption);

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 'asc' })
      );
    });
  });

  it('should display current filter values', () => {
    const currentFilters = {
      status: 'ready',
      kind: 'lora-training',
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };

    render(<DatasetFilters onFilterChange={vi.fn()} defaultValues={currentFilters} />);

    // Radix Select displays values as text content, not as form values
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('LoRA Training')).toBeInTheDocument();
    expect(screen.getByText('Created Date')).toBeInTheDocument();
    expect(screen.getByText('Descending')).toBeInTheDocument();
  });

  it('should have clear filters button', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<DatasetFilters onFilterChange={onFilterChange} defaultValues={{ status: 'ready' }} />);

    // Clear button should be visible when filters are active
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(onFilterChange).toHaveBeenCalledWith({});
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<DatasetFilters onFilterChange={onFilterChange} />);

    // Tab through filter controls
    await user.tab();
    expect(screen.getByLabelText(/filter by status/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/filter by kind/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/sort by field/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/sort order/i)).toHaveFocus();
  });

  it('should have proper ARIA labels', () => {
    render(<DatasetFilters onFilterChange={vi.fn()} />);

    expect(screen.getByLabelText(/filter by status/i)).toHaveAttribute('aria-label');
    expect(screen.getByLabelText(/filter by kind/i)).toHaveAttribute('aria-label');
    expect(screen.getByLabelText(/sort by field/i)).toHaveAttribute('aria-label');
    expect(screen.getByLabelText(/sort order/i)).toHaveAttribute('aria-label');
    expect(screen.getByPlaceholderText(/search/i)).toHaveAttribute('aria-label');
  });
});
