Scopo
Questo folder contiene template di workflow n8n per i principali processi della piattaforma. Sono pensati come base di partenza e vanno importati in n8n (UI: Import) e adattati alle API locali.

Prerequisiti
- n8n in esecuzione su `http://localhost:5678` (o dove configurato)
- API raggiungibile (es. `http://localhost:3000`)
- Token/API key configurata

Variabili ambiente usate nei template
- `API_BASE_URL`: base URL dell'API (default `'http://localhost:3000'`)
- `API_TOKEN`: bearer token per autenticazione (default `'dev-token'` – cambialo)

Workflow inclusi
- `content-plan.template.json`: crea un Content Plan via `POST /content-plans`
- `content-generation.template.json`: enqueue job `content-generation` via `POST /jobs`
- `lora-training.template.json`: enqueue job `lora-training` via `POST /jobs`
- `autopost.template.json`: scheletro per pubblicazione social, da integrare

Istruzioni rapide
1) In n8n apri: Menu → Workflows → Import From File → seleziona un template
2) Aggiorna i nodi `HTTP Request` con credenziali/URL se necessario
3) Esegui manualmente dal nodo `Manual Trigger` per testare

Nota
Questi template non creano risorse reali senza un'API funzionante. Verifica gli endpoint richiesti nella repo e aggiorna i payload se necessario.

Esecuzione con Docker Compose (solo n8n)
- File di esempio: `infra/docker-compose.n8n.yml`
- Avvio (se usato insieme allo stack principale):
  - `cd infra`
  - `docker compose -f docker-compose.yml -f docker-compose.n8n.yml up -d n8n`
- Avvio (solo n8n standalone, puntando a API locale):
  - `cd infra`
  - `API_BASE_URL=http://localhost:3001 API_TOKEN=dev-token docker compose -f docker-compose.n8n.yml up -d`

Le variabili `API_BASE_URL` e `API_TOKEN` saranno disponibili come `$env` dentro i nodi HTTP di n8n.
