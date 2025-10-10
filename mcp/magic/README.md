# Magic MCP Server

Server MCP per funzionalità AI avanzate e utility.

## Funzionalità

- Trasformazione dati avanzata
- Pattern matching intelligente
- Code generation assistita
- Multi-modal processing

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
  -e OPENROUTER_API_KEY=${OPENROUTER_API_KEY} \
  meepleai/mcp-magic:latest
```

## Tools

- `magic_execute`: Esegue comandi avanzati
- `magic_transform`: Trasforma dati
- `magic_analyze`: Analizza pattern
- `magic_generate`: Genera codice
