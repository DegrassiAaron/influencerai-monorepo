# Debug Command - Automatic Error Analysis & Fix

Analizza errori dello stack (API/Frontend/Infra), propone 2 soluzioni, seleziona la migliore automaticamente, implementa fix preventivi e crea issue/PR su GitHub.

**Sintassi**: `/debug [messaggio_errore_opzionale]`

---

## STEP 1: RACCOLTA ERRORI

Se l'utente non fornisce un messaggio di errore specifico, raccogli automaticamente errori da tutte le fonti:

### A. Seq Logs (ultimi 10 minuti)
```bash
# Query Seq API per errori recenti
curl -s "http://localhost:8081/api/events?filter=Level%3D%27Error%27&count=50" | \
  ConvertFrom-Json | Select-Object -First 20 | \
  Select-Object Timestamp, RenderedMessage, Exception | Format-Table -AutoSize
```

### B. Docker Container Logs
```bash
# Analizza logs di tutti i container (ultimi 10 min)
docker compose logs --tail=100 --since=10m 2>&1 | \
  Select-String -Pattern "error|exception|failed|timeout|refused" -Context 1,1
```

### C. Frontend Build/Console Errors
```bash
# Check TypeScript errors
cd apps/web && pnpm typecheck 2>&1 | Select-String -Pattern "error TS" -Context 0,1

# Check build errors (se in prod build)
pnpm build 2>&1 | Select-String -Pattern "error|failed|Error:" -Context 1,1
```

### D. API Health Checks
```bash
# Verifica health endpoint
curl -s http://localhost:8080/health | ConvertFrom-Json | \
  Select-Object status, entries | Format-List
```

**Output atteso**: Aggregato di tutti gli errori trovati con timestamp, fonte, messaggio

---

## STEP 2: ANALISI MULTI-LAYER CON SEQUENTIAL REASONING

Usa `mcp__sequential__sequential_start` per analisi strutturata:

### Chain di Reasoning:
1. **Stack Detection**: Identifica layer coinvolto
   - Pattern matching: `*.cs` → API, `*.tsx/*.ts` → Frontend, `docker-compose` → Infra
   - Keyword analysis: `EF Core`, `Npgsql` → Database; `Redis`, `Qdrant` → Cache/Vector
   - Servizi coinvolti: Estrai nomi da logs (es. `RagService`, `ChatService`)

2. **Root Cause Analysis**:
   - **API errors**: Analizza stack trace, exception type, metodo fallito
   - **Frontend errors**: Component name, hook failure, API call failure
   - **Infra errors**: Service down, connection refused, timeout
   - **Database errors**: Migration issue, connection pool, query timeout
   - Usa `mcp__magic__magic_analyze` con `analysis_type: "pattern"` per pattern recognition

3. **Impact Assessment** (score 1-10):
   - **Critical (9-10)**: Servizio down, data loss, security breach
   - **High (7-8)**: Feature broken, performance degradation >50%
   - **Medium (4-6)**: Partial feature failure, workaround disponibile
   - **Low (1-3)**: UI glitch, minor inconvenience

4. **Dependency Mapping**: Identifica componenti impattati
   - Se errore in `RagService` → impatta `/agents/qa`, `/setup/generate`
   - Se errore in `AuthService` → blocca tutte le route autenticate

**Output Step 2**: JSON strutturato
```json
{
  "errorType": "ConnectionTimeout",
  "layer": "API",
  "service": "RagService",
  "rootCause": "Redis connection pool exhausted",
  "impactScore": 8,
  "affectedEndpoints": ["/api/v1/agents/qa", "/api/v1/setup/generate"],
  "stackTrace": "..."
}
```

---

## STEP 3: GENERAZIONE 2 SOLUZIONI ALTERNATIVE

Usa `mcp__sequential__sequential_step` per generare 2 soluzioni:

### Soluzione A: Fix Tattico/Immediato
- **Obiettivo**: Risolve il problema nel breve termine
- **Approccio**: Gestione errore, retry logic, fallback, validazione input
- **Esempio**: Aggiunge try-catch + retry exponential backoff

### Soluzione B: Fix Strategico/Strutturale
- **Obiettivo**: Previene il problema a livello architetturale
- **Approccio**: Refactoring, design pattern, monitoring, resilience pattern
- **Esempio**: Implementa Circuit Breaker pattern + health monitoring

### AI Scoring Automatico (0-100):

