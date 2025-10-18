# Risoluzione Problemi Comuni

Soluzioni rapide ai problemi più frequenti durante setup e sviluppo.

---

## Problemi Docker

### Container non si avvia

**Sintomo**: `docker ps` mostra container in stato `Restarting` o `Exited`

**Debug**:
```bash
# Visualizza logs
docker logs influencerai-postgres

# Verifica health check
docker inspect influencerai-postgres | grep -A 5 "Health"
```

**Soluzioni comuni**:

1. **Porta già in uso**:
```bash
# Trova processo che usa porta 5432
lsof -i :5432  # Mac/Linux
netstat -ano | findstr :5432  # Windows

# Termina processo
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

2. **Volume corrotto**:
```bash
# Rimuovi volume e ricrea
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d
```

3. **Memoria insufficiente**:
   - Docker Desktop → Settings → Resources
   - Aumenta memoria a minimo 8GB

### MinIO non accetta upload

**Sintomo**: "Insufficient Storage" o "403 Forbidden"

**Soluzioni**:
```bash
# 1. Verifica spazio disco
docker system df

# 2. Pulisci vecchi container/immagini
docker system prune -a

# 3. Verifica credenziali
mc alias set minio-local http://localhost:9000 minio minio12345
mc admin info minio-local
```

---

## Problemi Database

### Prisma: "Can't reach database server"

**Sintomo**: Errore durante `prisma migrate dev`

**Soluzioni**:

1. **Verifica PostgreSQL è running**:
```bash
docker ps | grep postgres
# Se non c'è, avvia: docker compose up -d postgres
```

2. **Aspetta health check**:
```bash
# Attendi 30 secondi dopo avvio
docker exec influencerai-postgres pg_isready -U postgres
```

3. **Verifica CONNECTION_STRING**:
```bash
# Nel file .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/influencerai
#                       ↑user    ↑pass      ↑host    ↑port  ↑database
```

### Migration fallisce

**Sintomo**: `Error: P3006: Migration X failed to apply cleanly`

**Soluzione**:
```bash
# Opzione 1: Resolve manualmente
pnpm dlx prisma migrate resolve --applied <migration-name>

# Opzione 2: Reset database (⚠️ dati persi)
pnpm dlx prisma migrate reset
```

### Prisma Client out of sync

**Sintomo**: `Unknown field 'xyz' on model 'Dataset'`

**Soluzione**:
```bash
# Rigenera Prisma Client
cd apps/api
pnpm dlx prisma generate
```

---

## Problemi API

### API non risponde su porta 3001

**Sintomo**: `curl http://localhost:3001/health` → Connection refused

**Soluzioni**:

1. **Verifica processo API running**:
```bash
# Cerca processo node su porta 3001
lsof -i :3001  # Mac/Linux
netstat -ano | findstr :3001  # Windows
```

2. **Controlla logs**:
```bash
# Se avviato con pnpm dev, guarda terminal output
# Cerca errori startup
```

3. **Porta già in uso**:
```bash
# Cambia porta in apps/api/.env
PORT=3002
```

### JWT Token Validation Error

**Sintomo**: `401 Unauthorized` su endpoint protetti

**Soluzioni**:

1. **Verifica JWT_SECRET in .env**:
```bash
JWT_SECRET=deve-essere-uguale-in-tutti-gli-env
```

2. **Token scaduto**:
```bash
# Genera nuovo token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### CORS Error

**Sintomo**: Browser console mostra "CORS policy blocked"

**Soluzione**:
```bash
# In apps/api/.env
CORS_ORIGIN=http://localhost:3000

# Per multiple origins (sviluppo)
CORS_ORIGIN=http://localhost:3000,http://192.168.1.100:3000
```

---

## Problemi Worker

### Job bloccato in "pending"

**Sintomo**: Job creato ma non processato

**Debug**:
```bash
# Verifica worker running
ps aux | grep worker

# Verifica Redis connection
redis-cli ping
# PONG

# Verifica job in queue
redis-cli
> LLEN bull:content-generation:waiting
> LRANGE bull:content-generation:waiting 0 -1
```

**Soluzioni**:

1. **Worker non avviato**:
```bash
pnpm --filter worker dev
```

2. **Redis non connesso**:
```bash
# Verifica REDIS_URL in .env
REDIS_URL=redis://localhost:6379
```

3. **Concurrency saturo**:
```bash
# Aumenta in apps/worker/.env
QUEUE_CONCURRENCY_CONTENT_GEN=5
```

### Job fallisce con "OpenRouter 429 Rate Limit"

**Sintomo**: Job status = "failed", error "Rate limit exceeded"

**Soluzione**:
```bash
# OpenRouter free tier: 10 req/min
# Attendi 1 minuto e riprova

