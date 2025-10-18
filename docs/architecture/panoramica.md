# Architettura del Sistema InfluencerAI

**Versione**: 1.0
**Data ultimo aggiornamento**: 2025-10-18
**Stato**: Documento vivente

---

## Sommario Esecutivo

InfluencerAI è un sistema monorepo TypeScript per la generazione automatizzata di contenuti (testo, immagini, video) per influencer virtuali. L'architettura è progettata per essere:

- **Locale-first**: Tutto il processing AI avviene on-premise (tranne text generation)
- **Cost-effective**: Unico costo esterno è OpenRouter API per text generation
- **Scalabile**: Basato su job queue con worker asincroni
- **Multi-tenant**: Supporto nativo per multiple organizzazioni

**Costo operativo mensile stimato**: €50-150 (solo OpenRouter, resto locale)

---

## Diagramma Architettura Sistema

```mermaid
graph TB
    subgraph "Frontend Layer"
        Web[Next.js Web App<br/>Port 3000<br/>App Router + Tailwind]
    end

    subgraph "API Layer"
        API[NestJS API<br/>Port 3001<br/>Fastify + Prisma + Zod]
    end

    subgraph "Storage Layer"
        DB[(PostgreSQL<br/>Port 5432<br/>Application Data)]
        Redis[(Redis<br/>Port 6379<br/>Job Queues + Cache)]
        S3[MinIO S3<br/>Port 9000/9001<br/>Assets Storage]
    end

    subgraph "Worker Layer"
        Worker1[Worker Service<br/>BullMQ Consumer<br/>Content Generation]
        Worker2[Worker Service<br/>BullMQ Consumer<br/>LoRA Training]
        Worker3[Worker Service<br/>BullMQ Consumer<br/>Video Generation]
    end

    subgraph "AI Services (Local)"
        ComfyUI[ComfyUI<br/>Image/Video Generation<br/>AnimateDiff + SVD]
        Kohya[kohya_ss CLI<br/>LoRA Training<br/>Stable Diffusion]
        FFmpeg[FFmpeg<br/>Post-processing<br/>Aspect Ratio + Subs]
    end

    subgraph "External Services"
        OpenRouter[OpenRouter API<br/>LLM Text Generation<br/>GPT-4, Claude, etc.]
    end

    subgraph "Orchestration"
        n8n[n8n Workflows<br/>Port 5678<br/>Automation Engine]
    end

    User[Utente/Frontend] --> Web
    Web --> API
    API --> DB
    API --> Redis
    API --> S3

    Redis --> Worker1
    Redis --> Worker2
    Redis --> Worker3

    Worker1 --> ComfyUI
    Worker1 --> S3
    Worker1 --> OpenRouter

    Worker2 --> Kohya
    Worker2 --> S3

    Worker3 --> ComfyUI
    Worker3 --> FFmpeg
    Worker3 --> S3

    n8n --> API
    n8n --> Worker1
    n8n -.webhook.-> ComfyUI

    API -.cost tracking.-> DB
    Worker1 -.results.-> DB
    Worker2 -.results.-> DB
    Worker3 -.results.-> DB

    style OpenRouter fill:#ff9999
    style ComfyUI fill:#99ff99
    style Kohya fill:#99ff99
    style FFmpeg fill:#99ff99
```

**Leggenda colori**:
- 🔴 Rosso = Servizio esterno a pagamento
- 🟢 Verde = Servizio locale (nessun costo recurring)

---

## Componenti Principali

### 1. Frontend Layer - Next.js Web App

**Responsabilità**:
- Dashboard per gestione tenant e influencer
- Interfaccia per upload dataset e configurazione LoRA
- Monitoring job e visualizzazione contenuti generati
- Gestione content plan e scheduling

