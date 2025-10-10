# Claude Context MCP Server

Server MCP per gestione contesto conversazionale di Claude.

## Funzionalità

- Salvataggio contesto conversazioni
- Merge di contesti multipli
- Recupero contesto storico
- Context compression

## Avvio

```bash
docker run -i --rm \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 128 \
  --memory 512m \
  --user $(id -u):$(id -g) \
  -v mcp-context:/data:rw \
  meepleai/mcp-claude-context:latest
```

## Tools

- `context_save`: Salva contesto
- `context_load`: Carica contesto
- `context_merge`: Unisci contesti
- `context_search`: Cerca in contesti
