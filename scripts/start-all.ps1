<#
  Start the full InfluencerAI stack (DB, cache, MinIO, n8n, API, worker, web).
  Usage: powershell -ExecutionPolicy Bypass -File scripts/start-all.ps1
#>

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptDir '..')
$Infra = Join-Path $Root 'infra'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error 'Docker is required but not found in PATH'
}

try { docker compose version | Out-Null } catch { Write-Error 'Docker Compose v2 is required (docker compose)'; }

# Ensure .env exists
$envPath = Join-Path $Root '.env'
$envExamplePath = Join-Path $Root '.env.example'
if (-not (Test-Path $envPath)) {
  if (Test-Path $envExamplePath) {
    Write-Host 'Creating .env from .env.example'
    Copy-Item $envExamplePath $envPath
  } else {
    Write-Warning '.env not found and .env.example missing. Proceeding with compose defaults.'
  }
}

Write-Host 'Building and starting services (from any directory)...'
docker compose -f (Join-Path $Infra 'docker-compose.yml') up -d --build

Write-Host ''
Write-Host 'Services are starting. Useful endpoints:'
Write-Host '- Web UI:          http://localhost:3000'
Write-Host '- API (Swagger):   http://localhost:3001/api'
Write-Host '- n8n:             http://localhost:5678'
Write-Host '- MinIO Console:   http://localhost:9001 (S3 at http://localhost:9000)'
Write-Host ''
Write-Host 'To follow logs:    docker compose -f infra/docker-compose.yml logs -f web'
Write-Host 'To stop stack:     docker compose -f infra/docker-compose.yml down'
