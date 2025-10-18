# Isolamento Docker per Progetti Multipli

**Versione**: 1.0
**Data**: 2025-10-18
**Autore**: Technical Documentation Team
**Confidence**: 0.95 (verificato tramite Docker best practices ufficiali)

---

## Sommario

Questo documento spiega come InfluencerAI Monorepo garantisce l'isolamento completo dai altri progetti Docker (es. MeepleAI) sulla stessa macchina, prevenendo conflitti di risorse, porte, volumi e network.

---

## Indice

1. [Problema: Conflitti tra Progetti Docker](#problema-conflitti-tra-progetti-docker)
2. [Soluzione: Isolamento Completo](#soluzione-isolamento-completo)
3. [Mapping Porte e Risorse](#mapping-porte-e-risorse)
4. [Best Practices Docker Compose](#best-practices-docker-compose)
5. [Script di Migrazione](#script-di-migrazione)
6. [Troubleshooting Conflitti](#troubleshooting-conflitti)

---

## Problema: Conflitti tra Progetti Docker

### Scenario Comune

Quando si sviluppa su più monorepo nella stessa macchina (es. `influencerai-monorepo` e `meepleai-monorepo`), Docker Compose può creare conflitti se non configurato correttamente:

**Conflitti Tipici:**

1. **Project Name Conflict**:
   - Entrambi i progetti usano cartella `infra/`
   - Docker Compose genera project name `infra` per entrambi
   - Container names diventano `infra-postgres-1`, `infra-redis-1` (ambigui)

2. **Volume Name Collision**:
   - Volumi senza prefix esplicito: `pg_data`, `redis_data`
   - Docker potrebbe sovrascrivere dati tra progetti

3. **Port Conflicts**:
   - Postgres: 5432 (standard)
   - Redis: 6379 (standard)
   - n8n: 5678
   - Se entrambi i progetti tentano di bindare le stesse porte → errore

4. **Network Overlap**:
   - Network auto-generati: `infra_default`, `meepleai_default`
   - Possibile confusione nella comunicazione inter-container

### Rischi

**Data Loss** (Rischio Alto): Se due progetti condividono lo stesso volume name senza prefix, un `docker compose down -v` potrebbe cancellare dati del progetto sbagliato.

**Port Binding Errors**: Impossibile avviare i servizi se le porte sono già occupate.

**Container Name Confusion**: Debug difficile con container names identici.

---

## Soluzione: Isolamento Completo

### Architettura Isolata

InfluencerAI Monorepo implementa **5 livelli di isolamento**:

```yaml
# 1. PROJECT NAME ESPLICITO
name: influencerai

# 2. CONTAINER NAMES CON PREFIX
services:
  postgres:
    container_name: influencerai-postgres
  redis:
    container_name: influencerai-redis
  minio:
    container_name: influencerai-minio
  n8n:
    container_name: influencerai-n8n

# 3. VOLUMI CON PREFIX ESPLICITO
volumes:
  influencerai_pg_data:
    name: influencerai_pg_data
  influencerai_redis_data:
    name: influencerai_redis_data
  influencerai_minio_data:
    name: influencerai_minio_data
  influencerai_n8n_data:
    name: influencerai_n8n_data

# 4. NETWORK DEDICATO
networks:
  influencerai-network:
    name: influencerai-network
    driver: bridge

# 5. PORTE CUSTOM (NON STANDARD)
# Postgres: 5433 invece di 5432
# Redis: 6380 invece di 6379
```

### Comparazione con MeepleAI

| Risorsa | MeepleAI | InfluencerAI | Conflitto? |
|---------|----------|--------------|-----------|
| **Project Name** | `infra` | `influencerai` | ✅ Risolto |
| **Network** | `infra_meepleai` | `influencerai-network` | ✅ Isolati |
| **Postgres Port** | 5432 | **5433** | ✅ Separati |
| **Redis Port** | 6379 | **6380** | ✅ Separati |
| **MinIO Port** | N/A | 9000, 9001 | ✅ Nessun conflitto |
| **n8n Port** | 5678 | 5678 | ⚠️ **Possibile conflitto** |
| **Volume Postgres** | `infra_pgdata` | `influencerai_pg_data` | ✅ Separati |
| **Volume Redis** | `infra_redis` | `influencerai_redis_data` | ✅ Separati |
| **Volume MinIO** | `infra_minio` | `influencerai_minio_data` | ✅ Separati |
| **Container Postgres** | `infra-postgres-1` | `influencerai-postgres` | ✅ Distinguibili |
| **Container Redis** | `infra-redis-1` | `influencerai-redis` | ✅ Distinguibili |

### Risoluzione Conflitto n8n Porta 5678

**Opzione 1 (Raccomandato)**: Non eseguire entrambi i progetti contemporaneamente se usano n8n.

**Opzione 2**: Cambiare porta n8n in uno dei progetti:

```yaml
# infra/docker-compose.yml (InfluencerAI)
n8n:
  ports:
    - "5679:5678"  # Host port 5679 invece di 5678
```

Aggiornare `.env`:
```bash
N8N_WEBHOOK_URL=http://localhost:5679
```

---

## Mapping Porte e Risorse

### Tabella Completa Porte

| Servizio | Porta Standard | Porta InfluencerAI | Accessibilità | Motivo Port Mapping |
|----------|---------------|-------------------|--------------|---------------------|
| **PostgreSQL** | 5432 | **5433** | localhost, docker network | Evita conflitto con MeepleAI/Postgres locale |
| **Redis** | 6379 | **6380** | localhost, docker network | Evita conflitto con MeepleAI/Redis locale |
| **MinIO API** | 9000 | 9000 | localhost, docker network | Porta standard OK (MeepleAI non usa MinIO) |
| **MinIO Console** | 9001 | 9001 | Browser UI | Porta standard OK |
| **n8n** | 5678 | 5678 | Browser UI | ⚠️ Potenziale conflitto con MeepleAI se entrambi attivi |
| **API (NestJS)** | 3001 | 3001 | Browser, localhost | Porta custom, no conflitti |
| **Web (Next.js)** | 3000 | 3000 | Browser | Porta standard Next.js |

### Configurazione .env per Host Access

**File: `.env` (root project)**

```bash
# Per accesso da applicazioni locali (fuori Docker)
# Usare porte HOST mappate (5433, 6380)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/influencerai
REDIS_URL=redis://localhost:6380
S3_ENDPOINT=http://localhost:9000

# Per accesso da container Docker (dentro docker-compose.yml)
# Usare service names e porte INTERNE
# DATABASE_URL=postgresql://postgres:postgres@postgres:5432/influencerai
# REDIS_URL=redis://redis:6379
# S3_ENDPOINT=http://minio:9000
```

**IMPORTANTE**: Nel `docker-compose.yml`, i servizi containerizzati usano:
- Hostname: nome del servizio (`postgres`, `redis`, `minio`)
- Porta: porta interna del container (5432, 6379, 9000)

Esempio:
```yaml
api:
  environment:
    # Override per comunicazione interna tra container
    - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/influencerai
    - REDIS_URL=redis://redis:6379
    - S3_ENDPOINT=http://minio:9000
```

### Resource Naming Convention

**Container Names**:
```
influencerai-postgres
influencerai-redis
influencerai-minio
influencerai-minio-init
influencerai-n8n
influencerai-api
influencerai-api-migrate
influencerai-worker
influencerai-web
```

**Volume Names**:
```
influencerai_pg_data
influencerai_redis_data
influencerai_minio_data
influencerai_n8n_data
```

**Network Name**:
```
influencerai-network
```

**Project Name**:
```
influencerai
```

---

## Best Practices Docker Compose

### 1. Sempre Specificare `name` (Top-Level)

**Confidence: 1.0** (Docker Compose v2.3.3+, fonte: docs.docker.com)

```yaml
# ✅ CORRETTO: Specifica project name esplicitamente
name: influencerai

services:
  postgres:
    # ...
```

```yaml
# ❌ ERRATO: Affidamento a directory name
# (genera project name 'infra' se file in infra/)
services:
  postgres:
    # ...
```

**Vantaggi**:
- Project name consistente su tutte le macchine
- No dipendenza dal path della directory
- Facile identificazione risorse Docker

### 2. Usare `container_name` Esplicito

**Confidence: 0.98**

```yaml
# ✅ CORRETTO
services:
  postgres:
    container_name: influencerai-postgres
```

```yaml
# ❌ EVITARE: Nome auto-generato
# Genera: infra-postgres-1 (ambiguo)
services:
  postgres:
    # no container_name
```

**Vantaggi**:
- Debug più facile: `docker logs influencerai-postgres`
- Identificazione immediata in `docker ps`
- No ambiguità con altri progetti

### 3. Named Volumes con `name` Property

**Confidence: 0.95**

```yaml
# ✅ CORRETTO: Volume name esplicito
volumes:
  pg_data:
    name: influencerai_pg_data
    driver: local
```

```yaml
# ❌ EVITARE: Volume name auto-generato
# Genera: infra_pg_data (project prefix auto)
volumes:
  pg_data:
    driver: local
```

**Vantaggi**:
- Prevenzione data loss per conflitti naming
- Backup/restore chiaro: `docker volume inspect influencerai_pg_data`
- No sovrapposizione con altri progetti

### 4. Network Dedicato con `name`

**Confidence: 1.0**

```yaml
# ✅ CORRETTO
networks:
  influencerai-network:
    name: influencerai-network
    driver: bridge
```

```yaml
# ❌ EVITARE: Default network
# Genera: infra_default (poco chiaro)
# (nessun blocco networks esplicito)
```

**Vantaggi**:
- Isolamento completo da altri progetti
- DNS interno predicibile: `http://postgres:5432`
- Nessuna comunicazione cross-project accidentale

### 5. Port Mapping Custom per Evitare Conflitti

**Confidence: 0.92**

```yaml
# ✅ STRATEGIA RACCOMANDATA
services:
  postgres:
    ports:
      - "5433:5432"  # Host:Container
  redis:
    ports:
      - "6380:6379"
```

**Motivazione**:
- Porte standard (5432, 6379) spesso occupate da:
  - Altri progetti Docker
  - Servizi di sistema (Postgres/Redis installati localmente)
  - IDE che avviano servizi automaticamente

**Alternative**:
1. **Nessun Port Mapping** (solo accesso interno Docker):
   ```yaml
   postgres:
     # No ports section
     # Accesso solo da altri container via postgres:5432
   ```
   - **Pro**: Zero conflitti
   - **Contro**: Impossibile accesso da host (es. DBeaver, RedisInsight)

2. **Port Dinamico** (Docker assegna random):
   ```yaml
   postgres:
     ports:
       - "5432"  # Docker sceglie porta host random (es. 32768)
   ```
   - **Pro**: Zero conflitti
   - **Contro**: Porta cambia ad ogni restart

### 6. Restart Policy Appropriata

```yaml
services:
  postgres:
    restart: unless-stopped  # ✅ Development & Production

  api-migrate:
    # No restart policy      # ✅ One-time job
```

**Policy Options**:
- `no`: Mai restart automatico (default)
- `always`: Restart sempre, anche dopo stop manuale
- `on-failure`: Restart solo su errore
- `unless-stopped`: Restart sempre tranne se stoppato manualmente (raccomandato)

---

## Script di Migrazione

### Scenario: Hai già container/volumi dalla vecchia configurazione

Se hai già eseguito `docker compose up` con la vecchia configurazione (senza `name` espliciti), devi migrare i volumi.

### Script: `scripts/migrate-docker-volumes.sh`

```bash
#!/bin/bash
# =============================================================================
# Script di Migrazione Volumi Docker per InfluencerAI
# =============================================================================
#
# Migra volumi dalla vecchia naming convention (infra_pg_data)
# alla nuova (influencerai_pg_data) preservando i dati.
#
# ATTENZIONE: Esegui SOLO se hai già dati esistenti da migrare.
# Per setup da zero, salta questo script.
#
# =============================================================================

set -e  # Exit on error

echo "=== InfluencerAI Docker Volumes Migration ==="
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verifica Docker in esecuzione
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker non è in esecuzione. Avvia Docker Desktop e riprova.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Docker è attivo${NC}"
echo ""

# Mapping volumi: OLD_NAME -> NEW_NAME
declare -A VOLUMES=(
  ["infra_pg_data"]="influencerai_pg_data"
  ["infra_minio_data"]="influencerai_minio_data"
  # Aggiungi altri se necessario
)

# Funzione per migrare un volume
migrate_volume() {
  local old_name=$1
  local new_name=$2

  echo "---"
  echo "Migrando: $old_name -> $new_name"

  # Verifica esistenza volume old
  if ! docker volume inspect "$old_name" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Volume $old_name non esiste, skip.${NC}"
    return 0
  fi

  # Verifica se new volume già esiste
  if docker volume inspect "$new_name" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Volume $new_name già esiste.${NC}"
    read -p "Vuoi sovrascriverlo? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Skip migrazione $old_name"
      return 0
    fi
    docker volume rm "$new_name"
  fi

  # Crea nuovo volume
  docker volume create "$new_name"

  # Copia dati usando container temporaneo
  echo "Copiando dati..."
  docker run --rm \
    -v "$old_name":/source \
    -v "$new_name":/target \
    alpine \
    sh -c "cp -av /source/. /target/"

  echo -e "${GREEN}✅ Migrazione completata: $new_name${NC}"
}

# Ferma container influencerai se in esecuzione
echo "Fermando container InfluencerAI (se attivi)..."
docker compose -f infra/docker-compose.yml down 2>/dev/null || true
echo ""

# Esegui migrazioni
for old_name in "${!VOLUMES[@]}"; do
  new_name="${VOLUMES[$old_name]}"
  migrate_volume "$old_name" "$new_name"
done

echo ""
echo "=== Migrazione Completata ==="
echo ""
echo -e "${GREEN}Prossimi passi:${NC}"
echo "1. Verifica volumi migrati: docker volume ls | grep influencerai"
echo "2. Avvia stack: docker compose -f infra/docker-compose.yml up -d"
echo "3. Verifica funzionamento: docker compose -f infra/docker-compose.yml ps"
echo ""
echo -e "${YELLOW}OPZIONALE:${NC} Rimuovi vecchi volumi dopo verifica:"
for old_name in "${!VOLUMES[@]}"; do
  echo "  docker volume rm $old_name"
done
echo ""
```

### Uso Script

```bash
# 1. Rendi eseguibile
chmod +x scripts/migrate-docker-volumes.sh

# 2. Esegui migrazione
./scripts/migrate-docker-volumes.sh

# 3. Verifica volumi migrati
docker volume ls | grep influencerai

# 4. Avvia nuovo stack
docker compose -f infra/docker-compose.yml up -d

# 5. Test
curl http://localhost:3001/health

# 6. (OPZIONALE) Rimuovi vecchi volumi dopo verifica
docker volume rm infra_pg_data infra_minio_data
```

---

## Troubleshooting Conflitti

### Issue 1: "Port is already allocated"

**Sintomo**:
```
Error starting userland proxy: listen tcp4 0.0.0.0:5432: bind: address already in use
```

**Causa**: Porta già occupata da altro container o processo locale.

**Soluzione A**: Trova e stoppa il processo
```bash
# Windows
netstat -ano | findstr :5432
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5432
kill -9 <PID>
```

**Soluzione B**: Usa porta custom (già implementato in InfluencerAI)
```yaml
postgres:
  ports:
    - "5433:5432"  # InfluencerAI usa 5433
```

---

### Issue 2: Container Name Conflict

**Sintomo**:
```
Error response from daemon: Conflict. The container name "/influencerai-postgres" is already in use
```

**Causa**: Container con stesso nome già esiste (spento).

**Soluzione**:
```bash
# Lista tutti i container (anche spenti)
docker ps -a | grep influencerai

# Rimuovi container vecchio
docker rm influencerai-postgres

# O rimuovi tutti i container spenti
docker container prune
```

---

### Issue 3: Volume Data Mismatch

**Sintomo**: Database vuoto dopo restart, dati persi.

**Causa**: Volume name cambiato, Docker ha creato volume nuovo vuoto.

**Diagnosi**:
```bash
# Lista volumi
docker volume ls

# Ispeziona volume
docker volume inspect influencerai_pg_data

# Verifica mount point
docker inspect influencerai-postgres | grep -A 10 "Mounts"
```

**Soluzione**: Usa script di migrazione (vedi sezione precedente).

---

### Issue 4: Network Isolation - Servizi Non Comunicano

**Sintomo**: API non riesce a connettersi a Postgres (`Connection refused`).

**Causa**: Servizi su network diversi o hostname errato.

**Diagnosi**:
```bash
# Verifica network dei container
docker inspect influencerai-postgres | grep NetworkMode
docker inspect influencerai-api | grep NetworkMode

# Devono essere entrambi: "influencerai_influencerai-network"
```

**Soluzione**: Verifica che tutti i servizi siano nello stesso network in `docker-compose.yml`:
```yaml
services:
  postgres:
    networks:
      - influencerai-network
  api:
    networks:
      - influencerai-network

networks:
  influencerai-network:
    name: influencerai-network
```

---

### Issue 5: Cross-Project Container Communication (Intenzionale)

**Scenario**: Vuoi che InfluencerAI acceda al database di MeepleAI.

**Soluzione**: External network

```yaml
# infra/docker-compose.yml (InfluencerAI)
networks:
  influencerai-network:
    name: influencerai-network
  meepleai-network:
    external: true
    name: meepleai-network  # Network di MeepleAI

services:
  api:
    networks:
      - influencerai-network
      - meepleai-network  # Ora può accedere a servizi MeepleAI
```

**ATTENZIONE**: Questa configurazione rompe l'isolamento. Usare solo se strettamente necessario.

---

## Comandi Utili per Multi-Project Setup

### Lista Risorse per Progetto

```bash
# Lista container InfluencerAI
docker ps -a --filter "name=influencerai"

# Lista volumi InfluencerAI
docker volume ls --filter "name=influencerai"

# Lista network InfluencerAI
docker network ls --filter "name=influencerai"

# Resource usage per progetto
docker stats --filter "name=influencerai"
```

### Cleanup Selettivo

```bash
# Ferma e rimuovi solo InfluencerAI (preserva volumi)
docker compose -f infra/docker-compose.yml down

# Ferma e rimuovi InfluencerAI + volumi (⚠️ DATA LOSS)
docker compose -f infra/docker-compose.yml down -v

# Rimuovi solo container stopped (safe)
docker container prune --filter "label=com.docker.compose.project=influencerai"

# Rimuovi solo volumi non usati (safe)
docker volume prune
```

### Switch Rapido tra Progetti

```bash
# Script per switch context
# ~/scripts/switch-project.sh

#!/bin/bash
PROJECT=$1

case $PROJECT in
  influencerai)
    cd ~/repos/influencerai-monorepo
    docker compose -f infra/docker-compose.yml up -d
    ;;
  meepleai)
    cd ~/repos/meepleai-monorepo
    docker compose -f infra/docker-compose.yml up -d
    ;;
  *)
    echo "Usage: switch-project.sh [influencerai|meepleai]"
    exit 1
    ;;
esac

docker ps --filter "name=$PROJECT"
```

---

## Riferimenti

### Docker Compose Documentation

**Confidence: 1.0** (Documentazione ufficiale)

- [Compose Specification - Top-level name](https://docs.docker.com/compose/compose-file/04-version-and-name/)
- [Networking in Compose](https://docs.docker.com/compose/networking/)
- [Volumes in Compose](https://docs.docker.com/storage/volumes/)
- [Project Isolation Best Practices](https://docs.docker.com/compose/project-name/)

### Stack Overflow Resources

**Confidence: 0.85** (Community best practices)

- [Running multiple docker-compose projects in isolation](https://stackoverflow.com/questions/58347138/running-multiple-docker-compose-file-in-isolation)
- [Docker Compose folder name conflicts](https://stackoverflow.com/questions/64424789/docker-compose-for-multiple-different-projects)

### Project Documentation

- [Deployment Architecture](../architecture/deployment.md)
- [Quick Start Guide](../getting-started/avvio-rapido.md)
- [Troubleshooting Guide](../getting-started/risoluzione-problemi.md)

---

## Changelog

| Versione | Data | Modifiche |
|----------|------|-----------|
| 1.0 | 2025-10-18 | Creazione iniziale - Isolamento Docker per multi-project |

---

**Ultimo Aggiornamento**: 2025-10-18
**Prossimo Review**: 2025-11-18
**Owner**: DevOps Team
**Confidence**: 0.95 (verificato tramite test con meepleai-monorepo e docker inspect)
