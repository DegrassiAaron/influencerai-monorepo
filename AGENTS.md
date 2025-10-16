# Agent Handbook

## Quick Repo Facts

- Monorepo layout: `apps/` (web=Next.js, api=NestJS, worker=BullMQ, n8n workflows), `packages/` (core-schemas, sdk, prompts), `data/` for artifacts, `infra/` for docker compose, `scripts/` for helper scripts.
- Install once with `pnpm -w install` (Node >= 20, pnpm >= 9).
- Start the local stack via `docker compose up` in `infra/` or `scripts/start-all.ps1`; run `pnpm dev` to watch web/api/worker.
- Preflight before pushing: `pnpm lint`, `pnpm test`, `pnpm build`; for e2e run `pnpm e2e:server` then `pnpm e2e:test`.
- TypeScript only; ESLint forbids `any` and `console` in `src/`; Prettier enforces 2-space indent, 100-char width, semicolons, single quotes.
- Vitest drives unit/integration tests alongside sources (`__tests__` or `*.spec.ts`); use `scripts/db-test.ps1` after Prisma updates; e2e suites live in `tests/e2e/`.
- Commits use conventional prefixes or backlog tags; keep migrations/scripts with their code; PRs link issues, include CI output, call out env impacts, and attach UI/workflow diffs when useful.
- Keep secrets local: never commit `.env`, document new variables in `.env.example`, rotate tokens on your machine.

## Agent Flow (use these docs in order)

1. Policies - `.docs/agents/POLICIES.md`: main and develop are protected; enforce conventional commits and SemVer; automerge requires green CI plus one review; apply label taxonomy (type, priority, status, area, size, release).
2. Git workflow - `.docs/agents/GITFLOW.md`: main is production, develop is integration; branch prefixes `feat|fix|hotfix|release/<...>`; rebase feature branches; allow merge commits on main/develop; always back-merge into develop after release or hotfix.
3. Definition of Done - `.docs/agents/DOD.md`: checklist covers lint, tests, e2e, docs/changelog, migrations, and maintainer sign-off; green CI ticks the automated items.
4. Branch naming - `.docs/agents/BRANCHING.md`: follow `<prefix>/<issue>-<slug>` in lowercase with hyphens; keep branches short-lived and focused; include issue number whenever available.
5. One-click automation - `.docs/agents/ONE_CLICK.md`: comment `/gitflow run` (or trigger `workflow_dispatch`) to create the branch, open a draft PR, sync DoD, request review, and enable automerge; workflow file `.github/workflows/gitflow-issue-automation.yml`.
6. PR and issue sync - `.docs/agents/PR_SYNC.md` + `.docs/agents/DOD_SYNC.md`: CI success ticks DoD items, flips Draft -> Ready when only manual tasks remain, and keeps issue and PR checklists aligned; use `/dod check|uncheck` for manual overrides.
7. Testing hooks - `.docs/agents/PUPPETEER_MCV.md`: run `pnpm e2e:server` on port 5173, then `pnpm e2e:test`; refer to `.github/workflows/e2e-puppeteer.yml` for CI coverage.
8. Operational workflows - `.docs/agents/WORKFLOWS.md`: ready-made prompts for creating PRs, running test batteries, performing reviews, and cutting releases with the required context bundles.
9. Collaboration conventions - `.docs/agents/CONVENTIONS.md`: keep commits imperative and issue-linked (#123), leave PRs in draft until CI is green and review is done, and mirror the release/hotfix strategy from Gitflow.

## Quick Actions

- Need a branch and draft PR from an issue: review steps 2-6 above and comment `/gitflow run` on the issue.
- Need DoD status: consult `.docs/agents/DOD.md`, sync via `/dod ...`, and confirm maintainer approval before merging.
- Need e2e coverage: follow `.docs/agents/PUPPETEER_MCV.md` commands and capture artifacts if tests fail.
- Planning a release: pair `.docs/agents/GITFLOW.md` with the release checklist in `.docs/agents/WORKFLOWS.md`, tag `v<version>`, and back-merge into develop.
