# Issue Bot Starter (Top-10 to GitHub)

Questo starter consente di:
1. **Prendere** un file `backlog/issues.yaml` generato da Claude Code (o altro).
2. **Selezionare** automaticamente le 10 issue più importanti.
3. **Creare** le issue su GitHub via `gh` CLI.
4. **Automatizzare** il tutto con una GitHub Action al push sul branch `backlog/auto`.

## Requisiti
- `gh` CLI autenticato (`gh auth login`).
- `yq` (per lo script bash) **oppure** Python 3.10+ (per lo script Python).
- Permessi `issues:write` per il token in CI.

## Workflow locale (manuale/semi-auto)
1. Colloca (o genera) `backlog/issues.yaml` secondo lo **schema** riportato più sotto.
2. Esegui:
   ```bash
   python tools/select_top10.py backlog/issues.yaml backlog/top10.yaml
   bash tools/create_issues.sh backlog/top10.yaml
   ```

## Automazione con GitHub Actions
- Pusha su `backlog/auto` il file `backlog/issues.yaml`.
- La workflow `.github/workflows/auto-issues.yml`:
  - Esegue `select_top10.py` per generare `backlog/top10.yaml`.
  - Crea su GitHub le 10 issue tramite `create_issues.sh`.

## Criteri di ranking (default)
- Ordina per `priority` (P1 > P2 > P3), poi `impact` (High > Medium > Low), poi stima (`estimate`: XS < S < M < L < XL).
- In assenza di campi, si applicano default conservativi: `P3`, `Low`, `M`.

Puoi adattare `select_top10.py` per modificare i pesi.

## Schema YAML atteso
```yaml
issues:
  - title: "Titolo azionabile"
    body: |-
      ### Contesto
      ...
      ### DoD
      - [ ] test: <asserzione chiudibile>
    labels: ["area:modulo","type:feat","priority:P1"]
    assignees: ["utente1"]
    milestone: "Sprint 42"
    estimate: "S"           # XS/S/M/L/XL
    impact: "High"          # High/Medium/Low
    depends_on: ["..."]     # opzionale (per governance interna, non usato da gh)
    parent: "EPIC: Nome"    # opzionale
```

## Sicurezza e limiti
- **Non** inserire segreti nel YAML.
- **Verifica** titoli e contenuti prima della creazione massiva.
- **Dry-run:** modifica `create_issues.sh` per echo dei comandi se vuoi simulare.

---

### Esempio minimo `backlog/issues.yaml`
```yaml
issues:
  - title: "Fix: race condition in /apps/web/hooks/useAuth"
    body: |
      ### Contesto
      ...
      ### DoD
      - [ ] test: login concurrent prevent dup calls
    labels: ["area:web","type:bug","priority:P1"]
    estimate: "S"
    impact: "High"

  - title: "Feat: add zod schema for /auth/login"
    body: |
      ### Contesto
      ...
      ### DoD
      - [ ] test: parse ok/ko
    labels: ["area:api","type:feat","priority:P2"]
    estimate: "S"
    impact: "Medium"
```
