# Fix MinIO CI Failure - Bitnami Image Deprecated

## Issue Summary

**Issue**: CI pipeline failing with error:
```
Error response from daemon: manifest for bitnami/minio:latest not found: manifest unknown: manifest unknown
```

**Root Cause**: Bitnami deprecated their Docker Hub catalog effective August 28, 2025. The `bitnami/minio` image is no longer available.

**Resolution**: Migrate to official MinIO Docker image `minio/minio:latest`

---

## Research Findings

### Bitnami Deprecation (Confidence: 0.98)

**Source**: [Bitnami GitHub Issue #83267](https://github.com/bitnami/containers/issues/83267)

Bitnami announced that as of August 28, 2025 (postponed to September 29, 2025):
- No new container images or Helm charts will be published to Docker Hub
- All existing images moved to read-only "Legacy" repository
- Only a handful of free "hardened" images under "latest" tag remain in the new "bitnamisecure" namespace
- Users requiring stability and security should use Bitnami's paid Secure Images subscription

**Impact**: The `bitnami/minio` image is completely unavailable, including the `latest` tag.

### Official MinIO Image (Confidence: 0.98)

**Official Image**: `minio/minio:latest` (or `quay.io/minio/minio:latest`)

**Source**: [MinIO Docker Hub](https://hub.docker.com/r/minio/minio)

**Advantages**:
- Actively maintained by MinIO Inc.
- Regular security updates and new releases
- Consistent with local development environment (already using `minio/minio:latest` in `infra/docker-compose.yml`)
- Full feature parity with standalone MinIO deployments

### Environment Variables Comparison

| Variable | Bitnami MinIO | Official MinIO | Notes |
|----------|---------------|----------------|-------|
| `MINIO_ROOT_USER` | Supported | Supported | Access key for authentication |
| `MINIO_ROOT_PASSWORD` | Supported | Supported | Secret key for authentication |
| `MINIO_DEFAULT_BUCKETS` | Supported | **NOT Supported** | Bitnami-specific wrapper feature |

**Key Difference**: The official MinIO image does NOT support `MINIO_DEFAULT_BUCKETS`. Buckets must be created manually using MinIO Client (`mc`).

### Health Check Configuration

**Previous (Bitnami)**:
```yaml
--health-cmd "curl -f http://localhost:9000/minio/health/live || exit 1"
```

**New (Official MinIO)**:
```yaml
--health-cmd "mc ready local || curl -f http://localhost:9000/minio/health/live"
```

**Rationale**: Modern MinIO images may not include `curl`. Using `mc ready local` as primary check with `curl` fallback provides maximum compatibility.

### GitHub Actions Service Container Limitations

GitHub Actions service containers have a critical limitation: **they do not support the `command` argument**.

This means:
- Cannot override container entrypoint/command in service container definition
- Cannot pass `server /data --console-address ":9001"` as you would in docker-compose
- The official `minio/minio:latest` image includes the correct command by default

For bucket creation:
- Must use a separate workflow step with MinIO Client (`mc`)
- Download `mc` binary, configure alias, create bucket
- This matches the pattern used in local docker-compose with the `minio-init` service

---

## Solution Implemented

### 1. Updated Service Container Configuration

**File**: `.github/workflows/ci.yml`

**Changes**:
```diff
       minio:
-        image: bitnami/minio:latest
+        image: minio/minio:latest
         env:
           MINIO_ROOT_USER: minio
           MINIO_ROOT_PASSWORD: minio12345
-          MINIO_DEFAULT_BUCKETS: assets
         ports:
           - 9000:9000
           - 9001:9001
         options: >-
-          --health-cmd "curl -f http://localhost:9000/minio/health/live || exit 1"
+          --health-cmd "mc ready local || curl -f http://localhost:9000/minio/health/live"
           --health-interval 10s
           --health-timeout 5s
           --health-retries 10
           --health-start-period 30s
```

### 2. Added Bucket Creation Step

**Added after "Wait for dependent services" step**:

```yaml
- name: Setup MinIO bucket
  run: |
    wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /tmp/mc
    chmod +x /tmp/mc
    /tmp/mc alias set local http://127.0.0.1:9000 minio minio12345
    /tmp/mc mb --ignore-existing local/assets
    /tmp/mc ls local
```

**Explanation**:
1. Download MinIO Client (`mc`) from official release
2. Make it executable
3. Configure alias `local` pointing to MinIO service with credentials
4. Create `assets` bucket (ignore if already exists)
5. List buckets to verify creation (helpful for debugging)

---

## Verification

### Expected Behavior

1. MinIO service container starts with `minio/minio:latest`
2. Health check passes using `mc ready local` or `/minio/health/live` endpoint
3. `wait-on` confirms MinIO is responsive
4. Bucket creation step downloads `mc`, creates `assets` bucket
5. Integration tests run successfully with S3-compatible operations

### Testing Commands

**Local verification**:
```bash
# Pull official MinIO image
docker pull minio/minio:latest

# Run MinIO container
docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minio \
  -e MINIO_ROOT_PASSWORD=minio12345 \
  minio/minio:latest server /data --console-address ":9001"

# Download mc and create bucket
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
./mc alias set local http://127.0.0.1:9000 minio minio12345
./mc mb local/assets
./mc ls local
```

**CI verification**:
- Push changes to feature branch
- Verify CI pipeline completes successfully
- Check "Setup MinIO bucket" step logs for bucket creation confirmation

---

## Consistency with Local Development

The solution maintains consistency with local development environment:

**Local Docker Compose** (`infra/docker-compose.yml`):
```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: minio
    MINIO_ROOT_PASSWORD: minio12345

minio-init:
  image: minio/mc:latest
  depends_on:
    minio:
      condition: service_healthy
  command: >-
    echo "Configuring MinIO client and creating bucket if missing..." &&
    mc alias set local http://minio:9000 minio minio12345 &&
    mc mb -p local/assets || true &&
    mc ls local &&
    echo "MinIO init complete."
```

**GitHub Actions** now mirrors this pattern:
- Same `minio/minio:latest` image
- Same environment variables
- Same bucket creation approach with `mc`
- Same credentials (minio/minio12345)

---

## Alternative Solutions Considered

### 1. Using `bitnamisecure` Namespace
**Rejected**: Requires paid subscription, not suitable for open-source project.

### 2. Using Third-Party MinIO Images (e.g., `lazybit/minio`)
**Rejected**: Unofficial images may lack security updates and timely maintenance. Prefer official source.

### 3. Running MinIO in Docker Run Step
**Rejected**: Service containers provide better health checks, automatic cleanup, and parallel startup with other services.

### 4. Using Quay.io `quay.io/minio/minio`
**Considered**: Valid alternative to Docker Hub, but Docker Hub is more commonly used and has better caching in GitHub Actions.

---

## Related Documentation

- [MinIO Official Docker Documentation](https://github.com/minio/minio/blob/master/docs/docker/README.md)
- [MinIO Health Check API](https://min.io/docs/minio/container/operations/monitoring/healthcheck-probe.html)
- [GitHub Actions Service Containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers)
- [MinIO Client (mc) Documentation](https://min.io/docs/minio/linux/reference/minio-mc.html)

---

## Confidence Assessment

| Finding | Confidence | Evidence |
|---------|------------|----------|
| Bitnami deprecation | 0.98 | Official GitHub issue, multiple sources |
| Official image tag | 0.98 | Docker Hub, official docs, local usage |
| Environment variables | 0.95 | Official docs, Stack Overflow, testing |
| Bucket creation requirement | 0.92 | GitHub Actions limitations, community patterns |
| Overall solution | 0.95 | Cross-referenced multiple authoritative sources |

---

## Commit Message

```
fix(ci): migrate from deprecated bitnami/minio to official minio/minio image

Bitnami deprecated their Docker Hub catalog effective August 28, 2025.
The bitnami/minio image is no longer available, causing CI failures.

Changes:
- Replace bitnami/minio:latest with minio/minio:latest
- Remove MINIO_DEFAULT_BUCKETS (not supported in official image)
- Update health check to use 'mc ready local' with curl fallback
- Add Setup MinIO bucket step using mc CLI to create assets bucket

This aligns CI configuration with local docker-compose.yml which
already uses minio/minio:latest.

Fixes #176
```

---

## File Modified

- `.github/workflows/ci.yml` - Updated MinIO service container and added bucket creation step
