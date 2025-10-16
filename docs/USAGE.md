# Guida all’Uso — InfluencerAI

Questa guida descrive come avviare lo stack, autenticarsi e usare le principali funzionalità di InfluencerAI in locale.

## Prerequisiti

- Docker + Docker Compose v2
- Node.js 20+ e pnpm (per sviluppo locale senza Docker)
- Porta libere: `3000` (Web), `3001` (API), `5433` (Postgres host), `6380` (Redis host), `9000/9001` (MinIO)

## Avvio Rapido (Docker Compose)

1. Installazione dipendenze (solo la prima volta)
   - `pnpm i`
2. Preparazione `.env` (opzionale)
   - Copia `.env.example` in `.env` alla root se vuoi overridare i default di Compose.
3. Avvio completo stack
   - Windows: `powershell -ExecutionPolicy Bypass -File scripts/start-all.ps1`
   - macOS/Linux: `bash scripts/start-all.sh`
4. Endpoints utili
   - Web UI: `http://localhost:3000`
   - API (Swagger): `http://localhost:3001/api`
   - n8n: `http://localhost:5678`
   - MinIO Console: `http://localhost:9001` (S3: `http://localhost:9000`)

Note: le migrazioni del DB vengono applicate automaticamente dal servizio `api-migrate` al primo avvio.

## Primo Accesso (Login)

L’app Web richiede login. In sviluppo, è presente uno seed utente amministratore.

- Credenziali seed (default):
  - Email: `admin@acme.test`
  - Password: `admin123`
- Procedura:
  1. Apri `http://localhost:3000/login`
  2. Inserisci le credenziali sopra
  3. Al login riuscito verrai reindirizzato alla Dashboard

Token e sessione

- Il token JWT viene salvato come cookie HttpOnly (`auth_token`) via route handler Next.js; il client non lo legge direttamente.
- Logout: pulsante “Logout” nella Home.

## Configurazione Web (solo sviluppo locale senza Docker)

- File: `apps/web/.env.local`
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`
- Comandi:
  - `pnpm -C apps/web dev` → avvia Next.js su `http://localhost:3000`

## Configurazione API (sviluppo senza Docker)

- Variabili principali (vedi `apps/api/.env.example`):
  - `PORT=3001`
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/influencerai`
  - `REDIS_URL=redis://localhost:6380`
  - `S3_ENDPOINT=http://localhost:9000` — MinIO
  - `S3_KEY=minio` / `S3_SECRET=minio12345` / `S3_BUCKET=assets`
- Comandi utili:
  - `pnpm -C apps/api prisma:migrate:dev` → crea/applica migrazioni
  - `pnpm -C apps/api dev` → avvia NestJS in watch

## Funzionalità della Dashboard

- Health: stato servizi (DB, Redis, MinIO)
- Code (BullMQ): numero job attivi/pending/failed
- Grafico job recenti
- Logout

## Esempi API (login e chiamate autenticata)

1. Login (email/password):

```
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.test","password":"admin123"}'
# → { "access_token": "<JWT>" }
```

2. Chiamata autenticata con Bearer token:

```
TOKEN="<JWT>"
curl -s http://localhost:3001/healthz -H "Authorization: Bearer $TOKEN"
```

Note: alcune route di health sono pubbliche; gli endpoint applicativi richiedono `Authorization: Bearer <JWT>`.

## Seed Dati (facoltativo)

Lo seed base crea un tenant di sviluppo e un utente admin:

- Script: `apps/api/prisma/seed.mjs`
- Variabili (opzionali): `SEED_TENANT_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
- Esecuzione (con DB up):
  - `node apps/api/prisma/seed.mjs`

## Troubleshooting

- “Integration not found” con GitHub App: verifica App ID numerico e private key corretta; vedi `get-installation-token.mjs` e `docs/security/token-rotation.md`.
- API 401/403: assenza o invalidità del Bearer token; effettua login e riprova.
- Connessioni a servizi esterni (DB/Redis/MinIO): in Docker usa host di servizio (`postgres`, `redis`, `minio`); fuori Docker usa `localhost` e le porte esposte dallo `docker-compose.yml`.

## Riferimenti

- Setup: `docs/SETUP.md`
- Test: `docs/TESTING.md`
- API (Prisma & Migrazioni): `apps/api/README.md`
- Rotazione token (PAT/GitHub App): `docs/security/token-rotation.md`
