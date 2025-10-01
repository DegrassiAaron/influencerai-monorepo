# Setup Ambiente di Sviluppo

Questa guida spiega come avviare l’intero stack in locale su Windows, macOS e Linux, con particolare attenzione a Windows/PowerShell.

## Prerequisiti

- Docker Desktop (o Docker Engine) con Docker Compose v2 disponibile come `docker compose`.
  - Windows: abilita backend WSL 2 e il supporto a file sharing della cartella del repo.
- Node.js 20+ e pnpm 9+ installati e nel PATH.
- Git installato.
- Facoltativi ma utili:
  - GitHub CLI `gh` (per script utility).
  - FFmpeg (per pipeline media locali, opzionale).

## Clonare il repository

```bash
git clone <URL_DEL_REPO> influencerai-monorepo
cd influencerai-monorepo
```

## Variabili d’ambiente

- Copia il file `.env.example` in `.env` alla radice del repo e, se necessario, modifica i valori:

```bash
cp .env.example .env   # macOS/Linux
# oppure
copy .env.example .env # Windows PowerShell
```

Valori predefiniti utili (estratto):

```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/influencerai
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_KEY=minio
S3_SECRET=minio12345
S3_BUCKET=assets
OPENROUTER_API_KEY=...
```

## Avvio rapido (consigliato)

- macOS/Linux (Bash):

```bash
bash scripts/start-all.sh
```

- Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-all.ps1
```

Il comando costruisce e avvia tramite `infra/docker-compose.yml` i servizi: Postgres, Redis, MinIO, n8n, API, worker e Web UI. Se `.env` non esiste, viene creato a partire da `.env.example`.

Endpoint utili dopo l’avvio:
- Web UI: `http://localhost:3000`
- API Swagger: `http://localhost:3001/api`
- n8n: `http://localhost:5678`
- MinIO Console: `http://localhost:9001` (S3 su `http://localhost:9000`)

## Migrazioni database (Prisma)

Le migrazioni richiedono il DB attivo (Postgres via Docker). Usa gli script dedicati:

- Windows (PowerShell):

```powershell
# sincronizza schema (sviluppo)
powershell -ExecutionPolicy Bypass -File scripts/db-migrate.ps1 -Action push

# applica migrazioni (prod/staging)
powershell -ExecutionPolicy Bypass -File scripts/db-migrate.ps1 -Action deploy
```

- macOS/Linux (Bash):

```bash
# sincronizza schema (sviluppo)
bash scripts/db-migrate.sh push

# applica migrazioni (prod/staging)
bash scripts/db-migrate.sh deploy
```

Per verificare la connessione al DB:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db-test.ps1
```

## Installazione dipendenze workspace

Esegui nel root del repo dopo il primo clone o dopo aver aggiornato i pacchetti:

```bash
pnpm -w install
```

## Avvio dei singoli servizi (avanzato)

Se vuoi gestire manualmente i servizi Docker:

```bash
cd infra
docker compose up -d        # avvia
docker compose logs -f api  # segui i log di un servizio
docker compose down         # stop
```

## Troubleshooting

- Verifica log: `cd infra && docker compose logs -f api` (o `web`, `worker`, `postgres`, `redis`, `minio`, `n8n`).
- Ricostruzione forzata: `cd infra && docker compose build --no-cache && docker compose up -d`.
- Volumi corrotti/schema incoerente: stop con purge e ripartenza
  - PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/stop-all.ps1 --purge`
  - Bash: `bash scripts/stop-all.sh --purge`
- `.env` mancante: crea a partire da `.env.example` o modifica i valori necessari.
- Porte occupate: chiudi i processi che usano le porte o modifica il mapping in `infra/docker-compose.yml`.
- Windows/PowerShell: se gli script sono bloccati, avvia la shell come amministratore oppure usa `-ExecutionPolicy Bypass` come mostrato.
- WSL2: assicurati che Docker Desktop usi backend WSL 2 e che la cartella del progetto sia accessibile (evita percorsi di rete lenti).

## Requisiti opzionali per pipeline AI locali

- ComfyUI installato localmente per pipeline immagini/video.
- FFmpeg nel PATH per elaborazioni video/audio.
- GPU con driver aggiornati; se VRAM è limitata, riduci risoluzione/batch.

