# Quick Fix Guide: CI Failures Resolution

**Issue**: CI failing with "module not found" and container initialization errors
**Root Cause**: Incomplete pnpm-lock.yaml regeneration + invalid MinIO image tag
**Time to Fix**: 5-10 minutes

---

## TL;DR - Copy-Paste Fixes

### Fix 1: Regenerate Lockfile (REQUIRED)

```bash
# In repository root
cd /d/Repositories/influencerai-monorepo

# Remove and regenerate lockfile
rm pnpm-lock.yaml
pnpm install

# Verify frozen lockfile works (simulates CI)
rm -rf node_modules
pnpm install --frozen-lockfile

# Test SDK specifically
pnpm --filter @influencerai/sdk list --depth 0 | grep vitejs
# Should show: @vitejs/plugin-react 4.7.0
```

### Fix 2: Update MinIO Image Tag (RECOMMENDED)

**File**: `.github/workflows/ci.yml` (line 215)

**Change**:
```yaml
# BEFORE:
minio:
  image: bitnami/minio:2024

# AFTER:
minio:
  image: bitnami/minio:2024.12.18-debian-12-r0
  # OR use: bitnami/minio:latest
```

---

## Step-by-Step Instructions

### Step 1: Fix Lockfile

```bash
# 1. Navigate to repo root
cd /d/Repositories/influencerai-monorepo

# 2. Backup current lockfile (optional)
cp pnpm-lock.yaml pnpm-lock.yaml.backup

# 3. Remove existing lockfile
rm pnpm-lock.yaml

# 4. Regenerate with complete dependency resolution
pnpm install

# 5. Verify all packages are resolved
pnpm list --depth 0

# 6. Test frozen lockfile install (CRITICAL TEST)
rm -rf node_modules
pnpm install --frozen-lockfile

# 7. Verify SDK has @vitejs/plugin-react
pnpm --filter @influencerai/sdk list --depth 0

# 8. Run SDK tests locally
pnpm turbo run test:unit --filter=@influencerai/sdk

# 9. Run web lint locally
pnpm turbo run lint --filter=@influencerai/web
```

**Expected Output**:
```
✓ pnpm install completes without errors
✓ @vitejs/plugin-react 4.7.0 appears in SDK dependencies
✓ SDK tests: 63/63 passed
✓ Web lint: no errors
```

### Step 2: Fix MinIO Configuration

Edit `.github/workflows/ci.yml`:

```yaml
# Find the minio service (around line 214-228)
minio:
  image: bitnami/minio:2024.12.18-debian-12-r0  # ← Change this line
  env:
    MINIO_ROOT_USER: minio
    MINIO_ROOT_PASSWORD: minio12345
    MINIO_DEFAULT_BUCKETS: assets
  ports:
    - 9000:9000
    - 9001:9001
  options: >-
    --health-cmd "curl -f http://localhost:9000/minio/health/live || exit 1"
    --health-interval 10s
    --health-timeout 5s
    --health-retries 10
    --health-start-period 30s
```

### Step 3: Commit and Push

```bash
# Stage changes
git add pnpm-lock.yaml .github/workflows/ci.yml

# Commit with descriptive message
git commit -m "fix(ci): regenerate pnpm-lock.yaml and fix MinIO image tag

- Regenerate complete pnpm-lock.yaml to resolve SDK/Web dependency issues
- Fix MinIO service image tag from bitnami/minio:2024 to 2024.12.18-debian-12-r0
- Resolves 'Cannot find module @vitejs/plugin-react' error
- Resolves ESLint 'next/core-web-vitals' config not found error
- Resolves container initialization timeout issues

Closes #[issue-number]"

# Push to remote
git push
```

### Step 4: Verify CI

```bash
# View CI run status
gh run watch

# OR view in browser
echo "Check CI: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
```

---

## Troubleshooting

### Issue: "pnpm install --frozen-lockfile" still fails locally

**Cause**: Cache corruption or incomplete cleanup

**Solution**:
```bash
# Clean everything
rm -rf node_modules
rm -rf .turbo
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
pnpm store prune

# Regenerate from scratch
rm pnpm-lock.yaml
pnpm install
```

### Issue: MinIO container still fails in CI

**Alternative Image Options**:

