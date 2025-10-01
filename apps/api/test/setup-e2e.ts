import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

// Default e2e environment knobs
// - Disable BullMQ queues unless a test explicitly enables them
// - Ensure consistent NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
if (!process.env.DISABLE_BULL) {
  process.env.DISABLE_BULL = '1';
}

// Load .env (root then app) to get DATABASE_URL_TEST if not provided
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: resolve(__dirname, '../../.env') });
  dotenv.config({ path: resolve(__dirname, '../.env') });
} catch {}

// Prefer test database for e2e
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

// Helper to reset DB using Prisma migrate reset (force, no seed)
function resetTestDb(label: string) {
  if (!process.env.DATABASE_URL) return;
  try {
    execSync('pnpm exec prisma migrate reset --force --skip-seed', {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env },
    });
    // Deploy again to ensure schema is applied in CI where reset might skip
    execSync('pnpm exec prisma migrate deploy', {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[e2e setup] DB reset failed during ${label}:`, err instanceof Error ? err.message : err);
  }
}

beforeAll(() => resetTestDb('beforeAll'));
afterAll(() => resetTestDb('afterAll'));

// Jest sometimes hangs due to unref'ed timers; ensure long timers don't block exit
const _setTimeout: typeof setTimeout = global.setTimeout.bind(global);

const customSetTimeout = ((
  handler: Parameters<typeof setTimeout>[0],
  timeout?: Parameters<typeof setTimeout>[1],
  ...args: Parameters<typeof setTimeout> extends [any, any, ...infer R] ? R : never
) => {
  const t = _setTimeout(handler as any, timeout as any, ...(args as unknown[]));
  const maybeTimer = t as unknown as { unref?: () => void };
  if (typeof maybeTimer?.unref === 'function') {
    // Avoid keeping event loop alive
    maybeTimer.unref();
  }
  return t;
}) as typeof setTimeout;

(customSetTimeout as any).__promisify__ = (_setTimeout as any).__promisify__;

(global as unknown as { setTimeout: typeof setTimeout }).setTimeout = customSetTimeout;
