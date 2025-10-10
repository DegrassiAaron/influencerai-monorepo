# MCP Servers - Model Context Protocol

Questa directory contiene i server MCP (Model Context Protocol) configurati per l'uso con Claude Code e altre applicazioni compatibili.

## Server Installati

### ✅ Operativi (Healthy)
1. **[Github Project Manager](./github-project-manager/)** - Gestione progetti GitHub (mcp-github) ✓
2. **[n8n Workflow Manager](./n8n/)** - Gestione e automazione workflows n8n (mcp-n8n) ✓
3. **[Memory Bank](./memory-bank/)** - Sistema di memoria persistente (mcp-memory) ✓

### ✅ Operativi (Running)
4. **[Sequential Thinking](./sequential/)** - Pensiero sequenziale e ragionamento (mcp-sequential) ✓
5. **[Playwright](./playwright/)** - Automazione browser e testing (mcp-playwright) ✓
6. **[Magic](./magic/)** - Funzionalità avanzate e utility (mcp-magic) ✓
7. **[Claude Context](./claude-context/)** - Gestione contesto conversazionale (mcp-claude-context) ✓
8. **[Knowledge Graph](./knowledge-graph/)** - Grafo di conoscenza e relazioni (mcp-knowledge-graph) ✓

**Nota**: Tutti i server sono attivi e funzionanti. I server con health check mostrano stato "Healthy", gli altri sono in esecuzione stabile.

## Architettura di Sicurezza

Tutti i server MCP sono containerizzati con Docker e configurati con le seguenti misure di sicurezza:

- **Read-only filesystem**: I container non possono modificare il filesystem
- **Dropped capabilities**: Tutte le capacità Linux sono rimosse
- **No new privileges**: Impedisce escalation di privilegi
- **Resource limits**: Limiti di memoria, CPU e processi
- **Non-root user**: Esecuzione come utente non privilegiato
- **Tmpfs mount**: Solo /tmp è scrivibile (64MB)

## Quick Start

### Prerequisiti

- Docker 24.0+
- Docker Compose v2+
- Claude Desktop o Claude CLI
- Git

### Avvio Rapido

```bash
# Avvia tutti i server MCP
cd docker/mcp
docker-compose up -d

# Verifica lo stato
docker-compose ps

# Visualizza i log
docker-compose logs -f

# Ferma tutti i server
docker-compose down
```

### Configurazione Claude Desktop

Aggiungi i server MCP al file di configurazione di Claude Desktop:

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
        "meepleai/mcp-github:latest"
      ],
      "env": {
        "GITHUB_TOKEN": "your-token-here"
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
    }
  }
}
```

## Configurazione Avanzata

### Variabili d'Ambiente

Crea un file `.env` nella directory `docker/mcp/`:

```bash
# GitHub
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo

# OpenRouter (per AI features)
OPENROUTER_API_KEY=sk-or-v1-...

# Memory Bank
MEMORY_PATH=/data/memory
MEMORY_MAX_SIZE=100MB

# Knowledge Graph
KG_QDRANT_URL=http://qdrant:6333
KG_COLLECTION=knowledge_graph
```

### Build delle Immagini

```bash
# Build tutte le immagini
cd docker/mcp
docker-compose build

# Build singola immagine
docker build -t meepleai/mcp-github:latest -f Dockerfile.github .
```

### Volumi Persistenti

I seguenti server utilizzano volumi per la persistenza dei dati:

- **memory-bank**: `mcp-memory` → `/data`
- **knowledge-graph**: `mcp-knowledge` → `/data`

```bash
# Backup dei volumi
docker run --rm -v mcp-memory:/data -v $(pwd):/backup alpine tar czf /backup/memory-backup.tar.gz /data

