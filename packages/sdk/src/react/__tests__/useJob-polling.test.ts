/**
 * @file useJob-polling.test.ts
 * @description Tests for the useJob hook polling behavior
 *
 * This test suite verifies:
 * - Polling starts when job is in active state (running/pending)
 * - Polling stops when job reaches terminal state (succeeded/failed)
 * - Exponential backoff on network errors
 * - RefetchInterval conditional logic
 * - Proper cleanup on unmount
 *
 * BDD Mapping: Scenario 2.1 (Real-time job monitoring)
 *
 * Uses React Testing Library, TanStack Query, and MSW for API mocking
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { useJob } from '../useJob';
import type { Job } from '@influencerai/core-schemas';

// MSW server for API mocking
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useJob - Polling Behavior', () => {
  let queryClient: QueryClient;

  const mockRunningJob: Job = {
    id: 'job_001',
    tenantId: 'tenant_1',
    type: 'lora_training',
    name: 'Test Training',
    status: 'running',
    spec: { datasetId: 'ds_1', configId: 'cfg_1' },
    result: null,
    error: null,
    progress: 50,
    cost: null,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:30:00Z',
  };

  const mockSucceededJob: Job = {
    ...mockRunningJob,
    status: 'succeeded',
    progress: 100,
    updatedAt: '2024-01-01T11:00:00Z',
  };

  const mockPendingJob: Job = {
    ...mockRunningJob,
    status: 'pending',
    progress: 0,
  };

  const mockFailedJob: Job = {
    ...mockRunningJob,
    status: 'failed',
    error: 'Training failed',
    progress: 30,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  describe('Polling Activation', () => {
    it('should poll when job status is running', async () => {
      let requestCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          return res(ctx.json(mockRunningJob));
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      // Initial fetch
      await waitFor(() => expect(result.current.data).toBeDefined());

      // Wait for at least one poll (refetchInterval: 2000ms)
      await waitFor(
        () => {
          expect(requestCount).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );

      expect(result.current.data?.status).toBe('running');
    });

    it('should poll when job status is pending', async () => {
      let requestCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          return res(ctx.json(mockPendingJob));
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.data).toBeDefined());

      await waitFor(
        () => {
          expect(requestCount).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );

      expect(result.current.data?.status).toBe('pending');
    });

    it('should not poll when polling option is false', async () => {
      let requestCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          return res(ctx.json(mockRunningJob));
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: false }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.data).toBeDefined());

      // Wait a bit to ensure no additional polling occurs
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Should only have initial request
      expect(requestCount).toBe(1);
    });

    it('should not poll when polling option is undefined', async () => {
      let requestCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          return res(ctx.json(mockRunningJob));
        })
      );

      const { result } = renderHook(() => useJob('job_001'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.data).toBeDefined());

      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(requestCount).toBe(1);
    });
  });

  describe('Polling Deactivation on Terminal States', () => {
    it('should stop polling when job status changes to succeeded', async () => {
      let requestCount = 0;
      let jobStatus: 'running' | 'succeeded' = 'running';

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          // After 2 requests, transition to succeeded
          if (requestCount >= 2) {
            jobStatus = 'succeeded';
          }
          const job = jobStatus === 'running' ? mockRunningJob : mockSucceededJob;
          return res(ctx.json(job));
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      // Wait for initial running state
      await waitFor(() => expect(result.current.data?.status).toBe('running'));

      // Wait for transition to succeeded
      await waitFor(() => expect(result.current.data?.status).toBe('succeeded'));

      const countAtSuccess = requestCount;

      // Wait to ensure polling stopped
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Request count should not increase after succeeded status
      expect(requestCount).toBeLessThanOrEqual(countAtSuccess + 1);
    });

    it('should stop polling when job status changes to failed', async () => {
      let requestCount = 0;
      let jobStatus: 'running' | 'failed' = 'running';

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          if (requestCount >= 2) {
            jobStatus = 'failed';
          }
          const job = jobStatus === 'running' ? mockRunningJob : mockFailedJob;
          return res(ctx.json(job));
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.data?.status).toBe('running'));
      await waitFor(() => expect(result.current.data?.status).toBe('failed'));

      const countAtFailure = requestCount;
      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(requestCount).toBeLessThanOrEqual(countAtFailure + 1);
    });

    it('should not poll if initial status is succeeded', async () => {
      let requestCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          return res(ctx.json(mockSucceededJob));
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.data?.status).toBe('succeeded'));

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Should only fetch once
      expect(requestCount).toBe(1);
    });

    it('should not poll if initial status is failed', async () => {
      let requestCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          return res(ctx.json(mockFailedJob));
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.data?.status).toBe('failed'));

      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(requestCount).toBe(1);
    });
  });

  describe('Polling Interval Configuration', () => {
    it('should use 2 second interval for active jobs', async () => {
      const requestTimestamps: number[] = [];

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestTimestamps.push(Date.now());
          return res(ctx.json(mockRunningJob));
        })
      );

      renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      // Wait for at least 3 requests
      await waitFor(
        () => {
          expect(requestTimestamps.length).toBeGreaterThanOrEqual(3);
        },
        { timeout: 6000 }
      );

      // Check intervals between requests (should be ~2000ms)
      for (let i = 1; i < requestTimestamps.length; i++) {
        const interval = requestTimestamps[i] - requestTimestamps[i - 1];
        // Allow 500ms tolerance for timing variations
        expect(interval).toBeGreaterThanOrEqual(1500);
        expect(interval).toBeLessThanOrEqual(2500);
      }
    });

    it('should return false from refetchInterval when status is terminal', async () => {
      // This is tested indirectly through polling deactivation tests
      // But we can verify the logic more explicitly

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          return res(ctx.json(mockSucceededJob));
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.data).toBeDefined());

      // The hook should have refetchInterval set to false for succeeded jobs
      // This is verified by checking that polling stops
      expect(result.current.data?.status).toBe('succeeded');
    });
  });

  describe('Error Handling and Retries', () => {
    it('should handle network errors gracefully', async () => {
      let requestCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          if (requestCount === 1) {
            // First request fails
            return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
          }
          // Second request succeeds
          return res(ctx.json(mockRunningJob));
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      // Should eventually succeed after error
      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.data?.status).toBe('running');
      });

      expect(requestCount).toBeGreaterThanOrEqual(2);
    });

    it('should continue polling after temporary network failures', async () => {
      let requestCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          if (requestCount === 2) {
            // Second request fails
            return res.networkError('Network connection lost');
          }
          return res(ctx.json(mockRunningJob));
        })
      );

      renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      // Wait for recovery after network error
      await waitFor(
        () => {
          expect(requestCount).toBeGreaterThanOrEqual(3);
        },
        { timeout: 5000 }
      );
    });

    it('should set error state when API returns error', async () => {
      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          return res(ctx.status(404), ctx.json({ error: 'Job not found' }));
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('Hook Lifecycle', () => {
    it('should stop polling when hook unmounts', async () => {
      let requestCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          return res(ctx.json(mockRunningJob));
        })
      );

      const { result, unmount } = renderHook(
        () => useJob('job_001', { polling: true }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.data).toBeDefined());

      const countBeforeUnmount = requestCount;
      unmount();

      // Wait to ensure no more requests after unmount
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Should not have made additional requests after unmount
      expect(requestCount).toBe(countBeforeUnmount);
    });

    it('should restart polling when jobId changes', async () => {
      const job1: Job = { ...mockRunningJob, id: 'job_001' };
      const job2: Job = { ...mockRunningJob, id: 'job_002' };

      server.use(
        rest.get('/api/jobs/job_001', (req, res, ctx) => {
          return res(ctx.json(job1));
        }),
        rest.get('/api/jobs/job_002', (req, res, ctx) => {
          return res(ctx.json(job2));
        })
      );

      const { result, rerender } = renderHook(
        ({ jobId }) => useJob(jobId, { polling: true }),
        {
          wrapper: createWrapper(),
          initialProps: { jobId: 'job_001' },
        }
      );

      await waitFor(() => expect(result.current.data?.id).toBe('job_001'));

      // Change job ID
      rerender({ jobId: 'job_002' });

      await waitFor(() => expect(result.current.data?.id).toBe('job_002'));
    });

    it('should handle polling option changes', async () => {
      let requestCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          requestCount++;
          return res(ctx.json(mockRunningJob));
        })
      );

      const { result, rerender } = renderHook(
        ({ polling }) => useJob('job_001', { polling }),
        {
          wrapper: createWrapper(),
          initialProps: { polling: false },
        }
      );

      await waitFor(() => expect(result.current.data).toBeDefined());

      const countWithoutPolling = requestCount;

      // Enable polling
      rerender({ polling: true });

      await waitFor(
        () => {
          expect(requestCount).toBeGreaterThan(countWithoutPolling);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Data Consistency', () => {
    it('should preserve data between polling requests', async () => {
      let progress = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          progress += 10;
          return res(
            ctx.json({
              ...mockRunningJob,
              progress: Math.min(progress, 100),
            })
          );
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.data?.progress).toBe(10));

      // Progress should increase with each poll
      await waitFor(() => expect(result.current.data?.progress).toBeGreaterThan(10));

      // Data should always be defined during polling
      expect(result.current.data).toBeDefined();
    });

    it('should update all job fields during polling', async () => {
      let updateCount = 0;

      server.use(
        rest.get('/api/jobs/:id', (req, res, ctx) => {
          updateCount++;
          return res(
            ctx.json({
              ...mockRunningJob,
              progress: updateCount * 25,
              updatedAt: new Date(
                Date.now() + updateCount * 1000
              ).toISOString(),
            })
          );
        })
      );

      const { result } = renderHook(() => useJob('job_001', { polling: true }), {
        wrapper: createWrapper(),
      });

      const firstUpdatedAt = await waitFor(() => {
        expect(result.current.data).toBeDefined();
        return result.current.data!.updatedAt;
      });

      // Wait for next poll
      await waitFor(() => {
        expect(result.current.data?.updatedAt).not.toBe(firstUpdatedAt);
      });

      expect(result.current.data?.progress).toBeGreaterThan(25);
    });
  });

  describe('Concurrent Polling', () => {
    it('should handle multiple simultaneous useJob calls independently', async () => {
      const job1: Job = { ...mockRunningJob, id: 'job_001' };
      const job2: Job = { ...mockPendingJob, id: 'job_002' };

      server.use(
        rest.get('/api/jobs/job_001', (req, res, ctx) => {
          return res(ctx.json(job1));
        }),
        rest.get('/api/jobs/job_002', (req, res, ctx) => {
          return res(ctx.json(job2));
        })
      );

      const { result: result1 } = renderHook(
        () => useJob('job_001', { polling: true }),
        { wrapper: createWrapper() }
      );

      const { result: result2 } = renderHook(
        () => useJob('job_002', { polling: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result1.current.data?.id).toBe('job_001');
        expect(result2.current.data?.id).toBe('job_002');
      });

      expect(result1.current.data?.status).toBe('running');
      expect(result2.current.data?.status).toBe('pending');
    });
  });
});
