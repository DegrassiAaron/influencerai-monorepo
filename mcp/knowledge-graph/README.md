# Knowledge Graph MCP Server

Server MCP per gestione grafo di conoscenza con Qdrant.

## Funzionalità

- Creazione entità e relazioni
- Query semantiche sul grafo
- Visualizzazione grafo
- Path finding

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
  --network mcp-network \
  -e QDRANT_URL=http://qdrant:6333 \
  -e QDRANT_COLLECTION=knowledge_graph \
  -e OPENROUTER_API_KEY=${OPENROUTER_API_KEY} \
  meepleai/mcp-knowledge-graph:latest
```

## Tools

- `kg_add_entity`: Aggiungi entità
- `kg_add_relation`: Aggiungi relazione
- `kg_query`: Query il grafo
- `kg_visualize`: Visualizza grafo
- `kg_find_path`: Trova percorso tra entità