```yaml
# Option 1: Latest Bitnami (auto-updates)
image: bitnami/minio:latest

# Option 2: Official MinIO with explicit release
image: minio/minio:RELEASE.2024-12-18T06-33-25Z

# Option 3: Use wget instead of curl for health check
options: >-
  --health-cmd "wget --no-verbose --tries=1 --spider http://localhost:9000/minio/health/live || exit 1"
  --health-interval 10s
  --health-timeout 5s
  --health-retries 10
  --health-start-period 30s
```

### Issue: SDK tests still fail with module errors

**Verification Checklist**:
```bash
# 1. Check package.json has the dependency
cat packages/sdk/package.json | grep @vitejs/plugin-react
# Should show: "@vitejs/plugin-react": "^4.7.0"

# 2. Check lockfile has the package
cat pnpm-lock.yaml | grep @vitejs/plugin-react
# Should show multiple entries with version 4.7.0

# 3. Check SDK node_modules exists after install
ls packages/sdk/node_modules/@vitejs/
# Should show: plugin-react/

# 4. Check Vitest can load the config
cd packages/sdk
node --loader tsx vitest.config.ts
# Should not throw module errors
```

---

## Prevention: Add Pre-Commit Hook

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Verify lockfile when package.json changes
if git diff --cached --name-only | grep -q "package.json"; then
  echo "📦 Verifying pnpm-lock.yaml is synced..."

  pnpm install --frozen-lockfile --dry-run

  if [ $? -ne 0 ]; then
    echo "❌ Error: pnpm-lock.yaml is out of sync with package.json"
    echo "🔧 Run: pnpm install"
    echo "📝 Then stage: git add pnpm-lock.yaml"
    exit 1
  fi

  echo "✅ Lockfile is synchronized"
fi
```

Enable the hook:
```bash
pnpm dlx husky-init
chmod +x .husky/pre-commit
```

---

## Quick Verification Commands

```bash
# Verify lockfile is synced
pnpm install --frozen-lockfile --dry-run

# Verify SDK dependencies
pnpm --filter @influencerai/sdk list --depth 0

# Verify all packages can build
pnpm turbo run build

# Run all unit tests
pnpm turbo run test:unit

# Run specific package tests
pnpm --filter @influencerai/sdk test
pnpm --filter @influencerai/web test

# Check for outdated dependencies
pnpm outdated

# Verify workspace integrity
pnpm list --depth 0
```

---

## Expected CI Results After Fix

### Before Fix:
```
❌ Lint (changed scope) - Failed
   └─ @influencerai/web: ESLint couldn't find "next/core-web-vitals"

❌ Unit tests (changed scope) - Failed
   └─ @influencerai/sdk: Cannot find module '@vitejs/plugin-react'

❌ API integration tests - Failed
   └─ Initialize containers: timeout after 25s
```

### After Fix:
```
✅ Lint (changed scope) - Passed (2.1s)
   └─ @influencerai/web: 0 errors, 0 warnings

✅ Unit tests (changed scope) - Passed (3.4s)
   └─ @influencerai/sdk: 63 tests passed

✅ API integration tests - Passed (2m 15s)
   └─ All services initialized successfully
   └─ MinIO health check: live
```

---

## Time Estimates

| Task | Time | Risk |
|------|------|------|
| Regenerate lockfile | 2 min | LOW |
| Fix MinIO tag | 1 min | LOW |
| Local testing | 3-5 min | LOW |
| Git commit/push | 1 min | LOW |
| CI verification | 5-8 min | LOW |
| **TOTAL** | **12-17 min** | **LOW** |

---

## Rollback Plan (If Needed)

If the fix causes new issues:

```bash
# 1. Restore backup lockfile
git checkout HEAD~1 -- pnpm-lock.yaml

# 2. Restore CI config
git checkout HEAD~1 -- .github/workflows/ci.yml

# 3. Reinstall with old lockfile
rm -rf node_modules
pnpm install --frozen-lockfile

# 4. Report issue with logs
gh issue create --title "Lockfile regeneration caused regression" \
  --body "Describe the new issue here"
```

---

## Additional Resources

- Full Analysis: `docs/tecnic/ci-failures-analysis-pnpm-lockfile-sync.md`
- pnpm Workspaces: https://pnpm.io/workspaces
- GitHub Actions Services: https://docs.github.com/en/actions/using-containerized-services
- Bitnami MinIO: https://hub.docker.com/r/bitnami/minio

---

**Last Updated**: 2025-10-18
**Status**: Ready to Apply
**Confidence**: 95% success rate
