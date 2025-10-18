# CI Troubleshooting Guide

## Node Modules Missing Error

### Problem Description

GitHub Actions CI jobs were failing with errors like:
- `sh: 1: cross-env: not found`
- `Module ts-jest in the transform option was not found`
- `WARN Local package.json exists, but node_modules missing`

This occurred even though `pnpm install` completed successfully.

### Root Cause

The issue was caused by a behavioral change in pnpm v10.x when using the `--prefer-offline` flag combined with GitHub Actions cache:

1. The pnpm store cache would be restored from previous runs
2. `pnpm install --frozen-lockfile --prefer-offline` would complete successfully
3. However, workspace package `node_modules` directories and `.bin` symlinks were not being created correctly
4. When Turbo ran tasks, packages couldn't find their dependencies or binaries

The `--prefer-offline` flag made pnpm assume everything was already available in the store, but it skipped creating the necessary symlinks in workspace packages.

### Solution Implemented

**Three-part fix applied to all CI jobs (lint, unit-tests, integration-tests):**

#### 1. Removed `--prefer-offline` Flag
Changed from:
```yaml
- name: Install dependencies
  run: pnpm -w install --frozen-lockfile --prefer-offline
```

To:
```yaml
- name: Install dependencies
  run: pnpm -w install --frozen-lockfile
```

**Rationale**: pnpm is already optimized to use the store cache efficiently. The `--prefer-offline` flag is redundant and can cause workspace linking issues.

#### 2. Added Workspace Node Modules Cache
Added a new cache layer for workspace `node_modules/.pnpm` directories:

```yaml
- name: Cache workspace node_modules
  uses: actions/cache@v4
  with:
    path: |
      node_modules/.pnpm
      apps/*/node_modules/.pnpm
      packages/*/node_modules/.pnpm
    key: ${{ runner.os }}-workspace-modules-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-workspace-modules-
```

**Rationale**: Caching the `.pnpm` virtual store directory provides additional performance benefits while ensuring symlinks are preserved correctly.

#### 3. Added Post-Install Verification Step
Added a verification step to fail-fast if `node_modules` are missing:

```yaml
- name: Verify dependencies installed
  shell: bash
  run: |
    set -euo pipefail
    echo "Verifying critical package node_modules..."

    # Check that packages have node_modules (at least .pnpm virtual store)
    for pkg_dir in apps/* packages/*; do
      if [ -f "$pkg_dir/package.json" ]; then
        pkg_name=$(basename "$pkg_dir")
        if [ ! -d "$pkg_dir/node_modules" ]; then
          echo "ERROR: $pkg_dir/node_modules not found after pnpm install"
          exit 1
        fi
      fi
    done

    echo "✓ All workspace packages have node_modules"
```

**Rationale**: Provides clear diagnostic output if the problem recurs, making debugging easier.

### Performance Impact

- **Without `--prefer-offline`**: Install takes ~10-15s with store cache hit
- **With workspace cache**: Can reduce to ~5-8s on cache hit
- **Overall impact**: Negligible difference (2-5s per job), but much more reliable

### Testing the Fix

To verify the fix locally:

```bash
# Simulate CI environment
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Run install without --prefer-offline
pnpm install --frozen-lockfile

# Verify all packages have node_modules
for pkg_dir in apps/* packages/*; do
  if [ -f "$pkg_dir/package.json" ]; then
    if [ ! -d "$pkg_dir/node_modules" ]; then
      echo "ERROR: $pkg_dir/node_modules missing"
      exit 1
    fi
  fi
done

echo "✓ All workspace packages have node_modules"
```

### Related Issues

- pnpm v10.x behavior changes with `--prefer-offline`
- GitHub Actions cache restore timing
- Workspace symlink creation in monorepo

### References

- [pnpm install documentation](https://pnpm.io/cli/install)
- [GitHub Actions cache documentation](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Turbo monorepo best practices](https://turbo.build/repo/docs/core-concepts/monorepos)
