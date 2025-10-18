# Documentazione Tecnica

Questa directory contiene documentazione tecnica approfondita, research, best practices e guide avanzate per sviluppatori.

---

## Indice Documenti

### Docker & Infrastructure

- **[docker-isolation-multiple-projects.md](./docker-isolation-multiple-projects.md)** - Come evitare conflitti Docker tra progetti multipli sulla stessa macchina. Include mapping porte, naming conventions, script di migrazione.

### API Development

- **[research-lora-config-api-best-practices.md](./research-lora-config-api-best-practices.md)** - Research completo su NestJS API patterns, Prisma best practices, Zod validation, testing E2E.

- **[nestjs-get-endpoints-best-practices.md](./nestjs-get-endpoints-best-practices.md)** - Patterns per endpoint GET: pagination, filtering, sorting, error handling.

- **[api-development-quick-reference.md](./api-development-quick-reference.md)** - Quick reference per sviluppo API NestJS con Prisma e Zod.

### Frontend Development

- **[research-dataset-ui-nextjs-tanstack-query.md](./research-dataset-ui-nextjs-tanstack-query.md)** - Research su implementazione UI Next.js con TanStack Query, shadcn/ui, form handling.

- **[research-dataset-ui-summary.md](./research-dataset-ui-summary.md)** - Sommario delle decisioni architetturali per frontend.

### CI/CD & DevOps

- **[research-github-actions-minio-service.md](./research-github-actions-minio-service.md)** - Research su configurazione MinIO in GitHub Actions per testing.

- **[fix-github-actions-minio-configuration.md](./fix-github-actions-minio-configuration.md)** - Fix per configurazione MinIO CI/CD.

- **[research-minio-github-actions-solutions.md](./research-minio-github-actions-solutions.md)** - Soluzioni alternative per MinIO testing in CI.

- **[ci-failures-analysis-pnpm-lockfile-sync.md](./ci-failures-analysis-pnpm-lockfile-sync.md)** - Analisi e risoluzione problemi pnpm lockfile in CI.

- **[fix-ci-failures-quick-guide.md](./fix-ci-failures-quick-guide.md)** - Guida rapida per fixare CI failures comuni.

---

## Convenzioni

### Naming Convention

I file tecnici seguono questa convenzione:

- `research-<topic>.md` - Research approfondito con confidence scores e fonti
- `fix-<issue>.md` - Guide per risolvere problemi specifici
- `<technology>-best-practices.md` - Best practices per tecnologia specifica

### Struttura Research Document

Ogni research document include:

1. **Confidence Score** (0.0-1.0) per ogni sezione
2. **Fonti verificate** (documentazione ufficiale, Stack Overflow, etc.)
3. **Code examples** testati
4. **Trade-offs** e alternative considerate
5. **Changelog** con versioni e date

### Confidence Scores

- **0.9-1.0**: Verificato da documentazione ufficiale
- **0.7-0.89**: Forte evidenza da fonti multiple affidabili
- **0.5-0.69**: Ragionevole inferenza da informazioni disponibili
- **<0.5**: Incerto, richiede verifica

---

## Come Contribuire

### Aggiungere Nuovo Research

1. Crea file `research-<topic>.md`
2. Segui template:

```markdown
# Research: <Topic>

**Confidence**: 0.X
**Data**: YYYY-MM-DD
**Autore**: Name

## Obiettivo

Cosa stai ricercando e perché.

## Metodologia

Come hai condotto la ricerca.

## Findings

### Finding 1
**Confidence**: 0.X
**Fonte**: [Link]

Descrizione...

## Raccomandazioni

Cosa implementare basato su questo research.

## Riferimenti

- [Source 1](url)
- [Source 2](url)
```

### Aggiungere Fix Guide

1. Crea file `fix-<issue>.md`
2. Includi:
   - Problema chiaro
   - Root cause
   - Soluzione step-by-step
   - Prevenzione futura

---

## Riferimenti Esterni

### Docker

- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/)
- [Docker Networking](https://docs.docker.com/network/)
- [Docker Volumes](https://docs.docker.com/storage/volumes/)

### NestJS

- [NestJS Documentation](https://docs.nestjs.com/)
- [Fastify Adapter](https://docs.nestjs.com/techniques/performance)
- [OpenAPI/Swagger](https://docs.nestjs.com/openapi/introduction)

### Prisma

- [Prisma Docs](https://www.prisma.io/docs/)
- [Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

### Frontend

- [Next.js App Router](https://nextjs.org/docs/app)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)

### Testing

- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Supertest](https://github.com/ladjs/supertest)

---

**Ultimo Aggiornamento**: 2025-10-18
