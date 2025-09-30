# Come usare questo pack

## Per chat operative
Inoltra a Claude il contenuto di `system.claude.md` come system prompt. 
Per task di codice, aggiungi `code.claude.md` come contesto aggiuntivo.

## Per richieste strutturate
Usa i template in `prompt_templates/templates.yaml` per mantenere il flusso Plan → Create → Test → Deploy.

## Comandi standard
- Install: `pnpm i`
- Build: `pnpm turbo run build`
- Avvio servizi: `docker compose -f infra/docker/docker-compose.yml up -d --build`
- Stop: `docker compose -f infra/docker/docker-compose.yml down`

## Nota
Le parti marcate **[Inference]** sono proposte non verificabili dal README fornito.
