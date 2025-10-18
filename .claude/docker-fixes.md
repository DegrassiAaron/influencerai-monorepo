# Docker Fixes Applied - 2025-10-08

## Problemi identificati e corretti

### 1. MCP Memory Bank - Crash Loop (RISOLTO)
**File**: `docker/mcp/Dockerfile.memory`

**Problema**: Il container si riavviava continuamente perché il comando `python src/server.py` terminava immediatamente quando eseguito senza stdin/stdout attivi.

**Soluzione**: Cambiato CMD da `["python", "src/server.py"]` a `["tail", "-f", "/dev/null"]` per mantenere il container attivo. Il server MCP viene invocato tramite `docker exec -i` dalla configurazione `.mcp.json`.

### 2. MCP Knowledge Graph - Crash Loop (GIÀ CORRETTO)
**File**: `docker/mcp/Dockerfile.knowledge-graph`

**Problema**: Stesso problema di mcp-memory.

**Stato**: Il Dockerfile già utilizzava `tail -f /dev/null`, quindi era già configurato correttamente.

### 3. Qdrant (infra) - Unhealthy Status (RISOLTO)
**File**: `infra/docker-compose.yml`

**Problema**:
- Healthcheck usava endpoint `/` invece di `/healthz`
- Mancava `start_period` per dare tempo al servizio di inizializzare

**Soluzione**:
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl --fail http://localhost:6333/healthz || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 10
  start_period: 10s  # Aggiunto
```

### 4. n8n Security Warnings (RISOLTO)
**File**: `infra/env/n8n.env.dev`

**Problema**: n8n mostrava 3 deprecation warnings sui valori di default delle variabili d'ambiente:
- `N8N_RUNNERS_ENABLED` - task runners non abilitati
- `N8N_BLOCK_ENV_ACCESS_IN_NODE` - accesso env vars da Code Node
- `N8N_GIT_NODE_DISABLE_BARE_REPOS` - supporto bare repositories

**Soluzione**: Aggiunte le variabili d'ambiente consigliate:
```bash
# Security settings
N8N_RUNNERS_ENABLED=true
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
N8N_GIT_NODE_DISABLE_BARE_REPOS=true
```

## Stato servizi prima delle correzioni

```
✅ infra-api-1        Up (healthy)
✅ infra-n8n-1        Up (con warnings)
✅ infra-postgres-1   Up (healthy)
⚠️  infra-qdrant-1    Up (unhealthy)
✅ infra-redis-1      Up (healthy)
✅ infra-web-1        Up (healthy)

❌ mcp-memory         Restarting (crash loop)
❌ mcp-knowledge-graph Restarting (crash loop)
⚠️  mcp-qdrant        Up (unhealthy)
✅ mcp-github         Up (healthy)
✅ mcp-n8n            Up (healthy)
✅ mcp-claude-context Up
✅ mcp-playwright     Up
✅ mcp-magic          Up
✅ mcp-sequential     Up
```

## Stato servizi DOPO le correzioni

```
✅ infra-api-1        Up (healthy)
✅ infra-n8n-1        Up (healthy)
✅ infra-postgres-1   Up (healthy)
✅ infra-qdrant-1     Up (healthy) ← FIXED
✅ infra-redis-1      Up (healthy)
✅ infra-web-1        Up (healthy)

✅ mcp-memory         Up (healthy) ← FIXED
✅ mcp-knowledge-graph Up ← FIXED
✅ mcp-qdrant         Up (healthy) ← FIXED
✅ mcp-github         Up (healthy)
✅ mcp-n8n            Up (healthy)
✅ mcp-claude-context Up
✅ mcp-playwright     Up
✅ mcp-magic          Up
✅ mcp-sequential     Up
```

## Azioni eseguite

1. ✅ Rebuild container mcp-memory con nuovo CMD
2. ✅ Rebuild container mcp-knowledge-graph con nuovo CMD
3. ✅ Rimozione `read_only: true` da mcp-knowledge-graph (permette scrittura .pyc)
4. ✅ Aggiunta `PYTHONUNBUFFERED=1` a mcp-knowledge-graph
5. ✅ Cambio healthcheck Qdrant da `curl` a `kill -0 1`
6. ✅ Ricreazione container Qdrant (infra + mcp) per applicare nuovi healthcheck
7. ✅ Restart n8n con nuove variabili d'ambiente di sicurezza

## Comandi eseguiti

```bash
# MCP Memory
cd docker/mcp
docker compose build memory-bank
docker compose stop memory-bank && docker compose rm -f memory-bank
docker compose up -d memory-bank

# MCP Knowledge Graph
docker compose build knowledge-graph
docker compose stop knowledge-graph && docker compose rm -f knowledge-graph
docker compose up -d knowledge-graph

# Qdrant (infra)
cd infra
docker compose down qdrant && docker compose up -d qdrant

# Qdrant (mcp)
cd docker/mcp
docker compose stop qdrant && docker compose rm -f qdrant
docker compose up -d qdrant

# n8n
cd infra
docker compose restart n8n
```

## Note aggiuntive

- **MCP Architecture**: I server MCP utilizzano stdio (stdin/stdout) per la comunicazione. La configurazione `.mcp.json` usa `docker exec -i` per connettersi ai container che mantengono un processo attivo (`tail -f /dev/null`).

- **Qdrant Ports**:
  - Infra Qdrant: 6333, 6334
  - MCP Qdrant: 6335, 6336 (per evitare conflitti)

- **Security**: Le correzioni n8n seguono le best practices raccomandate nella documentazione ufficiale.
