# Architettura Deployment e Infrastruttura

**Versione**: 1.0
**Data ultimo aggiornamento**: 2025-10-18

---

## Sommario

Questo documento descrive l'architettura di deployment, la configurazione Docker Compose, e le strategie di infrastruttura per gli ambienti di sviluppo e produzione di InfluencerAI.

---

## Indice

1. [Panoramica Infrastruttura](#panoramica-infrastruttura)
2. [Docker Compose Architecture](#docker-compose-architecture)
3. [Network Topology](#network-topology)
4. [Storage e Volumi](#storage-e-volumi)
5. [Configurazione Ambiente](#configurazione-ambiente)
6. [Deployment Sviluppo](#deployment-sviluppo)
7. [Deployment Produzione](#deployment-produzione-todo)
8. [Scaling Strategy](#scaling-strategy)
9. [Backup e Recovery](#backup-e-recovery)
10. [Monitoring e Logging](#monitoring-e-logging)

---

## Panoramica Infrastruttura

### Modello Current (Sviluppo Locale)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Host Machine                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Docker Desktop                          │  │
│  │                                                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │PostgreSQL│  │  Redis   │  │  MinIO   │              │  │
│  │  │  Port    │  │  Port    │  │  Port    │              │  │
│  │  │  5432    │  │  6379    │  │ 9000/9001│              │  │
│  │  └──────────┘  └──────────┘  └──────────┘              │  │
│  │                                                          │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │              n8n Workflow Engine                 │  │  │
│  │  │                Port 5678                         │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Node.js Processes (Local)                   │  │
│  │  ┌───────────┐  ┌────────────┐  ┌─────────────┐        │  │
│  │  │  Web App  │  │  API       │  │  Worker     │        │  │
│  │  │  Port     │  │  Port      │  │  (BullMQ)   │        │  │
│  │  │  3000     │  │  3001      │  │             │        │  │
│  │  └───────────┘  └────────────┘  └─────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              External Services (GPU)                     │  │
│  │  ┌──────────────┐  ┌──────────────────┐                │  │
│  │  │  ComfyUI     │  │  kohya_ss CLI    │                │  │
│  │  │  Port 8188   │  │  (Manual/n8n)    │                │  │
│  │  │  (GPU)       │  │  (GPU)           │                │  │
│  │  └──────────────┘  └──────────────────┘                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Caratteristiche**:
- **Servizi Containerizzati**: PostgreSQL, Redis, MinIO, n8n
- **Servizi Locali**: API, Web, Worker (hot reload con `pnpm dev`)
- **Servizi GPU Esterni**: ComfyUI e kohya_ss (non containerizzati per performance GPU)

---

## Docker Compose Architecture

### File: `infra/docker-compose.yml`

**Struttura Servizi**:

```yaml
version: '3.8'

services:
  # ===== Database =====
  postgres:
    image: postgres:15-alpine
    container_name: influencerai-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: influencerai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - influencerai-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ===== Cache & Queue =====
  redis:
    image: redis:7-alpine
    container_name: influencerai-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - influencerai-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # ===== Object Storage =====
  minio:
    image: minio/minio:latest
    container_name: influencerai-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio12345
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console UI
    volumes:
      - minio_data:/data
    networks:
      - influencerai-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ===== Workflow Orchestration =====
  n8n:
    image: n8nio/n8n:latest
    container_name: influencerai-n8n
    restart: unless-stopped
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin123
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - GENERIC_TIMEZONE=Europe/Rome
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=postgres
      - DB_POSTGRESDB_PASSWORD=postgres
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
      - ./apps/n8n/workflows:/workflows:ro  # Import workflows
    networks:
      - influencerai-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  n8n_data:
    driver: local

networks:
  influencerai-network:
    driver: bridge
```

---

## Network Topology

### Docker Bridge Network

**Nome**: `influencerai-network`
**Driver**: `bridge`
**Subnet**: `172.18.0.0/16` (auto-assigned)

**Service IPs** (esempio):
```
postgres:  172.18.0.2
redis:     172.18.0.3
minio:     172.18.0.4
n8n:       172.18.0.5
```

### Service Communication

**Containerizzati → Containerizzati**:
```typescript
// Da n8n a postgres (interno)
const connectionString = 'postgresql://postgres:postgres@postgres:5432/n8n';
```

**Locali → Containerizzati**:
```typescript
// Da API locale a postgres (host network)
const connectionString = 'postgresql://postgres:postgres@localhost:5432/influencerai';
```

**Tutti → External Services**:
```typescript
// Da qualsiasi servizio a ComfyUI (GPU host)
const comfyUrl = 'http://localhost:8188'; // o IP GPU machine
```

### Port Mapping

| Servizio | Container Port | Host Port | Accessibilità |
|----------|---------------|-----------|---------------|
| PostgreSQL | 5432 | 5432 | localhost, Docker network |
| Redis | 6379 | 6379 | localhost, Docker network |
| MinIO API | 9000 | 9000 | localhost, Docker network |
| MinIO Console | 9001 | 9001 | Browser (http://localhost:9001) |
| n8n | 5678 | 5678 | Browser (http://localhost:5678) |
| API (locale) | 3001 | 3001 | Browser (http://localhost:3001) |
| Web (locale) | 3000 | 3000 | Browser (http://localhost:3000) |
| ComfyUI (esterno) | 8188 | 8188 | localhost |

---

## Storage e Volumi

### Docker Volumes

**Named Volumes** (gestiti da Docker):

1. **postgres_data** - Database persistente
   - Path host: `/var/lib/docker/volumes/influencerai_postgres_data/_data`
   - Size: ~2-10 GB (dipende da utilizzo)
   - Backup: Dump SQL giornaliero

2. **redis_data** - Queue e cache persistente
   - Path host: `/var/lib/docker/volumes/influencerai_redis_data/_data`
   - Size: ~100 MB - 1 GB
   - Backup: AOF (append-only file) abilitato

3. **minio_data** - Object storage
   - Path host: `/var/lib/docker/volumes/influencerai_minio_data/_data`
   - Size: 50 GB+ (assets immagini e video)
   - Backup: S3 replication (produzione)

4. **n8n_data** - Workflow e credenziali
   - Path host: `/var/lib/docker/volumes/influencerai_n8n_data/_data`
   - Size: ~50-200 MB
   - Backup: Export workflow JSON giornaliero

### Host Mounts (Development)

**Bind mounts per sviluppo**:

```yaml
# Aggiungere in docker-compose.override.yml per sviluppo
services:
  postgres:
    volumes:
      - ./infra/init-scripts:/docker-entrypoint-initdb.d:ro

  n8n:
    volumes:
      - ./apps/n8n/workflows:/workflows:ro
```

### File System Layout

**Development**:
```
D:/Repositories/influencerai-monorepo/
├── data/                           # ⚠️ Gitignored, locale
│   ├── datasets/                   # Training datasets
│   │   └── <tenantId>/
│   │       └── <datasetName>/
│   │           ├── image001.jpg
│   │           └── image001.txt
│   ├── loras/                      # LoRA models output
│   │   └── <tenantId>/
│   │       └── influencer-name.safetensors
│   ├── outputs/                    # Temporary generation output
│   │   ├── images/
│   │   └── videos/
│   └── temp/                       # Temporary processing
│
├── infra/                          # Docker configs
│   ├── docker-compose.yml
│   ├── docker-compose.override.yml
│   └── init-scripts/
│
└── apps/
    ├── api/
    ├── web/
    ├── worker/
    └── n8n/
```

**Production** (MinIO-based):
```
MinIO Bucket: assets
├── datasets/
│   └── <tenantId>/
│       └── <datasetId>/
│           ├── manifest.json
│           └── images/
│               ├── img001.jpg
│               └── img001.txt
├── loras/
│   └── <tenantId>/
│       └── <loraId>.safetensors
├── images/
│   └── <tenantId>/
│       └── <jobId>/
│           └── output.png
└── videos/
    └── <tenantId>/
        └── <jobId>/
            └── output.mp4
```

---

## Configurazione Ambiente

### File `.env` Structure

**Root `.env`** (shared):
```bash
# ===== Environment =====
NODE_ENV=development
LOG_LEVEL=debug

# ===== Database =====
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/influencerai

# ===== Redis =====
REDIS_URL=redis://localhost:6379

# ===== MinIO S3 =====
S3_ENDPOINT=http://localhost:9000
S3_KEY=minio
S3_SECRET=minio12345
S3_BUCKET=assets
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true  # Required for MinIO

# ===== JWT =====
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# ===== OpenRouter =====
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# ===== ComfyUI =====
COMFYUI_URL=http://localhost:8188
COMFYUI_TIMEOUT=300000  # 5 minuti

# ===== n8n =====
N8N_WEBHOOK_URL=http://localhost:5678

# ===== Limits =====
MAX_UPLOAD_SIZE=100MB
MAX_DATASET_IMAGES=5000
MONTHLY_OPENROUTER_BUDGET=150.00  # USD

# ===== Feature Flags =====
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true
ENABLE_AUTO_CAPTIONS=false  # BLIP/CLIP auto-captioning
```

### App-Specific Config

**API** (`apps/api/.env`):
```bash
PORT=3001
CORS_ORIGIN=http://localhost:3000
SWAGGER_ENABLED=true
```

**Web** (`apps/web/.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

**Worker** (`apps/worker/.env`):
```bash
QUEUE_CONCURRENCY_CONTENT_GEN=3
QUEUE_CONCURRENCY_VIDEO_GEN=2
QUEUE_CONCURRENCY_LORA_TRAINING=1
```

---

## Deployment Sviluppo

### Quick Start (5 Minuti)

```bash
# 1. Clone repository
git clone <repo-url>
cd influencerai-monorepo

# 2. Create .env
cp .env.example .env
# Edit .env con le tue chiavi (almeno OPENROUTER_API_KEY)

# 3. Start Docker services
docker compose -f infra/docker-compose.yml up -d

# 4. Verify services
docker ps
# Dovresti vedere: postgres, redis, minio, n8n (4 container)

# 5. Setup database
cd apps/api
pnpm install
pnpm dlx prisma generate
pnpm dlx prisma migrate dev

# 6. Start development servers
cd ../..
pnpm install  # Install all workspace dependencies
pnpm dev      # Start API, Web, Worker in parallel

# 7. Verify endpoints
# Web: http://localhost:3000
# API: http://localhost:3001/api
# Swagger: http://localhost:3001/api/docs
# n8n: http://localhost:5678 (user: admin, pass: admin123)
# MinIO: http://localhost:9001 (user: minio, pass: minio12345)
```

### Verifica Health

```bash
# Test API
curl http://localhost:3001/health
# {"status":"ok","database":"connected","redis":"connected"}

# Test PostgreSQL
docker exec influencerai-postgres psql -U postgres -c "SELECT version();"

# Test Redis
docker exec influencerai-redis redis-cli ping
# PONG

# Test MinIO
curl http://localhost:9000/minio/health/live
# <MinIOHealthResponse>
```

### Sviluppo con Hot Reload

**Workflow tipico**:
```bash
# Terminal 1: Docker services
docker compose -f infra/docker-compose.yml up

# Terminal 2: API + Worker
pnpm --filter api dev
pnpm --filter worker dev

# Terminal 3: Web frontend
pnpm --filter web dev

# Terminal 4: Database tools
cd apps/api && pnpm dlx prisma studio
```

**Hot reload abilitato per**:
- API: Nodemon rileva cambi `.ts` file
- Web: Next.js Fast Refresh per React components
- Worker: Nodemon rileva cambi processor

---

## Deployment Produzione (TODO)

> **NOTA**: Deployment produzione è in fase di pianificazione. Questa sezione sarà completata in Q2 2025.

### Target Architecture (Kubernetes)

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                     Ingress NGINX                      │ │
│  │              (Load Balancer + SSL/TLS)                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                              ↓                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web Pod   │  │   API Pod   │  │  Worker Pod │        │
│  │  (3 replicas│  │ (5 replicas)│  │ (3 replicas)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                              ↓                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  PostgreSQL │  │Redis Cluster│  │MinIO Cluster│        │
│  │  (StatefulSet│  │ (3 nodes)  │  │  (4 nodes)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              GPU Node Pool (ComfyUI)                   │ │
│  │         (2x NVIDIA A10 o T4 instances)                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Componenti Pianificati

1. **Kubernetes Cluster**: GKE, EKS, o AKS
2. **Ingress Controller**: NGINX con Cert-Manager (Let's Encrypt SSL)
3. **Database**: PostgreSQL managed (AWS RDS, Google Cloud SQL)
4. **Cache/Queue**: Redis managed o ElastiCache
5. **Object Storage**: MinIO distributed o S3
6. **GPU Nodes**: Dedicated node pool con NVIDIA GPU
7. **Monitoring**: Prometheus + Grafana + Loki
8. **CI/CD**: GitHub Actions → Docker Registry → K8s

### Helm Chart Structure (Planned)

```
infra/helm/
├── Chart.yaml
├── values.yaml
├── values-production.yaml
├── values-staging.yaml
└── templates/
    ├── api/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   ├── hpa.yaml           # Horizontal Pod Autoscaler
    │   └── configmap.yaml
    ├── web/
    │   ├── deployment.yaml
    │   └── service.yaml
    ├── worker/
    │   ├── deployment.yaml
    │   └── hpa.yaml
    ├── ingress.yaml
    └── secrets.yaml
```

---

## Scaling Strategy

### Fase 1: Single Server (Current)

**Capacità**:
- 10-20 concurrent users
- 20-30 job/hour
- Single GPU (RTX 3060/4090)

**Bottleneck**: GPU saturation

---

### Fase 2: Horizontal Scaling (Q2 2025)

**Miglioramenti**:
- API: Scale to 3-5 replicas (stateless)
- Worker: Scale to 3-5 replicas (consumer concurrency)
- Redis: Cluster mode (3 master, 3 replica)
- Database: Read replicas (1 master, 2 read)

**Capacità**:
- 50-100 concurrent users
- 100+ job/hour
- Multi-GPU (2-4 GPU nodes)

**Costo stimato**: €300-500/mese

---

### Fase 3: Multi-Region (Q4 2025)

**Architettura**:
- Primary region: EU-West (Milan/Frankfurt)
- Secondary region: US-East (failover)
- Global CDN per static assets (CloudFlare)
- Database replication cross-region

**Capacità**:
- 500+ concurrent users
- 1000+ job/hour
- Auto-scaling GPU fleet (3-10 nodes)

**Costo stimato**: €1000-2000/mese

---

## Backup e Recovery

### Database Backup Strategy

**Frequency**:
- Full backup: Giornaliero (2:00 AM)
- Incremental: Ogni 6 ore
- Point-in-Time Recovery: Retention 30 giorni

**Script**:
```bash
#!/bin/bash
# scripts/backup-postgres.sh

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Dump database
docker exec influencerai-postgres pg_dump -U postgres influencerai | gzip > "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" s3://influencerai-backups/postgres/

# Cleanup old backups (keep 30 giorni)
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

**Cron Schedule**:
```cron
# Full backup ogni giorno alle 2:00 AM
0 2 * * * /opt/influencerai/scripts/backup-postgres.sh

# Incremental ogni 6 ore
0 */6 * * * /opt/influencerai/scripts/backup-postgres-incremental.sh
```

---

### MinIO Backup Strategy

**Metodo 1: S3 Replication** (Produzione)
```bash
# Configura replication verso S3
mc alias set minio-local http://localhost:9000 minio minio12345
mc alias set s3-backup s3.amazonaws.com ACCESS_KEY SECRET_KEY

mc replicate add minio-local/assets \
  --remote-bucket s3-backup/influencerai-assets-backup \
  --replicate "delete,delete-marker,existing-objects"
```

**Metodo 2: Periodic Sync** (Sviluppo)
```bash
#!/bin/bash
# scripts/backup-minio.sh

mc mirror --overwrite minio-local/assets /backups/minio/assets

# Upload to external S3
aws s3 sync /backups/minio/assets s3://influencerai-backups/minio/
```

---

### Disaster Recovery Procedure

**Scenario: Complete Data Loss**

**RTO** (Recovery Time Objective): 4 ore
**RPO** (Recovery Point Objective): 6 ore

**Steps**:
```bash
# 1. Restore Docker volumes
docker volume create postgres_data
docker volume create redis_data
docker volume create minio_data

# 2. Restore PostgreSQL
gunzip -c /backups/postgres/backup_latest.sql.gz | \
  docker exec -i influencerai-postgres psql -U postgres influencerai

# 3. Restore MinIO
aws s3 sync s3://influencerai-backups/minio/ /tmp/minio-restore
docker exec -i influencerai-minio mc cp --recursive \
  /tmp/minio-restore/ minio-local/assets/

# 4. Verify data integrity
docker exec influencerai-postgres psql -U postgres -c "SELECT COUNT(*) FROM \"Tenant\";"
docker exec influencerai-minio mc ls minio-local/assets --recursive | wc -l

# 5. Restart services
docker compose -f infra/docker-compose.yml restart

# 6. Smoke test
curl http://localhost:3001/health
```

---

## Monitoring e Logging

### Health Checks

**Liveness Probes** (Kubernetes):
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Readiness Probes**:
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Logging Strategy

**Formato**: JSON structured logs

```typescript
// Esempio log entry
{
  "timestamp": "2025-10-18T16:30:45.123Z",
  "level": "info",
  "service": "api",
  "tenantId": "t_abc123",
  "userId": "u_def456",
  "action": "dataset.create",
  "datasetId": "ds_ghi789",
  "duration": 145,  // ms
  "message": "Dataset created successfully"
}
```

**Aggregation**:
- Development: Console output + file (`logs/app.log`)
- Production: Loki + Grafana, retention 30 giorni

### Metriche Chiave

**System Metrics**:
```bash
# CPU Usage
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Disk Usage
df -h /var/lib/docker/volumes

# Network I/O
docker stats --no-stream --format "table {{.Container}}\t{{.NetIO}}"
```

**Application Metrics**:
- API request latency (p50, p95, p99)
- Job processing time
- Queue depth
- Error rate
- OpenRouter cost/day

**Dashboards**: Grafana (TODO Q2 2025)

---

## Security Considerations

### Network Security

**Firewall Rules** (Produzione):
```
# Allow only HTTPS ingress
Allow TCP 443 from 0.0.0.0/0

# Allow SSH from office IP only
Allow TCP 22 from 203.0.113.0/24

# Deny all other ingress
Deny all from 0.0.0.0/0

# Allow all egress (per API calls OpenRouter)
Allow all to 0.0.0.0/0
```

### Secrets Management

**Development**: `.env` file (gitignored)

**Production**: Kubernetes Secrets + External Secrets Operator
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql://...
  OPENROUTER_API_KEY: sk-or-v1-...
  JWT_SECRET: ...
```

**Best Practices**:
- Rotate JWT secret ogni 90 giorni
- Rotate MinIO/Redis credentials ogni 90 giorni
- Rotate OpenRouter API key ogni 180 giorni
- Use AWS Secrets Manager o HashiCorp Vault per produzione

### SSL/TLS

**Development**: HTTP (localhost)

**Production**: HTTPS con Let's Encrypt
```bash
# Cert-Manager Kubernetes
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# ClusterIssuer per Let's Encrypt
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@influencerai.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

---

## Troubleshooting Deployment

### Issue 1: Container Won't Start

**Sintomo**:
```bash
docker ps
# influencerai-postgres: Restarting (1) Less than a second ago
```

**Debug**:
```bash
# Check logs
docker logs influencerai-postgres

# Check volume permissions
docker inspect influencerai-postgres | grep -A 10 "Mounts"

# Check health
docker inspect influencerai-postgres | grep -A 5 "Health"
```

**Soluzioni Comuni**:
- Volume corruption: `docker volume rm postgres_data && docker compose up -d`
- Port conflict: `lsof -i :5432` (kill process or change port)
- Memory limit: Increase Docker Desktop memory (Settings → Resources)

---

### Issue 2: n8n Can't Connect to PostgreSQL

**Sintomo**: n8n logs show "Connection refused to postgres:5432"

**Cause**: PostgreSQL not ready when n8n starts

**Soluzione**: Aggiungi `depends_on` con health check
```yaml
n8n:
  depends_on:
    postgres:
      condition: service_healthy
```

---

### Issue 3: MinIO Out of Disk Space

**Sintomo**: Upload fails con 507 Insufficient Storage

**Debug**:
```bash
# Check Docker volume size
docker system df -v | grep minio

# Check host disk
df -h /var/lib/docker
```

**Soluzione**:
```bash
# Cleanup old assets (retention 90 giorni)
pnpm --filter worker run cleanup-old-assets

# Or extend disk (cloud provider)
# AWS: Modify EBS volume size
# GCP: gcloud compute disks resize <disk-name> --size 200GB
```

---

## Comandi Utili

### Docker Management

```bash
# Start all services
docker compose -f infra/docker-compose.yml up -d

# Stop all services
docker compose -f infra/docker-compose.yml down

# Stop and remove volumes (⚠️ DATA LOSS)
docker compose -f infra/docker-compose.yml down -v

# View logs
docker compose -f infra/docker-compose.yml logs -f

# Restart single service
docker compose -f infra/docker-compose.yml restart postgres

# Check resource usage
docker stats

# Prune unused resources
docker system prune -a
```

### Database Management

```bash
# Open PostgreSQL CLI
docker exec -it influencerai-postgres psql -U postgres influencerai

# Run migration
cd apps/api && pnpm dlx prisma migrate dev

# Seed database
cd apps/api && pnpm dlx prisma db seed

# Prisma Studio
cd apps/api && pnpm dlx prisma studio
```

### MinIO Management

```bash
# MinIO CLI (mc)
mc alias set minio-local http://localhost:9000 minio minio12345

# List buckets
mc ls minio-local

# List objects
mc ls minio-local/assets --recursive

# Create bucket
mc mb minio-local/new-bucket

# Copy object
mc cp local-file.jpg minio-local/assets/test.jpg

# Generate presigned URL
mc share download minio-local/assets/test.jpg --expire 1h
```

---

## Riferimenti

- [Panoramica Architettura](./panoramica.md)
- [Flusso Dati](./flusso-dati.md)
- [Guida Setup](../getting-started/avvio-rapido.md)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

---

**Ultimo Aggiornamento**: 2025-10-18
**Prossimo Review**: 2025-11-18
**Owner**: Team DevOps
