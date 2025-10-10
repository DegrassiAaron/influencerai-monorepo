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
