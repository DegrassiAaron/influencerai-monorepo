# n8n Workflow Manager MCP Server

Server MCP per gestione e automazione workflow n8n.

## Funzionalità

- ✅ Gestione completa workflows n8n
- ✅ Creazione e modifica workflows programmaticamente
- ✅ Esecuzione workflows on-demand
- ✅ Monitoraggio executions e logs
- ✅ Gestione credenziali e webhooks
- ✅ Import/Export workflows

## Prerequisiti

- Docker 24.0+
- n8n instance running (porta 5678)
- n8n API Key

## Installazione

### 1. Ottieni n8n API Key

1. Apri n8n: `http://localhost:5678`
2. Vai a Settings > API
3. Crea nuovo API Key
4. Copia il token

### 2. Configura Environment

Nel file `docker/mcp/.env`:

```bash
N8N_API_URL=http://n8n:5678/api/v1
N8N_API_KEY=n8n_api_your_key_here
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

### 3. Build dell'Immagine Docker

```bash
cd docker/mcp
docker build -t meepleai/mcp-n8n:latest -f Dockerfile.n8n .
```

### 4. Avvia il Server

```bash
# Avvio manuale con sicurezza
docker run -i --rm \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 128 \
  --memory 512m \
  --user $(id -u):$(id -g) \
  --network mcp-network \
  -e N8N_API_URL=${N8N_API_URL} \
  -e N8N_API_KEY=${N8N_API_KEY} \
  meepleai/mcp-n8n:latest

# Oppure usa docker-compose
docker-compose up n8n-manager
```

## Configurazione Claude Desktop

Aggiungi al file di configurazione (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "n8n": {
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
        "--network", "mcp-network",
        "-e", "N8N_API_URL",
        "-e", "N8N_API_KEY",
        "meepleai/mcp-n8n:latest"
      ],
      "env": {
        "N8N_API_URL": "http://n8n:5678/api/v1",
        "N8N_API_KEY": "n8n_api_your_key_here"
      }
    }
  }
}
```

## Tools Disponibili

### `n8n_list_workflows`
Elenca tutti i workflows disponibili.

**Parametri:**
```json
{
  "active": true,    // Solo workflows attivi (optional)
  "tags": ["prod"],  // Filtra per tags (optional)
  "limit": 50        // Numero massimo risultati (optional)
}
```

**Esempio d'uso:**
```
Mostrami tutti i workflows attivi in produzione
→ n8n_list_workflows con active=true, tags=["prod"]
```

### `n8n_get_workflow`
Recupera i dettagli di un workflow specifico.

**Parametri:**
```json
{
  "workflow_id": "123"  // ID del workflow
}
```

**Esempio d'uso:**
```
Mostrami i dettagli del workflow "Daily Report Generator"
→ n8n_get_workflow
```

### `n8n_create_workflow`
Crea un nuovo workflow.

**Parametri:**
```json
{
  "name": "New Workflow",
  "nodes": [...],         // Configurazione nodi
  "connections": {...},   // Connessioni tra nodi
  "active": false,        // Attiva immediatamente (optional)
  "tags": ["automation"]  // Tags (optional)
}
```

**Esempio d'uso:**
```
Crea un workflow che invia email ogni giorno alle 9:00
→ n8n_create_workflow con nodi Schedule Trigger e Send Email
```

### `n8n_update_workflow`
Modifica un workflow esistente.

**Parametri:**
```json
{
  "workflow_id": "123",
  "name": "Updated Name",     // Nuovo nome (optional)
  "nodes": [...],             // Nuova configurazione (optional)
  "active": true              // Cambia stato (optional)
}
```

**Esempio d'uso:**
```
Attiva il workflow "Daily Report Generator"
→ n8n_update_workflow con workflow_id, active=true
```

### `n8n_delete_workflow`
Elimina un workflow.

**Parametri:**
```json
{
  "workflow_id": "123",
  "confirm": true  // Conferma eliminazione
}
```

**Esempio d'uso:**
```
Elimina il workflow di test
→ n8n_delete_workflow
```

### `n8n_execute_workflow`
Esegue un workflow manualmente.

**Parametri:**
```json
{
  "workflow_id": "123",
  "data": {               // Dati input (optional)
    "customer_id": "456",
    "action": "send_report"
  }
}
```

**Esempio d'uso:**
```
Esegui il workflow "Generate Invoice" per il cliente 456
→ n8n_execute_workflow con data
```

