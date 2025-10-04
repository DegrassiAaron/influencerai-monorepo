# Branching — Convenzioni & Strategie

## Prefissi
- `feat/` nuove feature
- `fix/` bugfix
- `chore/` manutenzione/refactor/build
- `hotfix/` patch urgenti da `main`
- `release/` preparazione release

## Sintassi raccomandata
`<prefix>/<issue>-<slug>`

Esempi
- `feat/123-login-utenti`
- `fix/456-crash-puppeteer`
- `chore/789-update-deps`

## Stile
- Brevi ma descrittivi (≤ ~5 parole)
- Imperative mood: `add-user-authentication`
- Sempre numero issue quando presente
- Solo minuscole e `-` come separatore

## Durata dei branch
- Corti, focalizzati su una singola feature/bug
- Basati su `develop` aggiornato (o `main` se trunk-based nel repo)

## Commit & PR
- Conventional Commits: `type(scope): imperativo breve`
- PR title in imperativo, link all’issue
- PR body con motivazione + DoD
