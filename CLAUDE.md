# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Documentation Navigation

**Nuova documentazione organizzata disponibile!**

- **[Indice Completo Documentazione](docs/README.md)** - Punto di ingresso principale
- **[Avvio Rapido (5 min)](docs/getting-started/avvio-rapido.md)** - Setup Docker veloce
- **[Panoramica Architettura](docs/architecture/panoramica.md)** - Diagramma sistema, componenti, tech stack
- **[Flusso Dati](docs/architecture/flusso-dati.md)** - Lifecycle richieste, pattern elaborazione
- **[Deployment](docs/architecture/deployment.md)** - Docker Compose, infrastruttura
- **[Risoluzione Problemi](docs/getting-started/risoluzione-problemi.md)** - Troubleshooting comune
- **[Stato Progetto](docs/stato-progetto.md)** - Progress corrente, roadmap, metriche

**Per guide specifiche**: Consulta [docs/README.md](docs/README.md) per la mappa completa.

---

## Project Overview

InfluencerAI is a local TypeScript monorepo system for generating content (text, images, video) for virtual influencers. The architecture uses n8n orchestration, LoRA training, and local video generation with ComfyUI. The only external cost is OpenRouter API for text generation.

## Repository Structure

This is a monorepo with the following structure:

- `apps/web/` - Next.js dashboard (App Router, Tailwind, shadcn/ui, TanStack Query)
- `apps/api/` - NestJS backend (Fastify, Prisma, Zod DTOs, BullMQ)
- `apps/worker/` - BullMQ consumers for async job processing
- `apps/n8n/` - n8n workflow definitions (JSON/YAML) and environment config
- `packages/core-schemas/` - Shared Zod schemas (JobSpec, ContentPlan, DatasetSpec, LoRAConfig)
- `packages/sdk/` - Client fetcher, hooks, and API typing
- `packages/prompts/` - LLM prompt templates
- `data/datasets/` - Images for LoRA training with captions
- `data/loras/` - Output .safetensors files from LoRA training
- `data/outputs/` - Generated images and videos
- `infra/` - Docker compose and infrastructure configs

## Tech Stack

- **Frontend**: Next.js with App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend**: NestJS with Fastify adapter, Prisma ORM on PostgreSQL, Zod validation, BullMQ on Redis
- **Storage**: MinIO (S3-compatible) for object storage
- **Orchestration**: n8n for workflow automation
- **AI**: OpenRouter for text generation, ComfyUI for local image/video generation, kohya_ss CLI for LoRA training

## Development Commands

### Initial Setup

```bash
docker compose -f infra/docker-compose.yml up -d
pnpm install
cd apps/api && pnpm dlx prisma generate && pnpm dlx prisma migrate dev
```

### Running Services

```bash
# Start all Docker services (Postgres, Redis, MinIO, n8n)
docker compose -f infra/docker-compose.yml up -d

# Run the full stack (requires Docker services running)
pnpm dev

# Run individual apps
pnpm --filter web dev
pnpm --filter api dev
pnpm --filter worker dev
```

### Database Management

```bash
# Generate Prisma client
cd apps/api && pnpm dlx prisma generate

# Create and apply migrations
cd apps/api && pnpm dlx prisma migrate dev --name <migration_name>

# Reset database (careful!)
cd apps/api && pnpm dlx prisma migrate reset

# Open Prisma Studio
cd apps/api && pnpm dlx prisma studio
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific app
pnpm --filter api test
pnpm --filter web test

# Run tests in watch mode
pnpm --filter api test:watch
```

### Building

```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter api build
pnpm --filter web build
```

### Linting and Formatting

```bash
pnpm lint
pnpm format
```

## Key Architectural Patterns

### Job Queue System

All async operations (LoRA training, content generation, video rendering) are processed through BullMQ queues:

- Jobs are created via NestJS API endpoints and persisted in the `Job` table
- Worker processes consume jobs from Redis queues
- Job status, cost tracking (OpenRouter tokens), and results are stored back in Postgres

### Multi-Tenancy

The system supports multiple tenants:

- Each tenant can have multiple influencers
- Data isolation is enforced at the database level via `tenantId` foreign keys
- All API endpoints require tenant context

### n8n Workflow Integration

n8n orchestrates complex multi-step workflows:

