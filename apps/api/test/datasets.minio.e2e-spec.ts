import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { fetch } from 'undici';
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

jest.setTimeout(20000);
jest.mock('../src/auth/jwt-auth.guard', () => ({
  JwtAuthGuard: class {
    canActivate() {
      return true;
    }
  },
}));

describe('Datasets + MinIO integration (e2e)', () => {
  let app: INestApplication | undefined;
  let storage: StorageService | undefined;
  let skipSuite = false;

  const s3Endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  const s3Key = process.env.S3_KEY || 'minio';
  const s3Secret = process.env.S3_SECRET || 'minio12345';
  const s3Bucket = process.env.S3_BUCKET || 'assets';
  const awsRegion = process.env.AWS_REGION || 'us-east-1';

  const datasetStore: Record<string, any> = {};

  const prismaMock: Partial<PrismaService> = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    enableShutdownHooks: jest.fn(),
    dataset: {
      create: jest.fn(async ({ data }: any) => {
        const id = `ds_${Math.random().toString(36).slice(2, 10)}`;
        const record = {
          id,
          tenantId: 'tenant_e2e',
          kind: data.kind,
          path: data.path,
          meta: data.meta,
          status: data.status ?? 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        datasetStore[id] = record;
        return record;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const current = datasetStore[where.id];
        if (!current) {
          throw new Error(`Dataset ${where.id} not found`);
        }
        const next = {
          ...current,
          ...data,
          updatedAt: new Date(),
        };
        datasetStore[where.id] = next;
        return next;
      }),
    } as any,
  };

  beforeAll(async () => {
    // Force StorageModule to attempt real initialization
    process.env.SKIP_S3_INIT = '0';

    const cfg = new ConfigService({
      S3_ENDPOINT: s3Endpoint,
      S3_KEY: s3Key,
      S3_SECRET: s3Secret,
      S3_BUCKET: s3Bucket,
      AWS_REGION: awsRegion,
      NODE_ENV: 'test',
    } as any);
    const probeStorage = new StorageService(cfg as any);
    try {
      const bootstrapClient = new S3Client({
        endpoint: s3Endpoint,
        region: awsRegion,
        credentials: { accessKeyId: s3Key, secretAccessKey: s3Secret },
        forcePathStyle: true,
      });
      try {
        await bootstrapClient.send(new CreateBucketCommand({ Bucket: s3Bucket }));
      } catch (err: any) {
        const code = err?.Code || err?.name;
        if (!code || !['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(code)) {
          throw err;
        }
      }

      await probeStorage.ensureBucket();
      const probeKey = `e2e/datasets-minio-probe-${Date.now()}.txt`;
      const payload = 'probe';
      let success = false;
      let lastError: unknown;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await probeStorage.ensureBucket();
          await probeStorage.putTextObject(probeKey, payload);
          const roundtrip = await probeStorage.getTextObject(probeKey);
          if (roundtrip === payload) {
            success = true;
            break;
          }
        } catch (err) {
          lastError = err;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      if (!success) {
        throw lastError ?? new Error('Impossibile scrivere oggetto di probe su MinIO');
      }
    } catch (err) {
      skipSuite = true;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`MinIO non disponibile; salto la suite Datasets + MinIO (e2e): ${message}`);
      return;
    }

    // Guard that skips authentication for tests
    const { AppModule } = require('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_GUARD)
      .useValue({ canActivate: () => true } as CanActivate)
      .overrideProvider(JwtService)
      .useValue({ verify: () => ({ sub: 'user', tenantId: 'tenant_e2e', email: 'test@example.com', role: 'admin' }) })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
    storage = app.get(StorageService);
    await storage.ensureBucket();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('creates a dataset and allows uploading via presigned URL to MinIO', async () => {
    if (skipSuite || !app || !storage) {
      return;
    }

    const res = await request(app.getHttpServer())
      .post('/datasets')
      .send({ kind: 'training', filename: 'dataset.txt', contentType: 'text/plain' })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      uploadUrl: expect.any(String),
      key: expect.any(String),
      bucket: storage.getBucketName(),
    });

    const uploadUrl = res.body.uploadUrl as string;
    const objectKey = res.body.key as string;
    const payload = 'hello-from-datasets-minio-e2e';

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: payload,
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(uploadResponse.ok).toBe(true);

    const stored = await storage.getTextObject(objectKey);
    expect(stored).toBe(payload);
  });
});