**Formula**:
```
Score = (Impact_Reduction × 0.4) + (1 - Effort_Normalized × 0.3) +
        (1 - Risk_Normalized × 0.2) + (Maintainability × 0.1)
```

**Criteri**:
1. **Impact Reduction (40%)**: Quanto riduce la probabilità di recurrence?
   - Tattico: 60-75%
   - Strategico: 85-95%

2. **Implementation Effort (30%)**: Ore di sviluppo stimate
   - Low (1-2h): Score 90
   - Medium (3-6h): Score 70
   - High (7-16h): Score 40

3. **Risk/Side-Effects (20%)**: Probabilità di regressioni
   - Low (modifiche isolate): Score 90
   - Medium (refactoring medio): Score 70
   - High (architectural change): Score 50

4. **Maintainability (10%)**: Facilità manutenzione futura
   - Pattern standard: Score 90
   - Custom logic: Score 60

**Selezione**: Soluzione con score più alto (>= 70 preferibile)

**Output Step 3**:
```
⚖️  Soluzione A (Score: 72): Retry logic + exponential backoff
    Impact: 70%, Effort: 2h, Risk: Low, Maintainability: High

⚖️  Soluzione B (Score: 85): Circuit breaker pattern + health monitoring ✓
    Impact: 90%, Effort: 4h, Risk: Medium, Maintainability: High

✅ Selezionata automaticamente: Soluzione B
```

---

## STEP 4: IMPLEMENTAZIONE FIX + PREVENTION MEASURES

Usa `mcp__sequential__sequential_step` per implementazione:

### A. Applica Fix Codice
- **API (.cs)**:
  - Modifica service/middleware necessario
  - Aggiunge configuration in `appsettings.json` se richiesto
  - Update DI in `Program.cs` se nuovi servizi

- **Frontend (.tsx/.ts)**:
  - Modifica componenti/hooks
  - Aggiorna types in `@/lib/api.ts`
  - Fix import/export

- **Infra (docker-compose.yml, Dockerfile)**:
  - Aggiorna configurazione container
  - Aggiunge health checks
  - Fix environment variables

### B. Validation Guards
Aggiungi validazione preventiva:
```csharp
// Esempio API
if (string.IsNullOrWhiteSpace(config.RedisUrl))
    throw new InvalidOperationException("REDIS_URL configuration is required");

// Esempio Frontend
if (!gameId || !uuid.validate(gameId)) {
    throw new Error("Invalid gameId format");
}
```

### C. Unit/Integration Tests
Crea test case che riproducono l'errore:

**Backend (xUnit)**:
```csharp
// File: apps/api/tests/Api.Tests/Services/{ServiceName}ResilienceTests.cs
[Fact]
public async Task MethodName_WhenConditionThatCausedError_ShouldHandleGracefully()
{
    // Arrange: Setup scenario che causa errore
    // Act: Esegui operazione
    // Assert: Verifica gestione corretta
}
```

**Frontend (Jest)**:
```typescript
// File: apps/web/src/__tests__/{component}.resilience.test.tsx
it('should handle {error_scenario} gracefully', async () => {
    // Arrange: Mock API failure
    // Act: Trigger error condition
    // Assert: Verify error handling
});
```

Crea **almeno 3 test**:
1. Test che riproduce l'errore originale
2. Test edge case correlato
3. Test integrazione end-to-end

### D. Documentation Update
Aggiorna `docs/troubleshooting.md`:

```markdown
## {Error Type}: {Brief Description}

**Sintomo**: {Come si manifesta l'errore}

**Root Cause**: {Causa identificata}

**Soluzione**: {Fix implementato}

**Prevenzione**:
- {Validation guard aggiunto}
- {Test coverage aggiunto}
- {Monitoring aggiunto}

**Riferimenti**: Issue #{issue_number}, PR #{pr_number}

---
```

### E. Monitoring/Alerting
Aggiungi log strutturato + metric:

**Log (Serilog)**:
```csharp
_logger.LogWarning(
    "RagService Redis timeout prevented by circuit breaker. " +
    "State: {CircuitState}, FailureCount: {FailureCount}",
    circuitState, failureCount);
```

**Metric (OpenTelemetry)**:
```csharp
// In MeepleAiMetrics.cs
public static readonly Counter<long> CircuitBreakerStateChanges =
    Meter.CreateCounter<long>(
        "meepleai.circuitbreaker.state_changes.total",
        description: "Circuit breaker state transitions");
```

