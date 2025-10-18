# =============================================================================
# Script di Migrazione Volumi Docker per InfluencerAI (PowerShell)
# =============================================================================
#
# Migra volumi dalla vecchia naming convention (infra_pg_data)
# alla nuova (influencerai_pg_data) preservando i dati.
#
# ATTENZIONE: Esegui SOLO se hai già dati esistenti da migrare.
# Per setup da zero, salta questo script.
#
# Usage (PowerShell):
#   .\scripts\migrate-docker-volumes.ps1
#
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== InfluencerAI Docker Volumes Migration ===" -ForegroundColor Cyan
Write-Host ""

# Verifica Docker in esecuzione
try {
    docker info | Out-Null
    Write-Host "✅ Docker è attivo" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker non è in esecuzione. Avvia Docker Desktop e riprova." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Mapping volumi: OLD_NAME -> NEW_NAME
$volumeMappings = @{
    "infra_pg_data" = "influencerai_pg_data"
    "infra_minio_data" = "influencerai_minio_data"
    "infra_n8n_data" = "influencerai_n8n_data"
    "infra_redis_data" = "influencerai_redis_data"
    "pg_data" = "influencerai_pg_data"
    "minio_data" = "influencerai_minio_data"
    "n8n_data" = "influencerai_n8n_data"
    "redis_data" = "influencerai_redis_data"
}

# Funzione per migrare un volume
function Migrate-Volume {
    param(
        [string]$OldName,
        [string]$NewName
    )

    Write-Host "---" -ForegroundColor Blue
    Write-Host "Migrando: $OldName -> $NewName" -ForegroundColor Blue

    # Verifica esistenza volume old
    try {
        docker volume inspect $OldName | Out-Null
    } catch {
        Write-Host "⚠️  Volume $OldName non esiste, skip." -ForegroundColor Yellow
        return
    }

    # Verifica se new volume già esiste
    try {
        docker volume inspect $NewName | Out-Null
        Write-Host "⚠️  Volume $NewName già esiste." -ForegroundColor Yellow
        $response = Read-Host "Vuoi sovrascriverlo? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Host "Skip migrazione $OldName"
            return
        }
        Write-Host "Rimuovendo volume esistente $NewName..."
        docker volume rm $NewName
    } catch {
        # Volume non esiste, ok
    }

    # Crea nuovo volume
    Write-Host "Creando nuovo volume $NewName..."
    docker volume create $NewName | Out-Null

    # Copia dati usando container temporaneo
    Write-Host "Copiando dati (questo può richiedere alcuni minuti)..."
    docker run --rm `
        -v "${OldName}:/source" `
        -v "${NewName}:/target" `
        alpine `
        sh -c "cp -av /source/. /target/"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrazione completata: $NewName" -ForegroundColor Green
    } else {
        Write-Host "❌ Errore durante migrazione: $NewName" -ForegroundColor Red
        throw "Migration failed for $NewName"
    }
}

# Ferma container influencerai se in esecuzione
Write-Host "Fermando container InfluencerAI (se attivi)..." -ForegroundColor Yellow
Set-Location (Join-Path $PSScriptRoot "..")
docker compose -f infra/docker-compose.yml down 2>$null
Write-Host ""

# Mostra volumi esistenti
Write-Host "Volumi Docker esistenti:" -ForegroundColor Blue
docker volume ls | Select-String -Pattern "(infra|pg_data|redis|minio|n8n)"
Write-Host ""

# Conferma prima di procedere
$confirm = Read-Host "Procedere con la migrazione? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Migrazione annullata."
    exit 0
}
Write-Host ""

# Esegui migrazioni (rimuovi duplicati)
$processed = @{}
foreach ($oldName in $volumeMappings.Keys) {
    $newName = $volumeMappings[$oldName]
    # Skip se già processato questo target
    if ($processed.ContainsKey($newName)) {
        continue
    }
    $processed[$newName] = $true
    Migrate-Volume -OldName $oldName -NewName $newName
}

Write-Host ""
Write-Host "=== Migrazione Completata ===" -ForegroundColor Green
Write-Host ""
Write-Host "Prossimi passi:" -ForegroundColor Green
Write-Host "1. Verifica volumi migrati:"
Write-Host "   docker volume ls | Select-String influencerai" -ForegroundColor Blue
Write-Host ""
Write-Host "2. Avvia stack con nuova configurazione:"
Write-Host "   docker compose -f infra/docker-compose.yml up -d" -ForegroundColor Blue
Write-Host ""
Write-Host "3. Verifica funzionamento:"
Write-Host "   docker compose -f infra/docker-compose.yml ps" -ForegroundColor Blue
Write-Host "   curl http://localhost:3001/health" -ForegroundColor Blue
Write-Host ""
Write-Host "OPZIONALE: Rimuovi vecchi volumi dopo verifica:" -ForegroundColor Yellow
foreach ($oldName in $volumeMappings.Keys) {
    try {
        docker volume inspect $oldName | Out-Null
        Write-Host "  docker volume rm $oldName" -ForegroundColor Blue
    } catch {
        # Volume non esiste
    }
}
Write-Host ""
Write-Host "Migrazione completata con successo!" -ForegroundColor Green
