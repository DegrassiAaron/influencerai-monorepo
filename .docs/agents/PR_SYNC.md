# PR DoD Sync on CI Success

Ascolta i workflow di CI; quando la pipeline è **success**, spunta le voci **DoD** automatizzabili in PR (e Issue collegata), converte **Draft → Ready** se resta solo la voce manual e abilita l'automerge se consentito.

File workflow: `.github/workflows/gitflow-pr-sync.yml`
