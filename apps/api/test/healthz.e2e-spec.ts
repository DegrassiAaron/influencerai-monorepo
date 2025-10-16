import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

let redisShouldFail = false;

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      connect: async () => {
        if (redisShouldFail) throw new Error('Redis connect fail');
      },
      ping: async () => {
        if (redisShouldFail) throw new Error('Redis ping fail');
        return 'PONG';
      },
      disconnect: () => {},
    } as any;
  });
});

describe('Health Endpoints (e2e) - OK', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SKIP_S3_INIT = '1';
    redisShouldFail = false;

    const prismaMock: Partial<PrismaService> = {
      // emulate successful query
      $queryRaw: jest.fn(async () => [[1]]),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      enableShutdownHooks: jest.fn(),
    } as any;

    const storageMock: Partial<StorageService> = {
      ensureBucket: jest.fn(async () => {}),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(StorageService)
      .useValue(storageMock)
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /healthz returns ok report', async () => {
    const res = await request(app.getHttpServer()).get('/healthz').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks?.db?.status).toBe('ok');
    expect(res.body.checks?.redis?.status).toBe('ok');
    expect(res.body.checks?.minio?.status).toBe('ok');
  });

  it('GET /readyz returns 200 when healthy', async () => {
    await request(app.getHttpServer()).get('/readyz').expect(200);
  });
});

describe('Health Endpoints (e2e) - Failures', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SKIP_S3_INIT = '1';
    redisShouldFail = true;

    const prismaMock: Partial<PrismaService> = {
      $queryRaw: jest.fn(async () => {
        throw new Error('DB down');
      }),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      enableShutdownHooks: jest.fn(),
    } as any;

    const storageMock: Partial<StorageService> = {
      ensureBucket: jest.fn(async () => {
        throw new Error('MinIO down');
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(StorageService)
      .useValue(storageMock)
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => {
    await app.close();
    redisShouldFail = false;
  });

  it('GET /healthz aggregates component errors', async () => {
    const res = await request(app.getHttpServer()).get('/healthz').expect(200);
    expect(res.body.status).toBe('error');
    expect(res.body.checks?.db?.status).toBe('error');
    expect(res.body.checks?.redis?.status).toBe('error');
    expect(res.body.checks?.minio?.status).toBe('error');
  });

  it('GET /readyz returns 503 when unhealthy', async () => {
    await request(app.getHttpServer()).get('/readyz').expect(503);
  });
});