- `/plan/generate` - Creates ContentPlan using OpenRouter
- `/lora/train` - Triggers LoRA training jobs via kohya_ss
- `/content/run` - Full pipeline: caption generation → image (Leonardo or ComfyUI) → video (ComfyUI) → autopost
- `/publish` - Posts content to social media APIs
- `/webhook/comfyui` - Receives render completion callbacks

Use cloudflared tunnel for webhook exposure to external services.

### Content Generation Pipeline

1. Generate content plan and captions via OpenRouter API
2. Generate images (Leonardo API for manual, ComfyUI for local with LoRA)
3. Generate video from images using ComfyUI (AnimateDiff/SVD)
4. Post-process with FFmpeg (aspect ratio, subtitles, loudness normalization)
5. Upload to MinIO and track as Asset records
6. Autopost to social platforms

### LoRA Training Pipeline

1. Prepare dataset in `data/datasets/<name>` with images and captions
2. Optional auto-captioning with BLIP/CLIP
3. Train with kohya_ss CLI
4. Output .safetensors to `data/loras/<name>`
5. Use in ComfyUI for consistent influencer appearance

## Environment Configuration

Required environment variables (see `.env` example):

```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/influencerai
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_KEY=minio
S3_SECRET=minio12345
S3_BUCKET=assets
OPENROUTER_API_KEY=...
```

## Important Constraints

### Cost Control

- OpenRouter is the only paid external service
- Implement token estimation before API calls
- Enforce monthly spending caps
- Cache LLM results where possible

### Local Processing

- All image/video generation runs locally via ComfyUI
- GPU/VRAM constraints: reduce batch size and resolution if saturated
- Use SSD NVMe for fast I/O on datasets and outputs
- Implement job priority queues for resource management

### Social Media Integration

- Instagram/Facebook: Use Graph API (requires Business/Creator account)
- YouTube Shorts: Use official upload API
- TikTok: Limited API access, fallback to manual export
- Schedule posts via n8n cron + autopost queue

## Database Schema Notes

Key models (Prisma):

- `Tenant` - Multi-tenant organization
- `Influencer` - Virtual influencer profile with persona (JSON)
- `Dataset` - Training data for LoRA, tracks path and metadata
- `Job` - Async job tracking with type, status, payload, result, cost
- `Asset` - Generated content (images/videos) linked to jobs

All timestamps use `DateTime` with `@default(now())` for audit trails.

## API Development Best Practices

### NestJS Controller Patterns

Follow these patterns when implementing CRUD API endpoints:

#### Thin Controllers
Controllers should ONLY handle:
- Request validation with Zod
- Response formatting
- Error handling
- Delegation to services

```typescript
@Post()
@ApiOperation({ summary: 'Create resource' })
@ApiResponse({ status: 201, description: 'Resource created' })
@ApiResponse({ status: 400, description: 'Validation error' })
async create(@Body() body: unknown) {
  const parsed = CreateResourceSchema.safeParse(body);
  if (!parsed.success) {
    const formatted = parsed.error.flatten();
    const errorMessage = Object.entries(formatted.fieldErrors)
      .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
      .join('; ') || formatted.formErrors.join('; ') || 'Validation error';
    throw new BadRequestException(errorMessage);
  }
  return this.service.create(parsed.data);
}
```

#### Fastify Response Headers
Use `@Res({ passthrough: true })` for custom headers:

```typescript
@Get()
async list(
  @Query() query: ListQuery,
  @Res({ passthrough: true }) res?: FastifyReply
) {
  const result = await this.service.list(query);
  if (res) {
    res.header('x-total-count', result.total.toString());
  }
  return result.data;  // Return data directly, not wrapped
}
```

### Zod Validation Patterns

#### Query Parameters with Coercion
```typescript
export const ListResourcesQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(20).optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});
```

#### Command Schemas with Detailed Validation
```typescript
export const CreateResourceSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Name must contain only letters, numbers, hyphens, and underscores'),
  value: z.number().int().min(1).max(1000).default(100).optional(),
});
```

### Prisma Service Patterns

