import {
  loadE2eEnv,
  hasDbResetCompleted,
  markDbResetCompleted,
  resetTestDb,
  shouldSkipDbReset,
} from './utils/reset-db';

// Default e2e environment knobs
// - Disable BullMQ queues unless a test explicitly enables them
// - Ensure consistent NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
if (!process.env.DISABLE_BULL) {
  process.env.DISABLE_BULL = '1';
}

loadE2eEnv();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/influencerai?schema=public';
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

const customSetTimeout = ((...args: Parameters<typeof setTimeout>) => {
  const t = _setTimeout(...args);
  const maybeTimer = t as unknown as { unref?: () => void };
  if (typeof maybeTimer?.unref === 'function') {
    // Avoid keeping event loop alive
    maybeTimer.unref();
  }
  return t;
}) as typeof setTimeout;

(customSetTimeout as typeof setTimeout & { __promisify__?: unknown }).__promisify__ = (
  _setTimeout as typeof setTimeout & { __promisify__?: unknown }
).__promisify__;

(global as unknown as { setTimeout: typeof setTimeout }).setTimeout = customSetTimeout;
