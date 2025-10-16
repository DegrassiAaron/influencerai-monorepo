# Spike: aggiornamento NestJS 11

## Sintesi rapida

- NestJS 11 richiede Node.js >= 20 e aggiorna entrambi i runtime HTTP (Express 5, Fastify 5), quindi l'
  ambiente deve restare su Node 20 e allineare sia le dipendenze Nest che i peer del transport layer.
- L'ecosistema ufficiale pubblica nuove major per `@nestjs/config`, `@nestjs/bullmq`, CLI e Swagger;
  serve stimare impatto su bootstrap, validazione config e documentazione API.
- L'upgrade include Fastify 5: rimuove la `listen` variadica e aggiorna le opzioni degli helper
  (`@fastify/static`), imponendo una revisione del bootstrap in `main.ts` e dei plugin caricati.
- Il logging via `nestjs-pino` è compatibile con Nest 11, ma conviene allineare Pino e verificare la
  nuova API Fastify logger per evitare regressioni di formattazione.

## Stato attuale (pacchetti chiave)

| Pacchetto                    | Versione | Note                 | Fonte                   |
| ---------------------------- | -------- | -------------------- | ----------------------- |
| @nestjs/common/core/platform | 10.4.x   | Core Nest 10         | `apps/api/package.json` |
| @nestjs/config               | 3.3.0    | ConfigModule         | `apps/api/package.json` |
| @nestjs/swagger              | 8.0.7    | Swagger docs         | `apps/api/package.json` |
| @nestjs/bullmq               | 10.2.1   | code BullMQ          | `apps/api/package.json` |
| @fastify/static              | 7.0.4    | richiesto da Swagger | `apps/api/package.json` |
| fastify                      | 5.2.3    | adapter HTTP         | `apps/api/package.json` |
| nestjs-pino                  | 4.0.0    | logger Fastify       | `apps/api/package.json` |
| express (dev root)           | 4.21.2   | usato nei tool       | `package.json`          |

`pnpm --filter @influencerai/api outdated` evidenzia gli upgrade major disponibili per tutte le
librerie sopra oltre a pacchetti di tooling (Jest 30, @types/\* 30+, Zod 4, ecc.); ci concentriamo sui
componenti necessari alla migrazione a NestJS 11.【53c31e†L1-L27】【53c31e†L28-L43】

## Target upgrade

| Categoria          | Target principale                                   | Note operative                                                                          |
| ------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Nest core          | `@nestjs/*` 11.1.x, `reflect-metadata` ^0.2         | aggiornare `core`, `common`, `platform-fastify`, `testing`, `jwt`, `passport`, `bullmq` |
| Tooling Nest       | `@nestjs/cli` 11.x, `@nestjs/schematics` 11.x       | garantire compatibilità generatori                                                      |
| Configurazione     | `@nestjs/config` 4.0.x                              | verificare breaking changes su `forRoot`                                                |
| Documentazione     | `@nestjs/swagger` 11.x + `@fastify/static` 8.x      | controllare opzioni `SwaggerModule`                                                     |
| HTTP adapters      | `fastify` 5.x, `@fastify/static` 8.x, `express` 5.x | adeguare bootstrap e middleware                                                         |
| Logging            | `nestjs-pino` >= 4.4, `pino` 9→10, `pino-pretty` 13 | aggiornare peer coerenti                                                                |
| Codebase condivisa | Nessun bump obbligatorio (Zod, Jest, ecc.)          | valutare separatamente per minimizzare scope                                            |

## Cambiamenti da analizzare

### NestJS 11 core

- Release v11 impone Node >= 20 e aggiorna Express/Fastify alla major successiva.【8fa888†L1-L21】
- Nessun cambio sostanziale al ciclo di vita ma serve rigenerare il client Swagger e aggiornare le
  tipizzazioni generate.
- Verificare `@nestjs/passport` 11 (richiede `passport` >= 0.7, già presente) e `@nestjs/jwt` 11
  (richiede `jsonwebtoken` >= 9, già presente).