#### Parallel Queries for Performance
```typescript
async list(query: ListQuery): Promise<{ data: T[]; total: number; take: number; skip: number }> {
  const ctx = getRequestContext();
  const tenantId = ctx.tenantId;
  if (!tenantId) throw new UnauthorizedException('Tenant context required');

  const where = { tenantId, ...buildFilters(query) };
  const orderBy = { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' };
  const take = query.take ?? 20;
  const skip = query.skip ?? 0;

  // Execute queries in parallel (50% faster than sequential)
  const [data, total] = await Promise.all([
    this.prisma.model.findMany({ where, orderBy, take, skip }),
    this.prisma.model.count({ where }),
  ]);

  return { data, total, take, skip };
}
```

#### Defensive Security Check
```typescript
async getById(id: string): Promise<T> {
  const ctx = getRequestContext();
  const tenantId = ctx.tenantId;
  if (!tenantId) throw new UnauthorizedException('Tenant context required');

  const resource = await this.prisma.model.findUnique({ where: { id } });
  if (!resource) throw new NotFoundException(`Resource ${id} not found`);

  // Return 404 instead of 403 to avoid information disclosure (OWASP best practice)
  if (resource.tenantId !== tenantId) {
    throw new NotFoundException(`Resource ${id} not found`);
  }

  return resource;
}
```

#### Unique Constraint Error Handling
```typescript
try {
  return await this.prisma.model.create({ data: { ...input, tenantId } });
} catch (error: any) {
  if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
    throw new ConflictException(`Resource with name "${input.name}" already exists`);
  }
  throw error;
}
```

### Prisma Schema Patterns

#### Resource Model Template
```prisma
model Resource {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  description String?

  // Resource-specific fields
  value       Int      @default(100)

  // Flexible metadata (JSONB)
  metadata    Json?    @default("{}")

  // Relations
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Indexes for performance
  @@index([tenantId])
  @@index([tenantId, name])
  @@unique([tenantId, name])  // Prevent duplicates per tenant
}
```

#### Migration Naming Convention
```bash
# Use descriptive, lowercase names with underscores and action verbs
npx prisma migrate dev --name add_resource_model
npx prisma migrate dev --name update_resource_add_value_field
npx prisma migrate dev --name remove_deprecated_resource_status

# For complex migrations requiring manual SQL editing
npx prisma migrate dev --name add_resource_model --create-only
# Edit SQL in migrations/ directory
npx prisma migrate dev
```

### OpenAPI Documentation Patterns

Use comprehensive decorators for auto-generated API documentation:

```typescript
@ApiTags('resources')  // Groups endpoints in Swagger UI
@Controller('resources')
export class ResourcesController {
  @Post()
  @ApiOperation({
    summary: 'Create resource',
    description: 'Creates a new resource with validation. Resource names must be unique per tenant.'
  })
  @ApiResponse({ status: 201, description: 'Resource successfully created' })
  @ApiResponse({ status: 400, description: 'Validation error - invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing tenant context' })
  @ApiResponse({ status: 409, description: 'Conflict - resource name already exists' })
  async create(@Body() body: unknown) { ... }
}
```

### Testing Patterns

#### E2E Test Template with Fastify
```typescript
describe('Resources (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  beforeAll(async () => {
    prismaMock = {
      onModuleInit: jest.fn(),
      resource: {
        create: jest.fn(async ({ data }) => ({ id: 'res_1', ...data, createdAt: new Date(), updatedAt: new Date() })),
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
      },
    };

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();  // CRITICAL for Fastify
  });

  afterAll(async () => { await app.close(); });

  it('should create resource with valid data', async () => {
    const res = await request(app.getHttpServer())
      .post('/resources')
      .set(getAuthHeader())
      .send({ name: 'test-resource', value: 100 })
      .expect(201);

    expect(res.body).toMatchObject({ id: expect.any(String), name: 'test-resource' });
  });

  it('should return 404 for cross-tenant access (security)', async () => {
    prismaMock.resource.findUnique.mockResolvedValue({
      id: 'res_other',
      tenantId: 't_2',  // Different tenant
    });

    await request(app.getHttpServer())
      .get('/resources/res_other')
      .set(getAuthHeader())  // tenant_1 in auth
      .expect(404);
  });
});
```

### Reference Implementation

For complete implementation examples, see:
- `apps/api/src/datasets/` - Full CRUD API with pagination, filtering, sorting
- `docs/tecnic/research-lora-config-api-best-practices.md` - Comprehensive research and patterns
- `apps/api/test/datasets.e2e-spec.ts` - E2E testing patterns with Fastify