# Oppure upgrading a paid plan
# https://openrouter.ai/settings/credits
```

---

## Problemi ComfyUI

### ComfyUI timeout

**Sintomo**: Job fallisce dopo 5 minuti con timeout error

**Soluzioni**:

1. **Aumenta timeout**:
```bash
# In .env
COMFYUI_TIMEOUT=600000  # 10 minuti
```

2. **Verifica GPU disponibile**:
```bash
# NVIDIA
nvidia-smi

# Se GPU saturata, attendi job completino
```

3. **Riduci complessità workflow**:
   - Steps: 30 → 20
   - Resolution: 1024x1536 → 768x1024

### ComfyUI non risponde

**Sintomo**: `curl http://localhost:8188` → Connection refused

**Soluzioni**:

1. **Verifica ComfyUI running**:
```bash
ps aux | grep python | grep main.py
```

2. **Avvia ComfyUI**:
```bash
cd /path/to/ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

3. **Firewall blocca porta 8188**:
```bash
# Windows: Aggiungi regola firewall
# Mac: System Preferences → Security → Firewall
```

---

## Problemi n8n

### n8n non salva workflow

**Sintomo**: Modifiche workflow non persistono dopo restart

**Causa**: n8n usa database PostgreSQL, verifica configurazione

**Soluzione**:
```bash
# In infra/docker-compose.yml, verifica:
n8n:
  environment:
    - DB_TYPE=postgresdb
    - DB_POSTGRESDB_HOST=postgres
```

### Webhook n8n non riceve chiamate

**Sintomo**: n8n workflow con webhook trigger non si attiva

**Soluzioni**:

1. **URL webhook errato**:
```bash
# Deve essere accessibile da API
N8N_WEBHOOK_URL=http://localhost:5678

# Se n8n su macchina remota
N8N_WEBHOOK_URL=http://192.168.1.200:5678
```

2. **Workflow non attivo**:
   - Apri n8n UI → Workflow → Toggle "Active"

3. **Firewall blocca webhook**:
   - Verifica porta 5678 aperta

---

## Problemi Frontend

### Next.js: "Module not found"

**Sintomo**: Errore import durante build/dev

**Soluzione**:
```bash
# Pulisci e reinstalla
rm -rf node_modules .next
pnpm install
```

### TanStack Query: "No QueryClient set"

**Sintomo**: Errore React durante uso `useQuery`

**Soluzione**:
```tsx
// Verifica che _app.tsx abbia QueryClientProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
```

---

## Problemi Performance

### API lenta (>1s per richiesta)

**Debug**:
```bash
# Abilita query logging Prisma
DATABASE_URL="postgresql://...?connect_timeout=10&pool_timeout=10&socket_timeout=10"
```

**Soluzioni**:

1. **Indici mancanti**: Aggiungi `@@index` in Prisma schema
2. **N+1 queries**: Usa `include` invece di query separate
3. **Connection pool saturo**: Aumenta `connection_limit` in DATABASE_URL

### Build lento

**Sintomo**: `pnpm build` richiede >10 minuti

**Soluzioni**:

1. **Incrementa cache**:
```bash
# Turbo cache
pnpm build --cache-dir=.turbo
```

2. **Build singolo workspace**:
```bash
pnpm --filter api build
```

---

## Comandi Debug Utili

```bash
# === Docker ===
docker ps -a                     # Tutti container
docker logs -f <container>       # Logs real-time
docker inspect <container>       # Info dettagliate
docker stats                     # Resource usage

# === Database ===
docker exec -it influencerai-postgres psql -U postgres influencerai
\dt                              # Lista tabelle
\d "Dataset"                     # Schema tabella

# === Redis ===
docker exec -it influencerai-redis redis-cli
KEYS *                           # Tutte chiavi
LLEN bull:content-generation:waiting  # Lunghezza queue

# === MinIO ===
mc alias set local http://localhost:9000 minio minio12345
mc ls local/assets --recursive   # Lista oggetti
mc stat local/assets/test.jpg    # Info oggetto

# === Process ===
lsof -i :3001                    # Processo su porta (Mac/Linux)
ps aux | grep node               # Processi Node.js
top -p $(pgrep -d',' node)       # Resource usage Node
```

---

## Supporto

Se il problema persiste:

1. **Cerca issue esistenti**: GitHub Issues
2. **Crea nuovo issue**: Includi logs, versione Node.js, sistema operativo
3. **Slack/Discord**: Canale #support

---

## Riferimenti

- [Avvio Rapido](./avvio-rapido.md)
- [Setup Locale](./sviluppo-locale.md)
- [Deployment](../architecture/deployment.md)
