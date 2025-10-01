Param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('push','deploy')]
  [string]$Action,
  [string]$SchemaPath = "apps/api/prisma/schema.prisma"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Resolve repo root relative to this script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..") | ForEach-Object { $_.Path }

function Get-DotenvValue {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string]$Key
  )
  if (-not (Test-Path $FilePath)) { return $null }
  $line = Get-Content -Raw -ErrorAction SilentlyContinue $FilePath |
    Select-String -Pattern "^(\s*)$([Regex]::Escape($Key))=" -CaseSensitive |
    Select-Object -First 1
  if (-not $line) { return $null }
  $text = $line.Line.Trim()
  if ($text -like '#*') { return $null }
  $eq = $text.IndexOf('=')
  if ($eq -lt 0) { return $null }
  $value = $text.Substring($eq + 1)
  if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Trim('"') }
  if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Trim("'") }
  return $value
}

# Load DATABASE_URL if not already set
if (-not $env:DATABASE_URL -or $env:DATABASE_URL.Trim() -eq '') {
  $envFiles = @(
    (Join-Path $RootDir "apps/api/.env"),
    (Join-Path $RootDir ".env")
  )
  foreach ($f in $envFiles) {
    $val = Get-DotenvValue -FilePath $f -Key 'DATABASE_URL'
    if ($val) { $env:DATABASE_URL = $val; Write-Host ("Loaded DATABASE_URL from " + (Resolve-Path $f).Path); break }
  }
}

if (-not $env:DATABASE_URL -or $env:DATABASE_URL.Trim() -eq '') {
  Write-Error "DATABASE_URL non impostata. Impostala oppure aggiungila a apps/api/.env o .env"
}

# Ensure pnpm is available
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Error "pnpm non trovato nel PATH"
}

switch ($Action) {
  'push'   { $cmd = @('exec','prisma','db','push') }
  'deploy' { $cmd = @('exec','prisma','migrate','deploy') }
}

Write-Host "Eseguo prisma $Action..."

# Run via pnpm workspace filter for @influencerai/api
& pnpm --filter @influencerai/api @cmd

Write-Host "OK: prisma $Action completato"