### `n8n_list_executions`
Elenca le esecuzioni di un workflow.

**Parametri:**
```json
{
  "workflow_id": "123",  // ID workflow (optional, altrimenti tutte)
  "status": "success",   // "success", "error", "running" (optional)
  "limit": 20            // Numero risultati (optional)
}
```

**Esempio d'uso:**
```
Mostrami le ultime esecuzioni fallite
→ n8n_list_executions con status="error"
```

### `n8n_get_execution`
Recupera i dettagli di una esecuzione specifica.

**Parametri:**
```json
{
  "execution_id": "exec_123"
}
```

**Esempio d'uso:**
```
Mostrami perché l'esecuzione exec_123 è fallita
→ n8n_get_execution con execution_id
```

### `n8n_create_webhook`
Crea un nuovo webhook.

**Parametri:**
```json
{
  "workflow_id": "123",
  "path": "customer-signup",  // Percorso webhook
  "method": "POST",           // HTTP method
  "auth": "header"            // Tipo autenticazione (optional)
}
```

**Esempio d'uso:**
```
Crea un webhook per ricevere notifiche di signup
→ n8n_create_webhook
```

### `n8n_list_credentials`
Elenca le credenziali configurate.

**Parametri:**
```json
{
  "type": "slackApi"  // Filtra per tipo (optional)
}
```

### `n8n_test_workflow`
Testa un workflow senza salvarlo.

**Parametri:**
```json
{
  "nodes": [...],
  "connections": {...},
  "test_data": {...}  // Dati di test (optional)
}
```

**Esempio d'uso:**
```
Testa questo workflow prima di salvarlo
→ n8n_test_workflow
```

### `n8n_export_workflow`
Esporta un workflow in formato JSON.

**Parametri:**
```json
{
  "workflow_id": "123",
  "include_credentials": false  // Includi credenziali (ATTENZIONE)
}
```

### `n8n_import_workflow`
Importa un workflow da JSON.

**Parametri:**
```json
{
  "workflow_json": {...},     // Workflow in formato JSON
  "activate": false           // Attiva dopo import (optional)
}
```

## Esempi d'Uso Avanzati

### Workflow Completo: Data Pipeline

```
"Crea un workflow che:
1. Ogni giorno alle 8:00
2. Legge dati da PostgreSQL
3. Trasforma i dati
4. Carica su Google Sheets
5. Invia email di conferma"

→ n8n_create_workflow con:
  - Schedule Trigger (cron: "0 8 * * *")
  - Postgres Node (query dati)
  - Function Node (trasformazione)
  - Google Sheets Node (upload)
  - Send Email Node (notifica)
```

### Debugging Workflow Fallito

```
"Perché il workflow 'Daily Report' sta fallendo?"

1. n8n_list_executions(workflow_id="123", status="error")
2. n8n_get_execution(execution_id="exec_456")
3. Analizza errore e suggerisci fix
4. n8n_update_workflow con correzioni
```

### Automazione Completa

```
"Crea un sistema di notifiche per nuovi clienti"

1. n8n_create_webhook(path="new-customer")
2. n8n_create_workflow con:
   - Webhook Trigger
   - Validate Data
   - Create Customer in DB
   - Send Welcome Email
   - Notify Slack Channel
3. n8n_test_workflow con dati di esempio
4. n8n_update_workflow(active=true)
```

## Configurazione Avanzata

### Multiple n8n Instances

Per gestire più istanze n8n:

```json
{
  "mcpServers": {
    "n8n-prod": {
      "command": "docker",
      "args": ["..."],
      "env": {
        "N8N_API_URL": "https://n8n-prod.example.com/api/v1",
        "N8N_API_KEY": "prod_key"
      }
    },
    "n8n-dev": {
      "command": "docker",
      "args": ["..."],
      "env": {
        "N8N_API_URL": "http://localhost:5678/api/v1",
        "N8N_API_KEY": "dev_key"
      }
    }
  }
}
```

### Webhook Security

Configura autenticazione per webhooks:

```bash
# In n8n settings
N8N_WEBHOOK_TUNNEL_URL=https://your-domain.com
N8N_WEBHOOK_AUTH_HEADER=X-n8n-Auth
N8N_WEBHOOK_AUTH_VALUE=your-secret-token
```

### Rate Limiting

n8n API ha limiti di rate. Il server MCP implementa retry automatico:

