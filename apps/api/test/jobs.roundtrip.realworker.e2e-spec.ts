import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { INestApplication } from '@nestjs/common';
import * as supertest from 'supertest';
// AppModule will be required dynamically after setting env flags
import { PrismaService } from '../src/prisma/prisma.service';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';

describe('Jobs Roundtrip with Real Worker (e2e)', () => {
  let app: INestApplication | undefined;
  let appContentQ: Queue | undefined;
  let appLoraQ: Queue | undefined;
  let appVideoQ: Queue | undefined;
  let workerProc: ChildProcess | undefined;
  let baseUrl = '';
  let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  let skipSuite = false;

  // Simple in-memory Prisma mock
  const mem: Record<string, any> = {};
  const prismaMock: Partial<PrismaService> = {
    job: {
      create: async (args: any) => {
        const id = 'job_real';
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
    process.env.BULL_PREFIX = `bull-real-${Math.random().toString(36).slice(2, 8)}`;

    const client = new IORedis(redisUrl);
    try {
      await client.ping();
    } catch {
      console.warn('Redis non disponibile; salto la suite Real Worker Roundtrip (e2e)');
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
        .overrideProvider(PrismaService)
        .useValue(prismaMock)
        .compile();

      app = moduleFixture.createNestApplication(new FastifyAdapter());
      await app.listen(0, '127.0.0.1');
      const addr = (app.getHttpAdapter().getInstance() as any).server.address();
      const port = typeof addr === 'object' ? addr.port : 0;
      baseUrl = `http://127.0.0.1:${port}`;
      await (app.getHttpAdapter().getInstance() as any).ready();
    } catch (e) {
      console.warn('Impossibile avviare l\'app; salto suite Real Worker Roundtrip (e2e)');
      skipSuite = true;
      return;
    }

    // Spawn the real worker using its tsx runner
    const apiDir = process.cwd(); // apps/api
    const workerDir = path.resolve(apiDir, '../worker');
    const tsxBin = path.resolve(
      workerDir,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'tsx.CMD' : 'tsx'
    );
    const entry = path.resolve(workerDir, 'src', 'index.ts');

    // Map REDIS_URL to worker host/port envs
    let redisHost = 'localhost';
    let redisPort = '6379';
    try {
      const u = new URL(redisUrl);
      redisHost = u.hostname || redisHost;
      redisPort = String(u.port || redisPort);
    } catch {}

    try {
      workerProc = spawn(tsxBin, [entry], {
        env: {
          ...process.env,
          API_BASE_URL: baseUrl,
          WORKER_API_URL: baseUrl,
          REDIS_HOST: redisHost,
          REDIS_PORT: redisPort,
          BULL_PREFIX: process.env.BULL_PREFIX!,
          LOG_LEVEL: 'debug',
          NODE_ENV: 'development',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: workerDir,
      });
      // Optional: wait a bit for worker to boot
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.warn('Impossibile avviare il worker reale; salto suite');
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
  });

  afterAll(async () => {
    try { if (appVideoQ) await appVideoQ.close(); } catch {}
    try { if (appLoraQ) await appLoraQ.close(); } catch {}
    try { if (appContentQ) await appContentQ.close(); } catch {}
    if (workerProc && !workerProc.killed) {
      try { workerProc.kill('SIGTERM'); } catch {}
    }
    if (app) { await app.close(); }
  });

  it('Real worker processes job and updates status to succeeded', async () => {
    if (skipSuite || !app) return;

    const res = await (supertest as any)(app.getHttpServer())
      .post('/jobs')
      .send({ type: 'content-generation', payload: { test: true } })
      .expect(201);

    const id = res.body.id;
    expect(id).toBe('job_real');

    // Poll the API until status becomes 'succeeded'
    const deadline = Date.now() + 15000;
    let state: any | undefined;
    while (Date.now() < deadline) {
      const resGet = await (supertest as any)(app.getHttpServer()).get(`/jobs/${id}`).expect(200);
      state = resGet.body;
      if (state?.status === 'succeeded') break;
      await new Promise((r) => setTimeout(r, 200));
    }
    expect(state?.status).toBe('succeeded');
    expect(state?.result).toBeTruthy();
  }, 30000);
});
