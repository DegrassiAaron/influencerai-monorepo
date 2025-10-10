# Memory Bank MCP Server

Server MCP per la gestione di memoria persistente e context a lungo termine per Claude.

## Funzionalità

- ✅ Memorizzazione persistente di informazioni
- ✅ Recupero semantico basato su embedding
- ✅ Organizzazione gerarchica dei ricordi
- ✅ Ricerca full-text e semantica
- ✅ Gestione di tag e categorie
- ✅ Export/Import dei dati

## Installazione

### 1. Build dell'Immagine

```bash
cd docker/mcp
docker build -t meepleai/mcp-memory:latest -f Dockerfile.memory .
```

### 2. Avvia il Server

```bash
# Con volume persistente
docker run -i --rm \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 128 \
  --memory 512m \
  --user $(id -u):$(id -g) \
  -v mcp-memory:/data:rw \
  meepleai/mcp-memory:latest
```

## Configurazione Claude Desktop

```json
{
  "mcpServers": {
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

## Tools Disponibili

### `memory_store`
Memorizza informazioni nella banca dati.

```json
{
  "content": "Il cliente preferisce comunicazioni via email",
  "tags": ["cliente", "preferenze", "comunicazione"],
  "category": "business",
  "metadata": {
    "client_id": "12345",
    "importance": "high"
  }
}
```

### `memory_recall`
Recupera ricordi in base a query semantica.

```json
{
  "query": "preferenze di comunicazione del cliente",
  "limit": 5,
  "category": "business"
}
```

### `memory_search`
Ricerca full-text nei ricordi.

```json
{
  "text": "email",
  "tags": ["cliente"],
  "date_from": "2024-01-01"
}
```

### `memory_forget`
Elimina ricordi specifici.

```json
{
  "memory_id": "uuid-here",
  "confirm": true
}
```

### `memory_export`
Esporta tutti i ricordi in JSON.

### `memory_import`
Importa ricordi da file JSON.

## Esempi d'Uso

```
"Ricorda che il cliente XYZ preferisce ricevere report settimanali via email il lunedì mattina"
→ memory_store

"Quali sono le preferenze di comunicazione del cliente XYZ?"
→ memory_recall

"Cerca tutti i ricordi relativi a report"
→ memory_search
```

## Backup e Restore

```bash
# Backup
docker run --rm -v mcp-memory:/data -v $(pwd):/backup alpine tar czf /backup/memory-backup.tar.gz /data

# Restore
docker run --rm -v mcp-memory:/data -v $(pwd):/backup alpine tar xzf /backup/memory-backup.tar.gz
```
