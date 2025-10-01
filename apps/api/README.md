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

#### Nota su `DATABASE_URL` con Docker Compose

- Se il file `.env` alla root definisce `DATABASE_URL=...localhost...`, può sovrascrivere i default del compose e far puntare i container a Postgres dell'host.
- In ambiente container, usa `postgres:5432` come host (es. `postgresql://postgres:postgres@postgres:5432/influencerai`).
- Opzioni consigliate:
  - Non definire `DATABASE_URL` nel `.env` root quando usi Docker Compose.
  - Oppure sovrascrivi la variabile nei servizi che la usano (es. `api-migrate`) con `-e DATABASE_URL=...`.
  - Oppure mantieni due file env separati (host vs docker) e carica quello corretto.

### Troubleshooting

- Verifica che Postgres sia attivo (Docker) e che `DATABASE_URL` punti all'istanza corretta.
- Rigenera il client dopo modifiche allo schema: `pnpm --filter @influencerai/api prisma:generate`.


## Esempi cURL Jobs

- Crea job (content-generation):

```
curl -X POST http://localhost:3001/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "content-generation",
    "payload": { "foo": "bar" },
    "priority": 1
  }'
```

- Lista job (filtri/paginazione):

```
curl "http://localhost:3001/jobs?type=content-generation&status=pending&take=10&skip=0"
```

- Dettaglio job:

```
curl http://localhost:3001/jobs/<JOB_ID>
```

