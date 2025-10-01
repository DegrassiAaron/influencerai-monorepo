# API (NestJS) — Prisma e Migrazioni

- Schema Prisma: `apps/api/prisma/schema.prisma`
- Client: `@prisma/client` (generato da `prisma generate`)

## Comandi utili

- Genera client: `pnpm --filter @influencerai/api prisma:generate`
- Migrazione (dev): `pnpm --filter @influencerai/api prisma:migrate:dev`
- Deploy migrazioni (prod/staging): `pnpm --filter @influencerai/api prisma:migrate:deploy`
- Sync schema senza migrazioni (dev): `pnpm --filter @influencerai/api prisma:db:push`

Richiede `DATABASE_URL` configurata (in `apps/api/.env` o nella root `.env`).

### Tramite Docker Compose

- Le migrazioni vengono applicate automaticamente al primo avvio tramite il servizio `api-migrate` definito in `infra/docker-compose.yml`.
- Avvio completo stack: vedi root `README.md` o `docs/SETUP.md` (script `scripts/start-all.*`).

### Troubleshooting

- Verifica che Postgres sia attivo (Docker) e che `DATABASE_URL` punti all'istanza corretta.
- Rigenera il client dopo modifiche allo schema: `pnpm --filter @influencerai/api prisma:generate`.
