# Playwright MCP Server

Server MCP per automazione browser e web scraping.

## Funzionalità

- Navigazione browser automatizzata
- Screenshot e PDF capture
- Form filling e clicking
- Data extraction

## Avvio

```bash
docker run -i --rm \
  --cap-drop ALL \
  --cap-add SYS_ADMIN \
  --security-opt no-new-privileges \
  --pids-limit 256 \
  --memory 1024m \
  --shm-size 2gb \
  --user $(id -u):$(id -g) \
  -e PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright \
  meepleai/mcp-playwright:latest
```

## Tools

- `browser_navigate`: Naviga URL
- `browser_screenshot`: Cattura screenshot
- `browser_click`: Clicca elemento
- `browser_extract`: Estrai dati
