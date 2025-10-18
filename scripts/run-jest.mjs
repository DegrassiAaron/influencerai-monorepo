#!/usr/bin/env node

/**
 * Jest runner with git-aware selection.
 * - Detects changed files via CI_BASE_SHA/CI_HEAD_SHA (falls back to HEAD diff).
 * - Runs changed spec files directly.
 * - Uses `--findRelatedTests` for non-test source changes.
 * - Skips execution when the package is unaffected or selection disabled.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const packageDir = process.cwd();
const packageRelative = normalizePath(relative(repoRoot, packageDir));

const baseSha = process.env.CI_BASE_SHA || process.env.GITHUB_BASE_SHA || '';
const headSha = process.env.CI_HEAD_SHA || 'HEAD';
const selectionMode = (process.env.JEST_SELECTION_MODE || 'auto').toLowerCase();
const forceAll =
  process.env.JEST_FORCE_ALL === '1' ||
  process.env.JEST_FORCE_ALL === 'true' ||
  selectionMode === 'off';

const forwardArgs = process.argv.slice(2);
const shardIndexRaw = process.env.JEST_SHARD_INDEX;
const totalShardsRaw = process.env.JEST_TOTAL_SHARDS;
const shardIndex = shardIndexRaw ? Number(shardIndexRaw) : NaN;
const totalShards = totalShardsRaw ? Number(totalShardsRaw) : NaN;
const shouldShard =
  Number.isInteger(shardIndex) && Number.isInteger(totalShards) && totalShards > 1;

if (!forceAll && shouldShard && shardIndex > 1) {
  console.log(
    `[jest-runner] Skipping targeted run on shard ${shardIndex}/${totalShards}; shard 1 handles selective execution.`
  );
  process.exit(0);
}

if (forceAll) {
  exitWith(runJest([...forwardArgs], { fullRun: true }));
}

const changed = getChangedFiles();
if (changed.length === 0) {
  console.log('[jest-runner] No changed files detected for this package; skipping targeted run.');
  process.exit(0);
}

const { testFiles, sourceFiles } = partitionFiles(changed);

if (testFiles.length === 0 && sourceFiles.length === 0) {
  console.log('[jest-runner] Changes do not touch this package; skipping execution.');
  process.exit(0);
}

let exitCode = 0;

if (testFiles.length > 0) {
  console.log(
    `[jest-runner] Running changed spec files (${testFiles.length}):\n  - ${testFiles.join(
      '\n  - '
    )}`
  );
  exitCode = runJest([...forwardArgs, ...testFiles], { fullRun: false });
  if (exitCode !== 0) {
    exitWith(exitCode);
  }
}

if (sourceFiles.length > 0) {
  console.log(
    `[jest-runner] Running related specs for source changes (${sourceFiles.length}):\n  - ${sourceFiles.join(
      '\n  - '
    )}`
  );
  exitCode = runJest([...forwardArgs, '--findRelatedTests', ...sourceFiles], {
    fullRun: false,
  });
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
      `[jest-runner] git diff failed (status ${result.status}). Falling back to full test run.`
    );
    exitWith(runJest([...forwardArgs], { fullRun: true }));
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
      testFiles.push(relativeToPackage);
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

function runJest(args, options = {}) {
  const finalArgs = [...args];
  if (
    options.fullRun &&
    shouldShard &&
    !finalArgs.some((arg) => String(arg).startsWith('--shard'))
  ) {
    finalArgs.push(`--shard=${shardIndex}/${totalShards}`);
  }

  const result = spawnSync('./node_modules/.bin/jest', finalArgs, {
    cwd: packageDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      // Avoid watch mode even if inherited from env
      CI: 'true',
    },
    shell: true,
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
