# Lovable Prompts – InfluencerAI

Questa pagina contiene prompt pronti da copiare in Lovable per lavorare sul monorepo InfluencerAI.

## Prompt (Estensione repo esistente)

— Inizio prompt —

Sei incaricato di estendere il monorepo TypeScript “InfluencerAI” esistente, mantenendo struttura, stile e strumenti già in uso. Lavora INCREMENTALMENTE, senza rompere build o dev flow. Prima di cambiare, leggi con attenzione: `README.md`, `infra/docker-compose.yml`, `.env.example`, `package.json`, `turbo.json`, `apps/*`, `packages/*`, `docs/security/token-rotation.md`.

Obiettivi

- Abilitare un percorso E2E minimo: login → dashboard → creazione job “content-generation” → completamento (mock/placeholder ok) → visualizzazione asset risultati.
- Implementare client OpenRouter con stima costi token e cap, integrato nei job “content-generation”.
- Integrare MinIO per asset (upload/list/firma URL) e webhook `POST /webhook/comfyui`.
- Consolidare Zod schemas condivisi e tipizzare i payload dei job.
- Mantenere orchestrazione n8n prevista (placeholder/README in `apps/n8n`).

Vincoli

- Non rinominare cartelle né cambiare porte in `infra/docker-compose.yml`.
- Non modificare `.env`; aggiorna solo `.env.example` quando serve.
- Non introdurre servizi cloud aggiuntivi (OpenRouter testo ok).
- Mantieni stile TypeScript strict, ESLint/Prettier, Turborepo.
- Sicurezza: JWT in cookie HttpOnly, refresh rotation, `sameSite=strict` (secure in prod).

Cosa implementare (incrementale e minimale)

- packages/core-schemas
  - Aggiungi/rafforza Zod: `JobSpec`, `ContentPlan`, `DatasetSpec`, `LoRAConfig`, `AuthSchemas`.
- packages/sdk
  - `openrouterClient`: wrapper fetch con key da `OPENROUTER_API_KEY`, stima token/costi, gestione rate-limit base.
  - `minioClient`: helper S3-compat (endpoint/credenziali da env) per firma URL e listing.
  - Hook/fetcher typed per web.
- packages/prompts
  - Template LLM base per caption/script/hashtag/brief; API per renderizzare template + vars.
- apps/api (NestJS + Fastify)
  - Auth: login mock (email/password), set JWT in cookie HttpOnly; refresh rotation; logout; guard + ruoli (admin/editor/viewer).
  - CRUD minimi: Tenants/Influencers/Datasets (DTO Zod, paginazione/filtri semplici).
  - Jobs: `POST /jobs` (content-generation|lora-training|video-generation) + `GET /jobs`, `GET /jobs/:id`.
  - Assets: listing per job, firma URL (MinIO).
  - Webhooks: `POST /webhook/comfyui` per segnare completamento render e creare `Asset`.
  - Swagger su `/api`, schemi coerenti con Zod.
- apps/worker (BullMQ)
  - Consumers tipizzati con Zod.
  - content-generation: chiama OpenRouter, salva testo/metadata, aggiorna `costTok`.
  - lora-training: simulazione (HTTP/shell placeholder), aggiorna stato/output path.
  - video-generation: invoca ComfyUI (client placeholder), attende webhook.
  - Retry/backoff, progress, log strutturati.
- apps/web (Next.js App Router)
  - Login/logout, gestione sessione SSR con cookie HttpOnly.
  - Dashboard: stato job recenti, costi stimati, code.
  - Liste/CRUD basilari per Influencers/Datasets.
  - Avvio “Content Plan” e job “content-generation”; tabella job con filtri e dettaglio; preview asset (URL MinIO).
- infra e scripts
  - Non cambiare `infra/docker-compose.yml`.
  - Verifica/aggiungi script: `scripts/start-all.*`, `scripts/stop-all.*` (già menzionati in README).
- docs
  - Collega in `README.md` la guida `docs/security/token-rotation.md`.

Accettazione

- `pnpm -w install` esegue senza errori; build e lint passano.
- Avvio con `scripts/start-all.*` o `docker compose -f infra/docker-compose.yml up -d`.
- Login → dashboard → crea job “content-generation” → stato aggiornato → asset visualizzabile (anche se placeholder).
- Swagger disponibile e coerente con Zod.
- Nessuna credenziale committata; `.env.example` completo.

Note

- Mantieni i percorsi, i nomi dei pacchetti e le porte esistenti.
- Aggiungi test minimi per validazioni Zod e API auth/jobs basilari.
- Ogni modifica sensibile ai secrets deve fare riferimento a `docs/security/token-rotation.md`.

Se qualcosa non è chiaro, chiedi prima di procedere. Mantieni le modifiche minimali e tipizzate, privilegiando estensioni additive.

— Fine prompt —

## Prompt (Nuovo progetto da zero) – Opzionale

— Inizio prompt —

Costruisci/estendi un monorepo TypeScript chiamato “InfluencerAI” per un sistema locale di generazione contenuti (testo, immagini, video) per influencer virtuali. Usa pnpm + Turborepo. Genera solo codice e configurazioni necessarie al funzionamento locale, evitando servizi cloud esterni eccetto OpenRouter per il testo.