**Stack Tecnico**:
- **Framework**: Next.js 14 con App Router
- **Styling**: Tailwind CSS + shadcn/ui component library
- **State Management**: TanStack Query (React Query) per data fetching
- **Form Handling**: React Hook Form + Zod validation
- **Charts**: Recharts per analytics

**Porte e Endpoint**:
- Porta: `3000`
- URL sviluppo: `http://localhost:3000`

**Percorso codebase**: `apps/web/`

---

### 2. API Layer - NestJS Backend

**Responsabilità**:
- Esposizione REST API per tutti i domini (auth, datasets, jobs, influencers, content-plans)
- Validazione richieste con Zod schemas
- Autenticazione e multi-tenancy
- Creazione job asincroni in BullMQ
- Tracking costi OpenRouter

**Stack Tecnico**:
- **Framework**: NestJS 10 con Fastify adapter (30% più veloce di Express)
- **ORM**: Prisma Client con PostgreSQL
- **Validation**: Zod schemas condivisi (`packages/core-schemas`)
- **Job Queue**: BullMQ producer
- **Documentation**: Swagger/OpenAPI auto-generato

**Pattern Architetturali**:
- **Controller Pattern**: Thin controllers (solo validazione e response)
- **Service Pattern**: Business logic isolata nei service layer
- **Repository Pattern**: Prisma service per data access
- **DTO Pattern**: Zod schemas per input/output validation

**Porte e Endpoint**:
- Porta: `3001`
- API base: `http://localhost:3001/api`
- Swagger UI: `http://localhost:3001/api/docs`

**Percorso codebase**: `apps/api/`

**Esempio Endpoint**:
```typescript
// GET /api/datasets?take=20&skip=0&sortBy=createdAt&sortOrder=desc
// Response:
{
  "data": [...],
  "total": 150,
  "take": 20,
  "skip": 0
}
// Header: x-total-count: 150
```

---

### 3. Worker Layer - BullMQ Consumers

**Responsabilità**:
- Consumo job dalle code Redis
- Esecuzione operazioni asincrone (LoRA training, content generation, video rendering)
- Retry automatico con exponential backoff
- Tracking progresso e risultati

**Stack Tecnico**:
- **Queue Library**: BullMQ consumer
- **Job Types**:
  - `content-generation`: Genera testo (OpenRouter) + immagine (ComfyUI)
  - `video-generation`: Genera video da immagini (ComfyUI AnimateDiff/SVD)
  - `lora-training`: Training LoRA con kohya_ss CLI
  - `autopost`: Pubblicazione social media

**Configurazione Code**:
```typescript
{
  'content-generation': {
    concurrency: 3,        // Max 3 job paralleli
    priority: 1,           // Alta priorità
    attempts: 3,           // Retry fino a 3 volte
    backoff: {
      type: 'exponential',
      delay: 5000          // 5s, 25s, 125s
    }
  },
  'lora-training': {
    concurrency: 1,        // Solo 1 training alla volta (GPU bound)
    priority: 2,
    attempts: 2
  }
}
```

**Percorso codebase**: `apps/worker/`

---

### 4. Storage Layer

#### PostgreSQL - Application Database

**Responsabilità**:
- Persistenza dati applicativi (tenant, influencer, dataset, job, asset)
- Tracking multi-tenancy
- Audit trail con timestamp

**Schema Principale**:
```prisma
model Tenant {
  id          String      @id @default(cuid())
  name        String
  influencers Influencer[]
  datasets    Dataset[]
  jobs        Job[]
  createdAt   DateTime    @default(now())
}

model Influencer {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  persona     Json     // Prompt, tone, style
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
}

model Dataset {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  path        String   // Percorso locale data/datasets/
  imageCount  Int
  status      String   // draft | ready | training
}

model Job {
  id          String   @id @default(cuid())
  tenantId    String
  type        String   // content-generation | video-generation | lora-training
  status      String   // pending | processing | completed | failed
  payload     Json     // Input parameters
  result      Json?    // Output results
  cost        Float?   // Costo OpenRouter in USD
  error       String?
  createdAt   DateTime @default(now())
  completedAt DateTime?
}

model Asset {
  id          String   @id @default(cuid())
  tenantId    String
  jobId       String?
  type        String   // image | video
  s3Key       String   // Chiave MinIO
  metadata    Json     // Dimensioni, durata, formato
}
```

