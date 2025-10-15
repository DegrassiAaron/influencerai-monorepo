import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../src/prisma/prisma.service';
import { getAuthHeader } from './utils/test-auth';

describe('Content Plans with OpenRouter (fetch mock) (e2e)', () => {
  let app: INestApplication;
  let originalFetch: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.OPENROUTER_TIMEOUT_MS = '200';
    process.env.OPENROUTER_MAX_RETRIES = '3';

    // Mock global fetch to emulate OpenRouter
    originalFetch = (global as any).fetch;
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: async () => ({
        choices: [{ message: { content: JSON.stringify([{ caption: 'nock-post', hashtags: ['h'] }]) } }],
        usage: { total_tokens: 42 },
      }),
    })) as any;

    const prismaStub: Partial<PrismaService> = {
      influencer: { findUnique: jest.fn(async ({ where: { id } }: any) => (id === 'inf_1' ? { id, tenantId: 'ten_1', persona: { name: 'A' } } : null)) } as any,
      job: { create: jest.fn(async ({ data }: any) => ({ id: 'job_nock_1', ...data })) } as any,
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('content-generation')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(getQueueToken('lora-training')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(getQueueToken('video-generation')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(PrismaService).useValue(prismaStub)
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => {
    (global as any).fetch = originalFetch;
    if (app) await app.close();
  });

  it('POST /content-plans uses OpenRouter and returns 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/content-plans')
      .set(getAuthHeader())
      .send({ influencerId: 'inf_1', theme: 'tech' })
      .expect(201);
    expect(res.body.plan.posts[0]).toEqual({ caption: 'nock-post', hashtags: ['h'] });
  });
});

describe('Content Plans with OpenRouter retry 429→200 (fetch mock) (e2e)', () => {
  let app: INestApplication;
  let originalFetch: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.OPENROUTER_TIMEOUT_MS = '200';
    process.env.OPENROUTER_MAX_RETRIES = '3';
    process.env.OPENROUTER_BACKOFF_BASE_MS = '1';
    process.env.OPENROUTER_BACKOFF_JITTER_MS = '0';

    // First 429, then 200
    let call = 0;
    originalFetch = (global as any).fetch;
    (global as any).fetch = jest.fn(async () => {
      call += 1;
      if (call === 1) {
        return {
          ok: false,
          status: 429,
          headers: { get: (k: string) => (k === 'Retry-After' ? '0' : null) },
          json: async () => ({ error: 'rate' }),
          text: async () => 'rate',
        } as any;
      }
      return {
        ok: true,
        status: 200,
        headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
        json: async () => ({ choices: [{ message: { content: JSON.stringify([{ caption: 'nock-ok', hashtags: ['ok'] }]) } }] }),
      } as any;
    }) as any;

    const prismaStub: Partial<PrismaService> = {
      influencer: { findUnique: jest.fn(async ({ where: { id } }: any) => (id === 'inf_1' ? { id, tenantId: 'ten_1', persona: { name: 'A' } } : null)) } as any,
      job: { create: jest.fn(async ({ data }: any) => ({ id: 'job_nock_2', ...data })) } as any,
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('content-generation')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(getQueueToken('lora-training')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(getQueueToken('video-generation')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(PrismaService).useValue(prismaStub)
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => {
    (global as any).fetch = originalFetch;
    if (app) await app.close();
  });

  it('POST /content-plans eventually succeeds after 429', async () => {
    const res = await request(app.getHttpServer())
      .post('/content-plans')
      .set(getAuthHeader())
      .send({ influencerId: 'inf_1', theme: 'tech' })
      .expect(201);
    expect(res.body.plan.posts[0]).toEqual({ caption: 'nock-ok', hashtags: ['ok'] });
  });
});
