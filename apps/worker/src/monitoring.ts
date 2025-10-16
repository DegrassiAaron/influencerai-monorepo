import Fastify, { type FastifyInstance } from 'fastify';
import basicAuth from '@fastify/basic-auth';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';
import type { Queue } from 'bullmq';

export type MonitoringLogger = {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

export type MonitoringQueue = {
  name: string;
  queue: Queue;
};

export type MonitoringWebhookConfig = {
  url: string;
  consecutiveFailuresThreshold?: number;
  fetch?: typeof fetch;
};

export type CreateMonitoringServerInput = {
  logger: MonitoringLogger;
  queues: MonitoringQueue[];
  auth: {
    username: string;
    password: string;
  };
  port?: number;
  host?: string;
  registry?: Registry;
  webhook?: MonitoringWebhookConfig;
};

export type MonitoringServer = {
  app: FastifyInstance;
  registry: Registry;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  recordCompletion: (
    queueName: string,
    job: { processedOn?: number | null; finishedOn?: number | null; timestamp?: number | null; id?: string }
  ) => void;
  recordFailure: (queueName: string, jobId: string | undefined, error: unknown) => Promise<void>;
};

const JOB_COUNT_STATUSES = ['waiting', 'failed', 'completed'] as const;

const DEFAULT_DURATION_BUCKETS = [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300];

export function createMonitoringServer(input: CreateMonitoringServerInput): MonitoringServer {
  const { logger, queues, auth, port = 3031, host = '0.0.0.0', registry = new Registry(), webhook } = input;

  const app = Fastify({ logger: false });

  const validate = async (username: string, password: string) => {
    if (username !== auth.username || password !== auth.password) {
      throw new Error('Unauthorized');
    }
  };

  app.register(basicAuth, {
    validate,
    authenticate: { realm: 'Worker Monitoring' },
  });

  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/bull-board');
  createBullBoard({
    queues: queues.map((queue) => new BullMQAdapter(queue.queue as Queue)),
    serverAdapter,
  });

  app.after(() => {
    app.register(
      async (instance) => {
        instance.addHook('onRequest', instance.basicAuth);
        instance.register(serverAdapter.registerPlugin());
      },
      { prefix: '/bull-board' }
    );
  });

  collectDefaultMetrics({ register: registry });

  const _jobCountGauge = new Gauge({
    name: 'worker_queue_jobs',
    help: 'Number of BullMQ jobs grouped by status',
    labelNames: ['queue', 'status'],
    registers: [registry],
    async collect() {
      for (const { name, queue } of queues) {
        try {
          const counts = await queue.getJobCounts(...JOB_COUNT_STATUSES);
          for (const status of JOB_COUNT_STATUSES) {
            const value = Number(counts[status]) || 0;
            this.set({ queue: name, status }, value);
          }
        } catch (err) {
          logger.warn({ err, queue: name }, 'Unable to collect queue metrics');
        }
      }
    },
  });

  const jobDurationHistogram = new Histogram({
    name: 'worker_job_duration_seconds',
    help: 'Histogram of completed job durations',
    labelNames: ['queue'],
    buckets: DEFAULT_DURATION_BUCKETS,
    registers: [registry],
  });

  const failureCounts = new Map<string, number>();
  const alertedQueues = new Set<string>();

  app.get('/metrics', async (_request, reply) => {
    const metrics = await registry.metrics();
    reply.type(registry.contentType).send(metrics);
  });

  app.get('/healthz', async (_request, reply) => {
    reply.send({ status: 'ok' });
  });

  let started = false;

  async function start() {
    if (started) return;
    await app.listen({ port, host });
    started = true;
    logger.info({ port, host }, 'Monitoring server listening');
  }

  async function stop() {
    if (!started) return;
    await app.close();
    started = false;
  }

  function resetFailures(queueName: string) {
    failureCounts.set(queueName, 0);
    alertedQueues.delete(queueName);
  }

  function recordCompletion(
    queueName: string,
    job: { processedOn?: number | null; finishedOn?: number | null; timestamp?: number | null; id?: string }
  ) {
    resetFailures(queueName);
    const processedOn = job.processedOn ?? job.timestamp;
    const finishedOn = job.finishedOn;
    if (typeof processedOn === 'number' && typeof finishedOn === 'number' && finishedOn >= processedOn) {
      const durationSeconds = (finishedOn - processedOn) / 1000;
      if (Number.isFinite(durationSeconds) && durationSeconds >= 0) {
        jobDurationHistogram.observe({ queue: queueName }, durationSeconds);
      }
    }
  }

  async function recordFailure(queueName: string, jobId: string | undefined, error: unknown) {
    const current = failureCounts.get(queueName) ?? 0;
    const next = current + 1;
    failureCounts.set(queueName, next);

    if (!webhook) {
      return;
    }

    const threshold = webhook.consecutiveFailuresThreshold && webhook.consecutiveFailuresThreshold > 0
      ? webhook.consecutiveFailuresThreshold
      : 3;

    if (next < threshold || alertedQueues.has(queueName)) {
      return;
    }

    const fetchImpl = webhook.fetch ?? fetch;
    try {
      const response = await fetchImpl(webhook.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          queue: queueName,
          jobId,
          consecutiveFailures: next,
          error: error instanceof Error ? error.message : String(error ?? 'unknown error'),
          timestamp: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        logger.warn({ queue: queueName, status: (response as any).status }, 'Failure webhook responded with non-OK status');
        return;
      }
      alertedQueues.add(queueName);
      logger.info({ queue: queueName, jobId, consecutiveFailures: next }, 'Sent failure alert webhook');
    } catch (err) {
      logger.error({ err, queue: queueName, jobId }, 'Failed to send failure webhook');
    }
  }

  return {
    app,
    registry,
    start,
    stop,
    recordCompletion,
    recordFailure,
import express, { type RequestHandler } from 'express';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';
import type { Server } from 'node:http';
import type { Queue, Worker as BullWorker } from 'bullmq';
import type { WorkerLogger } from './index';

type QueueLike = Pick<Queue, 'name' | 'getJobCounts'>;
type WorkerLike = Pick<BullWorker, 'on'>;

type QueueBinding = {
  name: string;
  queue: QueueLike;
  worker: WorkerLike;
};

type BasicAuthConfig = { username: string; password: string } | null;

type StartMonitoringOptions = {
  logger: WorkerLogger;
  queues: QueueBinding[];
  metricsPrefix: string;
  bullBoard: {
    host: string;
    port: number;
    basicAuth: BasicAuthConfig;
  };
  alerts: {
    threshold: number;
    webhookUrl?: string;
  };
};

type MonitoringHandle = {
  close: () => Promise<void>;
  port: number;
  host: string;
  server: Server;
  registry: Registry;
};

export function createBasicAuthMiddleware(config: BasicAuthConfig): RequestHandler {
  if (!config) {
    return (_req, _res, next) => next();
  }

  const { username, password } = config;

  return (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header || typeof header !== 'string' || !header.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
      res.status(401).send('Authentication required');
      return;
    }

    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const [providedUser, providedPassword] = decoded.split(':');
    if (providedUser === username && providedPassword === password) {
      next();
      return;
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
    res.status(401).send('Access denied');
  };
}

export async function startMonitoring(options: StartMonitoringOptions): Promise<MonitoringHandle> {
  const { logger, queues, metricsPrefix, bullBoard, alerts } = options;

  if (alerts.webhookUrl) {
    logger.info(
      { threshold: alerts.threshold, webhookUrl: alerts.webhookUrl },
      'Failure alert webhook configured'
    );
  }

  const app = express();
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: metricsPrefix });

  const waitingGauge = new Gauge({
    name: `${metricsPrefix}queue_jobs_waiting`,
    help: 'Number of waiting jobs per queue',
    labelNames: ['queue'],
    registers: [registry],
  });

  waitingGauge.collect = async () => {
    await Promise.all(
      queues.map(async ({ name, queue }) => {
        try {
          const counts = await queue.getJobCounts();
          waitingGauge.set({ queue: name }, counts.waiting ?? 0);
        } catch (err) {
          logger.warn({ err, queueName: name }, 'Unable to collect waiting job count');
        }
      })
    );
  };

  const failedGauge = new Gauge({
    name: `${metricsPrefix}queue_jobs_failed`,
    help: 'Number of failed jobs per queue',
    labelNames: ['queue'],
    registers: [registry],
  });

  failedGauge.collect = async () => {
    await Promise.all(
      queues.map(async ({ name, queue }) => {
        try {
          const counts = await queue.getJobCounts();
          failedGauge.set({ queue: name }, counts.failed ?? 0);
        } catch (err) {
          logger.warn({ err, queueName: name }, 'Unable to collect failed job count');
        }
      })
    );
  };

  const durationHistogram = new Histogram({
    name: `${metricsPrefix}job_duration_seconds`,
    help: 'Histogram of job processing duration in seconds',
    labelNames: ['queue'],
    buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600],
    registers: [registry],
  });

  queues.forEach(({ name, worker }) => {
    worker.on('completed', (job: any) => {
      const processedOn = job?.processedOn;
      const finishedOn = job?.finishedOn;
      if (typeof processedOn !== 'number' || typeof finishedOn !== 'number') {
        return;
      }
      const durationMs = finishedOn - processedOn;
      if (Number.isFinite(durationMs) && durationMs >= 0) {
        durationHistogram.observe({ queue: name }, durationMs / 1000);
      }
    });
  });

  app.get('/metrics', async (_req, res) => {
    try {
      res.setHeader('Content-Type', registry.contentType);
      res.send(await registry.metrics());
    } catch (err) {
      logger.error({ err }, 'Failed to produce Prometheus metrics');
      res.status(500).send('Unable to collect metrics');
    }
  });

  const serverAdapter = new ExpressAdapter();
  const boardBasePath = '/bull-board';
  serverAdapter.setBasePath(boardBasePath);
  createBullBoard({
    queues: queues.map(({ queue }) => new BullMQAdapter(queue as Queue)),
    serverAdapter,
  });

  app.use(boardBasePath, createBasicAuthMiddleware(bullBoard.basicAuth), serverAdapter.getRouter());

  const server = await new Promise<Server>((resolve, reject) => {
    const srv = app
      .listen(bullBoard.port, bullBoard.host, () => {
        resolve(srv);
      })
      .on('error', (err) => {
        logger.error({ err }, 'Monitoring server failed to start');
        reject(err);
      });
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port ?? bullBoard.port : bullBoard.port;

  logger.info({ host: bullBoard.host, port }, 'Monitoring server started');

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      }),
    port,
    host: bullBoard.host,
    server,
    registry,
  };
}
