# API (NestJS) — Prisma e Migrazioni

 
- Schema Prisma: `apps/api/prisma/schema.prisma`
- Client: `@prisma/client` (generato da `prisma generate`)

## Comandi utili

- Genera client: `pnpm --filter @influencerai/api prisma:generate`
- Migrazione (dev): `pnpm --filter @influencerai/api prisma:migrate:dev`
- Deploy migrazioni (prod/staging): `pnpm --filter @influencerai/api prisma:migrate:deploy`
- Sync schema senza migrazioni (dev): `pnpm --filter @influencerai/api prisma:db:push`

Richiede `DATABASE_URL` configurata (in `apps/api/.env` o nella root `.env`).

### Tramite Docker Compose

- Le migrazioni vengono applicate automaticamente al primo avvio tramite il servizio `api-migrate` definito in `infra/docker-compose.yml`.
- Avvio completo stack: vedi root `README.md` o `docs/SETUP.md` (script `scripts/start-all.*`).

#### Nota su `DATABASE_URL` con Docker Compose

- Se il file `.env` alla root definisce `DATABASE_URL=...localhost...`, può sovrascrivere i default del compose e far puntare i container a Postgres dell'host.
- In ambiente container, usa `postgres:5432` come host (es. `postgresql://postgres:postgres@postgres:5432/influencerai`).
- Opzioni consigliate:
  - Non definire `DATABASE_URL` nel `.env` root quando usi Docker Compose.
  - Oppure sovrascrivi la variabile nei servizi che la usano (es. `api-migrate`) con `-e DATABASE_URL=...`.
  - Oppure mantieni due file env separati (host vs docker) e carica quello corretto.

### Troubleshooting

- Verifica che Postgres sia attivo (Docker) e che `DATABASE_URL` punti all'istanza corretta.
- Rigenera il client dopo modifiche allo schema: `pnpm --filter @influencerai/api prisma:generate`.


## Esempi cURL Jobs

- Crea job (content-generation):

```
curl -X POST http://localhost:3001/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "content-generation",
    "payload": { "foo": "bar" },
    "priority": 1
  }'
```

- Lista job (filtri/paginazione):

```
curl "http://localhost:3001/jobs?type=content-generation&status=pending&take=10&skip=0"
```

- Dettaglio job:

```
curl http://localhost:3001/jobs/<JOB_ID>
```


## OpenRouter: Timeout/Retry e Variabili d’Ambiente

- Richiede `OPENROUTER_API_KEY` impostata (skippata solo in `NODE_ENV=test`).
- Tuning opzionale (valori di default tra parentesi):
  - `OPENROUTER_TIMEOUT_MS` (60000)
  - `OPENROUTER_MAX_RETRIES` (3)
  - `OPENROUTER_BACKOFF_BASE_MS` (250)
  - `OPENROUTER_BACKOFF_JITTER_MS` (100)

Esempio `.env`:

```
OPENROUTER_API_KEY=your_api_key_here
# Opzionale
OPENROUTER_TIMEOUT_MS=60000
OPENROUTER_MAX_RETRIES=3
OPENROUTER_BACKOFF_BASE_MS=250
OPENROUTER_BACKOFF_JITTER_MS=100
```

### Mapping Errori Controller (Content Plans)

- Upstream 429 → risposta 429 con messaggio "Rate limited by upstream".
- Upstream 5xx → risposta 502 (Bad Gateway).
- Timeout upstream (AbortError) → risposta 408 (Request Timeout).
- Altri errori di rete → risposta 503 (Service Unavailable).
- Altri status non-OK → `HttpException` con lo status originario (fallback 502).

Note:
- Il servizio registra eventuali `usage`/token restituiti da OpenRouter a scopo di tracciamento costi.
- La logica di retry si applica a 429 e 5xx (backoff esponenziale + jitter, rispetto di `Retry-After`).

## Test E2E Roundtrip (Redis + Worker)

- Prerequisiti
  - Redis in esecuzione localmente: `docker run --rm -p 6379:6379 redis:7`
  - Dipendenze installate nel monorepo e SDK buildato: `pnpm i && pnpm --filter @influencerai/sdk build`

- Esecuzione test
  - Avvia i test E2E: `pnpm --filter @influencerai/api test:e2e`
  - Forza un reset del database di test prima dell'esecuzione con `SKIP_DB_RESET=0 pnpm --filter @influencerai/api test:e2e`
  - Le suite interessate sono:
    - `apps/api/test/jobs.roundtrip.redis.e2e-spec.ts` (worker inline di test)
    - `apps/api/test/jobs.roundtrip.realworker.e2e-spec.ts` (worker reale `apps/worker`)

- Variabili d’ambiente utili
  - `REDIS_URL` (default: `redis://localhost:6379`)
  - I test forzano Bull attivo con `DISABLE_BULL=0` e fanno il ping a Redis; se non raggiungibile, la suite viene automaticamente skippata.

- Note
  - Il test “real worker” avvia il worker con `tsx` puntando a `apps/worker/src/index.ts` e necessita che le sue dipendenze siano installate. Assicurati di aver eseguito `pnpm i` a livello root.
  - Entrambi i test usano un mock in‑memory di Prisma per evitare un database reale, ma esercitano gli endpoint `POST /jobs`, `GET /jobs/:id` e `PATCH /jobs/:id` oltre all’enqueue BullMQ.