```bash
# Aumenta timeout se necessario
N8N_API_TIMEOUT=30000  # 30 secondi
N8N_MAX_RETRIES=3
N8N_RETRY_DELAY=1000   # 1 secondo
```

## Troubleshooting

### Errore di connessione a n8n

```bash
# Verifica che n8n sia in esecuzione
curl http://localhost:5678/healthz

# Verifica API key
curl -H "X-N8N-API-KEY: your_key" http://localhost:5678/api/v1/workflows
```

### Workflow non si attiva

```bash
# Controlla lo stato
docker-compose exec n8n-manager n8n workflows list

# Verifica logs
docker-compose logs n8n
```

### Webhook non riceve richieste

```bash
# Verifica URL webhook
echo "Webhook URL: http://localhost:5678/webhook/customer-signup"

# Testa con curl
curl -X POST http://localhost:5678/webhook/customer-signup \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Problemi di permessi

```bash
# Verifica che l'utente abbia accesso
docker-compose exec n8n n8n user-management:list

# Genera nuovo API key se necessario
```

## Performance

### Utilizzo Risorse Tipico

- **Memory**: 100-300 MB
- **CPU**: < 5% (idle), 10-20% (active)
- **Network**: Dipende da frequenza chiamate API

### Ottimizzazione

```bash
# Cache risultati workflows list
N8N_CACHE_WORKFLOWS=true
N8N_CACHE_TTL=300  # 5 minuti

# Limita numero executions recuperate
N8N_MAX_EXECUTIONS=50
```

## Sicurezza

### Best Practices

1. **API Key Rotation**: Ruota API key ogni 90 giorni
2. **Network Isolation**: Usa network privato Docker
3. **Webhook Authentication**: Sempre abilita autenticazione
4. **Audit Logging**: Monitora tutte le modifiche workflows
5. **Backup**: Esporta workflows critici regolarmente

### Backup Automatico

```bash
# Script backup workflows
for wf in $(n8n workflows list --format json | jq -r '.[].id'); do
  n8n export workflow $wf > backup/workflow_$wf.json
done
```

## Integrazione con Altri MCP

### Con Knowledge Graph

```
"Crea un knowledge graph dei nostri workflows n8n"

1. n8n_list_workflows
2. Per ogni workflow:
   - Estrai nodi e connessioni
   - kg_add_entity per ogni nodo
   - kg_add_relation per connessioni
3. Visualizza grafo delle dipendenze
```

### Con Memory Bank

```
"Ricorda configurazione workflows di successo"

1. n8n_list_executions(status="success")
2. Identifica pattern di successo
3. memory_store per configurazioni ottimali
4. Usa per suggerire best practices
```

### Con GitHub

```
"Versiona tutti i workflows su GitHub"

1. n8n_list_workflows
2. Per ogni workflow:
   - n8n_export_workflow
   - github_create_or_update_file
3. Commit e push automatico
```

## API Reference

### n8n REST API Endpoints Utilizzati

- `GET /workflows` - Lista workflows
- `GET /workflows/:id` - Dettagli workflow
- `POST /workflows` - Crea workflow
- `PATCH /workflows/:id` - Aggiorna workflow
- `DELETE /workflows/:id` - Elimina workflow
- `POST /workflows/:id/activate` - Attiva workflow
- `GET /executions` - Lista esecuzioni
- `GET /executions/:id` - Dettagli esecuzione
- `POST /workflows/:id/execute` - Esegui workflow

### Formati Dati

#### Workflow Node Structure
```json
{
  "name": "HTTP Request",
  "type": "n8n-nodes-base.httpRequest",
  "position": [250, 300],
  "parameters": {
    "url": "https://api.example.com",
    "method": "GET"
  }
}
```

#### Workflow Connection Structure
```json
{
  "Trigger": {
    "main": [
      [
        {
          "node": "HTTP Request",
          "type": "main",
          "index": 0
        }
      ]
    ]
  }
}
```

## Aggiornamenti

```bash
# Aggiorna l'immagine MCP
cd docker/mcp
docker-compose build n8n-manager
docker-compose up -d n8n-manager

# Verifica versione n8n
curl http://localhost:5678/api/v1/version
```

## Contribuire

Vedi [CONTRIBUTING.md](../../CONTRIBUTING.md) per linee guida.

## Licenza

MIT License - vedi [LICENSE](../../LICENSE)
