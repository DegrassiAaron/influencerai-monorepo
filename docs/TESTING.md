# Testing

Istruzioni per eseguire test e verifiche locali del progetto.

## Prerequisiti

- Dipendenze installate: `pnpm -w install`
- Servizi di base in esecuzione (per test d’integrazione DB): `bash scripts/start-all.sh` oppure PowerShell equivalente.

## Test unitari e di pacchetto

Il workspace è predisposto per usare `turbo` come orchestratore di comandi. Quando i pacchetti esporranno lo script `test` (es. con Vitest), potrai eseguire:

```bash
pnpm test
# equivalente a
turbo run test
```

Esecuzione selettiva per package (una volta presenti gli script `test`):

```bash
pnpm --filter @influencerai/core-schemas test
pnpm --filter @influencerai/sdk test
pnpm --filter @influencerai/prompts test
```

Nota: la configurazione Vitest e le suite test per `core-schemas`, `sdk`, `prompts` saranno introdotte nell’attività PKG-01.

## Test con il database (smoke)

Verifica rapida della connessione Postgres tramite Prisma:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db-test.ps1
```

## Lint e build

```bash
pnpm lint
pnpm build
```

## Troubleshooting test

- Assicurati che `DATABASE_URL` sia valorizzata in `.env` o `apps/api/.env` per i test d’integrazione.
- Se i servizi non sono disponibili, avviali con `scripts/start-all.{sh,ps1}`.
- In caso di errori di permessi su Windows, esegui PowerShell con `-ExecutionPolicy Bypass`.

