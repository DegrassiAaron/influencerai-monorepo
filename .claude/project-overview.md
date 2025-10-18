# MeepleAI Project Overview

AI-powered board game rules assistant. Processes PDF rulebooks, semantic search via vector embeddings, intelligent gameplay answers.

## Monorepo Structure

```
apps/
  api/          # ASP.NET Core 8.0 backend
  web/          # Next.js 14 frontend
infra/          # Docker Compose, env templates, init scripts
schemas/        # JSON validation schemas
docs/           # Technical docs
tools/          # PowerShell scripts
```

## Tech Stack

- **Backend**: ASP.NET Core 8.0 (C#)
- **Frontend**: Next.js 14 + React 18 (TypeScript)
- **Databases**: PostgreSQL (relational), Qdrant (vector), Redis (cache)
- **AI/ML**: OpenRouter API (embeddings + LLM)
- **Workflow**: n8n
- **Infra**: Docker Compose

## CI/CD

`.github/workflows/ci.yml`:
- **ci-web**: Lint → Typecheck → Test (Node 20, pnpm 9)
- **ci-api**: Build → Test (.NET 8.0, postgres, qdrant)

## Related Context Files

- `backend-api.md`: API service architecture, commands, workflows
- `frontend-web.md`: Next.js app structure, testing, commands
- `infra-docker.md`: Docker services, ports, environment setup
