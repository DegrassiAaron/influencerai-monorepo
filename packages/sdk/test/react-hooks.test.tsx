import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { influencerAIQueryKeys } from '../src/react/query-keys';
import { InfluencerAIProvider } from '../src/react/provider';
import { useCreateJob, useDatasets, useJobs, useQueuesSummary } from '../src/react/hooks';

const API_BASE_URL = 'https://sdk.test';

const server = setupServer(
  http.get(`${API_BASE_URL}/jobs`, () =>
    HttpResponse.json([
      {
        id: 'job-1',
        status: 'pending',
        type: 'content-generation',
        payload: { foo: 'bar' },
        createdAt: new Date().toISOString(),
      },
    ]),
  ),
  http.post(`${API_BASE_URL}/jobs`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: 'job-created',
      status: 'pending',
      type: 'content-generation',
      payload: body,
      createdAt: new Date().toISOString(),
    });
  }),
  http.get(`${API_BASE_URL}/queues/summary`, () =>
    HttpResponse.json({ active: 2, waiting: 5, failed: 1 }),
  ),
  http.get(`${API_BASE_URL}/datasets`, () =>
    HttpResponse.json([
      {
        id: 'dataset-1',
        kind: 'lora-training',
        path: '/datasets/dataset-1',
        status: 'READY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  ),
);

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <InfluencerAIProvider baseUrl={API_BASE_URL}>{children}</InfluencerAIProvider>
    </QueryClientProvider>
  );
}

describe('React Query hooks', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('retrieves the jobs list', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useJobs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.id).toBe('job-1');

    queryClient.clear();
  });

  it('invalidates jobs and queues after creating a job', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);

    const mutation = renderHook(() => useCreateJob(), { wrapper });

    await act(async () => {
      await mutation.result.current.mutateAsync({
        type: 'content-generation',
        payload: { foo: 'bar' },
      } as any);
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: influencerAIQueryKeys.jobs.root }),
      ),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: influencerAIQueryKeys.queues.root }),
    );

    expect(mutation.result.current.data?.id).toBe('job-created');

    queryClient.clear();
  });

  it('loads datasets and queue summary data', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const datasets = renderHook(() => useDatasets(), { wrapper });
    const queues = renderHook(() => useQueuesSummary(), { wrapper });

    await waitFor(() => expect(datasets.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(queues.result.current.isSuccess).toBe(true));

    expect(datasets.result.current.data?.[0]?.id).toBe('dataset-1');
    expect(queues.result.current.data).toMatchObject({ active: 2, waiting: 5, failed: 1 });

    queryClient.clear();
  });
});
