# Avvio Rapido (5 Minuti)

Inizia a sviluppare su InfluencerAI in meno di 5 minuti con Docker Compose.

---

## Prerequisiti

- **Docker Desktop** installato ([Download](https://www.docker.com/products/docker-desktop/))
  - Windows: WSL 2 abilitato
  - RAM: Minimo 8GB raccomandati
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **pnpm** installato: `npm install -g pnpm`
- **Git** installato

---

## Setup in 4 Passi

### 1. Clone Repository

```bash
git clone <repository-url>
cd influencerai-monorepo
```

### 2. Configura Ambiente

```bash
# Copia file .env esempio
cp .env.example .env

# Apri .env e inserisci la tua chiave OpenRouter
# OPENROUTER_API_KEY=sk-or-v1-xxx
```

> **Importante**: Ottieni una chiave API gratuita su [openrouter.ai](https://openrouter.ai/keys)

### 3. Avvia Docker Services

```bash
# Avvia PostgreSQL, Redis, MinIO, n8n
docker compose -f infra/docker-compose.yml up -d

# Verifica che tutti i servizi siano attivi
docker ps
```

Dovresti vedere 4 container running:
- `influencerai-postgres`
- `influencerai-redis`
- `influencerai-minio`
- `influencerai-n8n`

### 4. Setup Database e Avvia Applicazioni

```bash
# Installa dipendenze (prima volta)
pnpm install

# Genera Prisma Client e esegui migrations
cd apps/api
pnpm dlx prisma generate
pnpm dlx prisma migrate dev
cd ../..

# Avvia tutte le applicazioni
pnpm dev
```

Questo comando avvia in parallelo:
- **Web** (Next.js) → `http://localhost:3000`
- **API** (NestJS) → `http://localhost:3001/api`
- **Worker** (BullMQ) → Background processing

---

## Verifica Funzionamento

### 1. Test Endpoint API

```bash
curl http://localhost:3001/health
```

Risposta attesa:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

### 2. Accedi alle UI

| Servizio | URL | Credenziali |
|----------|-----|-------------|
| **Web Dashboard** | http://localhost:3000 | (implementazione in corso) |
| **API Swagger** | http://localhost:3001/api/docs | N/A |
| **n8n Workflows** | http://localhost:5678 | user: `admin`, pass: `admin123` |
| **MinIO Console** | http://localhost:9001 | user: `minio`, pass: `minio12345` |
| **Prisma Studio** | `cd apps/api && pnpm dlx prisma studio` | N/A |

### 3. Test Creazione Dataset

```bash
curl -X POST http://localhost:3001/api/datasets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "name": "test-dataset",
    "path": "data/datasets/test",
    "imageCount": 10
  }'
```

---

## Comandi Utili

```bash
# Ferma tutti i servizi
docker compose -f infra/docker-compose.yml down

# Visualizza logs
docker compose -f infra/docker-compose.yml logs -f

# Riavvia singolo servizio
docker compose -f infra/docker-compose.yml restart postgres

# Pulisci e ripristina (⚠️ elimina dati)
docker compose -f infra/docker-compose.yml down -v
pnpm dlx prisma migrate reset
```

---

## Prossimi Passi

✅ **Setup completo!** Ora puoi:

1. **Esplora l'API**: Vai su http://localhost:3001/api/docs
2. **Crea un Dataset**: Segui la [guida datasets](../features/datasets.md)
3. **Configura n8n**: Importa workflow da `apps/n8n/workflows/`
4. **Sviluppa Features**: Leggi [API Best Practices](/CLAUDE.md#api-development-best-practices)

---

## Troubleshooting

### Problema: "Port 5432 already in use"

PostgreSQL già in esecuzione sul sistema.

**Soluzione**:
```bash
# Windows
net stop postgresql-x64-15

# Linux/Mac
sudo systemctl stop postgresql
```

Oppure cambia la porta in `infra/docker-compose.yml`:
```yaml
postgres:
  ports:
    - "5433:5432"  # Usa porta 5433 invece di 5432
```

### Problema: "Docker: Cannot connect to the Docker daemon"

Docker Desktop non è avviato.

**Soluzione**: Avvia Docker Desktop dall'icona applicazioni.

### Problema: "Prisma migrate dev fails"

Il database non è pronto.

**Soluzione**:
```bash
# Aspetta 30 secondi dopo docker compose up
sleep 30

# Oppure verifica health
docker exec influencerai-postgres pg_isready -U postgres
```

---

## Supporto

- **Documentazione completa**: [/docs/README.md](../README.md)
- **Setup avanzato**: [sviluppo-locale.md](./sviluppo-locale.md)
- **Risoluzione problemi**: [risoluzione-problemi.md](./risoluzione-problemi.md)

---

**Tempo stimato setup**: 5-10 minuti
**Ultima verifica**: 2025-10-18
