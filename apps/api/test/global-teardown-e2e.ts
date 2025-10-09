import { clearDbResetFlag, loadE2eEnv, resetTestDb, shouldSkipDbReset } from './utils/reset-db';

export default async function globalTeardown() {
  loadE2eEnv();

  try {
    if (!shouldSkipDbReset()) {
      resetTestDb('globalTeardown');
    }
  } finally {
    clearDbResetFlag();
  }
}
