# Backend API Context

**Working Directory**: `apps/api`

## Tech Stack
ASP.NET Core 8.0 (C#), PostgreSQL 16.4, Qdrant (vector), Redis (cache), n8n

## Commands

```bash
dotnet build                    # Build solution
dotnet test                     # Run tests
dotnet run                      # Run locally (from src/Api/)
dotnet ef database update --project src/Api
dotnet ef migrations add <Name> --project src/Api
```

## Architecture

### Service Layer (DI in `Program.cs:100-139`)

**AI Services**:
- `EmbeddingService`: OpenRouter API embeddings
- `QdrantService`: Vector database management
- `TextChunkingService`: 512 chars, 50 overlap
- `RagService`: Semantic search + RAG
- `LlmService`: LLM via OpenRouter

**PDF Services**:
- `PdfStorageService`: Upload/storage
- `PdfTextExtractionService`: Docnet.Core extraction
- `PdfTableExtractionService`: iText7 tables

**Domain Services**:
- `GameService`, `RuleSpecService`, `RuleSpecDiffService`, `SetupGuideService`

**Infrastructure**:
- `AuthService`: Session auth + cookies
- `AuditService`, `AiRequestLogService`
- `AiResponseCacheService`: Redis cache
- `RateLimitService`, `N8nConfigService`, `BackgroundTaskService`

### Database (EF Core 8.0)

**Context**: `Infrastructure/MeepleAiDbContext.cs`

**Key Entities** (`Infrastructure/Entities/`):
- Auth: `UserEntity`, `UserSessionEntity`, `UserRole`
- Game: `GameEntity`, `RuleSpecEntity`
- Docs: `PdfDocumentEntity`, `VectorDocumentEntity`
- Chat: `ChatEntity`, `ChatLogEntity`
- Logs: `AiRequestLogEntity`, `AuditLogEntity`
- Other: `AgentEntity`, `AgentFeedbackEntity`, `N8nConfigEntity`

**Migrations**: Auto-applied on startup (`Program.cs:184`) unless test mode

### Auth Flow (`Program.cs:226-248`)

1. Session cookie → `AuthService.ValidateSessionAsync()`
2. Claims: UserId, Email, DisplayName, Role
3. Active session in `HttpContext.Items["ActiveSession"]`

### Vector Search Pipeline

```
PDF → PdfTextExtractionService → TextChunkingService (512/50)
→ EmbeddingService → QdrantService → RagService.SearchAsync()
```

Qdrant collection init: `Program.cs:186-188`

### CORS (`Program.cs:141-170`)

Policy "web", origins from `Cors:AllowedOrigins`, fallback `http://localhost:3000`, credentials enabled

### Logging (Serilog, `Program.cs:23-32`)

Console + structured, enriched (MachineName, EnvironmentName, CorrelationId), `X-Correlation-Id` header

## Testing

**Framework**: xUnit + Moq + Testcontainers

- `Testcontainers.PostgreSql`, `Testcontainers.Qdrant`
- `Microsoft.AspNetCore.Mvc.Testing`
- SQLite in-memory for unit tests
- CI: `CI=true`, `DocnetRuntime=linux`

## Common Workflows

**Add Endpoint**:
1. Service method in `Services/<Service>.cs`
2. Endpoint in `Program.cs` (line 250+)
3. Models in `Models/` if needed
4. Tests in `tests/Api.Tests/`
5. Auth/authz logic

**Add Entity**:
1. `Infrastructure/Entities/<Entity>.cs`
2. `DbSet<T>` in `MeepleAiDbContext`
3. `dotnet ef migrations add <Name> --project src/Api`
4. Review in `Migrations/`
5. `dotnet ef database update --project src/Api`

## Environment

`infra/env/api.env.dev`:
- `OPENROUTER_API_KEY`: AI API key
- `QDRANT_URL`: `http://qdrant:6333`
- `REDIS_URL`: `redis:6379`
- `ConnectionStrings__Postgres`: PostgreSQL connection

## Code Standards

- Nullable reference types enabled
- Async for I/O operations
- Register services in `Program.cs`
- `ILogger<T>` + Serilog
- Appropriate HTTP status codes

## Troubleshooting

**Migrations**: Check `__EFMigrationsHistory`, rollback: `dotnet ef database update <Previous>`

**Qdrant**: `curl http://localhost:6333/healthz`, check API logs for collection init

**Auth**: Check `SessionCookieConfiguration`, `user_sessions` table, cookie settings
