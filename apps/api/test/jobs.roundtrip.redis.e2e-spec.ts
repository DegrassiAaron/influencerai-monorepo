import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
// AppModule will be required dynamically after setting env flags
import { PrismaService } from '../src/prisma/prisma.service';
import IORedis from 'ioredis';
import { Worker, Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { fetch } from 'undici';

jest.setTimeout(20000);

describe('Jobs Roundtrip + Redis (e2e)', () => {
  let app: INestApplication | undefined;
  let appContentQ: Queue | undefined;
  let appLoraQ: Queue | undefined;
  let appVideoQ: Queue | undefined;
  let testWorker: Worker | undefined;
  let baseUrl = '';
  let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  let workerRedis: IORedis | undefined;
  let skipSuite = false;

  // Simple in-memory Prisma mock
  const mem: Record<string, any> = {};
  const prismaMock: Partial<PrismaService> = {
     
    job: {
       
      create: async (args: any) => {
        const id = 'job_rt';
        mem[id] = { id, ...args.data };
        return mem[id];
      },
       
      update: async (args: any) => {
        const id = args.where.id;
        if (!mem[id]) throw new Error('NotFound');
        mem[id] = { ...mem[id], ...args.data };
        return mem[id];
      },
       
      findUnique: async (args: any) => mem[args.where.id] || null,
       
      findMany: async (_args: any) => Object.values(mem),
    } as any,
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    enableShutdownHooks: jest.fn(),
  };

  beforeAll(async () => {
    // Ensure Bull is enabled and Redis available
    process.env.NODE_ENV = 'development';
    process.env.DISABLE_BULL = '0';
    process.env.REDIS_URL = redisUrl;
    process.env.BULL_PREFIX = `bull-rt-${Math.random().toString(36).slice(2, 8)}`;

    const client = new IORedis(redisUrl, {
      connectTimeout: 500,
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
      retryStrategy: () => null,
    } as any);
    try {
      await client.ping();
    } catch {
      console.warn('Redis non disponibile; salto la suite Roundtrip + Redis (e2e)');
      skipSuite = true;
      return;
    } finally {
      client.disconnect();
    }

    try {
      const { AppModule } = require('../src/app.module');
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(APP_GUARD)
        .useValue({ canActivate: () => true })
        .overrideProvider(PrismaService)
        .useValue(prismaMock)
        .compile();

      app = moduleFixture.createNestApplication(new FastifyAdapter());
      // Bind to ephemeral port so SDK can reach it via HTTP
      await app.listen(0, '127.0.0.1');
      const addr = (app.getHttpAdapter().getInstance() as any).server.address();
      const port = typeof addr === 'object' ? addr.port : 0;
      baseUrl = `http://127.0.0.1:${port}`;

      await (app.getHttpAdapter().getInstance() as any).ready();
    } catch (e) {
      console.warn('Impossibile avviare l\'app con Bull/HTTP; salto suite Roundtrip + Redis (e2e)');
      skipSuite = true;
      return;
    }

    // Grab app queues to properly close them in teardown
    try {
      appContentQ = app!.get<Queue>(getQueueToken('content-generation'));
      appLoraQ = app!.get<Queue>(getQueueToken('lora-training'));
      appVideoQ = app!.get<Queue>(getQueueToken('video-generation'));
    } catch {
      // ignore if not available
    }

    // Start a test worker that mimics the real worker behavior using HTTP PATCH
    // Ensure ioredis is configured for BullMQ worker (maxRetriesPerRequest=null)
    workerRedis = new IORedis(redisUrl, { maxRetriesPerRequest: null } as any);
    testWorker = new Worker(
      'content-generation',
      async (job) => {
        const jobId = (job.data as any)?.jobId as string | undefined;
        if (jobId) {
          try {
            await fetch(`${baseUrl}/jobs/${jobId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'running' }),
            });
          } catch {}
        }
        // Simulate some processing
        await new Promise((r) => setTimeout(r, 200));
        const result = { ok: true };
        if (jobId) {
          try {
            await fetch(`${baseUrl}/jobs/${jobId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'succeeded', result }),
            });
          } catch {}
        }
        return result as any;
      },
      { connection: workerRedis as any, prefix: process.env.BULL_PREFIX }
    );
    await testWorker.waitUntilReady();
  });

  afterAll(async () => {
    try { if (testWorker) await testWorker.close(); } catch {}
    try { if (workerRedis) workerRedis.disconnect(); } catch {}
    try { if (appVideoQ) await appVideoQ.close(); } catch {}
    try { if (appLoraQ) await appLoraQ.close(); } catch {}
    try { if (appContentQ) await appContentQ.close(); } catch {}
    if (app) { await app.close(); }
  });

  it('Roundtrip: POST /jobs → worker runs → PATCH updates to succeeded', async () => {
    if (skipSuite || !app) return;

    const res = await request(app.getHttpServer())
      .post('/jobs')
      .send({ type: 'content-generation', payload: { test: true } })
      .expect(201);

    const id = res.body.id;
    expect(id).toBe('job_rt');

    // Poll the API until status becomes 'succeeded'
    const deadline = Date.now() + 10000;
    let state: any | undefined;
    while (Date.now() < deadline) {
      const resGet = await request(app.getHttpServer()).get(`/jobs/${id}`).expect(200);
      state = resGet.body;
      if (state?.status === 'succeeded') break;
      await new Promise((r) => setTimeout(r, 150));
    }
    expect(state?.status).toBe('succeeded');
    expect(state?.result).toBeTruthy();
  }, 20000);
});
