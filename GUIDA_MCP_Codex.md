# MCP Kit — Guida unica per più monorepo (MeepleAI / InfluencerAI) — ottimizzata per Codex

> Scopo: riutilizzare la stessa configurazione dei server MCP in `meepleai-monorepo` e `influencerai-monorepo`, mantenendo **token e processi locali per macchina**, con setup **as‑code**.

## Prompt rapido per Codex

Copia il blocco qui sotto in Codex per eseguire i passi chiave (puoi lanciarli in sequenza o a step).

```text
Obiettivo: attiva MCP GitHub via wrapper STDIO (docker run -i), con segreti locali, in questo workspace.

Passi:
1) Verifica variabile d'ambiente: GITHUB_PAT deve esistere (o popola tools/mcp-kit/.env.local).
2) Genera/aggiorna file: .codex/mcp.toml, tools/mcp-kit/wrappers/github-mcp.ps1, .vscode/tasks.json, tools/mcp-kit/.env.example.
3) Smoke-test: esegui "codex mcp list" e verifica che compaia 'github'.
4) Non committare tools/mcp-kit/.env.local.

Nota: i wrapper eseguono container efimeri in STDIO; nessuna porta esposta; stesso flusso in tutti i monorepo.
```

---

## Struttura consigliata del repo

```text
<repo>/
├─ .codex/
│  └─ mcp.toml              # Config Codex per questo repo
├─ tools/
│  └─ mcp-kit/              # Submodule o copia
│     ├─ wrappers/          # Script per avviare MCP (docker run -i)
│     │  └─ github-mcp.ps1
│     ├─ .env.example
│     └─ README.md
└─ .vscode/
   └─ tasks.json            # Task per smoke-test MCP
```

---

## Step 1 — Segreti locali (per macchina)

Crea `tools/mcp-kit/.env.local` partendo da questo esempio:

```env
# Copia come tools/mcp-kit/.env.local (NON committare)
GITHUB_PAT=ghp_xxxxxxx
```

Aggiungi a `.gitignore` (se serve):

```text
tools/mcp-kit/.env.local
```

---

## Step 2 — Wrapper MCP (STDIO, nessuna porta)

Crea `tools/mcp-kit/wrappers/github-mcp.ps1`:

```powershell
param(
  [string]$Token = $env:GITHUB_PAT
)
if (-not $Token) {
  Write-Error "GITHUB_PAT mancante (definisci in tools/mcp-kit/.env.local o come variabile d'ambiente)"
  exit 1
}

# Avvia il server MCP GitHub in STDIO (container effimero, nessuna porta esposta)
docker run -i --rm `
  -e GITHUB_PERSONAL_ACCESS_TOKEN=$Token `
  ghcr.io/github/github-mcp-server:latest
```

Facoltativo: crea altri wrapper per ulteriori MCP (es. `linear-mcp.ps1`) con le rispettive variabili.

---

## Step 3 — Configurazione Codex per repo

File: `.codex/mcp.toml`

```toml
# Codex MCP config — usa i wrapper STDIO del repo

[mcp_servers.github]
command = "powershell"
args = [
  "-NoProfile","-ExecutionPolicy","Bypass",
  "-File","${workspaceFolder}/tools/mcp-kit/wrappers/github-mcp.ps1"
]

# Esempio per altri MCP:
# [mcp_servers.linear]
# command = "powershell"
# args = ["-NoProfile","-ExecutionPolicy","Bypass","-File","${workspaceFolder}/tools/mcp-kit/wrappers/linear-mcp.ps1"]
```

---

## Step 4 — Task VSCode (smoke‑test e check token)

File: `.vscode/tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "MCP: env-check",
      "type": "shell",
      "command": "powershell -NoProfile -Command \"& { if (-not $env:GITHUB_PAT) { Write-Error 'GITHUB_PAT mancante. Crea tools/mcp-kit/.env.local' } else { Write-Host 'OK' } }\"",
      "problemMatcher": []
    },
    {
      "label": "MCP: smoke-test (GitHub)",
      "type": "shell",
      "command": "powershell -NoProfile -Command \"& { codex mcp list }\"",
      "problemMatcher": []
    }
  ]
}
```

---

## Step 5 — Workflow tipico

1. Popola/aggiorna `tools/mcp-kit/.env.local` con il tuo PAT.
2. Esegui in VSCode: **MCP: env-check** → deve stampare `OK`.
3. Avvia Codex → digita `/mcp` → verifica che `github` sia attivo.
4. Esegui **MCP: smoke-test (GitHub)** → controlla output strumenti.

---

## DoD — Definition of Done

- [ ] `tools/mcp-kit/.env.local` presente e **git‑ignored**.
- [ ] I wrapper in `tools/mcp-kit/wrappers/*.ps1` avviano correttamente i container MCP.
- [ ] `.codex/mcp.toml` punta ai wrapper del repo (niente path assoluti).
- [ ] `codex mcp list` mostra `github`.
- [ ] Nessun segreto è committato.

---

## Alternative e trade‑off (brevi)

- **HTTP/compose**: esporre porte con `docker-compose` e usare `transport=http` in `mcp.toml`. Pro: server persistenti; Contro: gestione porte e auth.
- **Profili globali**: usare profili TOML in `~/.codex/` e uno script di switch. Pro: centralizzazione; Contro: meno “as‑code” per repo.
- **Copia senza submodule**: duplicare `tools/mcp-kit` in ogni repo. Pro: semplice; Contro: aggiornamenti doppi.

---

## Troubleshooting

- **`GITHUB_PAT mancante`**: popola `.env.local` o esporta la variabile nel terminale di VSCode.
- **`codex mcp list` non vede il server**: controlla `mcp.toml` (path wrapper), prova ad aprire Codex nel workspace corretto.
- **Molti MCP in parallelo consumano RAM/CPU**: spegni le sessioni non usate o passa a compose persistente.

---

## Perché questo approccio

- Stessa UX in tutti i monorepo, con **segregazione dei segreti per macchina**.
- Nessuna porta aperta di default (meno superficie d’attacco).
- Configurazione **as‑code** e ripetibile.
