# GitHub Project Manager MCP Server

Server MCP per la gestione di progetti GitHub, issues, pull requests e code review.

## Funzionalità

- ✅ Creazione e gestione di issues
- ✅ Creazione e merge di pull requests
- ✅ Code review automatizzate
- ✅ Gestione di labels, milestones e projects
- ✅ Ricerca avanzata di issues e PR
- ✅ Statistiche e analytics del repository

## Prerequisiti

- Docker 24.0+
- GitHub Personal Access Token con permessi:
  - `repo` (accesso completo ai repository)
  - `project` (accesso ai progetti)
  - `read:org` (lettura organizzazioni)

## Installazione

### 1. Crea GitHub Token

1. Vai su [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Clicca "Generate new token (classic)"
3. Seleziona gli scopes:
   - `repo` (Full control of private repositories)
   - `project` (Full control of projects)
   - `read:org` (Read org and team membership)
4. Genera e copia il token

### 2. Configura Environment

Crea file `.env` nella directory `docker/mcp/`:

```bash
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-username-or-org
GITHUB_REPO=your-repo-name
```

### 3. Build dell'Immagine Docker

```bash
cd docker/mcp
docker build -t meepleai/mcp-github:latest -f Dockerfile.github .
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
  -e GITHUB_TOKEN=${GITHUB_TOKEN} \
  -e GITHUB_OWNER=${GITHUB_OWNER} \
  -e GITHUB_REPO=${GITHUB_REPO} \
  meepleai/mcp-github:latest

# Oppure usa docker-compose
docker-compose up github-project-manager
```

## Configurazione Claude Desktop

Aggiungi al file di configurazione (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "github": {
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
        "-e", "GITHUB_TOKEN",
        "-e", "GITHUB_OWNER",
        "-e", "GITHUB_REPO",
        "meepleai/mcp-github:latest"
      ],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "GITHUB_OWNER": "your-username",
        "GITHUB_REPO": "your-repo"
      }
    }
  }
}
```

## Tools Disponibili

### `github_create_issue`
Crea una nuova issue nel repository.

**Parametri:**
```json
{
  "title": "Titolo dell'issue",
  "body": "Descrizione dettagliata",
  "labels": ["bug", "priority:high"],
  "assignees": ["username1", "username2"],
  "milestone": 1
}
```

**Esempio d'uso:**
```
Crea un'issue per il bug di autenticazione con label "bug" e "security"
```

### `github_list_issues`
Elenca le issues del repository.

**Parametri:**
```json
{
  "state": "open",  // "open", "closed", "all"
  "labels": ["bug"],
  "assignee": "username",
  "limit": 10
}
```

**Esempio d'uso:**
```
Mostrami tutte le issues aperte con label "bug"
```

### `github_create_pr`
Crea una nuova pull request.

**Parametri:**
```json
{
  "title": "Titolo della PR",
  "body": "Descrizione delle modifiche",
  "head": "feature-branch",
  "base": "main",
  "draft": false
}
```

**Esempio d'uso:**
```
Crea una pull request dal branch feature/authentication al main
```

### `github_review_pr`
Effettua review di una pull request.

**Parametri:**
```json
{
  "pr_number": 123,
  "event": "APPROVE",  // "APPROVE", "REQUEST_CHANGES", "COMMENT"
  "body": "Commenti della review",
  "comments": [
    {
      "path": "src/auth.ts",
      "line": 42,
      "body": "Considera di aggiungere validazione"
    }
  ]
}
```

### `github_search_code`
Cerca codice nel repository.

**Parametri:**
```json
{
  "query": "function authenticate",
  "path": "src/**/*.ts",
  "language": "typescript"
}
```

### `github_get_stats`
Ottieni statistiche del repository.

**Parametri:**
```json
{
  "type": "issues",  // "issues", "prs", "contributors", "commits"
  "period": "week"   // "day", "week", "month", "year"
}
```

### `github_manage_labels`
Gestisci le labels del repository.

**Parametri:**
```json
{
  "action": "create",  // "create", "update", "delete", "list"
  "name": "bug",
  "color": "d73a4a",
  "description": "Something isn't working"
}
```

### `github_manage_milestones`
Gestisci i milestones.

**Parametri:**
```json
{
  "action": "create",
  "title": "v1.0.0",
  "description": "First stable release",
  "due_date": "2024-12-31"
}
```

## Esempi d'Uso

### Workflow Completo Issue → PR → Merge

```
1. "Crea un'issue per implementare autenticazione OAuth"
   → github_create_issue