Obiettivi chiave

- Generazione testi via OpenRouter (caption/script/hashtag/brief) con stima costi token e cap.
- Pipeline immagini/video locali orchestrate via n8n e ComfyUI (HTTP + webhook).
- Training LoRA con job dedicato (shell/HTTP trigger, non serve implementare training engine).
- Autopost orchestrato da n8n (placeholder endpoints).
- Multi-tenant, ruoli e sicurezza robusta.

Struttura monorepo

- apps/web: Next.js 14 (App Router, TS), Tailwind, shadcn/ui, TanStack Query.
- apps/api: NestJS (Fastify), Prisma (Postgres), Zod per DTO, Swagger.
- apps/worker: BullMQ (Redis), job “content-generation”, “lora-training”, “video-generation”.
- apps/n8n: placeholder per workflow JSON/YAML e env.
- packages/core-schemas: Zod (JobSpec, ContentPlan, DatasetSpec, LoRAConfig).
- packages/sdk: client fetcher, hooks typed, API types condivisi.
- packages/prompts: template LLM per i vari task.
- infra/docker-compose.yml: Postgres, Redis, MinIO (S3 compat), n8n, api, worker, web.
- data/{datasets,loras,outputs}: cartelle locali per dataset, modelli, output.

Dati e modelli (Prisma)

- Tenant(id, name, createdAt)
- Influencer(id, tenantId, name, persona Json, datasetId?)
- Dataset(id, tenantId, kind, path, meta Json, status, createdAt)
- Job(id, type, status, payload Json, result Json?, costTok Int?, startedAt, finishedAt)
- Asset(id, jobId, type, url, meta Json)
- Migrazioni incluse e seed minimi facoltativi.

API principali (NestJS)

- Auth: login con email/password finta (mock provider), sessione con JWT in cookie HttpOnly, refresh token/rotation, logout, middleware di protezione route, ruoli: admin/editor/viewer.
- Tenants/Influencers/Datasets CRUD con validazione Zod, paginazione, filtri base.
- Jobs
  - POST /jobs: crea job (content-generation|lora-training|video-generation) con payload e priority.
  - GET /jobs, GET /jobs/:id: listing e dettaglio con stati e costi token.
- Assets: listing per job e firma URL S3 (MinIO).
- Webhooks
  - POST /webhook/comfyui: riceve stato completamento render e aggiorna Job/Asset.
- Swagger su /api con esempi e schemi Zod.

Worker (BullMQ)

- Codecs tipizzati (Zod) per payload e result.
- content-generation: chiama OpenRouter (chiave da env), salva testo, stima costi token in Job.costTok.
- lora-training: simula invocazione training (shell/HTTP), aggiorna stato e output path.
- video-generation: orchestrazione HTTP verso ComfyUI (placeholder client) e attesa webhook.
- Retry con backoff, progress, logging strutturato.

Web UI (Next.js)

- Login, logout, gestione sessione (cookie HttpOnly, fetch lato server).
- Dashboard: riepilogo job recenti, costi stimati, stato code.
- Influencers: lista/dettaglio, persona editor (JSON schema), collegamento dataset.
- Datasets: upload path/metadata, stato (ready/processing/failed).
- Content Plan: form che chiama API per generare piano contenuti (OpenRouter).
- Jobs: tabella con filtri, stato live, dettaglio esecuzione, link/preview Asset.
- LoRA: form configurazione (LoRAConfig), avvio job training, stato e log.
- Asset gallery: preview immagini/video (URL da MinIO), metadati.

Orchestrazione n8n

- Placeholder directory con file README su come importare workflow e var env.
- Endpoints previsti dall’API: /plan/generate, /lora/train, /content/run, /publish, /webhook/comfyui.

Storage e infrastruttura

- MinIO: bucket “assets”, utility per upload/list firma URL.
- Docker Compose esponendo: web:3000, api:3001, n8n:5678, minio:9000/9001, db:5432, redis:6379.
- Script avvio/stop (bash e PowerShell) per up/down + purge volumi.
- .env.example completo con chiavi locali; non committare .env.

Sicurezza

- JWT in cookie HttpOnly + rotazione refresh, CSRF-safe pattern (sameSite=strict, secure in prod).
- Validazione Zod end-to-end e sanitizzazione input.
- RBAC semplice (admin/editor/viewer) su risorse per tenant.
- Documenta guida rapida per rotazione token/segreti (link placeholder docs/security).

Qualità e DX

- ESLint/Prettier config TS, strict mode.
- Turborepo pipelines per build/lint/test.
- Testing punto-inizio: unit per DTO/validazioni, e2e basilare su auth e jobs.
- README con quick start, endpoints utili e troubleshooting principali.

Accettazione

- Avvio locale con un comando: scripts/start-all.\* che richiama infra/docker-compose.yml.
- UI navigabile: login → dashboard → CRUD base funzionanti → avvio job content-generation (finto ok) e ricezione webhook simulata.
- Swagger completo e coerente con Zod.
- Nessun servizio esterno oltre OpenRouter per il testo.

Se qualche dettaglio non è chiaro, chiedi prima di procedere. Mantieni il codice minimale, tipizzato, e allineato alla struttura indicata.

— Fine prompt —
