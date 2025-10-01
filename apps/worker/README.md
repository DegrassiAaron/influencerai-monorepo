Worker (BullMQ)

- Purpose: process queues `content-generation` and `lora-training` and sync job status to the API.

Env variables
- `API_BASE_URL` or `WORKER_API_URL`: base URL of API (default `http://localhost:3001`).
- `REDIS_HOST` (default `localhost`), `REDIS_PORT` (default `6379`).
- `BULL_PREFIX`: optional Redis key prefix to isolate queues per env/test.
- `WORKER_JOB_ATTEMPTS`: number of attempts when enqueuing jobs from API (default 3; configured in API).
- `WORKER_JOB_BACKOFF_DELAY_MS`: backoff base delay for retries (default 5000; configured in API).

Behavior
- On job start: PATCH `/jobs/:id` with `status=running`.
- On success: PATCH with `status=succeeded` and a result payload.
- On failure: PATCH with `status=failed` and error info.
- Lightweight internal retry is applied for PATCH requests.

Run locally
- Ensure Redis is running.
- Build SDK if not built: `pnpm --filter @influencerai/sdk build`.
- Dev: `pnpm --filter @influencerai/worker dev`.