**Porte**: `5432`
**Connection String**: `postgresql://postgres:postgres@localhost:5432/influencerai`

---

#### Redis - Job Queue & Cache

**Responsabilità**:
- Code BullMQ per job asincroni
- Cache per risultati LLM (evitare duplicati costosi)
- Session storage

**Porte**: `6379`
**Connection String**: `redis://localhost:6379`

---

#### MinIO - Object Storage (S3-compatible)

**Responsabilità**:
- Storage immagini generate (PNG, JPEG)
- Storage video generati (MP4)
- Storage LoRA model (.safetensors)
- Storage dataset (immagini training)

**Bucket Structure**:
```
s3://assets/
├── datasets/
│   └── <tenantId>/
│       └── <datasetName>/
│           ├── image001.jpg
│           └── image001.txt  (caption)
├── loras/
│   └── <tenantId>/
│       └── <loraName>.safetensors
├── images/
│   └── <tenantId>/
│       └── <jobId>/
│           └── output.png
└── videos/
    └── <tenantId>/
        └── <jobId>/
            └── output.mp4
```

**Porte**:
- API: `9000`
- Console UI: `9001`

**Credenziali**:
- Access Key: `minio`
- Secret Key: `minio12345`

---

### 5. AI Services (Local)

#### ComfyUI - Image & Video Generation

**Responsabilità**:
- Generazione immagini con Stable Diffusion + LoRA personalizzati
- Generazione video con AnimateDiff o Stable Video Diffusion (SVD)
- Workflow customizzabili via JSON

**Workflow Principali**:
1. **Text-to-Image**: Prompt → SD 1.5/SDXL + LoRA → PNG
2. **Image-to-Video**: Immagine + motion prompt → AnimateDiff → MP4
3. **ControlNet**: Immagine reference + pose → Nuova immagine con posa

**Performance**:
- RTX 3060 12GB: ~30s per immagine 512x768
- RTX 4090 24GB: ~10s per immagine 1024x1536
- Video 16 frame @ 512x768: ~2-5 minuti

**API**:
- HTTP API per submit workflow
- Webhook callback per completamento

---

#### kohya_ss CLI - LoRA Training

**Responsabilità**:
- Training LoRA model da dataset custom
- Fine-tuning Stable Diffusion per aspetto specifico influencer

**Configurazione Training**:
```bash
# Esempio comando
accelerate launch --num_cpu_threads_per_process=8 train_network.py \
  --pretrained_model_name_or_path="stabilityai/stable-diffusion-xl-base-1.0" \
  --dataset_config="dataset_config.toml" \
  --output_dir="data/loras/my-influencer" \
  --network_module="networks.lora" \
  --network_dim=32 \
  --network_alpha=16 \
  --learning_rate=1e-4 \
  --max_train_steps=3000
```

**Tempi Training**:
- 50 immagini, 3000 steps: ~2-4 ore (RTX 3060)
- 200 immagini, 5000 steps: ~6-8 ore (RTX 3060)

---

#### FFmpeg - Post-processing

**Responsabilità**:
- Ritaglio video per aspect ratio social (9:16, 1:1, 16:9)
- Aggiunta sottotitoli bruciati
- Normalizzazione audio
- Compressione per target social (Instagram, TikTok, YouTube Shorts)

**Esempio Pipeline**:
```bash
# Instagram Reel: 9:16, 1080x1920, max 60s
ffmpeg -i input.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles=subs.srt" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k \
  -t 60 \
  output_instagram.mp4
```

---

### 6. External Services

