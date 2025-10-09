import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const RESET_FLAG = 'E2E_DB_RESET_DONE';

function getApiDir() {
  return resolve(__dirname, '..', '..');
}

function getRepoRoot() {
  return resolve(getApiDir(), '..', '..');
}

export function loadE2eEnv() {
  try {
    const dotenv = require('dotenv');
    const apiDir = getApiDir();
    const repoRoot = getRepoRoot();
    const appsDir = resolve(apiDir, '..');

    dotenv.config({ path: resolve(repoRoot, '.env') });
    dotenv.config({ path: resolve(appsDir, '.env') });
    dotenv.config({ path: resolve(apiDir, '.env') });
  } catch {}

  if (process.env.DATABASE_URL_TEST) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  }
}

export function shouldSkipDbReset() {
  const value = process.env.SKIP_DB_RESET;
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === '1' || normalized === 'true';
}

export function hasDbResetCompleted() {
  return process.env[RESET_FLAG] === '1';
}

export function markDbResetCompleted() {
  process.env[RESET_FLAG] = '1';
}

export function clearDbResetFlag() {
  delete process.env[RESET_FLAG];
}

function resolvePrismaCommand() {
  const apiDir = getApiDir();
  const repoRoot = getRepoRoot();
  const prismaExecutable = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';

  const localBin = resolve(apiDir, 'node_modules', '.bin', prismaExecutable);
  if (existsSync(localBin)) {
    return `"${localBin}"`;
  }

  const rootBin = resolve(repoRoot, 'node_modules', '.bin', prismaExecutable);
  if (existsSync(rootBin)) {
    return `"${rootBin}"`;
  }

  return undefined;
}

export function resetTestDb(label: string, options?: { ignoreSkip?: boolean }) {
  if (!process.env.DATABASE_URL) return false;
  const ignoreSkip = options?.ignoreSkip ?? false;

  if (!ignoreSkip && shouldSkipDbReset()) {
    return false;
  }

  try {
    const prismaCmd = resolvePrismaCommand();
    const apiDir = getApiDir();

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

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (label === 'globalSetup' || label === 'setup-e2e') {
      console.warn(`[e2e setup] DB reset failed during ${label}: ${message}`);
    }
    return false;
  }
}
