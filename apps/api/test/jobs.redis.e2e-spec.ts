import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { INestApplication } from '@nestjs/common';
import * as supertest from 'supertest';
// AppModule will be required dynamically after setting env flags
import { PrismaService } from '../src/prisma/prisma.service';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';

describe('Jobs + Redis (e2e)', () => {
  let app: INestApplication | undefined;
  let appContentQ: Queue | undefined;
  let appLoraQ: Queue | undefined;
  let appVideoQ: Queue | undefined;
  let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  let controlQueue: Queue | undefined;

  beforeAll(async () => {
    // Ensure Bull is enabled in this suite and Redis URL set
    process.env.NODE_ENV = 'development';
    process.env.DISABLE_BULL = '0';
    process.env.REDIS_URL = redisUrl;

    // Quick ping to Redis; if unavailable, skip the suite
    const client = new IORedis(redisUrl);
    try {
      await client.ping();
    } catch {
      // Skip if Redis is not available
      // eslint-disable-next-line no-console
      console.warn('Redis non disponibile; salto la suite Jobs + Redis (e2e)');
      return;
    } finally {
      client.disconnect();
    }

    const { AppModule } = require('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ onModuleInit: jest.fn(), onModuleDestroy: jest.fn(), enableShutdownHooks: jest.fn(), job: { create: jest.fn(async (data: any) => ({ id: 'job_e2e', ...data.data })) } })
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();

    // Grab app queues to properly close them in teardown
    try {
      appContentQ = app.get<Queue>(getQueueToken('content-generation'));
      appLoraQ = app.get<Queue>(getQueueToken('lora-training'));
      appVideoQ = app.get<Queue>(getQueueToken('video-generation'));
    } catch {
      // ignore if not available
    }

    // Create a control Queue instance and pause globally to avoid external workers consuming
    controlQueue = new Queue('content-generation', { connection: new IORedis(redisUrl) as any });
    await controlQueue.waitUntilReady();
    await controlQueue.pause();
  });

  afterAll(async () => {
    try {
      if (controlQueue) {
        // Clean up waiting jobs created by the test
        const jobs = await controlQueue.getJobs(['waiting', 'delayed', 'active']);
        for (const j of jobs) {
          try { await j.remove(); } catch {}
        }
        await controlQueue.resume();
        await controlQueue.close();
      }
    } catch {}
    try { if (appVideoQ) await appVideoQ.close(); } catch {}
    try { if (appLoraQ) await appLoraQ.close(); } catch {}
    try { if (appContentQ) await appContentQ.close(); } catch {}
    if (app) { await app.close(); }
  });

  it('POST /jobs enqueues into Redis', async () => {
    if (!app) {
      return; // skipped due to missing Redis
    }
    const res = await (supertest as any)(app.getHttpServer())
      .post('/jobs')
      .send({ type: 'content-generation', payload: { test: true } })
      .expect(201);

    expect(res.body).toMatchObject({ id: 'job_e2e', type: 'content-generation' });

    // Poll the same queue instance used by the app to avoid prefix/conn mismatch
    expect(appContentQ).toBeTruthy();
    let found: any | undefined;
    const deadline = Date.now() + 10000;
    while (!found && Date.now() < deadline) {
      const jobs = await appContentQ!.getJobs(['waiting', 'delayed', 'active', 'paused', 'prioritized', 'waiting-children']);
      found = jobs.find((j) => (j.data as any).jobId === 'job_e2e');
      if (!found) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    expect(found).toBeTruthy();
  }, 20000);
});
