#!/usr/bin/env bash
set -euo pipefail

# Stop the full InfluencerAI stack. Use --purge to also remove volumes.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"
PURGE=0

if [[ "${1:-}" == "--purge" ]]; then
  PURGE=1
fi

if [[ $PURGE -eq 1 ]]; then
  echo "Stopping and removing containers, networks, and volumes..."
  docker compose -f "$INFRA_DIR/docker-compose.yml" down -v
else
  echo "Stopping and removing containers and networks (volumes preserved)..."
  docker compose -f "$INFRA_DIR/docker-compose.yml" down
fi

echo "Done."