#### OpenRouter API - LLM Text Generation

**Responsabilità**:
- Generazione content plan (topic, caption, hook)
- Generazione prompt ottimizzati per Stable Diffusion
- Conversational AI per chat influencer

**Modelli Utilizzati**:
- `openai/gpt-4-turbo`: Content planning strategico
- `anthropic/claude-3-5-sonnet`: Prompt engineering, caption creative
- `meta-llama/llama-3.1-70b-instruct`: Alternative economica

**Cost Management**:
```typescript
// Esempio tracking costo
{
  model: 'openai/gpt-4-turbo',
  inputTokens: 1500,
  outputTokens: 800,
  inputCost: 0.015,   // $0.01/1k tokens
  outputCost: 0.024,  // $0.03/1k tokens
  totalCost: 0.039    // Salvato in Job.cost
}
```

**Budget Controls**:
- Limite mensile per tenant configurabile
- Alert quando 80% budget raggiunto
- Cache aggressive per prompt ripetuti

**UNICO COSTO ESTERNO**: Stima €50-150/mese per tenant attivo

---

### 7. Orchestration Layer - n8n

**Responsabilità**:
- Automazione workflow multi-step
- Scheduling post social
- Monitoring e alerting
- Integrazione webhook esterni

**Workflow Chiave**:

1. **Content Generation Pipeline**:
```
Trigger (Cron/Manual)
  → Generate Content Plan (OpenRouter)
  → Create Job (API)
  → Wait for Image (ComfyUI webhook)
  → Generate Video (Create Video Job)
  → Wait for Video (Worker webhook)
  → Upload to Social (Instagram/TikTok API)
```

2. **LoRA Training Pipeline**:
```
Upload Dataset (API)
  → Auto-caption Images (BLIP/CLIP - optional)
  → Create Training Job (API)
  → Execute Training (Worker → kohya_ss)
  → Test LoRA (Generate sample images)
  → Notify User (Email/Webhook)
```

3. **Daily Content Schedule**:
```
Cron 9:00 AM
  → Fetch Content Plan for Today
  → Generate Content for Each Influencer (3-5 post)
  → Queue Autopost Jobs (staggered timing)
```

**Porte**: `5678`
**UI**: `http://localhost:5678`
**Percorso codebase**: `apps/n8n/workflows/`

---

## Scelte Tecnologiche e Motivazioni

### Perché NestJS?

✅ **Pro**:
- TypeScript-first con dependency injection nativa
- Architettura modulare scalabile
- Fastify adapter per performance (30% più veloce di Express)
- Swagger auto-generation out-of-the-box
- Testing utilities integrate

❌ **Alternative considerate**:
- Express: Troppo minimale, servirebbero troppi plugin
- Fastify puro: Manca struttura enterprise
- tRPC: Non necessario, preferiamo REST standard

### Perché Prisma?

✅ **Pro**:
- Type-safety completa end-to-end
- Migration system robusto e versionato
- Prisma Client auto-generato (no query builder manuale)
- Supporto nativo multi-tenancy
- Query parallele semplici (`Promise.all([findMany(), count()])`)

❌ **Alternative considerate**:
- TypeORM: Query builder verboso, meno type-safe
- Drizzle: Più performante ma meno mature
- Raw SQL: Nessun type-safety, manutenzione difficile

### Perché BullMQ?

✅ **Pro**:
- Redis-based (single dependency per queue + cache)
- Retry automatico con exponential backoff
- Job prioritization e concurrency control
- Built-in monitoring con Bull Board UI
- Performance eccellente (10k+ job/sec)

❌ **Alternative considerate**:
- RabbitMQ: Overkill per use case
- AWS SQS: Vogliamo soluzione locale
- Kafka: Troppo complesso per volume attuale

### Perché ComfyUI (invece di Automatic1111)?

