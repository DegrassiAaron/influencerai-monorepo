#!/usr/bin/env bash
set -euo pipefail

# Apply Prisma migrations (deploy) or push schema
# Usage:
#   bash scripts/db-migrate.sh deploy   # prisma migrate deploy
#   bash scripts/db-migrate.sh push     # prisma db push

CMD="${1:-deploy}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "${DATABASE_URL:-}" ]; then
  for f in "$ROOT_DIR/apps/api/.env" "$ROOT_DIR/.env"; do
    if [ -f "$f" ]; then
      eval "$(grep -E '^DATABASE_URL=' "$f" || true)"
      export DATABASE_URL
      break
    fi
  done
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL non impostata. Impostala oppure aggiungila a apps/api/.env o .env" >&2
  exit 1
fi

case "$CMD" in
  deploy)
    echo "Eseguo prisma migrate deploy..."
    pnpm --filter @influencerai/api exec prisma migrate deploy
    ;;
  push)
    echo "Eseguo prisma db push..."
    pnpm --filter @influencerai/api exec prisma db push
    ;;
  *)
    echo "Uso: bash scripts/db-migrate.sh [deploy|push]" >&2
    exit 1
    ;;
fi
