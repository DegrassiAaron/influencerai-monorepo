import {
  hasDbResetCompleted,
  loadE2eEnv,
  markDbResetCompleted,
  resetTestDb,
  shouldSkipDbReset,
} from './utils/reset-db';

export default async function globalSetup() {
  loadE2eEnv();

  if (hasDbResetCompleted()) {
    return;
  }

  const didReset = resetTestDb('globalSetup');

  if (didReset || shouldSkipDbReset()) {
    markDbResetCompleted();
  }
}
