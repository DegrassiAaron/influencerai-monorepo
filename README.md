# InfluencerAI

[![Sync Backlog Issues](https://github.com/DegrassiAaron/influencerai-monorepo/actions/workflows/sync-backlog-issues.yml/badge.svg)](https://github.com/DegrassiAaron/influencerai-monorepo/actions/workflows/sync-backlog-issues.yml)
[![Verify Backlog Issues](https://github.com/DegrassiAaron/influencerai-monorepo/actions/workflows/verify-backlog-issues.yml/badge.svg)](https://github.com/DegrassiAaron/influencerai-monorepo/actions/workflows/verify-backlog-issues.yml)
[![CI - install & build](https://github.com/DegrassiAaron/influencerai-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/DegrassiAaron/influencerai-monorepo/actions/workflows/ci.yml)

**Sistema locale per generazione contenuti AI (testo, immagini, video) per influencer virtuali.**

Monorepo TypeScript con orchestrazione n8n, training LoRA, e generazione video locale con ComfyUI.
**Unico costo**: OpenRouter API per generazione testi (~€50-150/mese).

---

## 🚀 Avvio Rapido (5 Minuti)

### 1. Clone e Configura

```bash
git clone <repository-url>
cd influencerai-monorepo
cp .env.example .env
# Edit .env e inserisci la tua OPENROUTER_API_KEY
```

### 2. Avvia con Docker

```bash
# Bash (macOS/Linux/Git Bash)
bash scripts/start-all.sh

# PowerShell (Windows)
powershell -ExecutionPolicy Bypass -File scripts/start-all.ps1
```

### 3. Verifica Endpoint

| Servizio | URL | Credenziali |
|----------|-----|-------------|
| **Web Dashboard** | http://localhost:3000 | In sviluppo |
| **API Swagger** | http://localhost:3001/api | N/A |
| **n8n Workflows** | http://localhost:5678 | admin / admin123 |
| **MinIO Console** | http://localhost:9001 | minio / minio12345 |

**Pronto!** Il sistema è attivo. Continua con la [guida completa](./docs/getting-started/avvio-rapido.md).

---

## 📚 Documentazione Completa

### Per Iniziare
- **[Avvio Rapido](./docs/getting-started/avvio-rapido.md)** - Setup Docker in 5 minuti
- **[Setup Sviluppo Locale](./docs/getting-started/sviluppo-locale.md)** - Setup completo senza Docker
- **[Risoluzione Problemi](./docs/getting-started/risoluzione-problemi.md)** - Troubleshooting comune

### Architettura
- **[Panoramica Sistema](./docs/architecture/panoramica.md)** - Diagrammi, componenti, tech stack
- **[Flusso Dati](./docs/architecture/flusso-dati.md)** - Lifecycle richieste e pattern
- **[Deployment](./docs/architecture/deployment.md)** - Docker Compose, infrastruttura, scaling

### Sviluppo
- **[API Best Practices](./CLAUDE.md#api-development-best-practices)** - Pattern NestJS, Prisma, Zod
- **[Testing Guide](./docs/TESTING.md)** - Unit, integration, E2E testing
- **[Indice Completo](./docs/README.md)** - Tutta la documentazione

---

## 🛠️ Stack Tecnologico

| Layer | Tecnologie |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, TanStack Query |
| **Backend** | NestJS 10 + Fastify, Prisma ORM, PostgreSQL 15, Zod validation |
| **Queue & Cache** | BullMQ, Redis 7 |
| **Storage** | MinIO (S3-compatible), volumi Docker |
| **AI Services** | OpenRouter API (testo), ComfyUI (immagini/video locale), kohya_ss CLI (LoRA training) |
| **Orchestration** | n8n workflows, Docker Compose |

**Dettagli completi**: [docs/architecture/panoramica.md](./docs/architecture/panoramica.md)

---

## 📂 Struttura Repository

```
influencerai-monorepo/
├── apps/
│   ├── web/            # Dashboard Next.js
│   ├── api/            # Backend NestJS
│   ├── worker/         # BullMQ consumers
│   └── n8n/            # Workflow definitions
├── packages/
│   ├── core-schemas/   # Zod schemas condivisi
│   ├── sdk/            # Client API + hooks
│   └── prompts/        # Template LLM
├── docs/               # Documentazione completa
│   ├── architecture/   # Design sistema
│   ├── getting-started/# Guide setup
│   └── README.md       # Indice documentazione
├── infra/              # Docker Compose configs
├── data/               # Dataset, LoRA, outputs (gitignored)
└── scripts/            # Utility scripts
```

---

## ⚙️ Comandi Utili

```bash
# Avvio stack completo
bash scripts/start-all.sh           # Bash
powershell scripts/start-all.ps1    # PowerShell

# Stop services
bash scripts/stop-all.sh            # Stop normale
bash scripts/stop-all.sh --purge    # Stop + elimina volumi

# Sviluppo (dopo setup Docker)
pnpm install                        # Install dipendenze
pnpm dev                            # Avvia API + Web + Worker

# Database
cd apps/api
pnpm dlx prisma generate            # Genera Prisma Client
pnpm dlx prisma migrate dev         # Applica migrations
pnpm dlx prisma studio              # UI database

# Testing
pnpm test                           # Tutti i test
pnpm --filter api test:watch       # Test API in watch mode
```

---

## 🔧 Troubleshooting Rapido

### Problema: Porta già in uso

```bash
# Trova processo su porta
lsof -i :5432      # Mac/Linux
netstat -ano | findstr :5432  # Windows
```

### Problema: Docker container non si avvia

```bash
# Logs dettagliati
docker logs influencerai-postgres

# Reset completo (⚠️ elimina dati)
bash scripts/stop-all.sh --purge
bash scripts/start-all.sh
```

### Problema: API non risponde

```bash
# Verifica health
curl http://localhost:3001/health

# Check logs
docker logs influencerai-api
```

**Guida completa**: [docs/getting-started/risoluzione-problemi.md](./docs/getting-started/risoluzione-problemi.md)

---

## 🌐 Variabili d'Ambiente

### Setup Minimale

```bash
# Copia template
cp .env.example .env

# Modifica solo questa variabile (obbligatoria)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

**Ottieni chiave gratuita**: [openrouter.ai/keys](https://openrouter.ai/keys)

### Variabili Pre-configurate (non modificare per sviluppo locale)

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/influencerai
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_KEY=minio
S3_SECRET=minio12345
```

**Riferimento completo**: [docs/getting-started/variabili-ambiente.md](./docs/getting-started/variabili-ambiente.md)

---

## 📊 Stato Progetto

**Fase**: Pre-MVP (Q4 2025)
**Versione**: 0.x

| Componente | Stato | Completamento |
|------------|-------|---------------|
| API Backend | ✅ Produzione | 85% |
| Database Schema | ✅ Stabile | 95% |
| Frontend Dashboard | 🔄 In sviluppo | 40% |
| Worker Processing | 🔄 In sviluppo | 60% |
| n8n Workflows | 🔄 Test | 70% |

**Dettagli**: [docs/stato-progetto.md](./docs/stato-progetto.md) (TODO)

---

## 🤝 Contribuire

1. **Fork & Clone**
2. **Crea branch**: `git checkout -b feature/amazing-feature`
3. **Commit**: `git commit -m 'feat: add amazing feature'`
4. **Push**: `git push origin feature/amazing-feature`
5. **Pull Request**

**Best Practices**: Leggi [CLAUDE.md](./CLAUDE.md) per pattern API e [docs/README.md](./docs/README.md) per standard documentazione.

---

## 📞 Supporto

- **Documentazione**: [docs/README.md](./docs/README.md)
- **Issues**: [GitHub Issues](../../issues)
- **Troubleshooting**: [docs/getting-started/risoluzione-problemi.md](./docs/getting-started/risoluzione-problemi.md)

---

## 📄 Licenza

Proprietario - Uso interno

---

**Creato con**: TypeScript, NestJS, Next.js, Prisma, n8n, ComfyUI, OpenRouter API
