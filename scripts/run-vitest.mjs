#!/usr/bin/env node

/**
 * Vitest runner with intelligent test selection.
 * - Uses `CI_BASE_SHA`/`CI_HEAD_SHA` (or git merge-base) to detect changed files.
 * - Runs changed spec files directly.
 * - Invokes `vitest related --run` for non-test files to cover dependent specs.
 * - Falls back to running the full suite when selection is disabled or no diffs are available.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const packageDir = process.cwd();
const packageRelative = normalizePath(relative(repoRoot, packageDir));

const baseSha = process.env.CI_BASE_SHA || process.env.GITHUB_BASE_SHA || '';
const headSha = process.env.CI_HEAD_SHA || 'HEAD';
const selectionMode = (process.env.VITEST_SELECTION_MODE || 'auto').toLowerCase();
const forceAll =
  process.env.VITEST_FORCE_ALL === '1' ||
  process.env.VITEST_FORCE_ALL === 'true' ||
  selectionMode === 'off';

const forwardArgs = process.argv.slice(2);
const shardIndexRaw = process.env.VITEST_SHARD_INDEX;
const totalShardsRaw = process.env.VITEST_TOTAL_SHARDS;
const shardIndex = shardIndexRaw ? Number(shardIndexRaw) : NaN;
const totalShards = totalShardsRaw ? Number(totalShardsRaw) : NaN;
const shouldShard =
  Number.isInteger(shardIndex) && Number.isInteger(totalShards) && totalShards > 1;
const hasExplicitTargets =
  forwardArgs.includes('--include') ||
  forwardArgs.some((arg) => /\.(spec|test)\.[cm]?[tj]sx?$/.test(arg));

if (forceAll) {
  exitWith(runVitest(['run', ...forwardArgs], { fullRun: true }));
}

if (hasExplicitTargets) {
  exitWith(runVitest(['run', ...forwardArgs], { fullRun: true }));
}

const changed = getChangedFiles();
if (changed.length === 0) {
  console.log(
    '[vitest-runner] No changed files detected for this package; skipping targeted run.'
  );
  process.exit(0);
}

const { testFiles, sourceFiles } = partitionFiles(changed);

if (testFiles.length === 0 && sourceFiles.length === 0) {
  console.log(
    '[vitest-runner] Changes do not touch this package; skipping vitest execution.'
  );
  process.exit(0);
}

let exitCode = 0;

if (testFiles.length > 0) {
  console.log(
    `[vitest-runner] Running changed spec files (${testFiles.length}):\n  - ${testFiles.join(
      '\n  - '
    )}`
  );
  exitCode = runVitest(['run', ...forwardArgs, ...testFiles], { fullRun: false });
  if (exitCode !== 0) {
    exitWith(exitCode);
  }
}

if (sourceFiles.length > 0) {
  console.log(
    `[vitest-runner] Running related specs for source changes (${sourceFiles.length}):\n  - ${sourceFiles.join(
      '\n  - '
    )}`
  );
  const relatedArgs = ['related', ...forwardArgs, ...sourceFiles];
  if (!forwardArgs.some((arg) => arg === '--run' || arg === '-r')) {
    relatedArgs.push('--run');
  }
  exitCode = runVitest(relatedArgs, { fullRun: false });
}

exitWith(exitCode);

function getChangedFiles() {
  const gitArgs = ['diff', '--name-only'];
  if (baseSha) {
    gitArgs.push(`${baseSha}...${headSha}`);
  } else {
    gitArgs.push(headSha);
  }

  const result = spawnSync('git', gitArgs, {
    cwd: repoRoot,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    console.warn(
      `[vitest-runner] git diff failed (status ${result.status}). Falling back to full test run.`
    );
    exitWith(runVitest(['run', ...forwardArgs], { fullRun: true }));
  }

  const lines = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizePath);

  return lines.filter((file) => isInPackage(file) && file.endsWith('.ts'));
}

function partitionFiles(files) {
  const testFiles = [];
  const sourceFiles = [];

  for (const file of files) {
    if (isTestFile(file)) {
      const relativeToPackage = normalizePath(
        packageRelative ? file.slice(packageRelative.length + 1) : file
      );
      if (existsSync(resolve(packageDir, relativeToPackage))) {
        testFiles.push(relativeToPackage);
      }
    } else {
      const relativeToPackage = normalizePath(
        packageRelative ? file.slice(packageRelative.length + 1) : file
      );
      if (relativeToPackage) {
        sourceFiles.push(relativeToPackage);
      }
    }
  }

  return { testFiles, sourceFiles };
}

function runVitest(args, options = {}) {
  const finalArgs = [...args];
  if (
    options.fullRun &&
    shouldShard &&
    !finalArgs.some((arg) => String(arg).startsWith('--shard'))
  ) {
    finalArgs.push(`--shard=${shardIndex}/${totalShards}`);
  }

  const result = spawnSync('pnpm', ['exec', 'vitest', ...finalArgs], {
    cwd: packageDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITEST_SEGFAULT_RETRY: '3',
    },
  });

  return result.status ?? 1;
}

function isInPackage(file) {
  if (!packageRelative) return true;
  return file === packageRelative || file.startsWith(`${packageRelative}/`);
}

function isTestFile(file) {
  return /\.(spec|test)\.[cm]?[tj]sx?$/.test(file);
}

function normalizePath(inputPath) {
  return inputPath.split(sep).join('/');
}

function exitWith(code) {
  process.exit(typeof code === 'number' ? code : 1);
}
