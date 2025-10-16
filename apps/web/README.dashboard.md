# Operational Dashboard (WEB-02)

This feature area covers the `/` home overview and the `/dashboard` workspace with three widgets:
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
- `apps/web/src/app/(dashboard)/page.tsx` (home overview)
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/dashboard/content-plans/page.tsx`
- `apps/web/src/app/(dashboard)/layout.tsx` (shared shell for the group)
- `apps/web/src/components/{HealthCard,QueuesWidget,JobsChart}.tsx`
- `apps/web/src/app/providers.tsx` (React Query client)
- `apps/web/src/app/layout.tsx` registers providers and global styles

Notes:
- Replace polling with websockets when API supports it.
- Styles rely on the shared design system primitives documented below.

## SDK React hooks

- Import hooks from `@influencerai/sdk/react` to reuse the HTTP client with TanStack Query.
- Wrap the application once with `<InfluencerAIProvider baseUrl={process.env.NEXT_PUBLIC_API_BASE_URL}>` inside `src/app/providers.tsx` (after the QueryClient provider).
- Available hooks mirror the API surface:
  - `useJobs` / `useJob`
  - `useCreateJob`
  - `useQueuesSummary`
  - `useDatasets` / `useCreateDataset`
  - `useContentPlan` / `useCreateContentPlan`
- Mutations automatically invalidate list/detail queries and the queues summary.
- Hooks accept the same options as their TanStack Query counterparts so you can override `refetchInterval`, `staleTime`, etc.

Example wiring:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InfluencerAIProvider } from '@influencerai/sdk/react';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <InfluencerAIProvider baseUrl={process.env.NEXT_PUBLIC_API_BASE_URL}>
        {children}
      </InfluencerAIProvider>
    </QueryClientProvider>
  );
}
```

## Design system & layout (WEB-06)

- `tailwind.config.ts` enables the shadcn-style preset with our `brand` palette and class-based dark mode. Global tokens live in
  `src/app/globals.css`.
- Reusable primitives live under `src/components/ui/` (Button, Card, Badge, Input, Label, Breadcrumb, Sheet, Avatar, Separator).
  Compose them instead of hand-written Tailwind utilities.
- Utility helpers:
  - `src/lib/utils.ts` → `cn()` merges class names using `clsx` and `tailwind-merge`.
  - `src/components/theme-provider.tsx` exposes `ThemeProvider`/`useTheme` for light/dark toggling.
- Application shell:
  - Implemented in `src/components/layout/AppShell.tsx` by composing `AppSidebar`, `AppHeader`, and `AppBreadcrumbs`.
  - `AppShell` is wired in `src/app/(dashboard)/layout.tsx`; every child page automatically inherits sidebar navigation, header
    actions, breadcrumb trail, and responsive mobile navigation.
  - To onboard a new view, place the page under `src/app/(dashboard)/` and render its content directly—the shell handles padding,
    chrome, and breadcrumbs.
- Navigation items live in `src/components/layout/nav-config.ts`; update this file to surface new primary or support links.
- Breadcrumb labels reuse the titles declared in `nav-config.ts`, keeping sidebar and breadcrumb terminology in sync. Use the
  overrides map in `app-breadcrumbs.tsx` for single-route tweaks (e.g. `/login`).
