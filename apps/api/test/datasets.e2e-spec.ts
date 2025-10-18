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
  let prismaMock: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db?schema=public';

    // Mock Prisma dataset CRUD minimal surface
    prismaMock = {
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
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
        findUnique: jest.fn(async () => null),
      } as any,
    };

    const storageMock: Partial<StorageService> = {
      getBucketName: jest.fn(() => 'datasets-test'),
      getPresignedPutUrl: jest.fn(
        async ({ key }: any) => `http://minio.local/presign/${encodeURIComponent(key)}`
      ),
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

    expect(res.body).toMatchObject({
      id: expect.any(String),
      uploadUrl: expect.any(String),
      key: expect.any(String),
      bucket: expect.any(String),
    });
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

  // ========================================
  // GET /datasets - List Datasets
  // ========================================

  describe('GET /datasets', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    // Scenario 1: List all datasets for tenant with default pagination
    it('should list all datasets with default pagination and tenant isolation', async () => {
      const mockDatasets = [
        {
          id: 'ds_1',
          tenantId: 'tenant_1',
          kind: 'lora-training',
          path: 'datasets/tenant_1/ds_1',
          status: 'ready',
          meta: {},
          createdAt: new Date('2025-01-15T10:00:00Z'),
          updatedAt: new Date('2025-01-15T10:00:00Z'),
        },
        {
          id: 'ds_2',
          tenantId: 'tenant_1',
          kind: 'reference',
          path: 'datasets/tenant_1/ds_2',
          status: 'pending',
          meta: {},
          createdAt: new Date('2025-01-15T09:00:00Z'),
          updatedAt: new Date('2025-01-15T09:00:00Z'),
        },
      ];

      prismaMock.dataset.findMany.mockResolvedValue(mockDatasets);
      prismaMock.dataset.count.mockResolvedValue(2);

      const res = await request(app.getHttpServer())
        .get('/datasets')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe('ds_1');
      expect(res.body[1].id).toBe('ds_2');
      expect(res.headers['x-total-count']).toBe('2');

      // Verify datasets are ordered by createdAt DESC
      expect(new Date(res.body[0].createdAt).getTime()).toBeGreaterThan(
        new Date(res.body[1].createdAt).getTime()
      );

      // Verify Prisma was called with tenant filter and default pagination
      expect(prismaMock.dataset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant_test_1' }),
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    // Scenario 2: Filter datasets by status
    it('should filter datasets by status=ready', async () => {
      const mockDatasets = [
        {
          id: 'ds_1',
          tenantId: 'tenant_1',
          kind: 'lora-training',
          status: 'ready',
          path: 'datasets/tenant_1/ds_1',
          meta: {},
          createdAt: new Date('2025-01-15T10:00:00Z'),
          updatedAt: new Date('2025-01-15T10:00:00Z'),
        },
        {
          id: 'ds_3',
          tenantId: 'tenant_1',
          kind: 'reference',
          status: 'ready',
          path: 'datasets/tenant_1/ds_3',
          meta: {},
          createdAt: new Date('2025-01-15T08:00:00Z'),
          updatedAt: new Date('2025-01-15T08:00:00Z'),
        },
      ];

      prismaMock.dataset.findMany.mockResolvedValue(mockDatasets);
      prismaMock.dataset.count.mockResolvedValue(2);

      const res = await request(app.getHttpServer())
        .get('/datasets?status=ready')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body.every((ds: any) => ds.status === 'ready')).toBe(true);
      expect(res.body.map((ds: any) => ds.id)).toEqual(['ds_1', 'ds_3']);

      // Verify Prisma was called with status filter
      expect(prismaMock.dataset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant_test_1',
            status: 'ready'
          }),
        })
      );
    });

    // Scenario 3: Filter datasets by kind
    it('should filter datasets by kind=lora-training', async () => {
      const mockDatasets = [
        {
          id: 'ds_1',
          tenantId: 'tenant_1',
          kind: 'lora-training',
          status: 'ready',
          path: 'datasets/tenant_1/ds_1',
          meta: {},
          createdAt: new Date('2025-01-15T10:00:00Z'),
          updatedAt: new Date('2025-01-15T10:00:00Z'),
        },
        {
          id: 'ds_3',
          tenantId: 'tenant_1',
          kind: 'lora-training',
          status: 'pending',
          path: 'datasets/tenant_1/ds_3',
          meta: {},
          createdAt: new Date('2025-01-15T08:00:00Z'),
          updatedAt: new Date('2025-01-15T08:00:00Z'),
        },
      ];

      prismaMock.dataset.findMany.mockResolvedValue(mockDatasets);
      prismaMock.dataset.count.mockResolvedValue(2);

      const res = await request(app.getHttpServer())
        .get('/datasets?kind=lora-training')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body.every((ds: any) => ds.kind === 'lora-training')).toBe(true);
      expect(res.body.map((ds: any) => ds.id)).toContain('ds_1');
      expect(res.body.map((ds: any) => ds.id)).toContain('ds_3');

      // Verify Prisma was called with kind filter
      expect(prismaMock.dataset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant_test_1',
            kind: 'lora-training'
          }),
        })
      );
    });

    // Scenario 4: Paginate datasets with take and skip
    it('should paginate datasets with take=10 and skip=20', async () => {
      const mockDatasets = Array.from({ length: 10 }, (_, i) => ({
        id: `ds_${21 + i}`,
        tenantId: 'tenant_1',
        kind: 'lora-training',
        status: 'ready',
        path: `datasets/tenant_1/ds_${21 + i}`,
        meta: {},
        createdAt: new Date(`2025-01-15T${10 - i}:00:00Z`),
        updatedAt: new Date(`2025-01-15T${10 - i}:00:00Z`),
      }));

      prismaMock.dataset.findMany.mockResolvedValue(mockDatasets);
      prismaMock.dataset.count.mockResolvedValue(50);

      const res = await request(app.getHttpServer())
        .get('/datasets?take=10&skip=20')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toHaveLength(10);
      expect(res.headers['x-total-count']).toBe('50');

      // Verify Prisma was called with correct pagination params
      expect(prismaMock.dataset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant_test_1' }),
          take: 10,
          skip: 20,
        })
      );
    });

    // Scenario 5: Enforce maximum take limit
    it('should return 400 when take exceeds maximum limit of 100', async () => {
      const res = await request(app.getHttpServer())
        .get('/datasets?take=500')
        .set(getAuthHeader())
        .expect(400);

      expect(res.body.message).toMatch(/take/i);
      expect(res.body.message).toMatch(/100/);
    });

    // Scenario 9: Return 401 when tenant context is missing
    it('should return 401 when authentication is missing', async () => {
      await request(app.getHttpServer())
        .get('/datasets')
        .expect(401);
    });

    // Scenario 10: Validate invalid status filter
    it('should return 400 for invalid status filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/datasets?status=invalid_status')
        .set(getAuthHeader())
        .expect(400);

      expect(res.body.message).toMatch(/status/i);
      // Zod validation should list valid enum values
      expect(res.body.message || res.body.errors).toBeTruthy();
    });

    // Scenario 11: Validate invalid sortBy parameter
    it('should return 400 for invalid sortBy parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/datasets?sortBy=invalidField')
        .set(getAuthHeader())
        .expect(400);

      expect(res.body.message || res.body.errors).toMatch(/sortBy/i);
    });

    // Scenario 12: Sort datasets by updatedAt descending
    it('should sort datasets by updatedAt desc when specified', async () => {
      const mockDatasets = [
        {
          id: 'ds_3',
          tenantId: 'tenant_1',
          kind: 'lora-training',
          status: 'ready',
          path: 'datasets/tenant_1/ds_3',
          meta: {},
          createdAt: new Date('2025-01-15T10:00:00Z'),
          updatedAt: new Date('2025-01-15T13:00:00Z'),
        },
        {
          id: 'ds_1',
          tenantId: 'tenant_1',
          kind: 'lora-training',
          status: 'ready',
          path: 'datasets/tenant_1/ds_1',
          meta: {},
          createdAt: new Date('2025-01-15T08:00:00Z'),
          updatedAt: new Date('2025-01-15T12:00:00Z'),
        },
        {
          id: 'ds_2',
          tenantId: 'tenant_1',
          kind: 'lora-training',
          status: 'ready',
          path: 'datasets/tenant_1/ds_2',
          meta: {},
          createdAt: new Date('2025-01-15T09:00:00Z'),
          updatedAt: new Date('2025-01-15T11:00:00Z'),
        },
      ];

      prismaMock.dataset.findMany.mockResolvedValue(mockDatasets);
      prismaMock.dataset.count.mockResolvedValue(3);

      const res = await request(app.getHttpServer())
        .get('/datasets?sortBy=updatedAt&sortOrder=desc')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body.map((ds: any) => ds.id)).toEqual(['ds_3', 'ds_1', 'ds_2']);

      // Verify Prisma was called with updatedAt sorting
      expect(prismaMock.dataset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
        })
      );
    });

    // Scenario 13: Combine multiple filters and sorting
    it('should combine kind, status filters with sorting by createdAt asc', async () => {
      const mockDatasets = [
        {
          id: 'ds_3',
          tenantId: 'tenant_1',
          kind: 'lora-training',
          status: 'ready',
          path: 'datasets/tenant_1/ds_3',
          meta: {},
          createdAt: new Date('2025-01-15T08:00:00Z'),
          updatedAt: new Date('2025-01-15T08:00:00Z'),
        },
        {
          id: 'ds_1',
          tenantId: 'tenant_1',
          kind: 'lora-training',
          status: 'ready',
          path: 'datasets/tenant_1/ds_1',
          meta: {},
          createdAt: new Date('2025-01-15T10:00:00Z'),
          updatedAt: new Date('2025-01-15T10:00:00Z'),
        },
      ];

      prismaMock.dataset.findMany.mockResolvedValue(mockDatasets);
      prismaMock.dataset.count.mockResolvedValue(2);

      const res = await request(app.getHttpServer())
        .get('/datasets?kind=lora-training&status=ready&sortBy=createdAt&sortOrder=asc')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body.map((ds: any) => ds.id)).toEqual(['ds_3', 'ds_1']);

      // Verify Prisma was called with all filters and sorting
      expect(prismaMock.dataset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant_test_1',
            kind: 'lora-training',
            status: 'ready'
          }),
          orderBy: { createdAt: 'asc' },
        })
      );
    });
  });

  // ========================================
  // GET /datasets/:id - Get Dataset by ID
  // ========================================

  describe('GET /datasets/:id', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Scenario 6: Get single dataset by ID
    it('should return dataset by id with all fields', async () => {
      const mockDataset = {
        id: 'ds_123',
        tenantId: 'tenant_1',
        kind: 'lora-training',
        path: 'datasets/tenant_1/my-lora-dataset',
        status: 'ready',
        meta: {
          filename: 'dataset.zip',
          imageCount: 50,
          captioned: true,
        },
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T11:00:00Z'),
      };

      prismaMock.dataset.findUnique.mockResolvedValue(mockDataset);

      const res = await request(app.getHttpServer())
        .get('/datasets/ds_123')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toMatchObject({
        id: 'ds_123',
        tenantId: 'tenant_1',
        kind: 'lora-training',
        path: 'datasets/tenant_1/my-lora-dataset',
        status: 'ready',
        meta: {
          filename: 'dataset.zip',
          imageCount: 50,
          captioned: true,
        },
      });

      // Verify all required fields are present
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('tenantId');
      expect(res.body).toHaveProperty('kind');
      expect(res.body).toHaveProperty('path');
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('meta');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');

      // Verify Prisma was called with correct ID
      expect(prismaMock.dataset.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ds_123' },
        })
      );
    });

    // Scenario 7: Return 404 for non-existent dataset
    it('should return 404 for non-existent dataset', async () => {
      prismaMock.dataset.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/datasets/ds_nonexistent')
        .set(getAuthHeader())
        .expect(404);

      expect(res.body.message).toMatch(/ds_nonexistent/i);
      expect(res.body.message).toMatch(/not found/i);
    });

    // Scenario 8: Return 404 for dataset from different tenant (security)
    it('should return 404 for dataset from different tenant without revealing existence', async () => {
      const mockDataset = {
        id: 'ds_other',
        tenantId: 'tenant_2', // Different tenant
        kind: 'lora-training',
        path: 'datasets/tenant_2/ds_other',
        status: 'ready',
        meta: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.dataset.findUnique.mockResolvedValue(mockDataset);

      const res = await request(app.getHttpServer())
        .get('/datasets/ds_other')
        .set(getAuthHeader()) // tenant_1
        .expect(404);

      expect(res.body.message).toMatch(/ds_other/i);
      expect(res.body.message).toMatch(/not found/i);

      // Security: Should NOT reveal that dataset exists for another tenant
      expect(res.body.message).not.toMatch(/tenant/i);
      expect(res.body.message).not.toMatch(/permission/i);
      expect(res.body.message).not.toMatch(/access/i);
    });

    // Additional: Return 401 when authentication is missing
    it('should return 401 when authentication is missing', async () => {
      await request(app.getHttpServer())
        .get('/datasets/ds_123')
        .expect(401);
    });
  });
});
