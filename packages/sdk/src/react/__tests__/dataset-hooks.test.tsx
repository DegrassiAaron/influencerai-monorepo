import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDataset, useDeleteDataset, useDatasets } from '../hooks';
import type { InfluencerAIClient } from '../../index';
import { InfluencerAIProvider } from '../provider';
import type { Dataset } from '../../types';

/**
 * BDD Test Suite for Dataset Management Hooks
 *
 * Following TEST-FIRST approach:
 * - Tests written BEFORE implementation
 * - Tests MUST FAIL initially (RED phase)
 * - Implementation follows to make tests PASS (GREEN phase)
 */

// Mock dataset data
const mockDataset: Dataset = {
  id: 'ds_1',
  kind: 'lora-training',
  path: 'datasets/tenant/ds_1/file.zip',
  status: 'ready',
  meta: { filename: 'file.zip' },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockDatasets: Dataset[] = [
  mockDataset,
  {
    id: 'ds_2',
    kind: 'reference',
    path: 'datasets/tenant/ds_2/ref.zip',
    status: 'pending',
    meta: { filename: 'ref.zip' },
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

describe('Dataset Hooks - BDD Scenarios', () => {
  let queryClient: QueryClient;
  let mockClient: Partial<InfluencerAIClient>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockClient = {
      getDataset: vi.fn(),
      listDatasets: vi.fn(),
      deleteDataset: vi.fn(),
    };
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <InfluencerAIProvider client={mockClient as InfluencerAIClient}>
        {children}
      </InfluencerAIProvider>
    </QueryClientProvider>
  );

  /**
   * BDD Scenario: useDataset(id) fetches and caches dataset
   *
   * Given I use useDataset('ds_1')
   * When component mounts
   * Then hook calls GET /datasets/ds_1
   * And returns { data, isLoading, error }
   * And result is cached
   */
  describe('useDataset(id)', () => {
    it('fetches single dataset by ID', async () => {
      vi.mocked(mockClient.getDataset!).mockResolvedValue(mockDataset);

      const { result } = renderHook(() => useDataset('ds_1'), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      // Wait for query to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify data is returned
      expect(result.current.data).toEqual(mockDataset);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify API was called with correct ID
      expect(mockClient.getDataset).toHaveBeenCalledWith('ds_1');
      expect(mockClient.getDataset).toHaveBeenCalledTimes(1);
    });

    it('caches dataset result', async () => {
      vi.mocked(mockClient.getDataset!).mockResolvedValue(mockDataset);

      // First render
      const { result: result1, rerender } = renderHook(() => useDataset('ds_1'), { wrapper });
      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      const callCountAfterFirstFetch = vi.mocked(mockClient.getDataset!).mock.calls.length;

      // Rerender the same hook - should use cache without refetching
      rerender();

      // Data should still be available
      expect(result1.current.data).toEqual(mockDataset);

      // API should not be called again during rerender (using cache)
      expect(mockClient.getDataset).toHaveBeenCalledTimes(callCountAfterFirstFetch);
    });

    it('handles API errors correctly', async () => {
      const apiError = new Error('Dataset not found');
      vi.mocked(mockClient.getDataset!).mockRejectedValue(apiError);

      const { result } = renderHook(() => useDataset('ds_999'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(apiError);
      expect(result.current.data).toBeUndefined();
    });

    it('disables query when ID is empty', () => {
      const { result } = renderHook(() => useDataset(''), { wrapper });

      // Query should not run
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockClient.getDataset).not.toHaveBeenCalled();
    });

    it('accepts custom query options', async () => {
      vi.mocked(mockClient.getDataset!).mockResolvedValue(mockDataset);

      const { result } = renderHook(
        () => useDataset('ds_1', { enabled: false }),
        { wrapper }
      );

      // Query should be disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockClient.getDataset).not.toHaveBeenCalled();
    });
  });

  /**
   * BDD Scenario: useDeleteDataset() invalidates queries
   *
   * Given dataset "ds_1" is cached
   * When I call mutate({ id: 'ds_1' })
   * Then hook calls DELETE /datasets/ds_1
   * And invalidates ['datasets'] and ['datasets', 'ds_1']
   */
  describe('useDeleteDataset()', () => {
    it('deletes dataset and invalidates cache', async () => {
      // Seed cache with dataset data
      vi.mocked(mockClient.getDataset!).mockResolvedValue(mockDataset);
      vi.mocked(mockClient.listDatasets!).mockResolvedValue(mockDatasets);
      vi.mocked(mockClient.deleteDataset!).mockResolvedValue(undefined);

      // Populate cache
      const { result: listResult } = renderHook(() => useDatasets(), { wrapper });
      await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

      const { result: detailResult } = renderHook(() => useDataset('ds_1'), { wrapper });
      await waitFor(() => expect(detailResult.current.isSuccess).toBe(true));

      // Execute delete mutation
      const { result: deleteResult } = renderHook(() => useDeleteDataset(), { wrapper });

      deleteResult.current.mutate({ id: 'ds_1' });

      await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true));

      // Verify delete API was called
      expect(mockClient.deleteDataset).toHaveBeenCalledWith('ds_1');

      // Verify cache invalidation by checking if queries were refetched
      await waitFor(() => {
        expect(mockClient.listDatasets).toHaveBeenCalledTimes(2); // Initial + refetch
      });
    });

    it('handles delete errors', async () => {
      const apiError = new Error('Delete failed');
      vi.mocked(mockClient.deleteDataset!).mockRejectedValue(apiError);

      const { result } = renderHook(() => useDeleteDataset(), { wrapper });

      result.current.mutate({ id: 'ds_1' });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(apiError);
    });

    it('calls onSuccess callback after successful deletion', async () => {
      vi.mocked(mockClient.deleteDataset!).mockResolvedValue(undefined);

      const onSuccessSpy = vi.fn();

      const { result } = renderHook(
        () => useDeleteDataset({ onSuccess: onSuccessSpy }),
        { wrapper }
      );

      result.current.mutate({ id: 'ds_1' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // TanStack Query v5 passes 4 arguments: data, variables, context, mutationContext
      expect(onSuccessSpy).toHaveBeenCalledWith(
        undefined,
        { id: 'ds_1' },
        undefined,
        expect.objectContaining({ meta: undefined })
      );
    });

    it('supports mutateAsync for promise-based workflows', async () => {
      vi.mocked(mockClient.deleteDataset!).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDataset(), { wrapper });

      const deletePromise = result.current.mutateAsync({ id: 'ds_1' });

      await expect(deletePromise).resolves.toBeUndefined();
      expect(mockClient.deleteDataset).toHaveBeenCalledWith('ds_1');
    });
  });

  /**
   * BDD Scenario: useDatasets(params) accepts pagination
   *
   * Given I use useDatasets({ take: 20, skip: 0, status: 'ready' })
   * Then hook calls GET /datasets?take=20&skip=0&status=ready
   * And returns { data: Dataset[], total, take, skip }
   */
  describe('useDatasets(params)', () => {
    it('fetches datasets without parameters', async () => {
      vi.mocked(mockClient.listDatasets!).mockResolvedValue(mockDatasets);

      const { result } = renderHook(() => useDatasets(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockDatasets);
      expect(mockClient.listDatasets).toHaveBeenCalledWith({});
    });

    it('fetches datasets with pagination parameters', async () => {
      vi.mocked(mockClient.listDatasets!).mockResolvedValue(mockDatasets);

      const params = { take: 20, skip: 0 };
      const { result } = renderHook(() => useDatasets(params), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockDatasets);
      expect(mockClient.listDatasets).toHaveBeenCalledWith(params);
    });

    it('fetches datasets with status filter', async () => {
      const readyDatasets = [mockDataset];
      vi.mocked(mockClient.listDatasets!).mockResolvedValue(readyDatasets);

      const params = { status: 'ready' as const };
      const { result } = renderHook(() => useDatasets(params), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(readyDatasets);
      expect(mockClient.listDatasets).toHaveBeenCalledWith(params);
    });

    it('fetches datasets with kind filter', async () => {
      const loraDatasets = [mockDataset];
      vi.mocked(mockClient.listDatasets!).mockResolvedValue(loraDatasets);

      const params = { kind: 'lora-training' as const };
      const { result } = renderHook(() => useDatasets(params), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(loraDatasets);
      expect(mockClient.listDatasets).toHaveBeenCalledWith(params);
    });

    it('fetches datasets with sorting parameters', async () => {
      vi.mocked(mockClient.listDatasets!).mockResolvedValue(mockDatasets);

      const params = { sortBy: 'createdAt' as const, sortOrder: 'asc' as const };
      const { result } = renderHook(() => useDatasets(params), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockDatasets);
      expect(mockClient.listDatasets).toHaveBeenCalledWith(params);
    });

    it('fetches datasets with all parameters combined', async () => {
      vi.mocked(mockClient.listDatasets!).mockResolvedValue([mockDataset]);

      const params = {
        status: 'ready' as const,
        kind: 'lora-training' as const,
        take: 10,
        skip: 5,
        sortBy: 'updatedAt' as const,
        sortOrder: 'desc' as const,
      };

      const { result } = renderHook(() => useDatasets(params), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockClient.listDatasets).toHaveBeenCalledWith(params);
    });

    it('caches datasets with different parameters separately', async () => {
      vi.mocked(mockClient.listDatasets!).mockResolvedValue(mockDatasets);

      // First query with status filter
      const { result: result1 } = renderHook(
        () => useDatasets({ status: 'ready' }),
        { wrapper }
      );
      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      // Second query with different filter
      const { result: result2 } = renderHook(
        () => useDatasets({ status: 'pending' }),
        { wrapper }
      );
      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Should have made two separate API calls
      expect(mockClient.listDatasets).toHaveBeenCalledTimes(2);
    });

    it('handles API errors correctly', async () => {
      const apiError = new Error('Failed to fetch datasets');
      vi.mocked(mockClient.listDatasets!).mockRejectedValue(apiError);

      const { result } = renderHook(() => useDatasets(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(apiError);
      expect(result.current.data).toBeUndefined();
    });

    it('accepts custom query options', async () => {
      vi.mocked(mockClient.listDatasets!).mockResolvedValue(mockDatasets);

      const { result } = renderHook(
        () => useDatasets({}, { enabled: false }),
        { wrapper }
      );

      // Query should be disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockClient.listDatasets).not.toHaveBeenCalled();
    });
  });
});
