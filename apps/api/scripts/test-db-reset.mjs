import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import fs from 'node:fs';

function loadDotenv(file) {
  try {
    const dotenv = require('dotenv');
    if (fs.existsSync(file)) dotenv.config({ path: file });
  } catch {}
}

const repoRoot = resolve(process.cwd(), '..', '..');
const apiDir = resolve(process.cwd());

// Load env (root then app) so app-level overrides root values
loadDotenv(resolve(repoRoot, '.env'));
loadDotenv(resolve(apiDir, '.env'));

const url = process.env.DATABASE_URL_TEST || '';
if (!url) {
  console.error('DATABASE_URL_TEST non impostata. Configura apps/api/.env.example -> .env');
  process.exit(1);
}

try {
  console.log('Reset DB di test con Prisma (migrate reset)...');
  execSync('pnpm exec prisma migrate reset --force --skip-seed', {
    cwd: apiDir,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
  console.log('Applico migrazioni (migrate deploy) sul DB di test...');
  execSync('pnpm exec prisma migrate deploy', {
    cwd: apiDir,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
  console.log('OK: database di test pronto');
} catch (err) {
  console.error('Errore durante il reset del DB di test:', err && err.message ? err.message : err);
  process.exit(1);
}

