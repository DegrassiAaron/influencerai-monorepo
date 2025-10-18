import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { getAuthHeader } from './utils/test-auth';

/**
 * E2E tests for LoRA Configs API
 *
 * Test coverage:
 * - POST /lora-configs (create)
 * - GET /lora-configs (list with filters)
 * - GET /lora-configs/:id (get by ID)
 * - PATCH /lora-configs/:id (update)
 * - DELETE /lora-configs/:id (delete)
 * - Validation errors (400)
 * - Tenant isolation (cross-tenant access returns 404)
 * - Business logic (default config, delete protection)
 */

describe('LoRA Configs (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  const mockTenantId = 'tenant_test_1';
  const otherTenantId = 'tenant_test_2';

  const mockLoraConfig = {
    id: 'lora_1',
    tenantId: mockTenantId,
    name: 'Test Config',
    description: 'Test description',
    modelName: 'sd15',
    epochs: 10,
    learningRate: 0.0001,
    batchSize: 1,
    resolution: 512,
    networkDim: 32,
    networkAlpha: 16,
    outputPath: null,
    meta: {},
    isDefault: false,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockDefaultConfig = {
    ...mockLoraConfig,
    id: 'lora_2',
    name: 'Default Config',
    isDefault: true,
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db?schema=public';

    // Mock Prisma with comprehensive LoRA config CRUD operations
    prismaMock = {
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      enableShutdownHooks: jest.fn(),
      loraConfig: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'lora_new',
          tenantId: data.tenantId,
          name: data.name,
          description: data.description ?? null,
          modelName: data.modelName,
          epochs: data.epochs ?? 10,
          learningRate: data.learningRate ?? 0.0001,
          batchSize: data.batchSize ?? 1,
          resolution: data.resolution ?? 512,
          networkDim: data.networkDim ?? 32,
          networkAlpha: data.networkAlpha ?? 16,
          outputPath: data.outputPath ?? null,
          meta: data.meta ?? {},
          isDefault: data.isDefault ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findFirst: jest.fn(async ({ where }: any) => {
          // Simulate tenant isolation
          if (where.id === 'lora_1' && where.tenantId === mockTenantId) {
            return mockLoraConfig;
          }
          if (where.id === 'lora_2' && where.tenantId === mockTenantId) {
            return mockDefaultConfig;
          }
          if (where.id === 'lora_with_jobs' && where.tenantId === mockTenantId) {
            return { ...mockLoraConfig, id: 'lora_with_jobs', name: 'Config With Jobs' };
          }
          // Cross-tenant access returns null
          if (where.tenantId !== mockTenantId) {
            return null;
          }
          // Name uniqueness check
          if (where.name === 'Duplicate Name' && where.tenantId === mockTenantId) {
            return { ...mockLoraConfig, name: 'Duplicate Name' };
          }
          return null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          let results = [mockLoraConfig, mockDefaultConfig];

          // Apply filters
          if (where?.isDefault !== undefined) {
            results = results.filter((c) => c.isDefault === where.isDefault);
          }
          if (where?.modelName) {
            results = results.filter((c) => c.modelName === where.modelName);
          }

          return results;
        }),
        count: jest.fn(async ({ where }: any) => {
          let count = 2;

          // Apply filters to count
          if (where?.isDefault !== undefined) {
            count = where.isDefault ? 1 : 1;
          }
          if (where?.modelName) {
            count = where.modelName === 'sd15' ? 2 : 0;
          }

          return count;
        }),
        update: jest.fn(async ({ where, data }: any) => ({
          ...mockLoraConfig,
          id: where.id,
          ...data,
          updatedAt: new Date(),
        })),
        updateMany: jest.fn(async () => ({ count: 1 })),
        delete: jest.fn(async ({ where }: any) => ({
          ...mockLoraConfig,
          id: where.id,
        })),
      } as any,
      job: {
        count: jest.fn(async ({ where }: any) => {
          // Simulate active jobs check
          if (where?.meta?.path?.[0] === 'loraConfigId' && where?.meta?.equals === 'lora_with_jobs') {
            return 2; // Has active jobs
          }
          return 0; // No active jobs
        }),
      } as any,
      $transaction: jest.fn(async (callback: any) => {
        // Simulate transaction by calling the callback with mocked tx
        const tx = {
          loraConfig: prismaMock.loraConfig,
        };
        return callback(tx);
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /lora-configs', () => {
    it('should create a LoRA config with valid parameters', async () => {
      const res = await request(app.getHttpServer())
        .post('/lora-configs')
        .set(getAuthHeader())
        .send({
          name: 'New Config',
          modelName: 'sdxl',
          epochs: 20,
          learningRate: 0.0002,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        name: 'New Config',
        modelName: 'sdxl',
        epochs: 20,
        learningRate: 0.0002,
      });
      expect(prismaMock.loraConfig.create).toHaveBeenCalled();
    });

    it('should apply default values for optional parameters', async () => {
      const res = await request(app.getHttpServer())
        .post('/lora-configs')
        .set(getAuthHeader())
        .send({
          name: 'Minimal Config',
          modelName: 'sd15',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        epochs: 10,
        learningRate: 0.0001,
        batchSize: 1,
        resolution: 512,
        networkDim: 32,
        networkAlpha: 16,
        isDefault: false,
      });
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/lora-configs')
        .set(getAuthHeader())
        .send({
          name: 'Invalid Config',
          // Missing modelName
        })
        .expect(400);

      expect(res.body).toMatchObject({
        message: 'Validation failed',
        errors: expect.any(Object),
      });
    });

    it('should return 400 for invalid parameter values', async () => {
      const res = await request(app.getHttpServer())
        .post('/lora-configs')
        .set(getAuthHeader())
        .send({
          name: 'Invalid Config',
          modelName: 'sd15',
          epochs: 5000, // Exceeds max of 1000
        })
        .expect(400);

      expect(res.body.message).toBe('Validation failed');
    });

    it('should return 409 for duplicate name', async () => {
      const res = await request(app.getHttpServer())
        .post('/lora-configs')
        .set(getAuthHeader())
        .send({
          name: 'Duplicate Name',
          modelName: 'sd15',
        })
        .expect(409);

      expect(res.body.message).toContain('already exists');
    });
  });

  describe('GET /lora-configs', () => {
    it('should list all configs with pagination metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/lora-configs')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
        take: expect.any(Number),
        skip: expect.any(Number),
      });
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by isDefault flag', async () => {
      const res = await request(app.getHttpServer())
        .get('/lora-configs?isDefault=true')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ isDefault: true }),
        ])
      );
      expect(prismaMock.loraConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isDefault: true }),
        })
      );
    });

    it('should filter by modelName', async () => {
      const res = await request(app.getHttpServer())
        .get('/lora-configs?modelName=sd15')
        .set(getAuthHeader())
        .expect(200);

      expect(prismaMock.loraConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ modelName: 'sd15' }),
        })
      );
    });

    it('should support custom pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/lora-configs?take=10&skip=5')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body.take).toBe(10);
      expect(res.body.skip).toBe(5);
      expect(prismaMock.loraConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        })
      );
    });

    it('should support sorting', async () => {
      const res = await request(app.getHttpServer())
        .get('/lora-configs?sortBy=name&sortOrder=asc')
        .set(getAuthHeader())
        .expect(200);

      expect(prismaMock.loraConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });

    it('should set pagination headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/lora-configs')
        .set(getAuthHeader())
        .expect(200);

      expect(res.headers['x-total-count']).toBeDefined();
      expect(res.headers['x-take']).toBeDefined();
      expect(res.headers['x-skip']).toBeDefined();
    });
  });

  describe('GET /lora-configs/:id', () => {
    it('should return config by ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/lora-configs/lora_1')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toMatchObject({
        id: 'lora_1',
        name: 'Test Config',
        modelName: 'sd15',
      });
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/lora-configs/nonexistent')
        .set(getAuthHeader())
        .expect(404);

      expect(res.body.message).toContain('not found');
    });

    it('should return 404 for cross-tenant access (not 403)', async () => {
      // Modify mock to simulate different tenant
      prismaMock.loraConfig.findFirst.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .get('/lora-configs/lora_other_tenant')
        .set(getAuthHeader())
        .expect(404);

      expect(res.body.message).toContain('not found');
    });
  });

  describe('PATCH /lora-configs/:id', () => {
    it('should update config with valid changes', async () => {
      const res = await request(app.getHttpServer())
        .patch('/lora-configs/lora_1')
        .set(getAuthHeader())
        .send({
          epochs: 30,
          learningRate: 0.0003,
        })
        .expect(200);

      expect(res.body).toMatchObject({
        id: 'lora_1',
        epochs: 30,
        learningRate: 0.0003,
      });
      expect(prismaMock.loraConfig.update).toHaveBeenCalledWith({
        where: { id: 'lora_1' },
        data: expect.objectContaining({
          epochs: 30,
          learningRate: 0.0003,
        }),
      });
    });

    it('should allow partial updates', async () => {
      const res = await request(app.getHttpServer())
        .patch('/lora-configs/lora_1')
        .set(getAuthHeader())
        .send({
          description: 'Updated description',
        })
        .expect(200);

      expect(res.body.description).toBe('Updated description');
    });

    it('should return 400 for invalid parameter values', async () => {
      const res = await request(app.getHttpServer())
        .patch('/lora-configs/lora_1')
        .set(getAuthHeader())
        .send({
          epochs: -5, // Invalid negative value
        })
        .expect(400);

      expect(res.body.message).toBe('Validation failed');
    });

    it('should return 404 for non-existent config', async () => {
      prismaMock.loraConfig.findFirst.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .patch('/lora-configs/nonexistent')
        .set(getAuthHeader())
        .send({
          epochs: 20,
        })
        .expect(404);

      expect(res.body.message).toContain('not found');
    });
  });

  describe('DELETE /lora-configs/:id', () => {
    it('should delete unused config successfully', async () => {
      const res = await request(app.getHttpServer())
        .delete('/lora-configs/lora_1')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
      });
      expect(prismaMock.loraConfig.delete).toHaveBeenCalledWith({
        where: { id: 'lora_1' },
      });
    });

    it('should return warning when deleting default config', async () => {
      const res = await request(app.getHttpServer())
        .delete('/lora-configs/lora_2')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        warnings: expect.arrayContaining([
          expect.stringContaining('default'),
        ]),
      });
    });

    it('should return 400 when active jobs exist', async () => {
      const res = await request(app.getHttpServer())
        .delete('/lora-configs/lora_with_jobs')
        .set(getAuthHeader())
        .expect(400);

      expect(res.body.message).toContain('active job');
      expect(prismaMock.loraConfig.delete).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent config', async () => {
      prismaMock.loraConfig.findFirst.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .delete('/lora-configs/nonexistent')
        .set(getAuthHeader())
        .expect(404);

      expect(res.body.message).toContain('not found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication header', async () => {
      await request(app.getHttpServer())
        .get('/lora-configs')
        .expect(401);

      // Auth middleware should block unauthorized requests
      // The specific error message format can vary, so we just check the status code
    });

    it('should isolate configs by tenant', async () => {
      // All queries should include tenantId from auth context
      await request(app.getHttpServer())
        .get('/lora-configs')
        .set(getAuthHeader())
        .expect(200);

      expect(prismaMock.loraConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: expect.any(String),
          }),
        })
      );
    });
  });
});
