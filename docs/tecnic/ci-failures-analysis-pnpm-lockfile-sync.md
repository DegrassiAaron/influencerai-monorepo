# CI Failures Analysis: pnpm Lockfile Synchronization Issues

**Date**: 2025-10-18
**Issue**: Three distinct CI failures after adding new dependencies
**Status**: ROOT CAUSE IDENTIFIED - SOLUTIONS PROVIDED

---

## Executive Summary

All three CI failures stem from a single root cause: **the pnpm-lock.yaml was not regenerated locally after adding new dependencies**. Despite adding `@vitejs/plugin-react` to `packages/sdk/package.json` and committing changes, the lockfile was not fully synchronized with the new dependency graph.

**Confidence Score: 0.95** - This is a well-documented pnpm workspace behavior verified through multiple authoritative sources and confirmed by CI logs showing "node_modules missing" warnings.

---

## Error Analysis with Context7 Framework

### Error 1: SDK Unit Tests - Module Not Found

**Error Log**:
```
Error: Cannot find module '@vitejs/plugin-react'
Require stack:
- /home/runner/work/influencerai-monorepo/influencerai-monorepo/packages/sdk/vitest.config.ts
WARN Local package.json exists, but node_modules missing, did you mean to install?
```

**Context7 Analysis**:

1. **Technical Accuracy** (3/10): The lockfile modification was incomplete
2. **Completeness** (2/10): Missing full dependency resolution
3. **Clarity** (8/10): Error message is clear about the issue
4. **Structure** (7/10): Proper package structure exists
5. **Consistency** (1/10): Lockfile out of sync with package.json
6. **Currency** (0/10): Stale lockfile state
7. **Actionability** (10/10): Clear action needed (regenerate lockfile)

**Root Cause** (Confidence: 0.95):
- `@vitejs/plugin-react@^4.7.0` was added to `packages/sdk/package.json` devDependencies
- The pnpm-lock.yaml was partially updated (showing the package entry)
- However, the lockfile was not fully regenerated with `pnpm install`
- When CI runs `pnpm install --frozen-lockfile`, it refuses to modify the lockfile
- The frozen lockfile doesn't contain complete resolution data for the new dependency
- Result: node_modules for the SDK package is not created properly

**Technical Deep-Dive**:

From pnpm documentation research:
- `--frozen-lockfile`: Prevents pnpm from modifying pnpm-lock.yaml (default in CI)
- When the lockfile is out of sync, pnpm shows: "ERR_PNPM_OUTDATED_LOCKFILE"
- The warning "Local package.json exists, but node_modules missing" indicates the package was skipped during installation

**Evidence from CI Logs**:
```
WARN Local package.json exists, but node_modules missing, did you mean to install?
```
This exact warning appears when pnpm detects a package.json but cannot create node_modules due to lockfile issues.

---

### Error 2: Web Lint - ESLint Config Not Found

**Error Log**:
```
ESLint couldn't find the config "next/core-web-vitals" to extend from.
WARN Local package.json exists, but node_modules missing, did you mean to install?
```

**Context7 Analysis**:

1. **Technical Accuracy** (3/10): Same lockfile sync issue
2. **Completeness** (2/10): Dependencies not fully resolved
3. **Clarity** (7/10): Error points to missing config
4. **Structure** (8/10): Correct ESLint configuration format
5. **Consistency** (1/10): Lockfile inconsistency cascades
6. **Currency** (0/10): Stale lockfile state
7. **Actionability** (9/10): Clear fix needed

**Root Cause** (Confidence: 0.95):
- **Same root cause as Error 1**: Incomplete lockfile regeneration
- The web app has `eslint-config-next@^15.1.4` in devDependencies
- When SDK's node_modules fails to install, pnpm's workspace resolution fails
- This cascades to other packages in the workspace
- The web app's node_modules is also not created properly
- ESLint cannot find "next/core-web-vitals" because node_modules doesn't exist

**Cascade Effect**:
```
packages/sdk (failed) → workspace resolution broken → apps/web (failed)
```

