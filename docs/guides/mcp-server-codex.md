# Utilizzare un MCP Server con Codex

Questa guida descrive come integrare un server [Model Context Protocol (MCP)](https://modelcontextprotocol.io) con un client basato su Codex. L'obiettivo è poter interrogare strumenti MCP ("tools") direttamente dal workflow Codex, mantenendo un'architettura modulare e facilmente estendibile.

## Prerequisiti

1. **Server MCP disponibile**: deve esporre l'endpoint MCP su HTTP/S o WebSocket.
2. **Credenziali**: eventuali chiavi API o token richiesti dal server MCP.
3. **Client Codex**: l'SDK o le API Codex abilitate all'uso di estensioni MCP.
4. **Ambiente Node.js**: consigliato Node 18+ per sfruttare le librerie moderne dell'SDK.

## Passaggi di integrazione

### 1. Configurare il server MCP

- Registrare il server nel catalogo Codex aggiungendo una voce alla configurazione MCP del progetto (ad es. `mcp.config.json`).
- Specificare URL, tipo di trasporto, timeouts e meccanismi di autenticazione.
- Mappare i tool MCP alle capability Codex che si vogliono esporre.

```jsonc
{
  "servers": [
    {
      "id": "analytics-mcp",
      "transport": "websocket",
      "url": "wss://mcp.example.com/ws",
      "auth": {
        "type": "bearer",
        "token": "${MCP_TOKEN}"
      },
      "tools": [
        "metrics.query",
        "metrics.listDashboards"
      ]
    }
  ]
}
```

### 2. Abilitare l'estensione MCP lato Codex

- Importare il client MCP dell'SDK Codex (`@codex-ai/mcp-client` o simile).
- In fase di bootstrap del bot/servizio, istanziare il client MCP e registrarlo nel runtime Codex.

```ts
import { createCodexApp } from '@codex-ai/sdk';
import { createMcpClient } from '@codex-ai/mcp-client';

const app = createCodexApp();
const mcp = await createMcpClient({ configPath: './mcp.config.json' });

app.use(mcp.middleware());
```

### 3. Definire i tool Codex che delegano a MCP

- Creare wrapper che implementano l'interfaccia `CodexTool` e inoltrano le richieste al tool MCP corrispondente.
- Applicare i principi SOLID: ogni wrapper deve occuparsi di un solo tool (Single Responsibility) e dipendere da astrazioni (Dependency Inversion) per facilitare i test.

```ts
import { CodexTool } from '@codex-ai/sdk';
import { McpToolInvoker } from './mcpToolInvoker';

export class QueryMetricsTool implements CodexTool {
  constructor(private readonly invoker: McpToolInvoker) {}

  readonly name = 'queryMetrics';
  readonly description = 'Esegue query di analytics sul server MCP';

  async execute(input: QueryMetricsInput) {
    return this.invoker.invoke('metrics.query', input);
  }
}
```

### 4. Test-driven development (TDD)

1. Scrivere test unitari per ogni tool wrapper (ad es. con Jest o Vitest), utilizzando un mock di `McpToolInvoker`.
2. Eseguire i test (falliranno inizialmente).
3. Implementare la logica nel wrapper fino al passaggio dei test.
4. Introdurre test di integrazione con un server MCP di staging per validare le chiamate reali.

### 5. Deploy e osservabilità

- Sincronizzare le variabili d'ambiente (`MCP_TOKEN`, `MCP_URL`) nel sistema di CI/CD.
- Monitorare i log Codex per intercettare errori di handshake o timeouts.
- Configurare alerting su metriche chiave (latency MCP, error rate).

## Risoluzione dei problemi

| Sintomo | Possibile causa | Azione suggerita |
| --- | --- | --- |
| `Handshake failed` | URL errato o certificato TLS non valido | Verificare la reachability e il certificato del server MCP |
| `Unauthorized` | Token scaduto o permessi insufficienti | Rigenerare la chiave e aggiornare le variabili d'ambiente |
| `Tool not found` | Tool non registrato in `mcp.config.json` | Aggiungere il tool o correggere il nome |

## Risorse aggiuntive

- Documentazione MCP: <https://modelcontextprotocol.io>
- SDK Codex: consultare il README dell'SDK in uso per conoscere metodi e middleware disponibili.

