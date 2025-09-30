# Prisma Connection Module (API-01)

This adds a production-ready Prisma bootstrapping layer to the NestJS API.

## What's included

- `PrismaService`: validates `DATABASE_URL`, connects on boot with masked logging, and registers process shutdown hooks (`beforeExit`, `SIGINT`, `SIGTERM`) to close the Nest app gracefully.
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

## Prisma 5+/6 compatibility note

From Prisma 5.0.0 onward, when using the library engine, `$on('beforeExit')` is no longer supported by the client. Instead, attach shutdown handlers to the Node process directly. This project implements:

```ts
// PrismaService.enableShutdownHooks(app)
const shutdown = async () => {
  this.logger.log('Process shutdown received - closing Nest application');
  await app.close();
};
process.on('beforeExit', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

This ensures the application closes cleanly on process termination without relying on Prisma client hooks.
