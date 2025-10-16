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
