# Sequential Thinking MCP Server

Server MCP per ragionamento sequenziale e pensiero passo-passo.

## Funzionalità

- Ragionamento strutturato passo-passo
- Chain-of-thought automatico
- Tracking del processo di pensiero

## Avvio

```bash
docker run -i --rm \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 128 \
  --memory 256m \
  --user $(id -u):$(id -g) \
  meepleai/mcp-sequential:latest
```

## Tools

- `sequential_start`: Inizia ragionamento
- `sequential_step`: Passo di ragionamento
- `sequential_conclude`: Conclude
