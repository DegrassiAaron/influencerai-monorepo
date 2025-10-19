import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { InfluencerAIProvider } from '../provider';
import { useContentPlans } from '../hooks';
import type { InfluencerAIClient } from '../../index';
import type { ContentPlanEnvelope } from '../../types';

const mockPlans: ContentPlanEnvelope[] = [
  {
    id: 'job_1',
    plan: {
      influencerId: 'inf_1',
      theme: 'Summer Glow',
      targetPlatforms: ['instagram', 'tiktok'],
      posts: [
        { caption: 'Caption 1', hashtags: ['#summer', '#glow'] },
        { caption: 'Caption 2', hashtags: ['#trend'] },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  },
  {
    id: 'job_2',
    plan: {
      influencerId: 'inf_2',
      theme: 'Winter Drops',
      targetPlatforms: ['youtube'],
      posts: [{ caption: 'Warm up your feed', hashtags: ['#winter'] }],
      createdAt: '2024-01-02T00:00:00.000Z',
    },
  },
];

describe('Content plan hooks', () => {
  let queryClient: QueryClient;
  let mockClient: Partial<InfluencerAIClient>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockClient = {
      listContentPlans: vi.fn(),
    };
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <InfluencerAIProvider client={mockClient as InfluencerAIClient}>{children}</InfluencerAIProvider>
    </QueryClientProvider>
  );

  it('fetches content plans with default parameters', async () => {
    vi.mocked(mockClient.listContentPlans!).mockResolvedValue(mockPlans);

    const { result } = renderHook(() => useContentPlans(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPlans);
    expect(mockClient.listContentPlans).toHaveBeenCalledWith({});
  });

  it('fetches content plans with filters applied', async () => {
    const filtered = [mockPlans[0]];
    vi.mocked(mockClient.listContentPlans!).mockResolvedValue(filtered);

    const params = { influencerId: 'inf_1', take: 5, skip: 0 } as const;
    const { result } = renderHook(() => useContentPlans(params), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(filtered);
    expect(mockClient.listContentPlans).toHaveBeenCalledWith(params);
  });

  it('handles API errors gracefully', async () => {
    const error = new Error('Failed to fetch content plans');
    vi.mocked(mockClient.listContentPlans!).mockRejectedValue(error);

    const { result } = renderHook(() => useContentPlans(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('honours custom query options', async () => {
    vi.mocked(mockClient.listContentPlans!).mockResolvedValue(mockPlans);

    const { result } = renderHook(() => useContentPlans({}, { enabled: false }), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockClient.listContentPlans).not.toHaveBeenCalled();
  });
});