2. "Crea un branch feature/oauth-auth"
   → (effettua le modifiche localmente)

3. "Crea una PR dal branch feature/oauth-auth"
   → github_create_pr

4. "Fai review della PR #123 e approva se tutto ok"
   → github_review_pr

5. "Mergia la PR #123"
   → github_merge_pr
```

### Code Review Automatizzata

```
"Analizza la PR #123 e suggerisci miglioramenti per sicurezza e performance"
→ Il server recupererà il diff, analizzerà il codice e suggerirà modifiche
```

### Report Settimanale

```
"Dammi un report delle attività della settimana scorsa"
→ github_get_stats con vari parametri per issues, PR, commits
```

## Configurazione Avanzata

### Rate Limiting

GitHub API ha limiti di rate. Il server implementa retry automatico con backoff esponenziale.

```bash
# Aumenta il timeout se necessario
GITHUB_API_TIMEOUT=30000  # 30 secondi
```

### Multiple Repositories

Per gestire più repository, puoi avviare più istanze:

```json
{
  "mcpServers": {
    "github-repo1": {
      "command": "docker",
      "args": ["..."],
      "env": {
        "GITHUB_REPO": "repo1"
      }
    },
    "github-repo2": {
      "command": "docker",
      "args": ["..."],
      "env": {
        "GITHUB_REPO": "repo2"
      }
    }
  }
}
```

### Webhook Integration

Il server può ricevere webhook da GitHub per eventi real-time:

```bash
# Esponi porta per webhook (solo in produzione con HTTPS)
docker run ... -p 8080:8080 -e WEBHOOK_SECRET=your-secret meepleai/mcp-github:latest
```

## Troubleshooting

### Errore di autenticazione

```bash
# Verifica il token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Controlla i permessi
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit
```

### Rate limit exceeded

```bash
# Controlla il rate limit attuale
docker-compose exec github-project-manager sh -c 'curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit'
```

Soluzione: Attendi il reset oppure usa un GitHub App invece di Personal Access Token.

### Errori di permessi nel container

```bash
# Verifica che l'utente abbia i permessi corretti
docker-compose exec github-project-manager id

# Se necessario, modifica UID/GID in docker-compose.yml
user: "1000:1000"
```

## Sicurezza

### Best Practices

1. **Token Rotation**: Ruota il GitHub token regolarmente (ogni 90 giorni)
2. **Least Privilege**: Usa solo gli scopes necessari
3. **Environment Variables**: Non committare mai i token nel codice
4. **Audit Logs**: Monitora l'uso del token via GitHub audit log
5. **Revoke Unused**: Revoca i token non più utilizzati

### Security Scanning

```bash
# Scansiona l'immagine per vulnerabilità
docker scan meepleai/mcp-github:latest

# Verifica le configurazioni di sicurezza
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image meepleai/mcp-github:latest
```

## Performance

### Caching

Il server implementa caching per ridurre le chiamate API:

- Issue list: 5 minuti
- Repository info: 1 ora
- User info: 1 ora

### Resource Usage

Utilizzo tipico:
- **Memory**: 100-200 MB
- **CPU**: < 5% (idle), 20-30% (active)
- **Network**: Dipende dall'uso (principalmente API calls)

## Aggiornamenti

```bash
# Aggiorna l'immagine
docker pull meepleai/mcp-github:latest

# Oppure rebuild locale
cd docker/mcp
docker-compose build github-project-manager
docker-compose up -d github-project-manager
```

## Contribuire

Vedi [CONTRIBUTING.md](../../CONTRIBUTING.md) per linee guida.

## Licenza

MIT License - vedi [LICENSE](../../LICENSE)
