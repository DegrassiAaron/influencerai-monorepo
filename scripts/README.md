# Script di utilità

Raccolta degli script disponibili nella cartella `scripts/` con esempi di utilizzo.

## Requisiti comuni

- Docker e Docker Compose v2 (`docker compose`).
- Node.js 20+ e `pnpm` nel PATH (per script che richiedono il workspace).
- Facoltativi: GitHub CLI `gh` per script che interagiscono con GitHub.

Suggerimento Windows: esegui PowerShell con `-ExecutionPolicy Bypass` come mostrato negli esempi.

---

## Avvio/Stop stack

- Avvio completo dello stack (DB, Redis, MinIO, n8n, API, worker, web):

```bash
# macOS/Linux
bash scripts/start-all.sh

# Windows
powershell -ExecutionPolicy Bypass -File scripts/start-all.ps1
```

- Stop stack (con opzione di purge volumi):

```bash
# macOS/Linux
bash scripts/stop-all.sh            # conserva volumi
bash scripts/stop-all.sh --purge    # rimuove anche i volumi

# Windows
powershell -ExecutionPolicy Bypass -File scripts/stop-all.ps1           \
  # conserva volumi
powershell -ExecutionPolicy Bypass -File scripts/stop-all.ps1 --purge   \
  # rimuove anche i volumi
```

---

## Database (Prisma)

- Migrazioni/schema:

```bash
# macOS/Linux
bash scripts/db-migrate.sh push    # sincronizza schema (sviluppo)
bash scripts/db-migrate.sh deploy  # applica migrazioni (prod/staging)

# Windows
powershell -ExecutionPolicy Bypass -File scripts/db-migrate.ps1 -Action push
powershell -ExecutionPolicy Bypass -File scripts/db-migrate.ps1 -Action deploy
```

- Test connessione DB (smoke):

```bash
# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File scripts/db-test.ps1
```

Note:

- Richiede `DATABASE_URL` in `.env` (root) o `apps/api/.env`.
- Richiede `pnpm` disponibile nel PATH.

---

## GitHub issue helper

Spunta automaticamente tutti i checkbox di un’issue su GitHub (richiede `gh` configurato):

```bash
# macOS/Linux
bash scripts/update-issue-checklist.sh 123

# Windows
powershell -ExecutionPolicy Bypass -File scripts/update-issue-checklist.ps1 -IssueNumber 123
```
