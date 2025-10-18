#!/bin/bash
# =============================================================================
# Script di Migrazione Volumi Docker per InfluencerAI
# =============================================================================
#
# Migra volumi dalla vecchia naming convention (infra_pg_data)
# alla nuova (influencerai_pg_data) preservando i dati.
#
# ATTENZIONE: Esegui SOLO se hai già dati esistenti da migrare.
# Per setup da zero, salta questo script.
#
# Usage:
#   chmod +x scripts/migrate-docker-volumes.sh
#   ./scripts/migrate-docker-volumes.sh
#
# =============================================================================

set -e  # Exit on error

echo "=== InfluencerAI Docker Volumes Migration ==="
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verifica Docker in esecuzione
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker non è in esecuzione. Avvia Docker Desktop e riprova.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Docker è attivo${NC}"
echo ""

# Mapping volumi: OLD_NAME -> NEW_NAME
declare -A VOLUMES=(
  ["infra_pg_data"]="influencerai_pg_data"
  ["infra_minio_data"]="influencerai_minio_data"
  ["infra_n8n_data"]="influencerai_n8n_data"
  ["infra_redis_data"]="influencerai_redis_data"
  # Aggiungi nomi alternativi che potrebbero esistere
  ["pg_data"]="influencerai_pg_data"
  ["minio_data"]="influencerai_minio_data"
  ["n8n_data"]="influencerai_n8n_data"
  ["redis_data"]="influencerai_redis_data"
)

# Funzione per migrare un volume
migrate_volume() {
  local old_name=$1
  local new_name=$2

  echo -e "${BLUE}---${NC}"
  echo -e "${BLUE}Migrando: $old_name -> $new_name${NC}"

  # Verifica esistenza volume old
  if ! docker volume inspect "$old_name" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Volume $old_name non esiste, skip.${NC}"
    return 0
  fi

  # Verifica se new volume già esiste
  if docker volume inspect "$new_name" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Volume $new_name già esiste.${NC}"
    read -p "Vuoi sovrascriverlo? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Skip migrazione $old_name"
      return 0
    fi
    echo "Rimuovendo volume esistente $new_name..."
    docker volume rm "$new_name"
  fi

  # Crea nuovo volume
  echo "Creando nuovo volume $new_name..."
  docker volume create "$new_name"

  # Copia dati usando container temporaneo
  echo "Copiando dati (questo può richiedere alcuni minuti)..."
  docker run --rm \
    -v "$old_name":/source \
    -v "$new_name":/target \
    alpine \
    sh -c "cp -av /source/. /target/"

  # Verifica successo
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrazione completata: $new_name${NC}"
  else
    echo -e "${RED}❌ Errore durante migrazione: $new_name${NC}"
    return 1
  fi
}

# Ferma container influencerai se in esecuzione
echo -e "${YELLOW}Fermando container InfluencerAI (se attivi)...${NC}"
cd "$(dirname "$0")/.." || exit 1
docker compose -f infra/docker-compose.yml down 2>/dev/null || true
echo ""

# Mostra volumi esistenti
echo -e "${BLUE}Volumi Docker esistenti:${NC}"
docker volume ls | grep -E "(infra|pg_data|redis|minio|n8n)" || echo "Nessun volume trovato"
echo ""

# Conferma prima di procedere
read -p "Procedere con la migrazione? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Migrazione annullata."
  exit 0
fi
echo ""

# Esegui migrazioni (rimuovi duplicati)
declare -A processed
for old_name in "${!VOLUMES[@]}"; do
  new_name="${VOLUMES[$old_name]}"
  # Skip se già processato questo target
  if [[ -n "${processed[$new_name]}" ]]; then
    continue
  fi
  processed[$new_name]=1
  migrate_volume "$old_name" "$new_name"
done

echo ""
echo -e "${GREEN}=== Migrazione Completata ===${NC}"
echo ""
echo -e "${GREEN}Prossimi passi:${NC}"
echo "1. Verifica volumi migrati:"
echo "   ${BLUE}docker volume ls | grep influencerai${NC}"
echo ""
echo "2. Avvia stack con nuova configurazione:"
echo "   ${BLUE}docker compose -f infra/docker-compose.yml up -d${NC}"
echo ""
echo "3. Verifica funzionamento:"
echo "   ${BLUE}docker compose -f infra/docker-compose.yml ps${NC}"
echo "   ${BLUE}curl http://localhost:3001/health${NC}"
echo ""
echo -e "${YELLOW}OPZIONALE:${NC} Rimuovi vecchi volumi dopo verifica:"
for old_name in "${!VOLUMES[@]}"; do
  if docker volume inspect "$old_name" > /dev/null 2>&1; then
    echo "  ${BLUE}docker volume rm $old_name${NC}"
  fi
done
echo ""
echo -e "${GREEN}Migrazione completata con successo!${NC}"
