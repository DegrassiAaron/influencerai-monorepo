import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ContentPlansService } from '../src/content-plans/content-plans.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { HTTPError } from '../src/lib/http-utils';
import { getAuthHeader } from './utils/test-auth';

describe('Content Plans Errors (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const svcMock: Partial<ContentPlansService> = {
      createPlan: jest.fn(async () => {
        throw new HTTPError('rate limited', { status: 429 });
      }),
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ContentPlansService)
      .useValue(svcMock)
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        enableShutdownHooks: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /content-plans returns 429 when upstream is rate limited', async () => {
    await request(app.getHttpServer())
      .post('/content-plans')
      .set(getAuthHeader())
      .send({ influencerId: 'inf_1', theme: 'tech' })
      .expect(429);
  });
});

describe('Content Plans Errors 5xx (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const svcMock: Partial<ContentPlansService> = {
      createPlan: jest.fn(async () => {
        throw new HTTPError('bad gateway', { status: 502 });
      }),
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ContentPlansService)
      .useValue(svcMock)
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        enableShutdownHooks: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /content-plans returns 502 when upstream 5xx occurs', async () => {
    await request(app.getHttpServer())
      .post('/content-plans')
      .set(getAuthHeader())
      .send({ influencerId: 'inf_1', theme: 'tech' })
      .expect(502);
  });
});

describe('Content Plans Errors timeout (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const svcMock: Partial<ContentPlansService> = {
      createPlan: jest.fn(async () => {
        const err: any = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      }),
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ContentPlansService)
      .useValue(svcMock)
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        enableShutdownHooks: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /content-plans returns 408 on upstream timeout', async () => {
    await request(app.getHttpServer())
      .post('/content-plans')
      .set(getAuthHeader())
      .send({ influencerId: 'inf_1', theme: 'tech' })
      .expect(408);
  });
});