**Alert Query (Seq)**:
```sql
-- Alert se >5 errori in 5 minuti
SELECT COUNT(*) FROM stream
WHERE Level = 'Error' AND ServiceName = 'RagService'
GROUP BY TIME(5m)
HAVING COUNT(*) > 5
```

---

## STEP 5: GIT WORKFLOW AUTOMATICO

Usa `mcp__github-project-manager__github_create_issue` e `github_create_pr`:

### A. Crea GitHub Issue
```typescript
{
  title: "[AUTO-DEBUG] {ErrorType}: {Brief Description}",
  body: `
## 🔍 Analisi Automatica

**Error Type**: {errorType}
**Layer**: {layer}
**Service**: {service}
**Impact Score**: {impactScore}/10

## 📊 Root Cause
{rootCause dettagliato con stack trace}

## ⚖️ Soluzioni Analizzate

### Soluzione A (Score: {scoreA})
{descrizione soluzione A}

### Soluzione B (Score: {scoreB}) ✓ SELEZIONATA
{descrizione soluzione B}

## 🛠️ Fix Implementato
- [ ] Codice modificato: {file list}
- [ ] Validation guards aggiunti
- [ ] Test creati ({test_count} tests)
- [ ] Documentazione aggiornata
- [ ] Monitoring aggiunto

## 📈 Metriche Prevention
- **Coverage**: {coverage_before}% → {coverage_after}%
- **Tests**: +{new_tests_count}
- **Monitoring**: {metrics_added}

🤖 Generato automaticamente da /debug command
  `,
  labels: ["bug", "auto-fix", "{layer}-layer", "priority-{priority}"]
}
```

### B. Crea Branch & Commit
```bash
# Branch naming: fix/debug-auto-{timestamp}-{error-type-slug}
git checkout -b "fix/debug-auto-$(Get-Date -Format 'yyyyMMdd-HHmmss')-{error-type-slug}"

# Commit con template strutturato
git add {modified_files}
git commit -m "$(cat <<'EOF'
fix({layer}): auto-debug fix for {ErrorType} in {Service}

## Problem
{brief description of error}

## Root Cause
{1-2 sentence root cause}

## Solution (Score: {selected_score})
{selected solution description}

## Changes
- {file1}: {change description}
- {file2}: {change description}

## Prevention Measures
- ✅ Validation guards added
- ✅ {test_count} tests created (coverage +{delta}%)
- ✅ Documentation updated
- ✅ Monitoring: {metrics_added}

## Testing
- Unit: {unit_tests_count} passing
- Integration: {integration_tests_count} passing

Closes #{issue_number}

🤖 Generated with /debug command via Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git push -u origin HEAD
```

### C. Crea Pull Request
```typescript
{
  title: "[AUTO-FIX] {ErrorType} in {Service} - {Brief Description}",
  head: "fix/debug-auto-{timestamp}-{error-type-slug}",
  base: "main",
  body: `
## 🐛 Problem
{error description con stack trace excerpt}

## 🔍 Analysis
**Root Cause**: {root cause}
**Impact**: {impactScore}/10 - {affected endpoints/features}

## ✅ Solution
Implemented **Solution B** (AI Score: {score}/100):
{solution description}

### Why This Solution?
- Impact Reduction: {impact}%
- Implementation Effort: {effort}h
- Risk: {risk_level}
- Maintainability: High

## 🛠️ Changes
${file_changes_summary}

## 🧪 Testing
- **Unit Tests**: {unit_count} new tests
- **Integration Tests**: {integration_count} new tests
- **Coverage**: {before}% → {after}% (+{delta}%)

## 🛡️ Prevention Measures
- ✅ **Validation**: Input/config guards added
- ✅ **Tests**: Regression prevention suite
- ✅ **Docs**: Troubleshooting guide updated
- ✅ **Monitoring**: New metrics/logs for early detection

## 📊 Metrics Added
{list of new metrics/logs}

## 🔗 References
Closes #{issue_number}

---
🤖 Auto-generated by /debug command
  `,
  draft: false
}
```

---

## STEP 6: OUTPUT UTENTE (Sintesi Operazioni)

Fornisci report strutturato con icone:

```
🔍 ANALISI ERRORE COMPLETATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 FONTI ERRORI ANALIZZATE:
  ├─ Seq Logs: 3 errors found
  ├─ Docker Logs: 1 error (redis timeout)
  ├─ Frontend Build: 0 errors
  └─ Health Checks: Redis unhealthy

🎯 ROOT CAUSE IDENTIFICATA:
  Error Type: ConnectionTimeout
  Layer: API (RagService.cs:142)
  Service: RagService → Redis
  Impact: 8/10 (High)

  Causa: Redis connection pool exhausted under high load
  Endpoints affected: /api/v1/agents/qa, /api/v1/setup/generate

⚖️  SOLUZIONI GENERATE:

  Soluzione A (Score: 72/100)
  └─ Retry logic + exponential backoff
     Impact: 70% | Effort: 2h | Risk: Low

  Soluzione B (Score: 85/100) ✓ SELEZIONATA
  └─ Circuit breaker pattern + health monitoring
     Impact: 90% | Effort: 4h | Risk: Medium

🛠️  FIX IMPLEMENTATO:

  ✅ Codice modificato:
     ├─ RagService.cs (circuit breaker integration)
     ├─ Program.cs (DI configuration)
     ├─ appsettings.json (circuit breaker settings)
     └─ MeepleAiMetrics.cs (new metrics)

  ✅ Prevention measures:
     ├─ Validation: Redis URL config guard
     ├─ Tests: 8 new tests (RagServiceResilienceTests.cs)
     ├─ Coverage: 87.3% → 89.1% (+1.8%)
     ├─ Docs: troubleshooting.md updated
     └─ Monitoring: circuit_breaker.state metric added

📝 GITHUB INTEGRATION:

  ✅ Issue created: #XXX
     └─ https://github.com/org/repo/issues/XXX

  ✅ PR created: #YYY
     └─ Branch: fix/debug-auto-20251018-143022-redis-timeout
     └─ https://github.com/org/repo/pull/YYY
     └─ Status: Ready for review

🎉 DEBUG COMPLETATO CON SUCCESSO!
   Tempo totale: 4m 32s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ERROR HANDLING

Se il comando fallisce in qualsiasi step:

1. **Raccolta errori fallita**: Usa solo il messaggio fornito dall'utente
2. **Analisi fallita**: Chiedi all'utente di fornire più contesto
3. **Generazione soluzioni fallita**: Proponi fix generico basato su best practices
4. **Implementazione fallita**: Crea solo issue su GitHub con analisi, senza PR
5. **GitHub API fallita**: Salva report in `docs/debug-reports/{timestamp}.md`

## BEST PRACTICES

- Usa `mcp__sequential__*` per reasoning chain tracciabile
- Usa `mcp__magic__magic_analyze` per pattern recognition
- Leggi SEMPRE i file esistenti prima di modificarli (usa Read tool)
- Esegui test dopo implementazione per verificare fix
- Non committare se i test falliscono
- Mantieni atomic commits (un problema = un fix)

## INTEGRAZIONE CON CONTEXT7

Per ogni library/framework menzionato nell'errore:
1. Usa `mcp__upstash-context-7-mcp__resolve-library-id` per trovare la library
2. Usa `mcp__upstash-context-7-mcp__get-library-docs` per ottenere documentazione
3. Consulta best practices, error handling patterns, troubleshooting

**Esempi**:
- Backend: ASP.NET Core, Entity Framework Core, Npgsql, StackExchange.Redis, Serilog
- Frontend: React, Next.js, TypeScript, Jest, Playwright
- Infra: Docker, PostgreSQL, Redis, Qdrant

## WORKFLOW ADAPTATION PER TIPO ERRORE

### Backend C# Error
```
/debug System.NullReferenceException in RagService.SearchAsync
```
- Context7: ASP.NET Core, Entity Framework Core
- Test: xUnit integration test con Testcontainers
- Verification: `dotnet test`, check Seq logs

### Frontend TypeScript Error
```
/debug TS2339: Property 'chatId' does not exist on type 'StreamingResponse'
```
- Context7: TypeScript, React, Next.js
- Test: Jest unit test
- Verification: `pnpm typecheck`, `pnpm test`

### Database Error
```
/debug Npgsql.PostgresException: 42P01: relation "game_rules" does not exist
```
- Context7: PostgreSQL, Npgsql, Entity Framework Core
- Test: EF Core migration scenario
- Verification: `dotnet ef database update`, integration tests

### Docker Error
```
/debug docker: Error response from daemon: port is already allocated
```
- Context7: Docker
- Test: docker-compose scenario
- Verification: `docker compose up`, verify services

---

**Fine comando /debug**
