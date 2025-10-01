import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

describe('Auth Guard (e2e)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DISABLE_BULL = '1';
    const prismaMock: Partial<PrismaService> = { onModuleInit: jest.fn(), onModuleDestroy: jest.fn(), enableShutdownHooks: jest.fn() };
    const storageMock: Partial<StorageService> = { ensureBucket: jest.fn(async () => undefined) } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(prismaMock)
      .overrideProvider(StorageService).useValue(storageMock)
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => { if (app) await app.close(); });

  it('rejects unauthenticated request with 401', async () => {
    await request(app!.getHttpServer()).get('/jobs').expect(401);
  });
});

