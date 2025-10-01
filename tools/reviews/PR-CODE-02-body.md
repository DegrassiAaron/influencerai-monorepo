fix(api): resilient OpenRouter calls with error handling, 60s timeout, retries (CODE-02)

Summary
- Adds robust error handling to OpenRouter calls in ContentPlansService: non-OK handling, 60s timeout, 429 rate-limit support with Retry-After, exponential backoff retries, response validation, token usage logging, and env var checks. Includes unit and e2e tests with mocked OpenRouter.

Changes
- OpenRouter client and helpers
  - apps/api/src/content-plans/content-plans.service.ts
    - Wraps fetch with timeout (60s) via AbortController
    - Checks response.ok; throws typed error with status/body/url/method
    - Handles 429 using Retry-After header (seconds/date)
    - Retries on 429/5xx with exponential backoff and jitter (max 3)
    - Parses and validates response content before JSON.parse
    - Logs token usage/cost fields when provided by OpenRouter
  - apps/api/src/main.ts
    - Verifies OPENROUTER_API_KEY at startup; fails fast with clear message
- Validation
  - apps/api/src/content-plans/content-plans.service.ts
    - Validates that the assistant message content is JSON array of { caption: string; hashtags: string[] }
- Tests
  - apps/api/src/content-plans/content-plans.service.spec.ts
    - Unit tests for: ok, non-OK (400/500), 429 with Retry-After, network error, timeout, malformed JSON, and retries
  - apps/api/test/content-plans.openrouter.e2e-spec.ts
    - E2E tests stubbing OpenRouter via fetch/undici mock: success and 429-then-success

Backlog DoD Mapping (CODE-02)
- response.ok/status handling: done
- 60s timeout via AbortController: done
- 429 rate limit with Retry-After: done
- Response structure validated (posts array): done
- Token usage logging for cost tracking: done
- Retry logic with exponential backoff: done
- Timeout/network error handling: done
- Env var OPENROUTER_API_KEY verified at startup: done
- Unit tests with mocked fetch: done
- E2E test with mocked OpenRouter (nock): done

How To Test Locally
- Env: ensure `.env` has OPENROUTER_API_KEY set (any non-empty for tests)
- Unit: pnpm --filter @influencerai/api test
- E2E: pnpm --filter @influencerai/api run test:e2e
- Manual: run API and POST /content-plans with sample payload; simulate 429 via nock or by temporarily forcing retry path in service

Risk/Impact
- External dependency behavior changes are surfaced earlier as typed errors; endpoints now return clearer errors on upstream failures.
- Rate limiting is respected; requests may be delayed by backoff under load.
- Startup will fail fast if OPENROUTER_API_KEY is missing.

Follow-ups (optional)
- Extract shared OpenRouter client (retry/timeout/validation) if other services need it.
- Emit structured logs/metrics for rate-limit and retry events.
- Add circuit breaker around persistent 5xx.
