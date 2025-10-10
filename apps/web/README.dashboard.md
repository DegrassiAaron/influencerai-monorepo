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
- `apps/web/src/app/layout.tsx` registers providers and global styles

Notes:
- Replace polling with websockets when API supports it.
- Styles now rely on the shared design system primitives documented below.

## Design system & layout (WEB-06)

- `tailwind.config.ts` enables the shadcn-style preset with our `brand` palette and class-based dark mode. Global tokens live in
  `src/app/globals.css`.
- Reusable primitives live under `src/components/ui/` (Button, Card, Badge, Input, Label, Breadcrumb, Sheet, Avatar, Separator).
  Compose them instead of hand-written Tailwind utilities.
- Utility helpers:
  - `src/lib/utils.ts` → `cn()` merges class names using `clsx` and `tailwind-merge`.
  - `src/components/theme-provider.tsx` exposes `ThemeProvider`/`useTheme` for light/dark toggling.
- Application shell:
  - Implemented in `src/components/layout/AppShell.tsx` with sidebar navigation, header actions, and breadcrumb rendering.
  - `src/app/(dashboard)/layout.tsx` configures navigation/breadcrumb data for dashboard routes.
  - Mobile navigation uses the shared `Sheet` primitive via `MobileNavigation`.
- When adding new views, render page content directly; the shell handles padding, chrome, and breadcrumbs.
