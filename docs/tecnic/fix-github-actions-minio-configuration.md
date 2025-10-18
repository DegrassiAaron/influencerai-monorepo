# Fix: GitHub Actions MinIO Service Container Configuration

**Issue**: Current workflow uses invalid `cmd:` field which is not supported by GitHub Actions service containers.

**File**: `.github/workflows/ci.yml` (lines 214-229)

## Current (Incorrect) Configuration

```yaml
minio:
  image: minio/minio:latest
  env:
    MINIO_ROOT_USER: minio
    MINIO_ROOT_PASSWORD: minio12345
  ports:
    - 9000:9000
    - 9001:9001
  options: >-
    --health-cmd "curl -f http://localhost:9000/minio/health/live || exit 1"
    --health-interval 10s
    --health-timeout 5s
    --health-retries 10
    --entrypoint /bin/sh
  # cmd: field is NOT supported by GitHub Actions
  cmd: -c "minio server /data --console-address ':9001'"
```

## Recommended Fix: Use bitnami/minio

```yaml
minio:
  image: bitnami/minio:2024
  env:
    MINIO_ROOT_USER: minio
    MINIO_ROOT_PASSWORD: minio12345
    MINIO_DEFAULT_BUCKETS: assets  # Auto-creates bucket
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

## Key Changes

1. **Image**: `minio/minio:latest` → `bitnami/minio:2024`
   - Bitnami image has pre-configured entrypoint that starts MinIO server automatically
   - No need for custom command

2. **Environment**: Added `MINIO_DEFAULT_BUCKETS: assets`
   - Auto-creates the `assets` bucket on startup
   - Eliminates need for manual bucket creation in tests

3. **Health Check**: Added `--health-start-period 30s`
   - Gives MinIO time to initialize before health checks begin
   - Prevents premature failures

4. **Removed**: Lines 227-229 (`--entrypoint` and `cmd:`)
   - GitHub Actions does not support passing commands to service containers
   - Bitnami image doesn't need these

## Why This Works

GitHub Actions service containers only support these fields:
- `image` - Docker image to use
- `env` - Environment variables
- `ports` - Port mappings
- `options` - Docker create flags (limited)
- `credentials` - Registry auth

**NOT SUPPORTED**: `cmd`, `command`, `args`, `--entrypoint` with arguments

The official `minio/minio:latest` image requires an explicit command to start, which GitHub Actions cannot provide. The `bitnami/minio` image has this command built-in.

## Trade-offs

**Pros**:
- Works reliably in GitHub Actions
- Auto-creates bucket (no manual setup needed)
- Well-maintained by Bitnami team
- Production-grade stability

**Cons**:
- Slightly slower startup (~30 seconds vs ~15 seconds)
- Larger image size (~400MB vs ~200MB)

**Impact**: Adds ~20-30 seconds to integration test job startup. With 2 shards running in parallel, total impact is ~30 seconds per workflow run.

## Alternative Solutions

If startup time becomes critical, consider:

1. **Custom Docker Image**: Create wrapper around official MinIO with pre-configured CMD
2. **Docker Run in Steps**: Use `docker run` directly in workflow steps instead of service containers
3. **fclairamb/minio-github-actions**: Faster but less maintained alternative

See `docs/tecnic/research-github-actions-minio-service.md` for detailed analysis of all options.

## Testing

After applying this fix:

1. Run workflow on feature branch
2. Verify MinIO health check passes
3. Verify integration tests can connect to MinIO at `http://127.0.0.1:9000`
4. Verify `assets` bucket exists (no manual creation needed)
5. Monitor total workflow duration

## References

- Research Document: `docs/tecnic/research-github-actions-minio-service.md`
- GitHub Actions Docs: https://docs.github.com/en/actions/use-cases-and-examples/using-containerized-services
- Bitnami MinIO: https://github.com/bitnami/containers/tree/main/bitnami/minio