# Restore dei volumi
docker run --rm -v mcp-memory:/data -v $(pwd):/backup alpine tar xzf /backup/memory-backup.tar.gz
```

## Utilizzo dei Server

Ogni server ha funzionalità specifiche accessibili tramite tools MCP:

### Github Project Manager
- `github_create_issue`: Crea issue
- `github_list_issues`: Lista issue
- `github_create_pr`: Crea pull request
- `github_review_code`: Review codice

### Memory Bank
- `memory_store`: Memorizza informazioni
- `memory_recall`: Recupera ricordi
- `memory_search`: Cerca nella memoria
- `memory_forget`: Elimina ricordi

### Sequential Thinking
- `sequential_start`: Inizia ragionamento
- `sequential_step`: Passo di ragionamento
- `sequential_conclude`: Concludi ragionamento

### Playwright
- `browser_navigate`: Naviga URL
- `browser_click`: Clicca elemento
- `browser_screenshot`: Cattura screenshot
- `browser_extract`: Estrai dati

### Magic
- `magic_execute`: Esegue comandi avanzati
- `magic_transform`: Trasforma dati
- `magic_analyze`: Analizza pattern

### Claude Context
- `context_save`: Salva contesto
- `context_load`: Carica contesto
- `context_merge`: Unisci contesti

### Knowledge Graph
- `kg_add_entity`: Aggiungi entità
- `kg_add_relation`: Aggiungi relazione
- `kg_query`: Query il grafo
- `kg_visualize`: Visualizza grafo

### n8n Workflow Manager
- `n8n_list_workflows`: Lista workflows
- `n8n_create_workflow`: Crea workflow
- `n8n_execute_workflow`: Esegui workflow
- `n8n_list_executions`: Lista esecuzioni
- `n8n_export_workflow`: Esporta workflow
- `n8n_import_workflow`: Importa workflow

## Troubleshooting

### Server non si avvia

```bash
# Verifica i log
docker-compose logs [nome-server]

# Verifica configurazione
docker-compose config

# Ricrea i container
docker-compose up -d --force-recreate
```

### Problemi di permessi

```bash
# Verifica UID/GID
id -u  # Dovrebbe essere 1000
id -g  # Dovrebbe essere 1000

# Se necessario, modifica docker-compose.yml con i tuoi UID/GID
```

### Problemi di memoria

```bash
# Aumenta il limite di memoria in docker-compose.yml
mem_limit: 1024m  # Invece di 512m
```

### Connessione a servizi esterni

```bash
# Verifica che il container possa raggiungere i servizi
docker-compose exec github ping -c 3 api.github.com
docker-compose exec knowledge-graph ping -c 3 qdrant
```

## Sicurezza

### Best Practices

1. **Token e Secrets**
   - Non committare mai `.env` files
   - Usa Docker secrets per produzione
   - Ruota regolarmente i token

2. **Network Isolation**
   - Usa network Docker dedicati
   - Limita l'esposizione delle porte
   - Usa firewall per restrizioni

3. **Updates**
   - Mantieni aggiornate le immagini base
   - Scansiona vulnerabilità con `docker scan`
   - Monitora CVE per dipendenze

4. **Logging e Monitoring**
   - Centralizza i log
   - Monitora metriche di risorse
   - Imposta alert per anomalie

### Security Scanning

```bash
# Scansiona immagini per vulnerabilità
docker scan meepleai/mcp-github:latest

# Analizza configurazione di sicurezza
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image meepleai/mcp-github:latest
```

## Performance Tuning

### Resource Limits

Modifica i limiti in `docker-compose.yml` basandoti sull'uso:

```yaml
services:
  github:
    mem_limit: 512m      # Aumenta se necessario
    memswap_limit: 512m  # Disabilita swap
    cpus: '0.5'          # Limita CPU
    pids_limit: 128      # Limita processi
```

### Monitoring

```bash
# Statistiche real-time
docker stats

# Monitoring specifico
docker stats mcp-github mcp-memory
```

## Contribuire

Per aggiungere nuovi server MCP:

1. Crea directory in `mcp/[nome-server]/`
2. Aggiungi `README.md` con documentazione
3. Crea `Dockerfile` in `docker/mcp/Dockerfile.[nome-server]`
4. Aggiungi configurazione a `docker-compose.yml`
5. Testa con security constraints
6. Aggiorna questo README

## Licenza

Vedi [LICENSE](../LICENSE) per dettagli.

## Supporto

- **Issues**: [GitHub Issues](https://github.com/DegrassiAaron/meepleai-monorepo/issues)
- **Documentazione**: Vedi README individuali in ogni directory MCP
- **Community**: [Discussions](https://github.com/DegrassiAaron/meepleai-monorepo/discussions)
