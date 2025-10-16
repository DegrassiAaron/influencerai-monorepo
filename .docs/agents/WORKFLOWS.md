# Workflows — Prompt operativi per agenti

## Creare PR da Issue

CONTEXT:

- .docs/agents/INDEX.md
- .docs/agents/GITFLOW.md
- .docs/agents/DOD.md
- .docs/agents/ONE_CLICK.md
- .docs/agents/BRANCHING.md

TASK:

- Crea branch da develop: feat/<issue>-<slug>
- Apri PR Draft con titolo imperativo e link a issue
- Sincronizza DoD; applica label (type, status: needs-review, area se deducibile)

## Eseguire test (lint/unit/e2e)

CONTEXT:

- .docs/agents/DOD.md
- .docs/agents/PUPPETEER_MCV.md

TASK:

- Esegui lint + unit test
- Avvia server MCV (5173) e lancia E2E Puppeteer (smoke, auth)
- Pubblica artifact log; aggiorna DoD

## Review

CONTEXT:

- .docs/agents/GITFLOW.md
- .docs/agents/DOD.md

TASK:

- Verifica DoD e CI verde
- Commenta in PR con feedback puntuali
- Approva o richiedi modifiche

## Release

CONTEXT:

- .docs/agents/GITFLOW.md

TASK:

- Crea release/<version> da develop
- Aggiorna changelog/version
- PR verso main + tag v<version>
- Back‑merge su develop
