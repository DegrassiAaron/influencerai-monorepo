# NestJS 11 Migration Spike Analysis

**Date:** 2025-10-16
**Prepared by:** Claude Code
**Target Migration:** NestJS 10.x → 11.x
**Current API Version:** @nestjs/core 10.4.20
**Target API Version:** @nestjs/core 11.1.6

---

## Executive Summary

### Migration Complexity: MEDIUM

**Estimated Total Effort:** 16-24 hours (2-3 developer days)

**Key Findings:**
- NestJS 11 introduces several breaking changes, but most are well-documented and low-risk
- The API uses Fastify adapter, which has a critical breaking change in route prefix exclusions
- Zod v4 upgrade is the highest risk item with significant breaking changes
- ConfigService behavior changes require careful testing
- Node.js 20+ is already in use (satisfies new requirements)

**Recommendation:** GO - Proceed with migration in a phased approach

**Key Risks:**
1. **HIGH:** Zod v4 error handling API changes may break validation logic
2. **MEDIUM:** ConfigService.get() precedence change may affect environment variable overrides
3. **MEDIUM:** Reflector.getAllAndOverride() type change requires null safety updates
4. **LOW:** Fastify route prefix warnings (cosmetic, not breaking)

---

## 1. Dependency Analysis

### 1.1 Outdated Packages Summary

Based on `pnpm outdated` output, the following packages require major version updates:

#### NestJS Core Ecosystem (10.x → 11.x)
| Package | Current | Target | Category |
|---------|---------|--------|----------|
| @nestjs/common | 10.4.20 | 11.1.6 | MAJOR |
| @nestjs/core | 10.4.20 | 11.1.6 | MAJOR |
| @nestjs/platform-fastify | 10.4.20 | 11.1.6 | MAJOR |
| @nestjs/testing | 10.4.20 | 11.1.6 | MAJOR (dev) |
| @nestjs/cli | 10.4.9 | 11.0.10 | MAJOR (dev) |
| @nestjs/schematics | 10.2.3 | 11.0.9 | MAJOR (dev) |

#### NestJS Modules (10.x → 11.x)
| Package | Current | Target | Category |
|---------|---------|--------|----------|
| @nestjs/bullmq | 10.2.3 | 11.0.4 | MAJOR |
| @nestjs/config | 3.3.0 | 4.0.2 | MAJOR |
| @nestjs/jwt | 10.2.0 | 11.0.1 | MAJOR |
| @nestjs/passport | 10.0.3 | 11.0.5 | MAJOR |
| @nestjs/swagger | 8.1.1 | 11.2.1 | MAJOR |

#### Fastify Ecosystem
| Package | Current | Target | Category |
|---------|---------|--------|----------|
| @fastify/static | 7.0.4 | 8.2.0 | MAJOR |

#### Core Dependencies
| Package | Current | Target | Category | Risk |
|---------|---------|--------|----------|------|
| zod | 3.25.76 | 4.1.12 | MAJOR | HIGH |
| pino | 9.12.0 | 10.0.0 | MAJOR | LOW |
| pino-pretty | 11.3.0 | 13.1.2 | MAJOR | LOW |
| bcryptjs | 2.4.3 | 3.0.2 | MAJOR | LOW |

#### Testing Dependencies
| Package | Current | Target | Category |
|---------|---------|--------|----------|
| jest | 29.7.0 | 30.2.0 | MAJOR |
| @types/jest | 29.5.14 | 30.0.0 | MAJOR |

