# MCP Configuration Fixes - 2025-10-08

## Problema

Claude Code non riusciva a connettersi ai server MCP locali con errore:
```
Failed to reconnect to claude-context.
```

## Causa

La configurazione `.mcp.json` conteneva comandi errati per invocare i server MCP nei container Docker. Specificatamente:

- **Server Python**: Configurati per usare `node /app/src/index.js` invece di `python server.py`
- **Server Node.js**: Solo `mcp-github` e `mcp-n8n` usano effettivamente Node.js

## Server MCP e loro runtime

### Server Node.js (2)
- ✅ `mcp-github` → `node /app/src/index.js`
- ✅ `mcp-n8n` → `node /app/src/index.js`

### Server Python (6)
- ✅ `mcp-memory` → `python src/server.py` (path diverso!)
- ✅ `mcp-sequential` → `python server.py`
- ✅ `mcp-playwright` → `python server.py`
- ✅ `mcp-magic` → `python server.py`
- ✅ `mcp-claude-context` → `python server.py`
- ✅ `mcp-knowledge-graph` → `python server.py`

## Correzioni applicate

### File: `.mcp.json`

**Prima (ERRATO)**:
```json
{
  "mcpServers": {
    "aakarsh-sasi-memory-bank-mcp": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-memory", "node", "/app/build/index.js"]
    },
    "sequential": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-sequential", "node", "/app/src/index.js"]
    },
    "playwright": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-playwright", "node", "/app/src/index.js"]
    },
    "magic": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-magic", "node", "/app/src/index.js"]
    },
    "claude-context": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-claude-context", "node", "/app/src/index.js"]
    },
    "knowledge-graph": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-knowledge-graph", "node", "/app/src/index.js"]
    }
  }
}
```

**Dopo (CORRETTO)**:
```json
{
  "mcpServers": {
    "aakarsh-sasi-memory-bank-mcp": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-memory", "python", "src/server.py"]
    },
    "sequential": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-sequential", "python", "server.py"]
    },
    "playwright": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-playwright", "python", "server.py"]
    },
    "magic": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-magic", "python", "server.py"]
    },
    "claude-context": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-claude-context", "python", "server.py"]
    },
    "knowledge-graph": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-knowledge-graph", "python", "server.py"]
    }
  }
}
```

## Test dei server

Tutti i server rispondono correttamente dopo le correzioni:

```bash
# Test mcp-memory
echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | docker exec -i mcp-memory python src/server.py
# Output: {"jsonrpc":"2.0","id":1,"result":{}}

# Test mcp-knowledge-graph
echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | docker exec -i mcp-knowledge-graph python server.py
# Output: {"jsonrpc":"2.0","id":1,"result":{}}

# Test mcp-sequential, mcp-playwright, mcp-magic, mcp-claude-context
# Tutti rispondono correttamente con lo stesso pattern
```

## Note importanti

1. **Path differente per mcp-memory**: Usa `src/server.py` invece di `server.py`
2. **Container attivi**: Tutti i container MCP devono essere in esecuzione con `CMD ["tail", "-f", "/dev/null"]` per rimanere attivi
3. **Comunicazione stdio**: I server MCP usano stdin/stdout per la comunicazione JSON-RPC
4. **Test manuale**: Usare `docker exec -i <container> python server.py` per testare la connessione

## Verifica stato container

```bash
docker ps --filter "name=mcp-" --format "table {{.Names}}\t{{.Status}}"
```

Output atteso:
```
NAMES                 STATUS
mcp-qdrant            Up (healthy)
mcp-knowledge-graph   Up
mcp-memory            Up (healthy)
mcp-claude-context    Up
mcp-playwright        Up
mcp-magic             Up
mcp-sequential        Up
mcp-github            Up (healthy)
mcp-n8n               Up (healthy)
```

## Prossimi passi

1. Riavviare Claude Code per ricaricare la configurazione `.mcp.json`
2. Verificare la connessione con `/mcp` command
3. Testare i tool MCP disponibili

## Struttura directory MCP

```
mcp/
├── memory-bank/
│   └── src/
│       └── server.py          ← Path: src/server.py
├── sequential/
│   └── server.py              ← Path: server.py
├── playwright/
│   └── server.py              ← Path: server.py
├── magic/
│   └── server.py              ← Path: server.py
├── claude-context/
│   └── server.py              ← Path: server.py
└── knowledge-graph/
    └── server.py              ← Path: server.py
```
