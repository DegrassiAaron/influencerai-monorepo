#!/usr/bin/env bash
set -euo pipefail

# Start the full InfluencerAI stack (DB, cache, MinIO, n8n, API, worker, web).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

if ! command -v docker &>/dev/null; then
  echo "Docker is required but not found in PATH" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required (docker compose)" >&2
  exit 1
fi

# Ensure .env exists at repo root so containers can read configuration
if [ ! -f "$ROOT_DIR/.env" ]; then
  if [ -f "$ROOT_DIR/.env.example" ]; then
    echo "Creating .env from .env.example"
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  else
    echo "Warning: .env not found and .env.example missing. Proceeding with compose defaults." >&2
  fi
fi

echo "Building and starting services (from any directory)..."
docker compose -f "$INFRA_DIR/docker-compose.yml" up -d --build

echo
echo "Services are starting. Useful endpoints:"
echo "- Web UI:          http://localhost:3000"
echo "- API (Swagger):   http://localhost:3001/api"
echo "- n8n:             http://localhost:5678"
echo "- MinIO Console:   http://localhost:9001 (S3 at http://localhost:9000)"
echo
echo "To follow logs:    docker compose -f infra/docker-compose.yml logs -f web"
echo "To stop stack:     docker compose -f infra/docker-compose.yml down"
