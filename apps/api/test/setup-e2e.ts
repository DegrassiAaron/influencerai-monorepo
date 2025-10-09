import { loadE2eEnv, hasDbResetCompleted, markDbResetCompleted, resetTestDb, shouldSkipDbReset } from './utils/reset-db';

// Default e2e environment knobs
// - Disable BullMQ queues unless a test explicitly enables them
// - Ensure consistent NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
if (!process.env.DISABLE_BULL) {
  process.env.DISABLE_BULL = '1';
}

loadE2eEnv();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/influencerai?schema=public';
}

// Avoid triggering DB resets multiple times when Jest spins up several workers.
const globalSetupState = global as unknown as {
  __E2E_DB_RESET_INITIALIZED__?: boolean;
};

if (!globalSetupState.__E2E_DB_RESET_INITIALIZED__) {
  globalSetupState.__E2E_DB_RESET_INITIALIZED__ = true;

  if (!hasDbResetCompleted()) {
    const didReset = resetTestDb('setup-e2e');
    if (didReset || shouldSkipDbReset()) {
      markDbResetCompleted();
    }
  }
}

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
