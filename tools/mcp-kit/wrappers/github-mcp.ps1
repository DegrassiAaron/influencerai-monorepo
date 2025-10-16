# GitHub MCP Server Wrapper (STDIO mode)
# This script launches the GitHub MCP server in an ephemeral Docker container
# Communication happens via STDIO (no exposed ports)

param(
  [string]$Token = $env:GITHUB_PAT
)

# Check if token is provided
if (-not $Token) {
  Write-Error "GITHUB_PAT not found. Please set it in one of these ways:"
  Write-Error "  1. Create tools/mcp-kit/.env.local and add: GITHUB_PAT=ghp_..."
  Write-Error "  2. Set environment variable: `$env:GITHUB_PAT = 'ghp_...'"
  Write-Error "  3. Pass as parameter: .\github-mcp.ps1 -Token 'ghp_...'"
  exit 1
}

# Run GitHub MCP server in STDIO mode
# - Uses official GitHub MCP server image
# - Container is ephemeral (--rm removes it after exit)
# - Interactive mode (-i) for STDIO communication
# - No ports exposed (secure by default)
docker run -i --rm `
  -e GITHUB_PERSONAL_ACCESS_TOKEN=$Token `
  ghcr.io/github/github-mcp-server:latest