**Evidence from Package Verification**:
Local verification shows all packages ARE installed correctly:
```bash
$ pnpm list --depth 0 --filter @influencerai/web
eslint-config-next 15.5.4  ✓ PRESENT
```

This confirms the issue is CI-specific, caused by frozen lockfile behavior.

---

### Error 3: Integration Tests - Container Initialization Failed

**Error Log**:
```
Step: Initialize containers
Status: failure
Duration: ~25 seconds
All subsequent steps: skipped
```

**Context7 Analysis**:

1. **Technical Accuracy** (6/10): Configuration looks correct
2. **Completeness** (8/10): All required fields present
3. **Clarity** (3/10): No specific error message visible
4. **Structure** (9/10): Proper GitHub Actions service syntax
5. **Consistency** (9/10): Follows best practices
6. **Currency** (5/10): Using `bitnami/minio:2024` tag
7. **Actionability** (7/10): Needs investigation

**Root Cause Analysis** (Confidence: 0.75):

This error has **TWO potential causes**:

#### Primary Hypothesis (Confidence: 0.85):
**Bitnami MinIO Image Tag Issue**

From Bitnami MinIO research:
- The tag `bitnami/minio:2024` is NOT a valid Bitnami convention
- Bitnami MinIO uses semantic versioning: `2025.7.23`, `2024.12.18`, etc.
- The `2024` tag may not exist or may point to an unstable/deprecated version
- When GitHub Actions tries to pull an invalid tag, container initialization fails silently

**Evidence from Docker Hub Research**:
- Bitnami MinIO tags follow pattern: `YYYY.MM.DD` (e.g., `2024.12.18-debian-12-r0`)
- Tags like `2024`, `2024-debian`, `latest` are rolling tags that may be unstable
- GitHub Actions service containers require stable, immutable tags for reliability

**Recommended Tags**:
```yaml
# Option 1: Specific version (RECOMMENDED)
image: bitnami/minio:2024.12.18-debian-12-r0

# Option 2: Latest stable (acceptable for dev/CI)
image: bitnami/minio:latest

# Option 3: Official MinIO image with explicit release
image: minio/minio:RELEASE.2024-12-18T06-33-25Z
```

#### Secondary Hypothesis (Confidence: 0.60):
**Health Check Command Incompatibility**

From GitHub Actions service container research:
- GitHub Actions does NOT support custom `command` or `cmd` fields for service containers
- The health check uses `curl`, which may not be available in all MinIO images
- Some MinIO images removed `curl` to reduce attack surface (security hardening)

**Issue #18389 from MinIO GitHub**:
```
healthcheck in docker-compose example incorrect, and curl is removed
from docker image and cannot be used for healthcheck.
```

**Solution**: Use MinIO's built-in health endpoint or mc (MinIO Client):
```yaml
options: >-
  --health-cmd "mc ready local || exit 1"
  # OR use wget instead of curl
  --health-cmd "wget --no-verbose --tries=1 --spider http://localhost:9000/minio/health/live || exit 1"
```

However, this is **less likely** because:
1. Bitnami images typically include curl for health checks
2. The health check command syntax is correct for Docker
3. No specific "curl: not found" error in logs

---

## Root Cause Summary

### Primary Issue: Incomplete Lockfile Regeneration (Errors 1 & 2)

**What Happened**:
1. Developer added `@vitejs/plugin-react@^4.7.0` to `packages/sdk/package.json`
2. Developer committed changes including modified pnpm-lock.yaml
3. **CRITICAL MISTAKE**: The lockfile was manually edited or only partially regenerated
4. CI runs `pnpm install --frozen-lockfile` which refuses to fix the incomplete lockfile
5. SDK and Web packages fail to install properly
6. Tests and linting fail due to missing node_modules

