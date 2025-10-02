# Token Rotation Guide (PAT and GitHub App)

This doc explains how to quickly revoke an exposed token and rotate credentials for both Personal Access Tokens (PAT) and GitHub App installation tokens.

## Quick Revoke (Now)

- If you pasted an installation token (`ghs_…`) publicly, revoke it immediately:
  - PowerShell: `curl.exe -s -X DELETE -H "Authorization: Bearer <INSTALLATION_TOKEN>" -H "Accept: application/vnd.github+json" https://api.github.com/installation/token`
  - Bash: `curl -s -X DELETE -H "Authorization: Bearer <INSTALLATION_TOKEN>" -H "Accept: application/vnd.github+json" https://api.github.com/installation/token`
  - Note: Installation tokens expire automatically (~1 hour), but explicit revocation is safer.

- If you pasted a Personal Access Token (`ghp_…` or `github_pat_…`), revoke it immediately (see PAT section below).

## Rotate a Personal Access Token (PAT)

1) Revoke the exposed PAT
   - GitHub Web: Settings → Developer settings → Personal access tokens → Find the token → Revoke.

2) Create a new PAT (fine-grained recommended)
   - Settings → Developer settings → Fine-grained tokens → Generate new token.
   - Resource owner: your user or org; Repository access: select `DegrassiAaron/influencerai-monorepo`.
   - Permissions (minimum for our workflow):
     - Repository permissions: Contents (Read and write), Pull requests (Read and write), Issues (Read and write).

3) Update local environment
    - PowerShell: `$env:GH_TOKEN='<NEW_PAT>'`
    - GitHub CLI (optional): `gh auth login --with-token` then paste `<NEW_PAT>`.

### Use a read-only PAT in GitHub Actions (GH_PAT_READ)

To lower rate limits on verification workflows, store a fine-grained PAT as a repository secret used by CI.

1) Create a fine-grained PAT
   - Owner: your user (recommended).
   - Repository access: `DegrassiAaron/influencerai-monorepo` only.
   - Permissions (minimum): Repository permissions → Contents: Read-only; Issues: Read-only.

2) Add as repo secret `GH_PAT_READ`
   - GitHub UI: Settings → Secrets and variables → Actions → New repository secret → Name: `GH_PAT_READ` → Value: your PAT.
   - Or via GitHub CLI from the repo root:
     - PowerShell: `gh secret set GH_PAT_READ -R DegrassiAaron/influencerai-monorepo --body "$env:GH_TOKEN"`
     - Bash: `gh secret set GH_PAT_READ -R DegrassiAaron/influencerai-monorepo --body "$GH_TOKEN"`

3) Workflow usage
   - `.github/workflows/verify-backlog-issues.yml` prefers `GH_PAT_READ` and falls back to `GITHUB_TOKEN`.
   - The workflow includes retry/backoff on 403/429 and when `x-ratelimit-remaining=0`.

4) Rotate the PAT
   - Revoke old PAT; generate a new fine-grained PAT with the same minimal permissions.
   - Update the repo secret:
     - PowerShell: `gh secret set GH_PAT_READ -R DegrassiAaron/influencerai-monorepo --body "<NEW_PAT>"`
     - Bash: `gh secret set GH_PAT_READ -R DegrassiAaron/influencerai-monorepo --body "<NEW_PAT>"`
   - See also the PAT rotation steps above.

## Rotate a GitHub App Installation Token

Installation tokens are short‑lived and scoped to the App installation. If an installation token is exposed:

1) Revoke the token
   - `curl -s -X DELETE -H "Authorization: Bearer <INSTALLATION_TOKEN>" -H "Accept: application/vnd.github+json" https://api.github.com/installation/token`

2) (If private key may be compromised) Rotate the App private key
   - Org/User Settings → Developer settings → GitHub Apps → Your App → Generate a new private key (.pem).
   - Replace any local references to the old key path (e.g., `GH_APP_PEM`).
   - Old JWTs signed with the previous key will no longer be valid; previously minted installation tokens will expire on their own.

3) Re‑generate an installation token
   - Use `get-installation-token.mjs` with the new private key:
     - PowerShell example:
       - `$env:GH_APP_ID='<APP_ID_NUMERICA>'`
       - `$env:GH_APP_PEM='D:\Repositories\influencerai-monorepo\tools\<your-app>.private-key.pem'` (or the folder containing a single .pem)
       - Optional auto‑resolve installation: `$env:GH_OWNER='DegrassiAaron'; $env:GH_REPO='influencerai-monorepo'`
       - `node .\get-installation-token.mjs`
     - Output is the new `INSTALLATION_TOKEN`.
   - Export it locally: `$env:GH_TOKEN='<INSTALLATION_TOKEN>'`

## Finish the WEB-01 flow (after rotation)

With `GH_TOKEN` set to the new PAT/installation token, you can complete the workflow.

1) Push the branch
   - Header auth (recommended):
     - `git -c http.extraHeader="Authorization: Bearer $env:GH_TOKEN" push origin feature/WEB-01-auth:feature/WEB-01-auth`
   - Or URL with token:
     - `git push https://x-access-token:$env:GH_TOKEN@github.com/DegrassiAaron/influencerai-monorepo.git feature/WEB-01-auth:feature/WEB-01-auth`

2) Create the PR (REST)
   - PowerShell:
     - `$pr = @{ title = "WEB-01: Implementare autenticazione e sessione"; head = "feature/WEB-01-auth"; base = "main"; body = "Implementa login (/login), salvataggio token HttpOnly via route handler, middleware di protezione e AuthProvider + test." } | ConvertTo-Json`
     - `curl.exe -s -X POST -H "Authorization: Bearer $env:GH_TOKEN" -H "Accept: application/vnd.github+json" -H "Content-Type: application/json" -d $pr https://api.github.com/repos/DegrassiAaron/influencerai-monorepo/pulls | ConvertFrom-Json`

3) Update the WEB-01 issue (check DoD and comment PR link)
   - Find issue: `curl.exe -s -H "Authorization: Bearer $env:GH_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/search/issues?q=repo:DegrassiAaron/influencerai-monorepo%20is:issue%20WEB-01" | ConvertFrom-Json`
   - Replace `- [ ]` with `- [x]` in the issue body and PATCH it.
   - Comment with: `PR creata: <PR_URL>`.

4) Request a review
   - `curl.exe -s -X POST -H "Authorization: Bearer $env:GH_TOKEN" -H "Accept: application/vnd.github+json" -H "Content-Type: application/json" -d '{"reviewers":["DegrassiAaron"]}' "https://api.github.com/repos/DegrassiAaron/influencerai-monorepo/pulls/<PR_NUMBER>/requested_reviewers"`

## Good Practices

- Never paste tokens into issues/PRs/chat; prefer local environment variables or secret stores.
- Keep GitHub App private keys restricted to trusted machines; rotate keys periodically.
- Prefer fine‑grained PAT or GitHub App tokens with minimal scopes.
