# Prompt Operativo — Claude Code

Contesto: stai modificando codice nel monorepo MeepleAI.

Checklist d'azione:
1) **Scopo della modifica**: riassumi in 1–2 righe.
2) **Impatti**: file/cartelle coinvolti.
3) **Implementazione**: step-by-step.
4) **Comandi** (solo quelli verificabili): 
   - `pnpm i`
   - `pnpm turbo run build`
   - `docker compose -f infra/docker/docker-compose.yml up -d --build`
   - `docker compose -f infra/docker/docker-compose.yml logs -f [Inference: se necessario per debug]`
5) **Test**: come verificare manualmente il cambiamento. [Inference: specifica i percorsi o le rotte soltanto se presenti nel repo corrente]
6) **Failure modes**: rischi, cause probabili, mitigazioni.
7) **Rollback**: come annullare la modifica (git revert/checkout + `docker compose down`).

Politiche:
- Non introdurre nuove tecnologie senza esplicita richiesta.
- Se un comando o una path non esiste, segnalo come **[Unverified]** e proponi alternative.
