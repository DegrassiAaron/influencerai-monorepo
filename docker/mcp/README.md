# MCP Docker Services - Guida Completa

Questa directory contiene i Dockerfile e la configurazione Docker Compose per tutti i server MCP.

## Quick Start

### 1. Prerequisiti

- Docker 24.0+
- Docker Compose v2+
- Almeno 4GB RAM disponibile
- 10GB spazio disco

### 2. Configurazione

```bash
# Copia il file di esempio
cp .env.example .env

# Modifica con i tuoi valori
nano .env  # oppure vim, code, etc.
```

### 3. Build delle Immagini

**IMPORTANTE**: Esegui sempre dalla root del repository, non da `docker/mcp`!

```bash
# Dalla root del monorepo
cd D:/Repositories/meepleai-monorepo

# Build tutte le immagini
docker compose -f docker/mcp/docker-compose.yml build

# Build singola immagine
docker compose -f docker/mcp/docker-compose.yml build github-project-manager
```

### 4. Avvio dei Servizi

```bash
# Dalla root del monorepo
cd D:/Repositories/meepleai-monorepo

# Avvia tutti i servizi
docker compose -f docker/mcp/docker-compose.yml up -d

# Avvia servizi specifici
docker compose -f docker/mcp/docker-compose.yml up -d github-project-manager memory-bank

# Visualizza lo stato
docker compose -f docker/mcp/docker-compose.yml ps

# Visualizza i log
docker compose -f docker/mcp/docker-compose.yml logs -f

# Ferma tutti i servizi
docker compose -f docker/mcp/docker-compose.yml down
```

## Comandi di Sicurezza

### Avvio Sicuro per Claude CLI

Ogni MCP server può essere avviato con il seguente comando sicuro:

```bash
# Template generale
claude mcp add [nome-mcp] -- docker run -i \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 128 \
  --memory 512m \
  --user $(id -u):$(id -g) \
  --rm \
  [nome-immagine]

# Esempio: GitHub Project Manager
claude mcp add github -- docker run -i \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 128 \
  --memory 512m \
  --user $(id -u):$(id -g) \
  --rm \
  -e GITHUB_TOKEN=${GITHUB_TOKEN} \
  -e GITHUB_OWNER=${GITHUB_OWNER} \
  -e GITHUB_REPO=${GITHUB_REPO} \
  meepleai/mcp-github:latest

# Esempio: Memory Bank (con volume persistente)
claude mcp add memory -- docker run -i \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 128 \
  --memory 512m \
  --user $(id -u):$(id -g) \
  --rm \
  -v mcp-memory:/data:rw \
  meepleai/mcp-memory:latest
```

### Spiegazione dei Flag di Sicurezza

| Flag | Scopo |
|------|-------|
| `--read-only` | Filesystem read-only, previene modifiche |
| `--tmpfs /tmp:rw,size=64m` | Solo /tmp è scrivibile, limitato a 64MB |
| `--cap-drop ALL` | Rimuove tutte le Linux capabilities |
| `--security-opt no-new-privileges` | Impedisce escalation di privilegi |
| `--pids-limit 128` | Limita il numero di processi |
| `--memory 512m` | Limita la memoria RAM a 512MB |
| `--user $(id -u):$(id -g)` | Esegue come utente non-root |
| `--rm` | Rimuove il container all'uscita |

## Configurazione Claude Desktop

Aggiungi i server MCP al file di configurazione:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--read-only",
        "--tmpfs", "/tmp:rw,size=64m",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--pids-limit", "128",
        "--memory", "512m",
        "--user", "1000:1000",
        "-e", "GITHUB_TOKEN",
        "-e", "GITHUB_OWNER",
        "-e", "GITHUB_REPO",
        "meepleai/mcp-github:latest"
      ],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "GITHUB_OWNER": "your-username",
        "GITHUB_REPO": "your-repo"
      }
    },
    "memory": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--read-only",
        "--tmpfs", "/tmp:rw,size=64m",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--pids-limit", "128",
        "--memory", "512m",
        "--user", "1000:1000",
        "-v", "mcp-memory:/data:rw",
        "meepleai/mcp-memory:latest"
      ]
    },
    "knowledge-graph": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--read-only",
        "--tmpfs", "/tmp:rw,size=64m",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--pids-limit", "128",
        "--memory", "512m",
        "--user", "1000:1000",
        "--network", "mcp-network",
        "-e", "QDRANT_URL=http://qdrant:6333",
        "-e", "OPENROUTER_API_KEY",
        "meepleai/mcp-knowledge-graph:latest"
      ],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-your-key"
      }
    }
  }
}
```

## Gestione Volumi

### Backup

```bash
# Backup Memory Bank
docker run --rm \
  -v mcp-memory:/data:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/memory-backup-$(date +%Y%m%d).tar.gz /data

