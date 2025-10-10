#!/usr/bin/env pwsh
#
# start-mcp-secure.ps1 - Avvia MCP servers con configurazioni di sicurezza
#

param(
    [string]$Server = "all",
    [switch]$Build,
    [switch]$Logs,
    [switch]$Stop,
    [switch]$Status
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== MCP Secure Startup ===" -ForegroundColor Cyan

# Check .env file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "IMPORTANT: Edit .env file with your credentials before starting!" -ForegroundColor Red
    Write-Host "Location: $PSScriptRoot\.env" -ForegroundColor Yellow
    exit 1
}

# Status check
if ($Status) {
    Write-Host "`nMCP Services Status:" -ForegroundColor Green
    docker-compose ps
    Write-Host "`nVolume Status:" -ForegroundColor Green
    docker volume ls | Select-String "mcp-"
    exit 0
}

# Stop services
if ($Stop) {
    Write-Host "Stopping MCP services..." -ForegroundColor Yellow
    if ($Server -eq "all") {
        docker-compose down
    } else {
        docker-compose stop $Server
    }
    Write-Host "Services stopped." -ForegroundColor Green
    exit 0
}

# Build images
if ($Build) {
    Write-Host "Building MCP images..." -ForegroundColor Yellow
    if ($Server -eq "all") {
        docker-compose build --parallel
    } else {
        docker-compose build $Server
    }
    Write-Host "Build complete." -ForegroundColor Green
}

# Show logs
if ($Logs) {
    if ($Server -eq "all") {
        docker-compose logs -f
    } else {
        docker-compose logs -f $Server
    }
    exit 0
}

# Security validation
Write-Host "`nValidating security settings..." -ForegroundColor Yellow

$securityChecks = @(
    @{Name="Read-only filesystem"; Check="read_only: true"},
    @{Name="Capabilities dropped"; Check="cap_drop:"},
    @{Name="No new privileges"; Check="no-new-privileges"},
    @{Name="PID limits"; Check="pids_limit"},
    @{Name="Memory limits"; Check="mem_limit"}
)

$composeContent = Get-Content "docker-compose.yml" -Raw

foreach ($check in $securityChecks) {
    if ($composeContent -match $check.Check) {
        Write-Host "  [OK] $($check.Name)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] $($check.Name) not found" -ForegroundColor Yellow
    }
}

# Start services
Write-Host "`nStarting MCP services..." -ForegroundColor Yellow

if ($Server -eq "all") {
    docker-compose up -d
} else {
    docker-compose up -d $Server
}

# Wait for services to be healthy
Write-Host "`nWaiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Show status
Write-Host "`nMCP Services Status:" -ForegroundColor Green
docker-compose ps

Write-Host "`n=== MCP Services Started ===" -ForegroundColor Cyan
Write-Host "Use 'docker-compose logs -f' to view logs" -ForegroundColor Yellow
Write-Host "Use './start-mcp-secure.ps1 -Stop' to stop all services" -ForegroundColor Yellow
Write-Host "Use './start-mcp-secure.ps1 -Status' to check status" -ForegroundColor Yellow
