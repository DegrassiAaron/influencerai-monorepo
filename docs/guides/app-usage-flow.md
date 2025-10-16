# Guida passo-passo ai flussi dell'app InfluencerAI

Questa guida descrive i flussi attualmente disponibili nell'applicazione, partendo dall'avvio dell'ambiente fino alla generazione e approvazione di un content plan. Ogni sezione include i comandi indispensabili e il percorso UI/API da seguire.

## 1. Avvio dell'ambiente locale

- Installa le dipendenze (una sola volta): `pnpm -w install`
- Avvia i servizi di supporto (Postgres, Redis, MinIO, n8n) e le app con Docker Compose:
  - Windows: `powershell -ExecutionPolicy Bypass -File scripts/start-all.ps1`
  - macOS/Linux: `bash scripts/start-all.sh`
- Verifica gli endpoint principali:
  - Web: `http://localhost:3000`
  - API Swagger: `http://localhost:3001/api`
  - n8n: `http://localhost:5678`
  - MinIO console: `http://localhost:9001`

> Nota: la migrazione iniziale del database parte automaticamente tramite il servizio `api-migrate`.

## 2. Accesso e sessione

1. Apri `http://localhost:3000/login`
2. Usa l'utente seed (modificabile via seeding Prisma):
   - Email: `admin@acme.test`
   - Password: `admin123`
3. Al login l'app salva un cookie `auth_token` HttpOnly gestito da Next.js (`apps/web/src/app/login/page.tsx` + `/api/session/login`).
4. Premi `Vai alla dashboard` dalla home per atterrare su `/dashboard`.
5. Per terminare la sessione usa il pulsante `Esci`, che chiama `POST /api/session/logout`.

## 3. Monitoraggio operativo (Dashboard)

Percorso: `http://localhost:3000/dashboard`

- **Health card** (`HealthCard.tsx`): interroga `GET /healthz` e mostra lo stato dei servizi (Postgres, Redis, MinIO, OpenRouter). Colori badge:
  - Verde → operativo (`status: ok`)
  - Giallo → degradato (`status: degraded`)
  - Rosso → down (`status: down`)
- **Job queues widget** (`QueuesWidget.tsx`): richiama `GET /queues/summary` e aggrega job BullMQ attivi/in attesa/falliti.
- **Jobs chart** (`JobsChart.tsx`): chiede `GET /jobs/series?window=1h` per tracciare successi/fallimenti nel tempo.
- Aggiornamento dati: React Query polling ogni 30 secondi (configurato in `apps/web/src/app/dashboard/page.tsx`).

### Azioni consigliate

- Se una health check fallisce, apri `http://localhost:3001/healthz` per il dettaglio e riavvia il servizio corrispondente (`docker compose restart <service>`).
- Se le code BullMQ crescono, entra in `http://localhost:3001/queues/summary` oppure usa la CLI:
  ```bash
  curl -s http://localhost:3001/queues/summary | jq
  ```

## 4. Flusso Content Plan Wizard

Percorso: `http://localhost:3000/dashboard/content-plans`

1. **Step Persona**: inserisci `Influencer ID` (deve esistere nel DB Prisma) e un riassunto della persona. Cambiare questi campi azzera eventuali risultati precedenti.
2. **Step Parametri**: definisci il `Theme` della campagna e seleziona le piattaforme target (Instagram, TikTok, YouTube Shorts).
3. **Step Revisione**: controlla il prompt sintetizzato (component `PromptSummaryCard`).
4. Premi `Generate content plan`. Il client invia `POST /content-plans` con `influencerId`, `theme` e `targetPlatforms` (vedi `apps/web/src/lib/content-plans.ts`). L'API:
   - Recupera la persona completa dall'archivio Prisma
   - Interroga OpenRouter per generare 3-5 post (`ContentPlansService.generatePlanPosts`)
   - Registra un job di tipo `content-plan` con stato `completed`
5. Alla risposta, `PlanPreview` mostra i post generati con caption e hashtag.

## 5. Approvazione o rigenerazione del piano

Sempre da `PlanPreview`:

1. `Approve plan` → invia `PATCH /jobs/:id` con `result` aggiornato (`approvalStatus: "approved"`).
2. `Reject plan` → stesso endpoint con `approvalStatus: "rejected"`.
3. `Regenerate plan` → richiama `POST /content-plans` per ottenere un nuovo set; il wizard mantiene lo stesso `Influencer ID` e tema.
4. Le azioni mostrano stato di caricamento (`isUpdatingApproval` / `isRegenerating`) per evitare doppi invii.

Verifica lato API:

```bash
curl -s http://localhost:3001/jobs/<JOB_ID> | jq '.result.approvalStatus'
```

## 6. Tracciamento job e audit

Per una visione d'insieme dei job:

1. Lista job recenti filtrando per tipo:
   ```bash
   curl -s "http://localhost:3001/jobs?type=content-plan&take=10" | jq
   ```
2. Recupera dettagli di un singolo job (risultato, costi, timestamp):
   ```bash
   curl -s http://localhost:3001/jobs/<JOB_ID> | jq
   ```
3. Esporta la serie temporale (usata dal grafico dashboard):
   ```bash
   curl -s "http://localhost:3001/jobs/series?window=6h" | jq
   ```

In caso di congestione:

- Usa `POST /jobs` per reinserire manualmente un job (payload conforme a `apps/api/src/jobs/dto.ts`).
- Controlla `apps/worker/src/queues` per capire quali consumer stanno processando i job.

## Issue mancanti / da aprire

- **UI per selezione influencer**: il wizard richiede un `Influencer ID` testuale (`ContentPlanWizard`, riga ~70) ma non offre autocompletamento via API; serve una lista filtrabile dagli influencer registrati.
- **Persona non inviata all'API**: il campo `personaSummary` raccolto al passo 1 non viene incluso nella richiesta (`createContentPlan` in `apps/web/src/lib/content-plans.ts`), quindi il prompt usa solo i dati salvati in Prisma; allineare front-end e API.
- **Metriche home statiche**: le card nella home (`apps/web/src/app/page.tsx`, costante `highlights`) mostrano numeri fissi; creare integrazione con API reali o rimuovere i placeholder.
- **Storico piani editoriali**: esiste l'endpoint `GET /content-plans` ma manca una vista UI per elencare e riaprire i piani generati; aggiungere una pagina tabellare sotto `/dashboard/content-plans`.
