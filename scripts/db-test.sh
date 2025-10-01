#!/usr/bin/env bash
set -euo pipefail

# Simple DB connectivity check for Prisma (select 1)
# Usage: DATABASE_URL=... bash scripts/db-test.sh

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

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm non trovato nel PATH" >&2
  exit 1
fi

echo "Eseguo test di connessione (select 1) con Prisma..."
pnpm --filter @influencerai/api exec prisma db execute --script "select 1;"
echo "OK: connessione riuscita"
