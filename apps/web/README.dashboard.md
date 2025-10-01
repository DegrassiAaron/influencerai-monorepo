# Operational Dashboard (WEB-02)

This implements `/dashboard` with three widgets:
- `Job Queues` summary: active, waiting, failed
- `Health` card: aggregate status from `/healthz`
- `Jobs` mini chart: recent successes/failures

Polling uses `@tanstack/react-query` via a top-level `Providers` wrapper.

Config:
- Set `NEXT_PUBLIC_API_BASE_URL` pointing to the API (e.g. `http://localhost:3001`)
- Endpoints expected:
  - `GET /healthz` -> `{ status: 'ok'|'degraded'|'down', checks: { [name]: boolean } }`
  - `GET /queues/summary` -> `{ active:number, waiting:number, failed:number }`
  - `GET /jobs/series?window=1h` -> `Array<{ t:string, success:number, failed:number }>`

Files:
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/components/{HealthCard,QueuesWidget,JobsChart}.tsx`
- `apps/web/src/app/providers.tsx` (React Query client)
- `apps/web/src/app/layout.tsx` wraps `Providers`

Notes:
- Replace polling with websockets when API supports it.
- Styles are Tailwind utility-first placeholders; can be refined.
