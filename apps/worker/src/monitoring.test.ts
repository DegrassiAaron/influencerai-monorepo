import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Queue } from 'bullmq';

vi.mock('@bull-board/fastify', async () => {
  const actual = await vi.importActual<typeof import('@bull-board/fastify')>('@bull-board/fastify');
  return actual;
});

describe('createMonitoringServer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exposes Prometheus metrics and protects Bull Board with basic auth', async () => {
    const { createMonitoringServer } = await import('./monitoring');
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const queueCounts = { waiting: 2, failed: 1, completed: 5 };
    const queue = {
      metaValues: { version: 'bullmq-stub' },
      getJobCounts: vi.fn().mockResolvedValue(queueCounts),
    } as unknown as Queue;

    const server = createMonitoringServer({
      logger,
      queues: [{ name: 'content-generation', queue }],
      auth: { username: 'admin', password: 'secret' },
    });

    const unauthorized = await server.app.inject({ method: 'GET', url: '/bull-board' });
    expect(unauthorized.statusCode).toBe(401);

    const authorized = await server.app.inject({
      method: 'GET',
      url: '/bull-board',
      headers: {
        authorization: `Basic ${Buffer.from('admin:secret').toString('base64')}`,
      },
    });

    expect(authorized.statusCode).toBeLessThan(500);

    const metricsResponse = await server.app.inject({ method: 'GET', url: '/metrics' });
    expect(metricsResponse.statusCode).toBe(200);
    expect(metricsResponse.body).toContain('worker_queue_jobs');
    expect(queue.getJobCounts).toHaveBeenCalledWith('waiting', 'failed', 'completed');
  });

  it('records job durations and sends webhook on consecutive failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const queue = {
      metaValues: { version: 'bullmq-stub' },
      getJobCounts: vi.fn().mockResolvedValue({ waiting: 0, failed: 0, completed: 0 }),
    } as unknown as Queue;
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const { createMonitoringServer } = await import('./monitoring');

    const server = createMonitoringServer({
      logger,
      queues: [{ name: 'video-generation', queue }],
      auth: { username: 'user', password: 'pass' },
      webhook: {
        url: 'https://hooks.test/alerts',
        consecutiveFailuresThreshold: 2,
        fetch: fetchMock as unknown as typeof fetch,
      },
    });

    server.recordFailure('video-generation', 'job-1', new Error('first'));
    expect(fetchMock).not.toHaveBeenCalled();

    await server.recordFailure('video-generation', 'job-2', new Error('second'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.test/alerts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
      })
    );

    server.recordCompletion('video-generation', {
      processedOn: Date.now() - 500,
      finishedOn: Date.now(),
    });

    const metricsAfterCompletion = await server.app.inject({ method: 'GET', url: '/metrics' });
    expect(metricsAfterCompletion.body).toContain('queue="video-generation"');

    await server.recordFailure('video-generation', 'job-3', new Error('third'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