### Fastify 5 e adapter

- Fastify 5 rimuove `listen` variadica: `await app.listen(port, host)` deve diventare
  `await app.listen({ port, host })`.【200f0a†L1-L13】
- Nuovo logger API Fastify: assicurarsi che `nestjs-pino` (>=4.4) agganci correttamente il logger e
  che il transport `pino-pretty` mantenga la configurazione.
- Aggiornare eventuali hook/middleware custom per le nuove opzioni (es. `requestIdHeader` ora `false`
  di default).【200f0a†L8-L20】

### `@fastify/static` 8

- Release Nest 11 aggiorna le interfacce delle opzioni statiche/view; Swagger 11 si aspetta queste
  firme, quindi va aggiornato il pacchetto e verificata la configurazione (attualmente non c'è
  registrazione manuale, ma il bootstrap Swagger le usa internamente).【0b3321†L5-L14】【0b3321†L35-L44】

### `@nestjs/config` 4

- Major release coordinata con Nest 11; l'API `ConfigModule.forRoot` resta stabile ma il typing delle
  chiavi esportate è più rigoroso (`KeyOf` supporta i simboli).【0b3321†L25-L28】【4dd9b2†L1-L1】
- Confermare che l'oggetto restituito da `validateEnv` continui ad allinearsi con la trasformazione
  Zod (`envSchema.transform`). Testare scenari runtime con `DISABLE_BULL`, `LOGGER_PRETTY` e config
  opzionali per evitare regressioni.

### Swagger 11

- Aggiornamento del `DocumentBuilder` con supporto per estensioni nell'`info` e negli schemi di
  sicurezza; non breaking ma opportunità per arricchire la documentazione.【19c201†L1-L9】
- Verificare generazione OpenAPI dopo l'upgrade (eseguire `SwaggerModule.createDocument`).

### Tooling e DevX

- Aggiornare CLI/schematics e rifare `pnpm install` assicurando che gli schematics generino codice
  conforme alle nuove regole (ESM ready, decorators).
- Valutare aggiornamento opzionale delle tipizzazioni (`@types/jest`, `@types/node`) solo dopo aver
  sbloccato Nest 11 per evitare rumore nello scope principale.

## Piano di lavoro proposto

1. **Preparazione branch**: creare branch `feat/125-nestjs-11-spike`, aggiornare pnpm se necessario.
2. **Aggiornare dipendenze**: bump manuale nel `package.json` API + root per Express 5; eseguire
   `pnpm install` e verificare il nuovo lockfile.
3. **Refactoring bootstrap**: adattare `main.ts` (`listen` options object) e confermare che `Logger`
   utilizzi il nuovo hook.
4. **Test funzionali**: eseguire `pnpm --filter @influencerai/api test`, `pnpm lint`, `pnpm build`.
5. **Verifiche manuali**: avviare `pnpm --filter api dev` e controllare health check + Swagger UI.
6. **Documentare follow-up**: annotare eventuali regression, TODO per pacchetti non critici (Zod 4,
   Jest 30) in issue dedicata.

## Strategia di test

- Unit/integration: `pnpm --filter @influencerai/api test`.
- End-to-end (se configurati): avviare servizi via Docker e lanciare suite `tests/e2e`.
- Fumo manuale: verificare endpoint `/health`, autenticazione e generazione job in ambiente locale.

## Rischi e mitigazioni

- **Compatibilità plugin Fastify**: dipendiamo da `nestjs-pino` e potenziali plugin futuri. Aggiornare
  a `nestjs-pino` 4.4.1 (peer ^11) e validare logging in dev.
- **Tipi Zod trasformati**: la nuova rigidità di `@nestjs/config` potrebbe evidenziare inconsistenze.
  Preparare test mirati per `computeBullEnabled` e `validateEnv`.
- **Dipendenze secondarie**: upgrade major di Jest/Zod potrebbero introdurre rumore; posticipare a un
  secondo PR salvo requisiti runtime.
