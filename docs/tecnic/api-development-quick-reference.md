# API Development Quick Reference

Quick reference guide for implementing REST APIs in the InfluencerAI monorepo using NestJS, Prisma, and Zod.

## For Comprehensive Details

See `docs/tecnic/research-lora-config-api-best-practices.md` for the complete research document with Context7 analysis, confidence scores, and detailed explanations.

---

## Table of Contents

1. [Setup Checklist](#setup-checklist)
2. [File Structure](#file-structure)
3. [Code Templates](#code-templates)
4. [Common Patterns](#common-patterns)
5. [Testing Examples](#testing-examples)

---

## Setup Checklist

When implementing a new API endpoint:

- [ ] Create Prisma schema with tenant isolation
- [ ] Add indexes: `@@index([tenantId])`, `@@index([tenantId, name])`, `@@unique([tenantId, name])`
- [ ] Run migration: `npx prisma migrate dev --name add_<model>_model`
- [ ] Create Zod schemas (query, command, response)
- [ ] Implement service layer with parallel queries
- [ ] Create thin controller with comprehensive OpenAPI decorators
- [ ] Write unit tests for service layer
- [ ] Write E2E tests for all endpoints
- [ ] Update CLAUDE.md if introducing new patterns
- [ ] Add API documentation to Swagger

---

## File Structure

```
apps/api/
├── src/
│   └── <resource>s/
│       ├── <resource>s.controller.ts    # Thin controller with validation
│       ├── <resource>s.service.ts       # Business logic + Prisma queries
│       ├── <resource>s.service.spec.ts  # Unit tests
│       ├── <resource>s.module.ts        # NestJS module
│       └── dto.ts                       # Zod schemas
├── test/
│   └── <resource>s.e2e-spec.ts         # E2E tests
└── prisma/
    └── schema.prisma                    # Database schema
```

---

## Code Templates

### 1. Prisma Schema

```prisma
model Resource {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  description String?

  // Resource-specific fields
  value       Int      @default(100)

  // Flexible metadata
  metadata    Json?    @default("{}")

  // Relations
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Indexes
  @@index([tenantId])
  @@index([tenantId, name])
  @@unique([tenantId, name])
}
```

### 2. Zod Schemas (dto.ts)

```typescript
import { z } from 'zod';

// Enums
export const ResourceSortBySchema = z.enum(['createdAt', 'updatedAt', 'name']);
export const SortOrderSchema = z.enum(['asc', 'desc']);

// Query Schema
export const ListResourcesQuerySchema = z.object({
  name: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(100).default(20).optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
  sortBy: ResourceSortBySchema.default('createdAt').optional(),
  sortOrder: SortOrderSchema.default('desc').optional(),
});
export type ListResourcesQuery = z.infer<typeof ListResourcesQuerySchema>;

// Create Schema
export const CreateResourceSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Name must contain only alphanumerics, hyphens, underscores'),
  value: z.number().int().min(1).max(1000).default(100).optional(),
});
export type CreateResourceDto = z.infer<typeof CreateResourceSchema>;

// Update Schema
export const UpdateResourceSchema = CreateResourceSchema.partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export type UpdateResourceDto = z.infer<typeof UpdateResourceSchema>;
```

### 3. Service Layer (resources.service.ts)

```typescript
import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../lib/request-context';
import { CreateResourceDto, UpdateResourceDto, ListResourcesQuery } from './dto';
import type { Resource, Prisma } from '@prisma/client';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateResourceDto): Promise<Resource> {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant context required');

    try {
      return await this.prisma.resource.create({
        data: { ...input, tenantId },
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new ConflictException(`Resource with name "${input.name}" already exists`);
      }
      throw error;
    }
  }

  async list(query: ListResourcesQuery): Promise<{
    data: Resource[];
    total: number;
    take: number;
    skip: number;
  }> {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant context required');

    const where: Prisma.ResourceWhereInput = { tenantId };
    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    const orderBy = { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' };
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    // Parallel queries (50% faster)
    const [data, total] = await Promise.all([
      this.prisma.resource.findMany({ where, orderBy, take, skip }),
      this.prisma.resource.count({ where }),
    ]);

    return { data, total, take, skip };
  }

  async getById(id: string): Promise<Resource> {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant context required');

    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException(`Resource ${id} not found`);

    // OWASP best practice: return 404 instead of 403 to avoid information disclosure
    if (resource.tenantId !== tenantId) {
      throw new NotFoundException(`Resource ${id} not found`);
    }

    return resource;
  }

  async update(id: string, input: UpdateResourceDto): Promise<Resource> {
    await this.getById(id);  // Verify exists and tenant owns it

    try {
      return await this.prisma.resource.update({ where: { id }, data: input });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new ConflictException(`Resource with name "${input.name}" already exists`);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);  // Verify exists and tenant owns it
    await this.prisma.resource.delete({ where: { id } });
  }
}
```

### 4. Controller Layer (resources.controller.ts)

```typescript
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { ResourcesService } from './resources.service';
import { CreateResourceSchema, UpdateResourceSchema, ListResourcesQuerySchema } from './dto';

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly svc: ResourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Create resource' })
  @ApiResponse({ status: 201, description: 'Resource created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Conflict - name exists' })
  async create(@Body() body: unknown) {
    const parsed = CreateResourceSchema.safeParse(body);
    if (!parsed.success) {
      const formatted = parsed.error.flatten();
      const errorMessage =
        Object.entries(formatted.fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
          .join('; ') ||
        formatted.formErrors.join('; ') ||
        'Validation error';
      throw new BadRequestException(errorMessage);
    }
    return this.svc.create(parsed.data);
  }

  @Get()
  @ApiOperation({ summary: 'List resources with pagination' })
  @ApiResponse({ status: 200, description: 'Resources list' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(
    @Query('name') name?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Res({ passthrough: true }) res?: FastifyReply
  ) {
    const parsed = ListResourcesQuerySchema.safeParse({
      name,
      take,
      skip,
      sortBy,
      sortOrder,
    });

    if (!parsed.success) {
      const formatted = parsed.error.flatten();
      const errorMessage =
        Object.entries(formatted.fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
          .join('; ') ||
        formatted.formErrors.join('; ') ||
        'Validation error';
      throw new BadRequestException(errorMessage);
    }

    const result = await this.svc.list(parsed.data);

    if (res) {
      res.header('x-total-count', result.total.toString());
    }

    return result.data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource by ID' })
  @ApiResponse({ status: 200, description: 'Resource found' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getById(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update resource' })
  @ApiResponse({ status: 200, description: 'Resource updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 409, description: 'Conflict - name exists' })
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateResourceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.svc.update(id, parsed.data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resource' })
  @ApiResponse({ status: 200, description: 'Resource deleted' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(@Param('id') id: string) {
    await this.svc.delete(id);
    return { message: 'Resource deleted successfully' };
  }
}
```

### 5. Module Definition (resources.module.ts)

```typescript
import { Module } from '@nestjs/common';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ResourcesController],
  providers: [ResourcesService, PrismaService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
```

---

## Common Patterns

### Zod Error Formatting

```typescript
// Detailed formatting (recommended)
const parsed = Schema.safeParse(body);
if (!parsed.success) {
  const formatted = parsed.error.flatten();
  const errorMessage =
    Object.entries(formatted.fieldErrors)
      .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
      .join('; ') ||
    formatted.formErrors.join('; ') ||
    'Validation error';
  throw new BadRequestException(errorMessage);
}

// Simple version
if (!parsed.success) {
  throw new BadRequestException(parsed.error.flatten());
}
```

### Fastify Response Headers

```typescript
@Get()
async list(
  @Query() query: ListQuery,
  @Res({ passthrough: true }) res?: FastifyReply  // CRITICAL: passthrough
) {
  const result = await this.service.list(query);

  if (res) {
    res.header('x-total-count', result.total.toString());
    res.header('x-custom-header', 'value');
  }

  return result.data;  // Return data directly
}
```

### Prisma Unique Constraint Handling

```typescript
try {
  return await this.prisma.model.create({ data });
} catch (error: any) {
  if (error.code === 'P2002') {
    const target = error.meta?.target;
    if (target?.includes('name')) {
      throw new ConflictException(`Resource with name "${data.name}" already exists`);
    }
    if (target?.includes('email')) {
      throw new ConflictException(`Resource with email "${data.email}" already exists`);
    }
  }
  throw error;  // Re-throw if not P2002
}
```

---

## Testing Examples

### Unit Test (resources.service.spec.ts)

```typescript
describe('ResourcesService', () => {
  let service: ResourcesService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      resource: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ResourcesService(prismaMock);
  });

  it('should create resource with tenant isolation', async () => {
    jest.spyOn(require('../lib/request-context'), 'getRequestContext')
      .mockReturnValue({ tenantId: 'tenant_1' });

    prismaMock.resource.create.mockResolvedValue({
      id: 'res_1',
      tenantId: 'tenant_1',
      name: 'test-resource',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({ name: 'test-resource', value: 100 });

    expect(result.id).toBe('res_1');
    expect(prismaMock.resource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant_1',
          name: 'test-resource',
        }),
      })
    );
  });

  it('should enforce unique constraint', async () => {
    prismaMock.resource.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['tenantId', 'name'] },
    });

    await expect(
      service.create({ name: 'duplicate', value: 100 })
    ).rejects.toThrow(ConflictException);
  });
});
```

### E2E Test (resources.e2e-spec.ts)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { getAuthHeader } from './utils/test-auth';

describe('Resources (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  beforeAll(async () => {
    prismaMock = {
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      enableShutdownHooks: jest.fn(),
      resource: {
        create: jest.fn(async ({ data }) => ({
          id: 'res_1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
        findUnique: jest.fn(async () => null),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();  // CRITICAL
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /resources', () => {
    it('should create resource with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/resources')
        .set(getAuthHeader())
        .send({ name: 'test-resource', value: 100 })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        name: 'test-resource',
      });
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/resources')
        .set(getAuthHeader())
        .send({ name: '', value: -1 })  // Invalid
        .expect(400);

      expect(res.body.message).toBeTruthy();
    });

    it('should return 401 when missing auth', async () => {
      await request(app.getHttpServer())
        .post('/resources')
        .send({ name: 'test' })
        .expect(401);
    });
  });

  describe('GET /resources', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should list resources with pagination', async () => {
      const mockResources = [
        { id: 'res_1', tenantId: 't_1', name: 'resource-1', value: 100, createdAt: new Date(), updatedAt: new Date() },
      ];

      prismaMock.resource.findMany.mockResolvedValue(mockResources);
      prismaMock.resource.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/resources?take=10&skip=0')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.headers['x-total-count']).toBe('1');
    });

    it('should filter by name', async () => {
      prismaMock.resource.findMany.mockResolvedValue([]);
      prismaMock.resource.count.mockResolvedValue(0);

      await request(app.getHttpServer())
        .get('/resources?name=specific')
        .set(getAuthHeader())
        .expect(200);

      expect(prismaMock.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'specific', mode: 'insensitive' },
          }),
        })
      );
    });
  });

  describe('GET /resources/:id', () => {
    it('should return resource by id', async () => {
      prismaMock.resource.findUnique.mockResolvedValue({
        id: 'res_1',
        tenantId: 't_1',
        name: 'test',
        value: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get('/resources/res_1')
        .set(getAuthHeader())
        .expect(200);

      expect(res.body.id).toBe('res_1');
    });

    it('should return 404 for non-existent resource', async () => {
      prismaMock.resource.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/resources/nonexistent')
        .set(getAuthHeader())
        .expect(404);
    });

    it('should return 404 for cross-tenant access (security)', async () => {
      prismaMock.resource.findUnique.mockResolvedValue({
        id: 'res_other',
        tenantId: 't_2',  // Different tenant
        name: 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get('/resources/res_other')
        .set(getAuthHeader())  // tenant_1 in auth
        .expect(404);

      // Should NOT reveal tenant information
      expect(res.body.message).not.toMatch(/tenant/i);
      expect(res.body.message).not.toMatch(/permission/i);
    });
  });
});
```

---

## Commands

```bash
# Create migration
npx prisma migrate dev --name add_resource_model

# Generate Prisma client
npx prisma generate

# Run unit tests
pnpm --filter api test

# Run E2E tests
pnpm --filter api test:e2e

# Run specific test file
pnpm --filter api test resources.service.spec.ts

# Start API in dev mode
pnpm --filter api dev

# Access Swagger documentation
# http://localhost:3000/api
```

---

## HTTP Status Codes Reference

| Code | Scenario | When to Use |
|------|----------|-------------|
| 200 | Success (GET, PATCH) | Retrieve or update resource |
| 201 | Created (POST) | Create new resource |
| 204 | No Content (DELETE) | Delete resource |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing or invalid auth |
| 404 | Not Found | Resource doesn't exist OR cross-tenant access |
| 409 | Conflict | Unique constraint violation |
| 500 | Internal Server Error | Unexpected error |

---

## Additional Resources

- **Comprehensive Research**: `docs/tecnic/research-lora-config-api-best-practices.md`
- **Reference Implementation**: `apps/api/src/datasets/`
- **E2E Test Examples**: `apps/api/test/datasets.e2e-spec.ts`
- **Project Guidelines**: `CLAUDE.md` (API Development Best Practices section)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-18
