import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';

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
  if (process.env.SKIP_DB_RESET === '1' || process.env.SKIP_DB_RESET === 'true') return;
  try {
    const apiDir = resolve(__dirname, '..');
    const rootDir = resolve(apiDir, '..');
    const prismaLocal = resolve(apiDir, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
    const prismaRoot = resolve(rootDir, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');

    let prismaCmd: string | undefined;
    if (existsSync(prismaLocal)) prismaCmd = `"${prismaLocal}"`;
    else if (existsSync(prismaRoot)) prismaCmd = `"${prismaRoot}"`;

    if (prismaCmd) {
      execSync(`${prismaCmd} migrate reset --force --skip-seed --skip-generate`, {
        cwd: apiDir,
        stdio: 'pipe',
        env: { ...process.env },
      });
      execSync(`${prismaCmd} migrate deploy`, {
        cwd: apiDir,
        stdio: 'pipe',
        env: { ...process.env },
      });
    } else {
      // Fallback to pnpm exec if local binary not found
      execSync('pnpm exec prisma migrate reset --force --skip-seed --skip-generate', {
        cwd: apiDir,
        stdio: 'pipe',
        env: { ...process.env },
      });
      execSync('pnpm exec prisma migrate deploy', {
        cwd: apiDir,
        stdio: 'pipe',
        env: { ...process.env },
      });
    }
  } catch (err) {
     
    const msg = err instanceof Error ? err.message : String(err);
    if (label === 'beforeAll') {
      console.warn(`[e2e setup] DB reset failed during ${label}: ${msg}`);
    } // be quiet during afterAll
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
