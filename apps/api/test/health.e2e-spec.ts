import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../src/prisma/prisma.service';
import { getAuthHeader } from './utils/test-auth';

describe('Health (e2e)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    // Provide a safe DATABASE_URL for PrismaService constructor (won't be used)
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db?schema=public';

    const prismaMock: Partial<PrismaService> = {
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      enableShutdownHooks: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('content-generation')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(getQueueToken('lora-training')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(getQueueToken('video-generation')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/health (GET)', async () => {
    const res = await request(app!.getHttpServer()).get('/health').set(getAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', timestamp: expect.any(String) });
  });
});
