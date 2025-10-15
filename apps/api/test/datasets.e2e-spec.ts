import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { getAuthHeader } from './utils/test-auth';

describe('Datasets (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db?schema=public';

    // Mock Prisma dataset CRUD minimal surface
    const prismaMock: Partial<PrismaService> = {
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      enableShutdownHooks: jest.fn(),
      dataset: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'ds_123',
          tenantId: 't_1',
          kind: data.kind,
          path: data.path,
          meta: data.meta,
          status: data.status ?? 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        update: jest.fn(async ({ where, data }: any) => ({
          id: where.id,
          tenantId: 't_1',
          kind: 'training',
          path: 'datasets/t_1/ds_123/dataset.zip',
          meta: { filename: 'dataset.zip' },
          status: data.status ?? 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      } as any,
    };

    const storageMock: Partial<StorageService> = {
      getBucketName: jest.fn(() => 'datasets-test'),
      getPresignedPutUrl: jest.fn(async ({ key }: any) => `http://minio.local/presign/${encodeURIComponent(key)}`),
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

  it('POST /datasets creates a dataset and returns presigned URL', async () => {
    const res = await request(app.getHttpServer())
      .post('/datasets')
      .set(getAuthHeader())
      .send({ kind: 'training', filename: 'dataset.zip', contentType: 'application/zip' })
      .expect(201);

    expect(res.body).toMatchObject({ id: expect.any(String), uploadUrl: expect.any(String), key: expect.any(String), bucket: expect.any(String) });
    expect(res.body.key).toContain('/ds_');
    expect(res.body.uploadUrl).toContain(encodeURIComponent(res.body.key));
  });

  it('PATCH /datasets/:id/status updates status', async () => {
    const res = await request(app.getHttpServer())
      .patch('/datasets/ds_123/status')
      .set(getAuthHeader())
      .send({ status: 'ready' })
      .expect(200);
    expect(res.body).toMatchObject({ id: 'ds_123', status: 'ready' });
  });
});

