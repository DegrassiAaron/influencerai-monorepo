# Frontend (Web) Context

**Working Directory**: `apps/web`

## Tech Stack
Next.js 14 (Pages Router), React 18, TypeScript, pnpm 9

## Commands

```bash
pnpm install                    # Install deps
pnpm dev                        # Dev server (port 3000)
pnpm build                      # Production build
pnpm start                      # Production server
pnpm lint                       # ESLint
pnpm lint:fix                   # Auto-fix linting
pnpm typecheck                  # TypeScript check
pnpm test                       # Jest tests
pnpm test:watch                 # Jest watch mode
pnpm test:coverage              # Coverage report
pnpm test:e2e                   # Playwright E2E
pnpm test:e2e:ui                # E2E with UI
pnpm test:e2e:report            # E2E report
```

## Architecture

**Framework**: Next.js 14 with Pages Router

**Key Pages** (`src/pages/`):
- `index.tsx`: Dashboard (9.7KB)
- `chat.tsx`: AI chat (14.3KB)
- `upload.tsx`: PDF upload (44KB, multi-step)
- `editor.tsx`: Rule editor (15.7KB)
- `versions.tsx`: Version comparison (20.1KB)
- `admin.tsx`: Admin dashboard (14.2KB)
- `n8n.tsx`: Workflow management (16KB)
- `logs.tsx`: Activity logs (6.9KB)

**API Client** (`src/lib/api.ts`):
- Base URL: `NEXT_PUBLIC_API_BASE`
- Cookie auth: `credentials: "include"`
- Methods: `get()`, `post()`, `put()`, `delete()`
- 401 handling

## Testing

**Jest** (Unit/Integration):
- Files: `**/__tests__/**/*.[jt]s?(x)` or `**/*.(spec|test).[jt]s?(x)`
- Environment: jsdom
- Setup: `jest.setup.js`
- Alias: `@/*` → `<rootDir>/src/*`
- Excluded: `_app.tsx`, `_document.tsx`, type defs
- Coverage: 80% threshold (branches, functions, lines, statements)

**Playwright** (E2E):
- Config: `playwright.config.ts`
- Excluded from Jest: `testPathIgnorePatterns: ['/e2e/']`

## Environment

`infra/env/web.env.dev`:
- `NEXT_PUBLIC_API_BASE`: API URL (default: `http://localhost:8080`)

## Workflows

**New Page**:
1. `apps/web/src/pages/<name>.tsx`
2. Use `@/lib/api` for backend calls
3. Tests: `apps/web/src/pages/__tests__/<name>.test.tsx`
4. 90% coverage

## Code Standards

- TypeScript strict mode
- ESLint (Next.js config)
- No `any`, explicit types
- Use `@/lib/api` for API calls
- Arrange-Act-Assert pattern

## Troubleshooting

**CORS**: Verify `NEXT_PUBLIC_API_BASE`, check `credentials: "include"`, verify API CORS config

**Auth**: Check cookies from localhost allowed in browser
