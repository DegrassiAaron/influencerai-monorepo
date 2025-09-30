# InfluencerAI

Sistema locale per generazione contenuti (testo, immagini, video) per influencer virtuali.  
Infrastruttura basata su **TypeScript** end-to-end, orchestrazione con **n8n**, addestramento **LoRA** e generazione **video locale** con **ComfyUI**.  
Unico costo previsto: **API OpenRouter** per generazione testi.

---

## Executive Summary

- Monorepo TS (Next.js dashboard, NestJS API, worker BullMQ) + n8n locale.
- Postgres + Redis + MinIO locali via Docker.
- LoRA training con `kohya_ss` (CLI) + ComfyUI per pipeline img/video + FFmpeg.
- OpenRouter solo per testo (caption/script/hashtag/brief) con cap costi e stima token.
- Autopost gestito via connettori n8n con tunnel (cloudflared) per webhooks dal locale.

---

## Stack

- **Frontend**: Next.js (App Router), Tailwind, shadcn/ui, TanStack Query.  
- **Backend**: NestJS (Fastify) + Prisma su Postgres, Zod per DTO, BullMQ su Redis.  
- **Storage**: MinIO (S3-compat) locale; cartelle “hot” su SSD per dataset/LoRA.  
- **Orchestrazione**: n8n locale (Docker) → chiama API interne, lancia job (HTTP/queues), riceve webhooks.  
- **AI**: OpenRouter (testo); immagini da Leonardo (manuale), video/immagini locali con ComfyUI; kohya_ss per addestrare LoRA.

---

## Struttura repository

```
influencerai/
  apps/
    web/            # Next.js dashboard
    api/            # NestJS: auth, tenants, influencers, datasets, jobs
    worker/         # BullMQ consumers
    n8n/            # workflow JSON/YAML e env
  packages/
    core-schemas/   # zod: JobSpec, ContentPlan, DatasetSpec, LoRAConfig
    sdk/            # client fetcher, hooks, api-typing
    prompts/        # template LLM
  data/
    datasets/       # immagini per LoRA (+captions)
    loras/          # output .safetensors
    outputs/        # immagini/video generati
  infra/
    docker-compose.yml
    cloudflared/    # opzionale tunnel webhooks
  .env
```

---

## Docker Compose

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
      POSTGRES_DB: influencerai
    volumes: [pg:/var/lib/postgresql/data]
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio12345
    volumes: [minio:/data]
    ports: ["9000:9000", "9001:9001"]

  n8n:
    image: n8nio/n8n:latest
    environment:
      - N8N_HOST=localhost
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - N8N_SECURE_COOKIE=false
    ports: ["5678:5678"]
    volumes:
      - ./apps/n8n:/home/node/.n8n

  api:
    build: ./apps/api
    env_file: [.env]
    depends_on: [postgres, redis, minio]
    ports: ["3001:3001"]

  worker:
    build: ./apps/worker
    env_file: [.env]
    depends_on: [redis, api]

  web:
    build: ./apps/web
    env_file: [.env]
    depends_on: [api]
    ports: ["3000:3000"]

volumes:
  pg:
  minio:
```

---

## Variabili ambiente (.env)


```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/influencerai
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_KEY=minio
S3_SECRET=minio12345
S3_BUCKET=assets
OPENROUTER_API_KEY=...
```

---

## Schema dati (Prisma – estratto)

```prisma
model Tenant {
  id        String  @id @default(cuid())
  name      String
  influencers Influencer[]
  createdAt DateTime @default(now())
}

model Influencer {
  id        String @id @default(cuid())
  tenantId  String
  name      String
  persona   Json
  datasetId String?
  Tenant    Tenant  @relation(fields: [tenantId], references: [id])
}

model Dataset {
  id        String @id @default(cuid())
  tenantId  String
  kind      String
  path      String
  meta      Json
  status    String
  createdAt DateTime @default(now())
}

model Job {
  id        String  @id @default(cuid())
  type      String
  status    String
  payload   Json
  result    Json?
  costTok   Int?
  startedAt DateTime?
  finishedAt DateTime?
}

model Asset {
  id       String @id @default(cuid())
  jobId    String
  type     String
  url      String
  meta     Json
  Job      Job    @relation(fields: [jobId], references: [id])
}
```

---

## Workflow n8n

- **/plan/generate** → crea ContentPlan con OpenRouter.  
- **/lora/train** → job di training LoRA con kohya_ss.  
- **/content/run** → sequenza caption → img (Leonardo o ComfyUI) → video (ComfyUI) → autopost.  
- **/publish** → invia verso API social.  
- **/webhook/comfyui** → riceve completamento render.

Tunnel consigliato: **cloudflared** per esporre webhook esterni.

---

## Pipeline LoRA

1. Dataset in `data/datasets/<nome>` con immagini + caption.  
2. Auto-caption (BLIP/CLIP) opzionale.  
3. Training con kohya_ss.  
4. Output in `data/loras/NAME`.  
5. Uso in ComfyUI per generazione coerente.

---

## Pipeline video

- ComfyUI con graph AnimateDiff/SVD.  
- FFmpeg per aspect ratio, sottotitoli, loudness.  
- n8n per orchestrazione batch.

---

## Autopost

- Instagram/Facebook: Graph API (account Business/Creator).  
- YouTube Shorts: API upload.  
- TikTok: limitazioni → fallback export.  
- Scheduler: cron n8n + coda autopost.

---

## Controllo costi OpenRouter

- Stima token ex-ante.  
- Cap mensile.  
- Cache risultati.

---

## Setup iniziale

```bash
pnpm dlx create-turbo@latest influencerai
cd influencerai
pnpm dlx create-next-app@latest apps/web --ts --eslint --app
pnpm dlx @nestjs/cli new apps/api
mkdir -p apps/worker packages/{core-schemas,sdk,prompts} infra data/{datasets,loras,outputs}
cd apps/api
pnpm add @nestjs/config @nestjs/swagger @nestjs/platform-fastify zod
pnpm add prisma @prisma/client
pnpm dlx prisma init
cd ../../apps/worker
pnpm init -y
pnpm add bullmq ioredis zod undici p-queue
cd ../..
docker compose up -d
pnpm -w install
```

---

## Failure modes

- GPU saturata/VRAM insufficiente → ridurre batch/resolution, code con priorità.  
- API social cambiano → astrazione con connettori n8n.  
- Qualità incoerente → versionare StylePack per influencer.  
- Costi OpenRouter → cap hard + cache.  
- I/O lento → usare SSD NVMe.

---

## MVP Sprint 0 (7 giorni)

- Giorno 1–2: scaffold monorepo.  
- Giorno 3: DB schema + Prisma + Redis + BullMQ.  
- Giorno 4: wrapper OpenRouter + ContentPlan.  
- Giorno 5: integrazione Leonardo + Asset manager.  
- Giorno 6: worker video locale con ComfyUI.  
- Giorno 7: workflow n8n end-to-end.