#### Minor Updates (Safe)
- @aws-sdk/client-s3: 3.908.0 → 3.911.0
- bullmq: 5.59.0 → 5.61.0
- @typescript-eslint/*: 8.45.0 → 8.46.1
- @types/node: 22.18.7 → 24.8.0
- dotenv: 16.6.1 → 17.2.3

### 1.2 Dependency Tree Conflicts

**Analysis:** No blocking peer dependency conflicts identified. All major NestJS packages follow synchronized versioning.

**Potential Issues:**
- `@fastify/static` v8 may have peer dependency requirements for Fastify v5
- Current Fastify version: 5.6.1 (compatible with NestJS 11's Fastify v5 support)

---

## 2. Breaking Changes Assessment

### 2.1 NestJS 11 Core Breaking Changes

#### 2.1.1 Node.js Version Requirements

**Breaking Change:** Node.js v16 and v18 support dropped. Minimum required: Node.js 20+

**Impact:** NONE - Already using Node.js 20

**Evidence:**
```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base
```

```yaml
# .github/workflows/ci.yml
node-version: '20'
```

**Action Required:** None

---

#### 2.1.2 Express v5 Integration

**Breaking Change:** Express v5 is now default (revised path route matching algorithm)

**Impact:** NONE - API uses Fastify adapter, not Express

**Code Location:** `src/main.ts`
```typescript
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),  // Fastify, not Express
);
```

**Action Required:** None

---

#### 2.1.3 Fastify v5 Support and Route Prefix Changes

**Breaking Change:** Fastify v5 support with warnings for wildcard route exclusions

**Impact:** LOW - May see console warnings, but functionality preserved

**Affected Code:** None currently, but if global prefix exclusions are added in future:
```typescript
// This pattern will generate warnings in NestJS 11 + Fastify:
app.setGlobalPrefix('api', {
  exclude: ['/health/*']  // Wildcards no longer supported
});
```

**Current Usage:** No global prefix or exclusions found in `src/main.ts`

**Action Required:** Monitor console for warnings after upgrade

**Mitigation:** If wildcards needed, use specific paths or route-level decorators

---

#### 2.1.4 Reflector Class Changes

**Breaking Change:** `getAllAndOverride()` return type changed from `T` to `T | undefined`

**Impact:** LOW - Only one usage found, already handles undefined

**Affected Code:**
```typescript
// src/auth/jwt-auth.guard.ts:12
const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
  context.getHandler(),
  context.getClass(),
]);
if (isPublic) return true;  // Handles falsy values (undefined/false)
```

**Analysis:** Current code already handles undefined/falsy values correctly. The implicit truthiness check works for both `false` and `undefined`.

**Action Required:**
1. Add explicit undefined check for type safety
2. Update similar patterns proactively

**Recommendation:**
```typescript
// Before (works but not type-safe):
const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
  context.getHandler(),
  context.getClass(),
]);
if (isPublic) return true;

// After (type-safe for NestJS 11):
const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
  context.getHandler(),
  context.getClass(),
]);
if (isPublic === true) return true;  // Explicit check
```

---

#### 2.1.5 ConfigService Behavior Changes

**Breaking Change:** Configuration precedence order changed in `@nestjs/config` v4

**New Order:**
1. Internal configuration (config namespaces, custom config files)
2. Validated environment variables (if validation enabled)
3. `process.env` (previously had priority)

**Impact:** MEDIUM - Custom configuration can now override environment variables

**Current Usage:** ConfigService used extensively (12 files)

**Risk Assessment:**
- Current code uses `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })`
- All config loaded from `process.env` via Zod validation schema
- No custom config factories that would override env vars
- **Likely safe**, but requires testing to confirm no unexpected behavior

**Affected Code Locations:**
- `src/app.module.ts` - ConfigModule registration
- `src/main.ts` - Config retrieval for PORT, NODE_ENV, OPENROUTER_API_KEY
- `src/storage/storage.service.ts` - S3 configuration
- `src/jobs/jobs.service.ts` - BullMQ configuration
- `src/content-plans/content-plans.service.ts` - OpenRouter API key

**Critical Test Cases:**
1. Verify environment variables are still loaded correctly
2. Confirm validated env vars take precedence as expected
3. Test with custom config factories (if added in future)

**Action Required:**
1. Review all ConfigService.get() calls
2. Add integration tests for critical config values
3. Test config loading in all environments (dev, test, prod)

---

#### 2.1.6 CacheModule Updates (Not Applicable)

**Breaking Change:** CacheModule migrated to Keyv (cache-manager v6)

**Impact:** NONE - API does not use @nestjs/cache-manager

**Action Required:** None

---

### 2.2 Swagger/OpenAPI Changes

**Package:** @nestjs/swagger 8.1.1 → 11.2.1

**Impact:** LOW - Major version bump, but NestJS Swagger typically maintains backward compatibility

**Current Usage:**
```typescript
// src/main.ts
const swaggerConfig = new DocumentBuilder()
  .setTitle('InfluencerAI API')
  .setDescription('API for virtual influencer content generation')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('api', app, document);
```

**Affected Files:**
- `src/main.ts` - Swagger setup
- `src/content-plans/content-plans.controller.ts` - @ApiTags, @ApiOperation, @ApiResponse
- `src/jobs/jobs.controller.ts` - Swagger decorators
- `src/jobs/queues.controller.ts` - Swagger decorators

**Action Required:**
1. Test Swagger UI after upgrade (/api endpoint)
2. Verify decorator behavior unchanged
3. Check OpenAPI spec generation

**Risk:** LOW - Simple usage, unlikely to break

---

### 2.3 Zod v4 Breaking Changes (HIGH RISK)

**Breaking Change:** Zod 4.x introduces multiple breaking changes to error handling and validation APIs

**Impact:** HIGH - Extensive Zod usage throughout API (14+ files)

#### Key Zod v4 Breaking Changes:

1. **Error Customization API Standardized**
   - Old fragmented APIs replaced with unified `error` param
   - May affect custom error messages

2. **Default Values in Optional Fields**
   - `z.object({ a: z.string().optional().default("tuna") })`
   - v3: Returns `{}` for missing field
   - v4: Returns `{ a: "tuna" }`
   - **Impact:** May change validation behavior in env.validation.ts

3. **Object Schema Methods Replaced**
   - `.strict()` → `z.strictObject()`
   - `.passthrough()` → `z.looseObject()`
   - Old methods remain for backward compatibility (LOW risk)

4. **ZodError Methods Deprecated**
   - `.format()` deprecated → use `z.treeifyError()`
   - `.flatten()` deprecated → need alternative
   - **Impact:** Not used in current codebase (safe)

5. **Issue Type Naming Changes**
   - `ZodInvalidTypeIssue` → `z.core.$ZodIssueInvalidType`
   - **Impact:** Not accessing raw issue types (safe)

#### Affected Code Locations:

**High Priority:**
- `src/config/env.validation.ts` - Complex schema with defaults, transforms, superRefine
- `src/content-plans/dto.ts` - DTOs with safeParse
- `src/jobs/dto.ts` - Job validation schemas
- `src/datasets/datasets.service.ts` - Dataset validation

**Medium Priority:**
- `src/auth/login-body.ts` - Simple validation
- `src/types/content.ts` - Type definitions
- `src/types/openrouter.ts` - API response validation
- `src/lib/http-utils.ts` - HTTP error handling

#### Critical Test Cases:

1. **Environment Validation:**
   ```typescript
   // src/config/env.validation.ts
   // Test: Default value application with optional fields
   const schema = z.object({
     LOGGER_PRETTY: booleanLike,  // Optional + transform
     LOG_LEVEL: logLevelEnum.optional(),
   }).transform(config => {
     const loggerPretty = (config.LOGGER_PRETTY ?? (config.NODE_ENV !== 'production')) as boolean;
     // ^^ May behave differently with v4 optional defaults
   });
   ```

2. **SafeParse Error Handling:**
   ```typescript
   // Controllers use safeParse extensively
   const parsed = CreateContentPlanSchema.safeParse(body);
   if (!parsed.success) {
     throw new BadRequestException(parsed.error.flatten());  // .flatten() deprecated!
   }
   ```

#### Action Required:

1. **CRITICAL:** Update error handling in controllers
   - Replace `parsed.error.flatten()` with v4-compatible approach
   - Test error responses for validation failures

2. **HIGH:** Audit env.validation.ts schema
   - Test default value behavior with optional fields
   - Verify transform functions work correctly
   - Test boolean coercion logic

3. **MEDIUM:** Run full validation test suite
   - Test all DTOs with invalid inputs
   - Verify error messages maintain quality
   - Check schema inference (TypeScript types)

4. **Consider:** Use codemod for automated migration
   - Community tool: `zod-v3-to-v4` codemod
   - Review changes manually before committing

**Mitigation:**
- Upgrade Zod separately from NestJS (allows isolated testing)
- Add comprehensive validation tests before migration
- Consider keeping Zod v3 initially if v4 migration is risky

---

### 2.4 Pino v10 Breaking Changes (LOW RISK)

**Breaking Change:** Node.js 18 support dropped

**Impact:** NONE - Already using Node.js 20

**Other Changes:** None - v10 is purely a Node version compatibility update

**Action Required:** None - Safe upgrade

---

### 2.5 Other Dependency Breaking Changes

#### 2.5.1 @nestjs/bullmq (10.x → 11.x)

**Impact:** LOW - Primarily NestJS 11 compatibility update

**New Features:**
- `forceDisconnectOnShutdown` option (11.0.4)
- Telemetry support for workers (11.0.3)
- Extra providers for forRootAsync (11.0.2)

**Current Usage:**
```typescript
// src/app.module.ts
BullModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => ({
    connection: parseRedisUrl(config.get('REDIS_URL', { infer: true })),
    prefix: config.get('BULL_PREFIX', { infer: true }),
  }),
})
```

**Action Required:** None - Current usage compatible

**Optional:** Consider enabling `forceDisconnectOnShutdown: true` for graceful shutdowns

---

#### 2.5.2 Jest v30 (29.x → 30.x)

**Impact:** LOW - Test framework upgrade

**Potential Issues:**
- API changes in matchers or config
- Performance improvements may reveal flaky tests

**Action Required:**
1. Run test suite after upgrade
2. Update jest.config.js if needed
3. Check for deprecated warnings

---

#### 2.5.3 bcryptjs (2.x → 3.x)

**Impact:** LOW - Hash library upgrade

**Risk:** Password hashing compatibility

**Action Required:**
1. Test authentication after upgrade
2. Verify existing hashes still validate
3. Check for performance changes

---

## 3. Impact Analysis

### 3.1 Module Impact Assessment

| Module | Impact Level | Reason |
|--------|--------------|--------|
| Auth (Guards) | LOW | Reflector change minor, already safe |
| Config | MEDIUM | ConfigService precedence change needs testing |
| Validation (Zod) | HIGH | Zod v4 has significant breaking changes |
| Jobs (BullMQ) | LOW | v11 is compatibility update |
| Storage | NONE | No affected dependencies |
| Health | NONE | No affected dependencies |
| Content Plans | MEDIUM | Zod validation + ConfigService usage |
| Datasets | MEDIUM | Zod validation |
| Swagger | LOW | Simple usage, backward compatible |

### 3.2 Test Impact

**Unit Tests:** 9 spec files
- Most use @nestjs/testing module (requires v11 update)
- Mocking patterns should remain compatible
- ConfigService mocking may need updates

**Integration Tests:** Sharded across 2 workers in CI
- Database migrations unaffected
- BullMQ queue behavior unchanged
- S3 mocking unchanged

**Critical Test Files:**
- `src/jobs/jobs.service.spec.ts` - BullMQ mocking
- `src/content-plans/content-plans.service.spec.ts` - ConfigService mocking
- `src/auth/auth.service.spec.ts` - Authentication logic

**Action Required:**
1. Run full test suite after NestJS upgrade
2. Run full test suite after Zod upgrade (separately)
3. Add tests for Reflector undefined handling
4. Add tests for ConfigService precedence

### 3.3 Docker Build Impact

**Current Dockerfile:** Node 20-alpine (compatible)

**Changes Required:**
```dockerfile
# No changes needed - already using Node 20
FROM node:20-alpine AS base
RUN corepack enable pnpm
```

**Build Process:**
- `pnpm install` will pull new versions
- `prisma generate` unaffected (Prisma client independent)
- TypeScript compilation may show new errors (strictNullChecks)

**Action Required:**
1. Test Docker build locally after package.json updates
2. Verify production image size unchanged
3. Test container startup and health checks

### 3.4 CI/CD Impact

**GitHub Actions:** `.github/workflows/ci.yml`

**Current Setup:**
- Node 20 (compatible)
- pnpm 10.17.1 (compatible)
- Services: PostgreSQL 16, Redis 7, MinIO (unaffected)

**Potential Issues:**
- Increased build time from larger dependencies
- Cache invalidation from major version bumps

**Action Required:**
1. Monitor CI job duration after migration
2. Verify all jobs pass (lint, unit, integration, docker-build)
3. Check for new TypeScript errors in CI

---

## 4. Migration Plan

### 4.1 Phased Approach

The migration will be executed in 4 phases to minimize risk and enable rollback at each stage.

---

#### Phase 1: Foundation (LOW RISK) - 2-4 hours

**Objective:** Upgrade low-risk dependencies and verify baseline

**Tasks:**
1. Upgrade Node.js-only breaking changes:
   - `pino@10.0.0`
   - `pino-pretty@13.1.2`
   - `@types/node@24.8.0` (minor)

2. Update minor versions:
   - AWS SDK: `@aws-sdk/client-s3@3.911.0`
   - BullMQ core: `bullmq@5.61.0`
   - ESLint tools: `@typescript-eslint/*@8.46.1`
   - Utilities: `dotenv@17.2.3`

3. Testing:
   - Run unit tests: `pnpm test:unit`
   - Run integration tests: `pnpm test:integration`
   - Verify local dev server starts: `pnpm dev`

**Rollback:** Revert package.json and pnpm-lock.yaml

**Success Criteria:**
- All tests pass
- No console errors
- Dev server starts successfully

---

#### Phase 2: NestJS Core (MEDIUM RISK) - 4-6 hours

**Objective:** Upgrade NestJS ecosystem to v11

**Tasks:**
1. Upgrade NestJS core packages simultaneously:
   ```bash
   pnpm add @nestjs/common@11.1.6 @nestjs/core@11.1.6 @nestjs/platform-fastify@11.1.6
   pnpm add -D @nestjs/cli@11.0.10 @nestjs/schematics@11.0.9 @nestjs/testing@11.1.6
   ```

2. Upgrade NestJS modules:
   ```bash
   pnpm add @nestjs/bullmq@11.0.4 @nestjs/jwt@11.0.1 @nestjs/passport@11.0.5 @nestjs/swagger@11.2.1
   ```

3. Upgrade @nestjs/config separately (breaking changes):
   ```bash
   pnpm add @nestjs/config@4.0.2
   ```

4. Upgrade Fastify adapter dependencies:
   ```bash
   pnpm add @fastify/static@8.2.0
   ```

5. Code changes:
   - **Update jwt-auth.guard.ts:**
     ```typescript
     // Before:
     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
       context.getHandler(),
       context.getClass(),
     ]);
     if (isPublic) return true;

     // After:
     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
       context.getHandler(),
       context.getClass(),
     ]);
     if (isPublic === true) return true;  // Explicit check for type safety
     ```

   - **Verify ConfigService calls:**
     - Review all `config.get()` usages
     - Ensure no unexpected precedence issues
     - Test with overridden environment variables

6. Testing:
   - Run unit tests: `pnpm test:unit`
   - Run integration tests: `pnpm test:integration`
   - Test Swagger UI: http://localhost:3001/api
   - Test authentication flows
   - Test BullMQ job creation/processing
   - Test S3 operations

7. Manual testing:
   - Create content plan (validates OpenRouter integration)
   - List jobs (validates database + queue integration)
   - Upload to S3 (validates storage service)
   - Check health endpoint

**Rollback:** Revert package.json and pnpm-lock.yaml, revert code changes

**Success Criteria:**
- All tests pass
- Swagger UI renders correctly
- Authentication works
- Job queues functional
- No console warnings (except expected Fastify prefix warnings)

---

#### Phase 3: Zod v4 Migration (HIGH RISK) - 6-10 hours

**Objective:** Upgrade Zod with careful error handling migration

**Tasks:**
1. Audit current Zod usage:
   ```bash
   # Search for flatten() usage (deprecated)
   grep -rn "\.flatten()" src/

   # Search for format() usage (deprecated)
   grep -rn "\.format()" src/

   # Search for optional().default() patterns
   grep -rn "optional().*default\|default().*optional" src/
   ```

2. Pre-migration testing:
   - Add tests for all validation schemas
   - Document expected error response formats
   - Test edge cases (missing fields, invalid types, etc.)

3. Upgrade Zod:
   ```bash
   pnpm add zod@4.1.12
   ```

4. Critical code updates:

   **A. Replace deprecated flatten() in controllers:**
   ```typescript
   // src/content-plans/content-plans.controller.ts
   // src/jobs/jobs.controller.ts
   // src/datasets/datasets.controller.ts

   // Before:
   const parsed = CreateContentPlanSchema.safeParse(body);
   if (!parsed.success) {
     throw new BadRequestException(parsed.error.flatten());
   }

   // After (Zod v4):
   const parsed = CreateContentPlanSchema.safeParse(body);
   if (!parsed.success) {
     throw new BadRequestException({
       errors: parsed.error.errors,
       message: 'Validation failed',
     });
   }
   ```

   **B. Review env.validation.ts default behavior:**
   ```typescript
   // Test optional fields with defaults
   // Verify transform functions still work
   // Check boolean coercion logic
   ```

   **C. Update custom error messages (if any):**
   - Review any custom `errorMap` usage
   - Update to v4's unified error param API

5. Testing strategy:
   - Unit tests for each schema:
     - Valid input → success
     - Invalid input → proper error structure
     - Optional fields → defaults applied correctly
     - Transform functions → correct values

   - Integration tests:
     - POST /content-plans with invalid body
     - POST /jobs with invalid payload
     - GET /jobs with invalid query params

   - Error response validation:
     ```bash
     # Test validation error format
     curl -X POST http://localhost:3001/content-plans \
       -H "Content-Type: application/json" \
       -d '{"invalid": "data"}'
     ```

6. Consider using codemod:
   ```bash
   # Install community codemod
   npm install -g @codemod/zod-v3-to-v4

   # Run on src/ directory (review changes before committing)
   codemod zod-v3-to-v4 src/
   ```

**Rollback:** Revert to Zod v3, revert code changes

**Success Criteria:**
- All validation tests pass
- Error responses maintain same structure
- Environment validation works correctly
- No unexpected default value behavior
- Type inference still works (no TypeScript errors)

---

#### Phase 4: Testing & Cleanup (LOW RISK) - 4-6 hours

**Objective:** Upgrade remaining dependencies and perform final validation

**Tasks:**
1. Upgrade testing dependencies:
   ```bash
   pnpm add -D jest@30.2.0 @types/jest@30.0.0
   ```

2. Upgrade remaining packages:
   ```bash
   pnpm add bcryptjs@3.0.2
   pnpm add -D @types/supertest@6.0.3 nock@14.0.10 undici@7.16.0
   ```

3. Run full test suite:
   - Unit tests
   - Integration tests (both shards)
   - E2E tests (if applicable)

4. Docker testing:
   ```bash
   # Build API image
   docker build -f apps/api/Dockerfile -t influencerai-api:v11 .

   # Run container
   docker run -p 3001:3001 --env-file .env influencerai-api:v11

   # Test endpoints
   curl http://localhost:3001/health
   ```

5. CI validation:
   - Push to feature branch
   - Verify all GitHub Actions jobs pass:
     - lint
     - unit-tests
     - integration-tests (both shards)
     - docker-build

6. Performance testing:
   - Benchmark response times (should be similar or better)
   - Check memory usage
   - Monitor job queue processing

7. Documentation updates:
   - Update package.json version references in docs
   - Update CLAUDE.md if needed
   - Add migration notes to CHANGELOG

8. Cleanup:
   - Remove deprecated code patterns
   - Update comments referencing old versions
   - Remove unused dependencies

**Success Criteria:**
- All tests pass locally and in CI
- Docker image builds successfully
- No performance regressions
- Documentation updated

---

### 4.2 Task Dependencies

```
Phase 1 (Foundation)
  └─> Phase 2 (NestJS Core)
        ├─> Phase 3 (Zod v4) [Can run in parallel]
        └─> Phase 4 (Testing & Cleanup)
```

**Critical Path:** Phase 1 → Phase 2 → Phase 4 (total: 10-16 hours)

**Parallel Work:** Phase 3 (Zod) can be done separately if high risk tolerance is unacceptable

---

### 4.3 Effort Estimates

| Phase | Task | Est. Time | Risk |
|-------|------|-----------|------|
| 1 | Foundation upgrades | 2h | LOW |
| 1 | Baseline testing | 2h | LOW |
| 2 | NestJS package updates | 1h | LOW |
| 2 | Code changes (Reflector, ConfigService) | 2h | MEDIUM |
| 2 | Testing & validation | 3h | MEDIUM |
| 3 | Zod audit & planning | 2h | HIGH |
| 3 | Zod upgrade & code updates | 4h | HIGH |
| 3 | Validation testing | 4h | HIGH |
| 4 | Testing dependency upgrades | 1h | LOW |
| 4 | Other dependency upgrades | 1h | LOW |
| 4 | Full test suite & CI | 2h | LOW |
| 4 | Docker & performance testing | 2h | LOW |
| **Total** | | **24h** | |

**Best Case:** 16 hours (no issues encountered)
**Worst Case:** 32 hours (multiple rollbacks and debugging)
**Recommended Buffer:** 40% = 24h + 10h = 34 hours (~4.5 days)

---

### 4.4 Testing Strategy

#### Unit Testing
- Run after each phase
- Focus on affected modules
- Mock external dependencies
- Target: 100% existing test pass rate

#### Integration Testing
- Run after Phases 2 and 3
- Test database interactions
- Test queue operations
- Test S3 operations
- Target: 100% existing test pass rate

#### Manual Testing Checklist
- [ ] Dev server starts without errors
- [ ] Swagger UI loads and renders correctly
- [ ] POST /auth/login → JWT token returned
- [ ] POST /content-plans → Plan created
- [ ] GET /content-plans → Plans listed
- [ ] POST /jobs → Job enqueued
- [ ] GET /jobs → Jobs listed
- [ ] GET /health → Health status returned
- [ ] Validation errors return proper format

#### Performance Testing
- Benchmark key endpoints before/after
- Monitor memory usage
- Check job processing throughput
- Target: <5% regression acceptable

#### Regression Testing
- Run full integration test suite
- Test edge cases from production bugs
- Verify error handling unchanged

---

## 5. Risk Assessment

### 5.1 Risk Register

| Risk | Severity | Probability | Impact | Mitigation |
|------|----------|-------------|--------|------------|
| Zod v4 breaks validation error responses | HIGH | MEDIUM | API clients receive unexpected error formats | Phase 3 includes extensive error response testing; add integration tests for error cases |
| ConfigService precedence breaks environment overrides | MEDIUM | LOW | Configuration values incorrect in prod | Test with actual env files; add integration test for config loading |
| Reflector undefined handling breaks authentication | LOW | LOW | All routes become public or all protected | Explicit type checking added; unit test for undefined case |
| Fastify v5 route matching changes break routes | LOW | LOW | Some routes become inaccessible | Not using wildcards currently; monitor console warnings |
| Type errors from strictNullChecks with Reflector | MEDIUM | MEDIUM | Build fails in CI | Fix type errors proactively; TypeScript strict mode already enabled |
| Jest v30 breaks test suite | MEDIUM | LOW | CI fails, blocking deployment | Run tests locally first; rollback if needed |
| BullMQ v11 breaks job processing | LOW | LOW | Background jobs fail to process | Current usage is simple; test job creation/processing |
| bcryptjs v3 breaks password validation | MEDIUM | LOW | Authentication fails | Test login flow; verify existing hashes validate |
| Docker build fails with new dependencies | LOW | LOW | Cannot deploy | Test build locally; verify layer caching |
| Increased bundle size impacts cold start | LOW | LOW | Slower container startup | Monitor image size; acceptable tradeoff for LTS |

### 5.2 Mitigation Strategies

#### For High-Severity Risks:

**Zod v4 Validation Errors:**
- Mitigation: Add comprehensive integration tests for all validation schemas
- Contingency: Create adapter function to maintain old error format
- Rollback: Revert Zod to v3.x, revert error handling code

**ConfigService Precedence:**
- Mitigation: Add integration test that loads config from env file
- Contingency: Use explicit environment variable access where critical
- Rollback: Revert @nestjs/config to v3.x

#### For Medium-Severity Risks:

**Type Errors:**
- Mitigation: Run TypeScript compiler after each phase
- Contingency: Add type assertions where needed
- Rollback: Fix type errors before proceeding to next phase

**Jest v30 Compatibility:**
- Mitigation: Run full test suite locally before CI
- Contingency: Update jest.config.js, fix deprecated patterns
- Rollback: Revert Jest to v29.x

---

### 5.3 Rollback Plan

Each phase has an independent rollback strategy:

**Phase 1 Rollback:**
```bash
git checkout package.json pnpm-lock.yaml
pnpm install
```

**Phase 2 Rollback:**
```bash
git checkout package.json pnpm-lock.yaml src/auth/jwt-auth.guard.ts
pnpm install
```

**Phase 3 Rollback:**
```bash
git checkout package.json pnpm-lock.yaml src/
pnpm install
```

**Phase 4 Rollback:**
```bash
# Unlikely needed - only testing dependencies
git checkout package.json pnpm-lock.yaml
pnpm install
```

**Full Migration Rollback:**
1. Revert all commits from migration branch
2. Verify tests pass on main branch
3. Redeploy previous version to production

---

## 6. Success Metrics

### 6.1 Migration Success Criteria

**Must Have (Go/No-Go):**
- [ ] All existing unit tests pass (100%)
- [ ] All existing integration tests pass (100%)
- [ ] CI pipeline passes all jobs (lint, test, build)
- [ ] Docker image builds successfully
- [ ] Dev server starts without errors
- [ ] Swagger UI renders correctly
- [ ] Authentication flow works (login → JWT → protected route)
- [ ] Job creation and queue processing works
- [ ] S3 operations work (upload, download, presigned URLs)

**Should Have (Quality Gates):**
- [ ] No new console warnings (except expected Fastify warnings)
- [ ] Response time regression <5% on key endpoints
- [ ] Memory usage regression <10%
- [ ] Docker image size increase <20%
- [ ] All TypeScript strict checks pass
- [ ] No TODO comments added (migrate fully, don't defer)

**Nice to Have (Post-Migration):**
- [ ] Improved type safety from Reflector changes
- [ ] Performance improvements from newer dependencies
- [ ] Reduced npm audit vulnerabilities
- [ ] Documentation updated with new patterns

### 6.2 Monitoring Plan

**During Migration:**
- Run tests after each phase
- Check console for new errors/warnings
- Monitor TypeScript compilation errors
- Track time spent vs. estimates

**Post-Migration:**
- Monitor application logs for new errors
- Track response times in production
- Monitor job processing rates
- Watch for user-reported issues

**Rollback Triggers:**
- Any must-have criteria fails
- >20% performance regression
- Critical production bug introduced
- Unable to resolve issue within 4 hours

---

## 7. Recommendations

### 7.1 Go/No-Go Decision: GO

**Rationale:**
1. **LTS Support:** NestJS 10.x will eventually lose support; upgrading to 11.x ensures long-term maintainability
2. **Security:** Staying on latest major versions reduces exposure to known vulnerabilities
3. **Team Velocity:** Delaying migration increases future technical debt and upgrade complexity
4. **Manageable Risk:** Breaking changes are well-documented and localized to specific areas
5. **Phased Approach:** Migration plan minimizes risk through incremental rollout

**Conditions:**
- Allocate 3-5 days of focused developer time
- No other major releases planned during migration window
- Staging environment available for testing
- Ability to rollback in production if needed

### 7.2 Alternative Approaches

#### Option A: Gradual Migration (Recommended)
**Description:** Follow phased approach outlined in Section 4.1

**Pros:**
- Lowest risk
- Easy to rollback at each phase
- Validates changes incrementally
- Allows parallel work on Phase 3 (Zod)

**Cons:**
- Takes longer (3-5 days)
- Multiple package.json updates

**Recommendation:** CHOOSE THIS - Best risk/reward balance

---

#### Option B: Big Bang Migration
**Description:** Update all packages simultaneously

**Pros:**
- Faster (1-2 days if no issues)
- Single package.json update
- Single PR to review

**Cons:**
- High risk - multiple breaking changes at once
- Harder to debug issues
- All-or-nothing rollback
- Higher chance of surprises

**Recommendation:** AVOID - Too risky for production system

---

#### Option C: Deferred Migration
**Description:** Stay on NestJS 10.x, only upgrade critical security patches

**Pros:**
- Zero migration risk
- No developer time investment
- No breaking changes to handle

**Cons:**
- Technical debt accumulates
- Eventually forced to upgrade (harder later)
- Missing out on performance improvements
- Security vulnerabilities in outdated packages
- Limited community support over time

**Recommendation:** AVOID - Kicks the can down the road

---

#### Option D: Zod v3 + NestJS v11
**Description:** Upgrade NestJS to v11 but keep Zod on v3

**Pros:**
- Eliminates highest risk item (Zod v4)
- Faster migration (16-18 hours)
- Easier rollback

**Cons:**
- Still need to migrate Zod eventually
- Zod v3 may have compatibility issues with future NestJS
- Delays inevitable Zod v4 migration

**Recommendation:** CONSIDER - Valid if Zod v4 risk is unacceptable

---

### 7.3 Timeline Recommendations

**Recommended Schedule:**

**Week 1:**
- Day 1-2: Phase 1 (Foundation) + Phase 2 (NestJS Core)
- Day 3-4: Phase 3 (Zod v4) - Can overlap with Phase 2 by different developer
- Day 5: Phase 4 (Testing & Cleanup)

**Week 2:**
- Day 1: Staging deployment + smoke testing
- Day 2: Production deployment (off-peak hours)
- Day 3-5: Monitor production, address any issues

**Blackout Windows to Avoid:**
- Major feature releases
- High-traffic periods
- Holiday weekends
- End of month/quarter

**Optimal Migration Window:**
- Mid-week (Tuesday-Thursday)
- Low-traffic hours for production deployment
- Full team available for support

---

### 7.4 Team Coordination

**Roles:**

**Migration Lead (1 developer):**
- Execute migration phases
- Run tests and validate changes
- Coordinate rollback if needed

**Code Reviewer (1 developer):**
- Review code changes in each phase
- Validate test coverage
- Approve PR before merge

**QA/Testing (1 developer, part-time):**
- Run manual test checklist
- Validate staging deployment
- Monitor production after deployment

**DevOps/SRE (on-call):**
- Support CI/CD issues
- Monitor infrastructure during deployment
- Assist with rollback if needed

**Communication Plan:**
- Create migration tracking ticket (Jira/GitHub Issues)
- Daily standup updates during migration
- Slack channel for real-time coordination
- Post-migration retrospective

---

## 8. Appendix

### 8.1 Useful Commands

```bash
# Check outdated packages
pnpm outdated -r

# Update specific package
pnpm add @nestjs/core@11.1.6

# Update all NestJS packages
pnpm add @nestjs/common@11 @nestjs/core@11 @nestjs/platform-fastify@11

# Run tests
pnpm test:unit
pnpm test:integration

# Check for type errors
pnpm --filter @influencerai/api exec tsc --noEmit

# Build Docker image
docker build -f apps/api/Dockerfile -t influencerai-api:v11 .

# Run container
docker run -p 3001:3001 --env-file .env influencerai-api:v11

# Check bundle size
pnpm --filter @influencerai/api exec du -sh node_modules
```

### 8.2 Reference Links

**NestJS:**
- Official Migration Guide: https://docs.nestjs.com/migration-guide
- NestJS 11 Release Notes: https://trilon.io/blog/announcing-nestjs-11-whats-new
- GitHub Releases: https://github.com/nestjs/nest/releases

**Zod:**
- Zod v4 Migration Guide: https://zod.dev/v4/changelog
- Zod v4 Release Notes: https://zod.dev/v4
- Codemod Tool: https://docs.codemod.com/guides/migrations/zod-3-4

**@nestjs/config:**
- Config v4.0.0 Release: https://github.com/nestjs/config/releases/tag/4.0.0

**BullMQ:**
- BullMQ NestJS Docs: https://docs.bullmq.io/guide/nestjs
- BullMQ Changelog: https://docs.bullmq.io/changelog

**Pino:**
- Pino v10 Release: https://github.com/pinojs/pino/releases/tag/v10.0.0

### 8.3 Testing Checklist

#### Pre-Migration
- [ ] Backup production database
- [ ] Document current response times
- [ ] Note current memory usage
- [ ] Capture current error rates
- [ ] Review open issues for related bugs

#### Post-Phase 1
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Dev server starts
- [ ] No new console errors

#### Post-Phase 2
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Swagger UI renders
- [ ] Authentication works
- [ ] Job queues work
- [ ] S3 operations work

#### Post-Phase 3
- [ ] Validation tests pass
- [ ] Error responses correct format
- [ ] Environment validation works
- [ ] All DTOs validate correctly

#### Post-Phase 4
- [ ] All tests pass (unit + integration)
- [ ] Docker build succeeds
- [ ] CI pipeline passes
- [ ] Performance acceptable
- [ ] Documentation updated

#### Pre-Production
- [ ] Staging deployment successful
- [ ] Smoke tests pass in staging
- [ ] Load testing (if applicable)
- [ ] Rollback plan documented
- [ ] Team notified of deployment

#### Post-Production
- [ ] Application starts successfully
- [ ] Health checks pass
- [ ] Monitor logs for errors
- [ ] Check response times
- [ ] Verify key features work
- [ ] Monitor for 24-48 hours

### 8.4 Contact & Escalation

**Migration Lead:** [Developer Name]
**Code Reviewer:** [Reviewer Name]
**Escalation Path:** Lead → Team Lead → Engineering Manager

**Emergency Rollback Authority:** Engineering Manager

---

**Document Version:** 1.0
**Last Updated:** 2025-10-16
**Next Review:** After Phase 2 completion
