# Come Usare i Server MCP

## Architettura MCP (Model Context Protocol)

I server MCP comunicano tramite **stdio** (standard input/output) e sono progettati per essere invocati **on-demand** da client MCP come Claude Desktop, non per girare come servizi daemon standalone.

## ⚠️ IMPORTANTE: Non Usare docker-compose up

**NON eseguire** `docker-compose up -d` per far girare i server MCP come servizi continui. I container andranno in crash-loop perché i server MCP si aspettano di comunicare via stdio con un client.

## Metodo di Utilizzo Corretto

### 1. Configurazione con Claude Desktop (Raccomandato)

I server MCP devono essere configurati nel file di configurazione di Claude Desktop per essere eseguiti automaticamente quando necessario.

**Percorso file di configurazione:**
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Esempio di configurazione:**

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--pids-limit", "128",
        "--memory", "512m",
        "--user", "1000:1000",
        "-e", "GITHUB_TOKEN",
        "-e", "GITHUB_OWNER",
        "-e", "GITHUB_REPO",
        "influencerai/mcp-github:latest"
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
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--pids-limit", "128",
        "--memory", "512m",
        "--user", "1000:1000",
        "-v", "mcp-memory:/data:rw",
        "influencerai/mcp-memory:latest"
      ]
    },
    "sequential": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "OPENROUTER_API_KEY",
        "influencerai/mcp-sequential:latest"
      ],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-your-key"
      }
    },
    "context7": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "CONTEXT7_API_KEY",
        "influencerai/mcp-context7:latest"
      ],
      "env": {
        "CONTEXT7_API_KEY": "your-context7-key"
      }
    },
    "magic": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "MAGIC_API_KEY",
        "influencerai/mcp-magic:latest"
      ],
      "env": {
        "MAGIC_API_KEY": "your-magic-key"
      }
    },
    "n8n": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "N8N_API_URL",
        "-e", "N8N_API_KEY",
        "influencerai/mcp-n8n:latest"
      ],
      "env": {
        "N8N_API_URL": "http://localhost:5678",
        "N8N_API_KEY": "your-n8n-key"
      }
    },
    "knowledge-graph": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "mcp-knowledge:/data:rw",
        "-e", "KG_DATA_PATH=/data",
        "influencerai/mcp-knowledge-graph:latest"
      ]
    },
    "playwright": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--shm-size", "512m",
        "--memory", "1024m",
        "influencerai/mcp-playwright:latest"
      ]
    }
  }
}
```

### 2. Esecuzione Manuale via Docker (Per Testing)

Per testare un server MCP manualmente:

```bash
# GitHub MCP
docker run -i --rm \
  -e GITHUB_TOKEN=your_token \
  -e GITHUB_OWNER=your_username \
  -e GITHUB_REPO=your_repo \
  influencerai/mcp-github:latest

# Memory MCP
docker run -i --rm \
  -v mcp-memory:/data:rw \
  influencerai/mcp-memory:latest

# Sequential Thinking MCP
docker run -i --rm \
  -e OPENROUTER_API_KEY=your_key \
  influencerai/mcp-sequential:latest
```

## Verificare le Immagini Installate

```bash
# Visualizza tutte le immagini MCP compilate
docker images | grep "influencerai/mcp-"

# Output atteso:
# influencerai/mcp-playwright        latest    ...    2.58GB
# influencerai/mcp-knowledge-graph   latest    ...    528MB
# influencerai/mcp-magic             latest    ...    453MB
# influencerai/mcp-n8n               latest    ...    339MB
# influencerai/mcp-context7          latest    ...    168MB
# influencerai/mcp-github            latest    ...    173MB
# influencerai/mcp-sequential        latest    ...    148MB
# influencerai/mcp-memory            latest    ...    145MB
```

## Volumi Persistenti

Due server MCP utilizzano volumi Docker per la persistenza dei dati:

- `mcp-memory`: volume `mcp-memory` per memorizzare il knowledge graph
- `knowledge-graph`: volume `mcp-knowledge` per i dati Qdrant

Questi volumi vengono automaticamente creati e montati quando i server vengono eseguiti.

## Aggiornare i Server MCP

Per aggiornare un server MCP alla versione più recente:

```bash
cd docker/mcp

# Rebuild di un server specifico
docker-compose build github

# Rebuild di tutti i server
docker-compose build --parallel

# Dopo il rebuild, le nuove immagini saranno automaticamente usate
# da Claude Desktop al prossimo avvio
```

## Troubleshooting

### Il server non si avvia in Claude Desktop

1. Verifica che l'immagine Docker esista:
   ```bash
   docker images | grep influencerai/mcp-
   ```

2. Testa il server manualmente:
   ```bash
   docker run -i --rm influencerai/mcp-github:latest
   ```

3. Verifica i log di Claude Desktop per eventuali errori

### Errori di permessi

Se ricevi errori di permessi, verifica che il tuo utente abbia UID 1000:
```bash
id -u  # Dovrebbe essere 1000
```

Se diverso, modifica il parametro `--user` nella configurazione di Claude Desktop.

### Server non riceve le variabili d'ambiente

Assicurati che le variabili d'ambiente siano correttamente configurate nella sezione `env` del file di configurazione di Claude Desktop.

## Rimuovere i Server MCP

```bash
# Rimuovi tutte le immagini MCP
docker images | grep "influencerai/mcp-" | awk '{print $3}' | xargs docker rmi

# Rimuovi i volumi (ATTENZIONE: elimina i dati persistenti!)
docker volume rm mcp-memory mcp-knowledge
```

## Riferimenti

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop MCP Configuration](https://docs.anthropic.com/claude/docs/mcp)
- Repository ufficiali dei server MCP: https://github.com/modelcontextprotocol/servers