✅ **Pro**:
- Workflow JSON-based (automazione via API)
- Nodi riutilizzabili e componibili
- Supporto naturo AnimateDiff e SVD per video
- Performance migliori con batch processing
- Community attiva con custom nodes

❌ **Alternative considerate**:
- Automatic1111 WebUI: Difficile automazione, UI-first
- InvokeAI: Buona API ma meno flessibile
- API proprietarie (Leonardo, Midjourney): Costo recurring alto

### Perché OpenRouter (invece di API dirette)?

✅ **Pro**:
- Single API per 200+ modelli (GPT-4, Claude, Llama, etc.)
- Fallback automatico se un modello è down
- Cost tracking unificato
- Rate limit handling automatico
- Nessun vendor lock-in

❌ **Alternative considerate**:
- OpenAI diretto: Vendor lock-in, nessun fallback
- Anthropic diretto: Stesso problema
- LLM locale (Ollama): Troppo lento per production

---

## Flusso Dati Tipico

### Caso d'uso: Generazione Contenuto Completo

```
1. Utente crea Content Plan (Web UI)
   ↓
2. API riceve richiesta, valida con Zod
   ↓
3. API chiama OpenRouter per generare:
   - Topic ideas
   - Captions ottimizzate
   - Stable Diffusion prompts
   ↓
4. API salva ContentPlan in PostgreSQL
   ↓
5. API crea Job "content-generation" in Redis/BullMQ
   ↓
6. Worker consuma job da Redis
   ↓
7. Worker invia workflow a ComfyUI:
   - Prompt: "beautiful sunset on beach, golden hour, <lora:my-influencer:0.8>"
   - Steps: 30, CFG: 7, Size: 1024x1536
   ↓
8. ComfyUI genera immagine (~15-30s)
   ↓
9. Worker riceve immagine, upload a MinIO
   ↓
10. Worker crea Asset record in PostgreSQL
    ↓
11. Worker aggiorna Job status = "completed" con result = { assetId, s3Key }
    ↓
12. (Opzionale) n8n riceve webhook completion
    ↓
13. n8n crea Job "video-generation" se richiesto
    ↓
14. Video Worker consuma job, invia a ComfyUI AnimateDiff
    ↓
15. ComfyUI genera video 16 frame (~3-5 min)
    ↓
16. Video Worker riceve video, post-processing con FFmpeg:
    - Crop 9:16 per Instagram
    - Add subtitles
    - Normalize audio
    ↓
17. Video Worker upload a MinIO, crea Asset
    ↓
18. (Opzionale) n8n autopost a Instagram/TikTok via API
    ↓
19. Web UI mostra preview video con link download
```

**Tempo totale**: ~5-10 minuti (immagine + video + post-processing)

---

## Sicurezza e Compliance

### Multi-Tenancy

- **Isolation Level**: Database-level con `tenantId` foreign key su ogni tabella
- **Enforcement**: Middleware NestJS verifica tenantId da JWT token
- **Pattern Difensivo**: Ritorna 404 invece di 403 per cross-tenant access (OWASP best practice)

```typescript
// Esempio enforcement
async getById(id: string): Promise<Dataset> {
  const ctx = getRequestContext();
  const tenantId = ctx.tenantId; // Da JWT

  const dataset = await prisma.dataset.findUnique({ where: { id } });
  if (!dataset) throw new NotFoundException();

  // Ritorna 404 anche se esiste ma tenantId diverso
  // (evita information disclosure)
  if (dataset.tenantId !== tenantId) {
    throw new NotFoundException();
  }

  return dataset;
}
```

### Authentication

- **Metodo**: Bearer Token (JWT)
- **Payload**: `{ userId, tenantId, role, exp }`
- **Rotation**: Token refresh ogni 7 giorni
- **Storage**: HttpOnly cookie per web, localStorage per mobile

### Secrets Management

