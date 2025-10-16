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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fetch from 'node-fetch';

vi.mock('@bull-board/api', () => ({
  createBullBoard: vi.fn(() => ({
    addQueue: vi.fn(),
    removeQueue: vi.fn(),
    setQueues: vi.fn(),
  })),
}));

vi.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: class {
    queue: unknown;
    constructor(queue: unknown) {
      this.queue = queue;
    }
  },
}));

vi.mock('@bull-board/express', () => {
  const express = require('express');
  return {
    ExpressAdapter: class {
      private router = express.Router();
      setBasePath = vi.fn();
      getRouter() {
        this.router.get('/', (_req: any, res: any) => res.json({ ok: true }));
        return this.router;
      }
    },
  };
});

class FakeQueue {
  name: string;
  waiting = 0;
  failed = 0;

  constructor(name: string) {
    this.name = name;
  }

  async getJobCounts() {
    return { waiting: this.waiting, failed: this.failed };
  }
}

type Listener = (...args: any[]) => void;

function createWorkerStub() {
  const listeners = new Map<string, Listener[]>();
  const worker = {
    on: vi.fn((event: string, handler: Listener) => {
      const handlers = listeners.get(event) ?? [];
      handlers.push(handler);
      listeners.set(event, handlers);
      return worker;
    }),
    emit(event: string, ...args: any[]) {
      const handlers = listeners.get(event) ?? [];
      handlers.forEach((handler) => handler(...args));
    },
    getListeners(event: string) {
      return listeners.get(event) ?? [];
    },
  };

  return worker;
}

describe('startMonitoring', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes Prometheus metrics and records job durations', async () => {
    const { startMonitoring } = await import('./monitoring');
    const queue = new FakeQueue('content-generation');
    const worker = createWorkerStub();

    const monitoring = await startMonitoring({
      logger,
      queues: [{ name: queue.name, queue: queue as any, worker: worker as any }],
      metricsPrefix: 'worker_',
      bullBoard: { host: '127.0.0.1', port: 0, basicAuth: null },
      alerts: { threshold: 3, webhookUrl: undefined },
    });

    try {
      queue.waiting = 5;
      queue.failed = 2;

      const metricsResponse = await fetch(`http://${monitoring.host}:${monitoring.port}/metrics`);
      const metricsBody = await metricsResponse.text();
      expect(metricsBody).toContain('worker_queue_jobs_waiting{queue="content-generation"} 5');
      expect(metricsBody).toContain('worker_queue_jobs_failed{queue="content-generation"} 2');

      const completedHandler = worker.getListeners('completed')[0];
      expect(completedHandler).toBeDefined();
      const now = Date.now();
      completedHandler?.({ processedOn: now - 1500, finishedOn: now } as any);

      const metricsAfterCompletion = await fetch(`http://${monitoring.host}:${monitoring.port}/metrics`);
      const metricsAfterText = await metricsAfterCompletion.text();
      expect(metricsAfterText).toMatch(/worker_job_duration_seconds_count\{queue="content-generation"\} 1/);
    } finally {
      await monitoring.close();
    }
  });

  it('protects Bull Board with basic auth', async () => {
    const { startMonitoring } = await import('./monitoring');
    const queue = new FakeQueue('video-generation');
    const worker = createWorkerStub();

    const monitoring = await startMonitoring({
      logger,
      queues: [{ name: queue.name, queue: queue as any, worker: worker as any }],
      metricsPrefix: 'worker_',
      bullBoard: { host: '127.0.0.1', port: 0, basicAuth: { username: 'admin', password: 'secret' } },
      alerts: { threshold: 3, webhookUrl: undefined },
    });

    try {
      const unauthorized = await fetch(`http://${monitoring.host}:${monitoring.port}/bull-board`);
      expect(unauthorized.status).toBe(401);

      const authorized = await fetch(`http://${monitoring.host}:${monitoring.port}/bull-board`, {
        headers: {
          Authorization: `Basic ${Buffer.from('admin:secret').toString('base64')}`,
        },
      });
      expect(authorized.status).not.toBe(401);
    } finally {
      await monitoring.close();
    }
  });
});
