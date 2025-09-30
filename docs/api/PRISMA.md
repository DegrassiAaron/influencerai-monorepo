# Prisma Connection Module (API-01)

This adds a production-ready Prisma bootstrapping layer to the NestJS API.

## What’s included

- `PrismaService`: validates `DATABASE_URL`, connects on boot with masked logging, clean shutdown, and `beforeExit` hook to close Nest app gracefully.
- `PrismaModule`: globally provides PrismaService.
- `AppModule` integration: Prisma is imported globally; BullMQ config is skipped when `NODE_ENV=test`.

## Files

- `apps/api/src/prisma/prisma.service.ts`
- `apps/api/src/prisma/prisma.module.ts`
- `apps/api/src/app.module.ts`

## Tests

- Unit: `pnpm --filter @influencerai/api test`
  - `PrismaService` connect/disconnect lifecycle, error propagation, shutdown hook wiring.
- E2E: `pnpm --filter @influencerai/api test:e2e`
  - Health endpoint boots the app and verifies `{ status: 'ok', timestamp }`.

## Local run

1. Ensure `.env` has a valid `DATABASE_URL` (see `.env.example`).
2. `bash scripts/start-all.sh` (or `docker compose -f infra/docker-compose.yml up -d --build`).
3. Visit Swagger: `http://localhost:3001/api`.

## Notes

- The service masks credentials in logs.
- Fails fast if `DATABASE_URL` is missing.
- CI runs unit + e2e tests on PRs; Docker images build in a separate job.
