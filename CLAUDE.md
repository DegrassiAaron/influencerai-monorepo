# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
