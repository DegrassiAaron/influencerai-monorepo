# Setup Sviluppo Locale Completo

Guida completa per sviluppatori che vogliono contribuire al progetto senza Docker.

---

## Prerequisiti

- **Node.js** v18+ LTS
- **pnpm** v8+
- **PostgreSQL** 15+
- **Redis** 7+
- **Git**

---

## Setup Servizi Locali

### 1. PostgreSQL

**Installazione**:
```bash
# Windows: Download installer
# https://www.postgresql.org/download/windows/

# Mac
brew install postgresql@15
brew services start postgresql@15

# Linux (Ubuntu)
sudo apt install postgresql-15
sudo systemctl start postgresql
```

**Configurazione**:
```sql
-- Crea database
CREATE DATABASE influencerai;

-- Crea utente (se necessario)
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE influencerai TO postgres;
```

### 2. Redis

**Installazione**:
```bash
# Mac
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis

# Windows: usa Docker o WSL
```

### 3. MinIO (Opzionale per sviluppo)

```bash
# Download binary
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio

# Avvia server
./minio server ./data/minio --console-address ":9001"
```

---

## Setup Progetto

### 1. Clone e Install

```bash
git clone <repo-url>
cd influencerai-monorepo
pnpm install
```

### 2. Configura .env

```bash
cp .env.example .env
```

Modifica `.env`:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/influencerai
REDIS_URL=redis://localhost:6379
OPENROUTER_API_KEY=sk-or-v1-xxx  # Tua chiave
```

### 3. Setup Database

```bash
cd apps/api
pnpm dlx prisma generate
pnpm dlx prisma migrate dev
pnpm dlx prisma db seed  # (opzionale)
```

---

## Sviluppo

### Avvia Tutti i Servizi

```bash
# Terminal unico (parallelo)
pnpm dev

# Oppure terminali separati:
# Terminal 1
pnpm --filter api dev

# Terminal 2
pnpm --filter web dev

# Terminal 3
pnpm --filter worker dev
```

### Hot Reload

- **API**: Nodemon rileva cambi `.ts` → restart automatico
- **Web**: Next.js Fast Refresh
- **Worker**: Nodemon su processor files

---

## Testing

```bash
# Tutti i test
pnpm test

# Test singolo workspace
pnpm --filter api test
pnpm --filter api test:watch

# Coverage
pnpm --filter api test:cov
```

---

## Linting e Format

```bash
# Lint
pnpm lint

# Fix automatico
pnpm lint:fix

# Format
pnpm format
```

---

## Database Tools

```bash
# Prisma Studio (UI per database)
cd apps/api && pnpm dlx prisma studio

# Crea migration
pnpm dlx prisma migrate dev --name add_new_field

# Reset database (⚠️ dati persi)
pnpm dlx prisma migrate reset

# Seed database
pnpm dlx prisma db seed
```

---

## Debugging

### VS Code Launch Config

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "api", "dev"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug Worker

```bash
# Avvia con inspector
node --inspect apps/worker/dist/main.js

# Attacca debugger su porta 9229
```

---

## Riferimenti

- [Avvio Rapido](./avvio-rapido.md)
- [Variabili Ambiente](./variabili-ambiente.md)
- [Risoluzione Problemi](./risoluzione-problemi.md)