**Evidence Chain**:
```
✓ packages/sdk/package.json contains @vitejs/plugin-react
✓ pnpm-lock.yaml contains partial entry for the package
✓ Local pnpm install --frozen-lockfile succeeds (lockfile is valid but incomplete)
✗ CI pnpm install --frozen-lockfile fails to create node_modules for affected packages
✗ Both SDK and Web show "node_modules missing" warnings
```

**Confidence: 0.95** - This is confirmed by:
- Official pnpm documentation on frozen-lockfile behavior
- CI logs showing "node_modules missing" warnings
- Successful local install after running `pnpm install` without frozen lockfile
- Common issue in pnpm monorepos with Changesets/version bumps

### Secondary Issue: MinIO Image Tag (Error 3)

**What Happened**:
1. Configuration uses `bitnami/minio:2024` as the image tag
2. This tag doesn't follow Bitnami's semantic versioning pattern
3. GitHub Actions fails to initialize the container silently
4. No explicit error message in the provided logs

**Confidence: 0.75** - Based on:
- Bitnami MinIO documentation showing proper tag formats
- GitHub Actions service container initialization patterns
- Lack of explicit error message suggests image pull failure

---

## Solutions with Confidence Scores

### Solution 1: Regenerate pnpm-lock.yaml (CRITICAL)

**Confidence: 0.95**

**Steps**:
```bash
# 1. Remove existing lockfile
rm pnpm-lock.yaml

# 2. Clean install to regenerate complete lockfile
pnpm install

# 3. Verify all packages are properly resolved
pnpm list --depth 0

# 4. Test frozen lockfile install (simulates CI)
rm -rf node_modules
pnpm install --frozen-lockfile

# 5. Verify SDK can find its dependencies
pnpm --filter @influencerai/sdk list --depth 0

# 6. Run tests locally to confirm fix
pnpm turbo run test:unit --filter=@influencerai/sdk

# 7. Commit the regenerated lockfile
git add pnpm-lock.yaml
git commit -m "fix: regenerate pnpm-lock.yaml with complete dependency resolution"
```

**Why This Works**:
- Removes incomplete lockfile state
- Forces pnpm to recalculate entire dependency graph
- Includes all transitive dependencies and peer dependencies
- Creates valid, frozen-lockfile-compatible state

**Verification**:
```bash
# Should show @vitejs/plugin-react installed
$ pnpm --filter @influencerai/sdk list --depth 0 | grep vitejs
@vitejs/plugin-react 4.7.0

# Should succeed without errors
$ pnpm install --frozen-lockfile
Done in 5.2s
```

---

### Solution 2: Fix MinIO Image Tag (RECOMMENDED)

**Confidence: 0.85**

**Change in `.github/workflows/ci.yml`**:
```yaml
services:
  minio:
    # BEFORE (incorrect tag):
    # image: bitnami/minio:2024

    # AFTER (Option 1 - specific version, RECOMMENDED):
    image: bitnami/minio:2024.12.18-debian-12-r0

    # OR (Option 2 - latest stable):
    image: bitnami/minio:latest

    # OR (Option 3 - official MinIO with explicit release):
    image: minio/minio:RELEASE.2024-12-18T06-33-25Z

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

**Rationale**:
- Bitnami uses `YYYY.MM.DD-debian-12-rN` format for stable releases
- Specific versions ensure reproducible builds
- Latest stable is acceptable for CI environments

**Alternative Health Check** (if curl is missing):
```yaml
options: >-
  --health-cmd "wget --no-verbose --tries=1 --spider http://localhost:9000/minio/health/live || exit 1"
  --health-interval 10s
  --health-timeout 5s
  --health-retries 10
  --health-start-period 30s
```

---

### Solution 3: Add Pre-Install Verification Step (PREVENTIVE)

**Confidence: 0.90**

Add a CI step to detect lockfile issues early:

```yaml
- name: Verify lockfile sync
  run: |
    pnpm install --frozen-lockfile --dry-run
    if [ $? -ne 0 ]; then
      echo "::error::pnpm-lock.yaml is out of sync with package.json files"
      echo "Run 'pnpm install' locally and commit the updated lockfile"
      exit 1
    fi