- **Environment Variables**: `.env` file (gitignored)
- **Rotation**: Chiavi MinIO/Redis rotate ogni 90 giorni
- **API Keys**: OpenRouter key in env var, mai in codebase

---

## Scalabilità e Performance

### Bottleneck Attuali

1. **GPU**: ComfyUI single GPU (può gestire 3-5 job paralleli)
   - **Soluzione**: GPU queue con priorità, scale orizzontale con multi-GPU
2. **LoRA Training**: Bloccante, solo 1 training alla volta
   - **Soluzione**: Pianificare training notturni off-peak
3. **Storage**: MinIO single node
   - **Soluzione**: MinIO distributed mode per HA

### Target Performance

| Metrica | Valore Corrente | Target 6 Mesi |
|---------|----------------|---------------|
| Job/ora (content-gen) | 20-30 | 100+ |
| Concurrent users | 10-20 | 100+ |
| Dataset max size | 500 immagini | 5000 immagini |
| LoRA training time | 2-4 ore (50 img) | <1 ora |
| Video generation time | 3-5 min (16 frame) | <1 min |
| API response time p95 | <200ms | <100ms |

### Strategia Scaling

1. **Fase 1** (attuale): Single server, single GPU
2. **Fase 2** (Q2 2025): Multi-worker, Redis cluster
3. **Fase 3** (Q3 2025): Multi-GPU, MinIO distributed
4. **Fase 4** (Q4 2025): Kubernetes, auto-scaling worker

---

## Monitoring e Observability

### Health Checks

```bash
# API health
curl http://localhost:3001/health
# Response: { "status": "ok", "database": "connected", "redis": "connected" }

# Worker health
curl http://localhost:3002/health
# Response: { "status": "ok", "queues": { "content-generation": "active" } }
```

### Metriche Chiave

- **Job Queue Length**: Monitorare per evitare backlog
- **Job Success Rate**: Target >95%
- **OpenRouter Cost**: Alert se >€150/mese
- **GPU Utilization**: Target 60-80% (evitare saturazione)
- **Storage Usage**: Alert se >80% capacità

### Logging

- **Formato**: JSON structured logs
- **Livelli**: ERROR, WARN, INFO, DEBUG
- **Retention**: 30 giorni PostgreSQL, 7 giorni file system

---

## Deployment

### Ambiente Sviluppo

```bash
# Avvio completo stack
docker compose -f infra/docker-compose.yml up -d
pnpm dev
```

**Servizi**:
- PostgreSQL, Redis, MinIO containerizzati
- API, Web, Worker in esecuzione locale (hot reload)

### Ambiente Produzione

**TODO**: Documentare deployment Kubernetes/Docker Swarm

---

## Prossimi Passi Architetturali

### Q1 2025 (Attuale)

- ✅ Database schema completo
- ✅ API CRUD endpoints principali
- ✅ Job queue system funzionante
- 🔄 ComfyUI integration (in corso)
- 🔄 LoRA training pipeline (in corso)

### Q2 2025

- [ ] Video generation completamente automatizzata
- [ ] Autopost social media (Instagram, TikTok, YouTube Shorts)
- [ ] Analytics dashboard avanzato
- [ ] A/B testing content variations

### Q3 2025

- [ ] Multi-GPU support per scaling
- [ ] Real-time collaboration (multiple user editing)
- [ ] AI voice cloning per video narration
- [ ] Content calendar intelligente con ML

---

## Riferimenti

- **Documentazione completa**: [/docs/README.md](../README.md)
- **Guida setup**: [/docs/getting-started/avvio-rapido.md](../getting-started/avvio-rapido.md)
- **API best practices**: [/CLAUDE.md](/CLAUDE.md)
- **n8n workflows**: [/apps/n8n/README.md](../../apps/n8n/README.md)

---

**Manutenzione**: Questo documento deve essere aggiornato ad ogni cambio architetturale significativo.
**Owner**: Team Architecture
**Review Cycle**: Mensile