# Backup Claude Context
docker run --rm \
  -v mcp-context:/data:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/context-backup-$(date +%Y%m%d).tar.gz /data
```

### Restore

```bash
# Restore Memory Bank
docker run --rm \
  -v mcp-memory:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/memory-backup-20241201.tar.gz
```

### Pulizia

```bash
# Rimuovi volumi non utilizzati (ATTENZIONE: elimina i dati!)
docker volume prune

# Rimuovi volumi specifici
docker volume rm mcp-memory mcp-context
```

## Monitoring

### Statistiche Real-Time

```bash
# Tutte le statistiche
docker stats

# Solo MCP containers
docker stats $(docker ps --filter "name=mcp-" --format "{{.Names}}")
```

### Log Management

```bash
# Segui i log di tutti i servizi
docker-compose logs -f

# Log di un servizio specifico
docker-compose logs -f github-project-manager

# Ultimi 100 righe
docker-compose logs --tail=100 memory-bank

# Log con timestamp
docker-compose logs -t knowledge-graph
```

### Health Checks

```bash
# Verifica salute dei container
docker-compose ps

# Ispezione dettagliata
docker inspect --format='{{json .State.Health}}' mcp-github | jq
```

## Troubleshooting

### Container non si avvia

```bash
# Verifica i log
docker-compose logs [nome-servizio]

# Verifica la configurazione
docker-compose config

# Ricrea il container
docker-compose up -d --force-recreate [nome-servizio]
```

### Problemi di permessi

```bash
# Verifica UID/GID
id -u  # Dovrebbe essere 1000
id -g  # Dovrebbe essere 1000

# Se diverso, modifica docker-compose.yml
user: "$(id -u):$(id -g)"
```

### Memoria insufficiente

```bash
# Verifica l'uso della memoria
docker stats --no-stream

# Aumenta i limiti in docker-compose.yml se necessario
mem_limit: 1024m
```

### Network issues

```bash
# Verifica le reti
docker network ls

# Ricrea la rete
docker network rm mcp-network
docker-compose up -d
```

## Security Scanning

### Scan delle Immagini

```bash
# Usa Docker Scan
docker scan meepleai/mcp-github:latest

# Usa Trivy
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image meepleai/mcp-github:latest

# Scan tutte le immagini MCP
for img in github memory sequential playwright magic claude-context knowledge-graph; do
  echo "Scanning meepleai/mcp-$img:latest..."
  trivy image meepleai/mcp-$img:latest
done
```

### Verifica Configurazione

```bash
# Docker Bench Security
docker run --rm --net host --pid host --userns host --cap-add audit_control \
  -v /var/lib:/var/lib \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc:/etc:ro \
  docker/docker-bench-security
```

## Performance Tuning

### Ottimizzazione Build

```bash
# Build con cache
docker-compose build

# Build senza cache
docker-compose build --no-cache

# Build parallelo
docker-compose build --parallel
```

### Resource Limits

Modifica `docker-compose.yml` per adattare i limiti:

```yaml
services:
  github-project-manager:
    mem_limit: 512m        # Aumenta se necessario
    memswap_limit: 512m    # Disabilita swap
    cpus: '0.5'            # Limita CPU al 50%
    pids_limit: 128        # Limita processi
```

## Manutenzione

### Aggiornamenti

```bash
# Pull nuove immagini
docker-compose pull

# Rebuild e restart
docker-compose up -d --build

# Rimuovi immagini vecchie
docker image prune -a
```

### Pulizia Sistema

```bash
# Pulizia generale (ATTENZIONE)
docker system prune -a --volumes

# Pulizia sicura (senza volumi)
docker system prune -a
```

## Best Practices

1. **Backup Regolari**: Esegui backup dei volumi settimanalmente
2. **Monitoring**: Imposta alert per uso eccessivo di risorse
3. **Updates**: Mantieni aggiornate le immagini base
4. **Secrets**: Non committare mai `.env` nel repository
5. **Logs**: Ruota i log per evitare crescita illimitata
6. **Testing**: Testa sempre in ambiente di sviluppo prima di produzione

## Supporto

- **Documentazione**: Vedi `mcp/*/README.md` per ogni server
- **Issues**: [GitHub Issues](https://github.com/DegrassiAaron/meepleai-monorepo/issues)
- **Security**: Segnala vulnerabilità via email privata
