feat(sdk): robust error handling + 30s timeouts (CODE-01)

Summary
- Centralizes fetch error handling, adds timeouts, and refactors the SDK client to throw typed errors. Includes Vitest-based unit tests for helpers and client paths.

Changes
- New helpers and error type
  - packages/sdk/src/fetch-utils.ts
    - APIError with status, body, url, method
    - handleResponse throws on non-OK, parses JSON/text
    - fetchWithTimeout uses AbortController (30s default)
- Client refactor
  - packages/sdk/src/index.ts
    - All calls use fetchWithTimeout + handleResponse
    - Exports InfluencerAIAPIError for consumers
- TS config update for DOM types
  - packages/sdk/tsconfig.json
- Vitest + tests
  - packages/sdk/package.json (scripts/devDeps)
  - packages/sdk/test/fetch-utils.test.ts
  - packages/sdk/test/client.test.ts

Backlog DoD Mapping (CODE-01)
- APIError class: done
- handleResponse helper: done
- All client methods updated: done
- 30s timeout: done
- Unit tests for error handling: done
- TanStack Query integration: guidance included; verify at app level

How To Test Locally
- Install: pnpm -F @influencerai/sdk install
- Run: pnpm --filter @influencerai/sdk test
- Build: pnpm --filter @influencerai/sdk build

Risk/Impact
- Behavior change: non-OK and network/timeout errors now throw APIError. Consumers relying on silent response.json() must catch and handle. Exposed InfluencerAIAPIError facilitates instanceof checks.

Follow-ups (optional)
- Add app/web TanStack Query handlers using e?.isAPIError for user-friendly messages.
- Expand tests to all client methods (listJobs, createContentPlan, health).
- CI: add Vitest to pipelines.