## Storage (MinIO/S3)

- Variabili richieste: `S3_ENDPOINT`, `S3_KEY`, `S3_SECRET`, `S3_BUCKET` (vedi `.env.example`).
- All'avvio del modulo, l'API verifica/crea il bucket configurato.
- Endpoint di verifica rapida:
  - `GET /storage/health` — controlla connettività e bucket
  - `PUT /storage/test-object?key=connectivity.txt&content=hello` — roundtrip upload/download

Con Docker Compose dello stack (`infra/docker-compose.yml`):
- `minio` espone S3 su `http://localhost:9000` e console su `http://localhost:9001`
- `minio-init` crea automaticamente il bucket `assets` se assente

## Health & Readiness

- `GET /healthz` restituisce lo stato di DB, Redis e MinIO con latenza per check.

## Esempi cURL Jobs

- Crea job (content-generation):

```
curl -X POST http://localhost:3001/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "content-generation",
    "payload": { "foo": "bar" },
    "priority": 1
  }'
```

- Lista job (filtri/paginazione):

```
curl "http://localhost:3001/jobs?type=content-generation&status=pending&take=10&skip=0"
```

- Dettaglio job:

```
curl http://localhost:3001/jobs/<JOB_ID>
```


## OpenRouter: Timeout/Retry e Variabili d’Ambiente

- Richiede `OPENROUTER_API_KEY` impostata (skippata solo in `NODE_ENV=test`).
- Tuning opzionale (valori di default tra parentesi):
  - `OPENROUTER_TIMEOUT_MS` (60000)
  - `OPENROUTER_MAX_RETRIES` (3)
  - `OPENROUTER_BACKOFF_BASE_MS` (250)
  - `OPENROUTER_BACKOFF_JITTER_MS` (100)

Esempio `.env`:

```
OPENROUTER_API_KEY=your_api_key_here
# Opzionale
OPENROUTER_TIMEOUT_MS=60000
OPENROUTER_MAX_RETRIES=3
OPENROUTER_BACKOFF_BASE_MS=250
OPENROUTER_BACKOFF_JITTER_MS=100
```

### Mapping Errori Controller (Content Plans)

- Upstream 429 → risposta 429 con messaggio "Rate limited by upstream".
- Upstream 5xx → risposta 502 (Bad Gateway).
- Timeout upstream (AbortError) → risposta 408 (Request Timeout).
- Altri errori di rete → risposta 503 (Service Unavailable).
- Altri status non-OK → `HttpException` con lo status originario (fallback 502).

Note:
- Il servizio registra eventuali `usage`/token restituiti da OpenRouter a scopo di tracciamento costi.
- La logica di retry si applica a 429 e 5xx (backoff esponenziale + jitter, rispetto di `Retry-After`).

## Test E2E Roundtrip (Redis + Worker)

- Prerequisiti
  - Redis in esecuzione localmente: `docker run --rm -p 6379:6379 redis:7`
  - Dipendenze installate nel monorepo e SDK buildato: `pnpm i && pnpm --filter @influencerai/sdk build`

- Esecuzione test
  - Avvia i test E2E: `pnpm --filter @influencerai/api test:e2e`
  - Per forzare un reset completo del database prima della run imposta `SKIP_DB_RESET=0`, ad esempio: `SKIP_DB_RESET=0 pnpm --filter @influencerai/api test:e2e`
  - Le suite interessate sono:
    - `apps/api/test/jobs.roundtrip.redis.e2e-spec.ts` (worker inline di test)
    - `apps/api/test/jobs.roundtrip.realworker.e2e-spec.ts` (worker reale `apps/worker`)

- Variabili d’ambiente utili
  - `REDIS_URL` (default: `redis://localhost:6379`)
  - I test forzano Bull attivo con `DISABLE_BULL=0` e fanno il ping a Redis; se non raggiungibile, la suite viene automaticamente skippata.

- Note
  - Il test “real worker” avvia il worker con `tsx` puntando a `apps/worker/src/index.ts` e necessita che le sue dipendenze siano installate. Assicurati di aver eseguito `pnpm i` a livello root.
  - Entrambi i test usano un mock in‑memory di Prisma per evitare un database reale, ma esercitano gli endpoint `POST /jobs`, `GET /jobs/:id` e `PATCH /jobs/:id` oltre all’enqueue BullMQ.

## Storage (MinIO/S3)

- Variabili richieste: `S3_ENDPOINT`, `S3_KEY`, `S3_SECRET`, `S3_BUCKET` (vedi `.env.example`).
- All'avvio del modulo, l'API verifica/crea il bucket configurato.
- Endpoint di verifica rapida:
  - `GET /storage/health` — controlla connettività e bucket
  - `PUT /storage/test-object?key=connectivity.txt&content=hello` — roundtrip upload/download

Con Docker Compose dello stack (`infra/docker-compose.yml`):
- `minio` espone S3 su `http://localhost:9000` e console su `http://localhost:9001`
- `minio-init` crea automaticamente il bucket `assets` se assente

## Health & Readiness

- `GET /healthz` restituisce lo stato di DB, Redis e MinIO con latenza per check.
- `GET /readyz` come `healthz`, ma ritorna 503 se uno dei servizi è KO (per probe/container orchestrators).