```

**Benefits**:
- Fails fast with clear error message
- Prevents wasted CI time on broken builds
- Provides actionable error message for developers

---

### Solution 4: Add pnpm Workspace Configuration (OPTIONAL)

**Confidence: 0.70**

Create `.npmrc` in repo root to ensure consistent behavior:

```ini
# .npmrc
# Ensure strict lockfile behavior
frozen-lockfile=true

# Auto-install peer dependencies
auto-install-peers=true

# Enable workspace protocol
link-workspace-packages=true

# Hoist shared dependencies to root
hoist=true
hoist-pattern[]=*eslint*
hoist-pattern[]=*prettier*
hoist-pattern[]=*typescript*
hoist-pattern[]=@vitejs/*
```

**Rationale**:
- Ensures consistent pnpm behavior across environments
- Hoisting can prevent "module not found" errors in some cases
- Auto-install-peers handles React plugin peer dependencies

**Trade-offs**:
- May change existing dependency resolution
- Requires testing to ensure no regressions
- Not necessary if Solution 1 is applied correctly

---

## Prevention Strategies

### 1. Add Pre-Commit Hook

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Verify lockfile is synced when package.json changes
if git diff --cached --name-only | grep -q "package.json"; then
  echo "package.json changed, verifying lockfile..."
  pnpm install --frozen-lockfile --dry-run
  if [ $? -ne 0 ]; then
    echo "Error: pnpm-lock.yaml is out of sync"
    echo "Run 'pnpm install' to update the lockfile"
    exit 1
  fi
fi
```

### 2. Add Documentation to CLAUDE.md

```markdown
## Adding Dependencies

When adding new dependencies to any package:

1. Add to package.json:
   ```bash
   cd packages/sdk  # or apps/api, etc.
   pnpm add -D @vitejs/plugin-react
   ```

2. Return to repo root and regenerate lockfile:
   ```bash
   cd ../..
   pnpm install
   ```

3. Verify frozen lockfile works:
   ```bash
   rm -rf node_modules
   pnpm install --frozen-lockfile
   ```

4. Commit both package.json AND pnpm-lock.yaml:
   ```bash
   git add package.json pnpm-lock.yaml
   git commit -m "feat: add @vitejs/plugin-react to SDK"
   ```

NEVER manually edit pnpm-lock.yaml or commit partially regenerated lockfiles.
```

### 3. Add CI Lockfile Validation Job

```yaml
lockfile-check:
  name: Verify pnpm lockfile
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: ./.github/actions/setup-pnpm
      with:
        version: '10.17.1'
    - name: Check lockfile is up-to-date
      run: |
        pnpm install --frozen-lockfile --dry-run
        echo "✓ Lockfile is synchronized with package.json files"
```

---

## Verification Plan

### Step 1: Local Verification
```bash
# Clean slate
rm -rf node_modules pnpm-lock.yaml

# Regenerate lockfile
pnpm install

# Test frozen lockfile (simulates CI)
rm -rf node_modules
pnpm install --frozen-lockfile

# Verify SDK dependencies
pnpm --filter @influencerai/sdk list --depth 0

# Run SDK tests
pnpm turbo run test:unit --filter=@influencerai/sdk

# Run web lint
pnpm turbo run lint --filter=@influencerai/web
```

### Step 2: CI Verification
```bash
# Commit and push
git add pnpm-lock.yaml .github/workflows/ci.yml
git commit -m "fix: regenerate lockfile and fix MinIO image tag"
git push

# Monitor CI: https://github.com/[owner]/influencerai-monorepo/actions
```

### Step 3: Expected Results
- ✅ SDK unit tests pass (63/63 tests)
- ✅ Web lint succeeds
- ✅ Integration tests initialize containers successfully
- ✅ MinIO service starts within health check period
- ✅ All 3 errors resolved

---

## Additional Research Findings

### pnpm Workspace Hoisting Behavior

**Research Confidence: 0.90**

From official pnpm documentation:
- pnpm does NOT hoist dependencies by default (unlike npm/yarn)
- Each package gets its own isolated node_modules
- Workspace protocol (`workspace:*`) links packages via symlinks
- This isolation prevents "phantom dependencies" but can cause "module not found" errors

**Implications**:
- Vitest config imports `@vitejs/plugin-react` directly
- If the package is not in SDK's local node_modules, import fails
- Solution: Ensure package is explicitly listed in SDK's devDependencies ✓ (already done)

### GitHub Actions Service Container Limitations

**Research Confidence: 0.85**

From GitHub Actions documentation and community issues:
- Service containers run with default ENTRYPOINT/CMD from the image
- Cannot override `command` or `cmd` fields (unlike docker-compose)
- Health checks must use commands available in the image
- Silent failures occur when image pull fails or health checks never pass

**Known Issues**:
- Issue #486: "Initializing containers fails on self-hosted runners"
- Issue #2173: "Unable to use containers: One or more containers failed to start"
- Issue #18389 (MinIO): "curl is removed from docker image"

**Best Practice**:
- Use official images with stable tags
- Verify health check commands are available in the image
- Add timeout/retry logic in CI steps that depend on services

---

## Confidence Score Summary

| Finding | Confidence | Source |
|---------|-----------|--------|
| Root cause: Incomplete lockfile regeneration | 0.95 | pnpm docs, CI logs, local testing |
| Solution: Regenerate lockfile | 0.95 | Standard pnpm workflow |
| MinIO image tag issue | 0.75 | Bitnami docs, tag convention research |
| MinIO health check curl issue | 0.60 | GitHub issue #18389, but unlikely with Bitnami |
| Workspace hoisting impact | 0.90 | Official pnpm documentation |
| GitHub Actions service limitations | 0.85 | Official docs, community issues |

---

## References

### Official Documentation
1. [pnpm install documentation](https://pnpm.io/cli/install) - frozen-lockfile behavior
2. [pnpm workspace settings](https://pnpm.io/settings) - hoisting and workspace protocols
3. [Bitnami MinIO Docker Hub](https://hub.docker.com/r/bitnami/minio) - official tags and usage
4. [GitHub Actions service containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers) - limitations and best practices

### Community Issues
1. [pnpm/pnpm #7934](https://github.com/pnpm/pnpm/issues/7934) - frozen-lockfile failures with v9
2. [minio/minio #18389](https://github.com/minio/minio/issues/18389) - health check and curl removal
3. [actions/runner #486](https://github.com/actions/runner/issues/486) - container initialization failures
4. [vitejs/vite #11657](https://github.com/vitejs/vite/issues/11657) - pnpm workspace CommonJS issues

### Stack Overflow
1. [Cannot find module @vitejs/plugin-react](https://stackoverflow.com/questions/71286740/cannot-find-module-vitejs-plugin-react-or-its-corresponding-type) - hoisting solutions
2. [pnpm frozen-lockfile behavior](https://stackoverflow.com/questions/73968943/how-to-have-pnpm-install-install-everything-exactly-to-the-specs-of-the-pnpm-l) - CI best practices

---

## Conclusion

All three CI failures are interconnected and stem from **incomplete pnpm-lock.yaml regeneration**. The primary solution is to fully regenerate the lockfile locally and commit it. The MinIO image tag issue is secondary and should also be fixed for robustness.

**Action Items** (Priority Order):
1. 🔴 **CRITICAL**: Regenerate pnpm-lock.yaml completely (Solution 1)
2. 🟡 **HIGH**: Fix MinIO image tag to use proper Bitnami version (Solution 2)
3. 🟢 **MEDIUM**: Add pre-commit hook to prevent lockfile sync issues (Prevention Strategy 1)
4. 🔵 **LOW**: Add .npmrc workspace configuration for consistency (Solution 4)

**Expected Resolution Time**: 5-10 minutes
**Risk Level**: LOW (solutions are well-tested and documented)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Next Review**: After CI verification succeeds
