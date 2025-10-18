# Infrastructure & Docker Context

**Working Directory**: `infra`

## Services & Ports

- `postgres`: 5432 (PostgreSQL 16.4)
- `qdrant`: 6333 (REST), 6334 (gRPC) - Vector DB
- `redis`: 6379 - Cache
- `n8n`: 5678 - Workflow automation
- `api`: 8080 - ASP.NET Core
- `web`: 3000 - Next.js

## Commands

```bash
docker compose up -d                    # Start all
docker compose up -d --build            # Rebuild + start
docker compose logs -f [service]        # View logs
docker compose down                     # Stop all
docker compose down -v                  # Stop + delete volumes
docker compose restart [service]        # Restart service
docker compose ps                       # Service health
```

## Environment Files

**Location**: `infra/env/*.env.*.example`

**Security**: Never commit `.env.dev`, `.env.local`, `.env.prod` (in `.gitignore`)

## Full Stack Local

```bash
# Terminal 1: Infrastructure
cd infra && docker compose up postgres qdrant redis n8n

# Terminal 2: API
cd apps/api/src/Api && dotnet run

# Terminal 3: Web
cd apps/web && pnpm dev

# Access: Web (3000), API (8080), n8n (5678)
```
