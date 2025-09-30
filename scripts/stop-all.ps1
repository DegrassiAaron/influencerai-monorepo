<#
  Stop the full InfluencerAI stack.
  Usage:
    powershell -ExecutionPolicy Bypass -File scripts/stop-all.ps1            # keep volumes
    powershell -ExecutionPolicy Bypass -File scripts/stop-all.ps1 --purge    # also remove volumes
#>

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptDir '..')
$Infra = Join-Path $Root 'infra'

$Purge = $false
if ($args.Length -ge 1 -and $args[0] -eq '--purge') { $Purge = $true }

if ($Purge) {
  Write-Host 'Stopping and removing containers, networks, and volumes...'
  docker compose -f (Join-Path $Infra 'docker-compose.yml') down -v
} else {
  Write-Host 'Stopping and removing containers and networks (volumes preserved)...'
  docker compose -f (Join-Path $Infra 'docker-compose.yml') down
}

Write-Host 'Done.'
