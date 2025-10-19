# LoRA Training Troubleshooting Guide

Solutions to common problems encountered during LoRA training setup and execution.

---

## Table of Contents

- [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
- [Infrastructure Issues](#infrastructure-issues)
  - [1. Docker Services Won't Start](#1-docker-services-wont-start)
  - [2. Database Migration Failures](#2-database-migration-failures)
- [Training Execution Issues](#training-execution-issues)
  - [3. Job Stuck in 'Pending' Status](#3-job-stuck-in-pending-status)
  - [4. Training Fails with Out-of-Memory Error](#4-training-fails-with-out-of-memory-error)
- [Quality Issues](#quality-issues)
  - [5. Poor LoRA Output Quality](#5-poor-lora-output-quality)
- [Integration Issues](#integration-issues)
  - [6. n8n Workflow Not Found or Stuck](#6-n8n-workflow-not-found-or-stuck)
  - [7. API Returns 404 for Existing Resource](#7-api-returns-404-for-existing-resource)
- [Additional Common Issues](#additional-common-issues)
- [Getting Help](#getting-help)

---

## Quick Diagnostic Checklist

Before diving into specific issues, verify these prerequisites:

**Infrastructure**:
- [ ] Docker Desktop is running: `docker ps` returns services list
- [ ] All required services are up: `docker compose -f infra/docker-compose.yml ps`
  - postgres (port 5433)
  - redis (port 6380)
  - minio (ports 9000, 9001)
  - n8n (port 5678)
- [ ] Database migrations applied: `cd apps/api && pnpm dlx prisma migrate status`
- [ ] Environment variables set: Check `.env` file exists with DATABASE_URL, REDIS_URL, etc.

**Application Services**:
- [ ] API running: `curl http://localhost:3001/health` returns 200 OK
- [ ] Worker running: `docker compose logs worker` shows "Worker started"
- [ ] Web dashboard accessible: http://localhost:3000

**Dataset & Configuration**:
- [ ] Dataset exists at specified path: `ls data/datasets/my-influencer`
- [ ] Images and captions present: `ls data/datasets/my-influencer/*.{png,txt}`
- [ ] Dataset registered in database: `curl http://localhost:3001/datasets -H "x-tenant-id: tenant_demo"`

If all checks pass but you still have issues, proceed to specific problem sections below.

---

## Infrastructure Issues

### 1. Docker Services Won't Start

**Symptom**: `docker compose up` fails, services crash immediately, or port binding errors.

#### Cause A: Port Conflicts

**Error Message**:
```
Error response from daemon: driver failed programming external connectivity on endpoint postgres:
Bind for 0.0.0.0:5433 failed: port is already allocated
```

**Solution**:

1. Check what's using the port:
   ```bash
   # Windows
   netstat -ano | findstr :5433

   # Linux/macOS
   lsof -i :5433
   ```

2. Stop the conflicting service or change ports in `infra/docker-compose.yml`:
   ```yaml
   postgres:
     ports:
       - "5434:5432"  # Changed from 5433
   ```

3. Update `.env` with new port:
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5434/influencerai
   ```

4. Restart Docker Compose:
   ```bash
   docker compose -f infra/docker-compose.yml down
   docker compose -f infra/docker-compose.yml up -d
   ```

#### Cause B: Missing or Invalid .env File

**Error Message**:
```
Error: Environment variable DATABASE_URL is not defined
```

**Solution**:

1. Verify `.env` file exists:
   ```bash
   ls -la .env  # Should show file in project root
   ```

2. Copy from example if missing:
   ```bash
   cp .env.example .env
   ```

3. Verify required variables are set:
   ```bash
   cat .env | grep -E "(DATABASE_URL|REDIS_URL|S3_ENDPOINT)"
   ```

   Should show:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/influencerai
   REDIS_URL=redis://localhost:6380
   S3_ENDPOINT=http://localhost:9000
   ```

4. Restart services:
   ```bash
   docker compose -f infra/docker-compose.yml restart
   ```

#### Cause C: Docker Desktop Not Running or Insufficient Resources

**Error Message**:
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution**:

1. Start Docker Desktop application
2. Wait for "Docker Desktop is running" status
3. Verify Docker is responding:
   ```bash
   docker version
   docker ps
   ```

4. Increase Docker resources if needed:
   - Docker Desktop → Settings → Resources
   - CPU: At least 4 cores
   - Memory: At least 8 GB (16 GB recommended for training)
   - Disk: At least 50 GB available

**Prevention**:
- Add Docker Desktop to startup applications
- Monitor resource usage with `docker stats`
- Regularly prune unused containers/images: `docker system prune -a`

---

### 2. Database Migration Failures

**Symptom**: API fails to start, Prisma errors, or "Table does not exist" errors.

#### Cause A: Prisma Client Out of Sync

**Error Message**:
```
PrismaClientInitializationError: Prisma Client could not locate the required files.
This usually happens when the `prisma generate` command was not run.
```

**Solution**:

1. Navigate to API directory:
   ```bash
   cd apps/api
   ```

2. Generate Prisma client:
   ```bash
   pnpm dlx prisma generate
   ```

3. Verify generation succeeded:
   ```bash
   ls node_modules/.prisma/client/
   # Should show index.js, index.d.ts, schema.prisma
   ```

4. Restart API:
   ```bash
   pnpm dev
   ```

#### Cause B: Pending Migrations Not Applied

**Error Message**:
```
Error: P2021: The table `public.Dataset` does not exist in the current database.
```

**Solution**:

1. Check migration status:
   ```bash
   cd apps/api
   pnpm dlx prisma migrate status
   ```

   Output shows:
   ```
   Following migrations have not yet been applied:
   20250115123456_add_lora_config
   ```

2. Apply pending migrations:
   ```bash
   pnpm dlx prisma migrate deploy
   # Or for development:
   pnpm dlx prisma migrate dev
   ```

3. Verify migrations applied:
   ```bash
   pnpm dlx prisma migrate status
   # Should show: "Database schema is up to date!"
   ```

#### Cause C: Database Connection Error

**Error Message**:
```
Error: P1001: Can't reach database server at `localhost:5433`
```

**Solution**:

1. Verify Docker database is running:
   ```bash
   docker compose -f infra/docker-compose.yml ps postgres
   # Should show "Up" status
   ```

2. Check database logs:
   ```bash
   docker compose -f infra/docker-compose.yml logs postgres
   # Look for "database system is ready to accept connections"
   ```

3. Test connection manually:
   ```bash
   docker exec -it postgres psql -U postgres -d influencerai
   # Should connect and show postgres=# prompt
   ```

4. If connection fails, restart database:
   ```bash
   docker compose -f infra/docker-compose.yml restart postgres
   ```

**Prevention**:
- Always run `prisma generate` after pulling schema changes
- Apply migrations before starting services
- Add to setup script:
  ```bash
  cd apps/api && pnpm dlx prisma generate && pnpm dlx prisma migrate deploy
  ```

---

## Training Execution Issues

### 3. Job Stuck in 'Pending' Status

**Symptom**: Job created successfully (status: `pending`) but never starts training. Remains in `pending` for 5+ minutes.

#### Cause A: Worker Process Not Running

**Error Message**: No error, job just stays `pending`.

**Solution**:

1. Check if worker is running:
   ```bash
   docker compose logs worker
   # OR if running locally:
   pnpm --filter worker dev
   ```

2. If worker is not running, start it:
   ```bash
   # Docker:
   docker compose -f infra/docker-compose.yml up -d worker

   # Local:
   cd apps/worker
   pnpm dev
   ```

3. Verify worker is consuming jobs:
   ```bash
   docker compose logs worker -f
   # Should show:
   # "BullMQ Worker started"
   # "Connected to Redis at redis://localhost:6380"
   ```

4. Check job is now processing:
   ```bash
   curl http://localhost:3001/jobs/{job-id} \
     -H "x-tenant-id: tenant_demo"
   # Status should change from "pending" to "running"
   ```

#### Cause B: Redis Connection Failure

**Error Message** (in worker logs):
```
Error: connect ECONNREFUSED 127.0.0.1:6380
```

**Solution**:

1. Verify Redis is running:
   ```bash
   docker compose -f infra/docker-compose.yml ps redis
   # Should show "Up" status
   ```

2. Test Redis connection:
   ```bash
   docker exec -it redis redis-cli ping
   # Should return: PONG
   ```

3. Check Redis logs for errors:
   ```bash
   docker compose -f infra/docker-compose.yml logs redis
   ```

4. Restart Redis if needed:
   ```bash
   docker compose -f infra/docker-compose.yml restart redis
   ```

5. Restart worker after Redis is up:
   ```bash
   docker compose -f infra/docker-compose.yml restart worker
   ```

#### Cause C: Queue Name Mismatch

**Error Message**: Worker running but not processing jobs.

**Solution**:

1. Check worker configuration for queue name:
   ```bash
   grep -r "queue:" apps/worker/src/
   # Should show queue name: "lora-training"
   ```

2. Verify job type matches queue:
   ```bash
   curl http://localhost:3001/jobs/{job-id} \
     -H "x-tenant-id: tenant_demo"
   # Check "type": "lora-training"
   ```

3. Check worker logs for queue registration:
   ```bash
   docker compose logs worker | grep "Processing queue"
   # Should show: "Processing queue: lora-training"
   ```

**Prevention**:
- Add worker health check endpoint
- Monitor queue depth: `redis-cli llen bull:lora-training:wait`
- Set up alerts for jobs pending > 5 minutes

---

### 4. Training Fails with Out-of-Memory Error

**Symptom**: Training starts but crashes during execution with CUDA or memory errors.

#### Cause A: VRAM Insufficient (GPU Out of Memory)

**Error Message**:
```
RuntimeError: CUDA out of memory. Tried to allocate 2.00 GiB (GPU 0; 8.00 GiB total capacity)
```

**Solution**:

1. Check GPU VRAM usage:
   ```bash
   nvidia-smi
   # Shows GPU memory usage and availability
   ```

2. Reduce batch size in LoRA config:
   ```bash
   curl -X PATCH http://localhost:3001/lora-configs/{config-id} \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{"batchSize": 1}'
   # Reduce from 2 or 4 to 1
   ```

3. Lower training resolution:
   ```bash
   curl -X PATCH http://localhost:3001/lora-configs/{config-id} \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{"resolution": 768}'
   # SDXL: 1024 → 768 → 512
   # SD 1.5: 768 → 512
   ```

4. Use memory-efficient optimizer:
   ```bash
   curl -X PATCH http://localhost:3001/lora-configs/{config-id} \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{"meta": {"optimizer": "AdamW8bit"}}'
   # AdamW8bit uses ~30% less VRAM than AdamW
   ```

5. Close other GPU-intensive applications:
   ```bash
   # Windows:
   tasklist | findstr "python torch"
   taskkill /PID {pid} /F

   # Linux:
   ps aux | grep python
   kill {pid}
   ```

6. Enable gradient checkpointing (advanced):
   Edit `apps/worker/src/processors/loraTraining.ts` to add:
   ```
   --gradient_checkpointing
   ```

#### Cause B: System RAM Insufficient

**Error Message**:
```
MemoryError: Unable to allocate array with shape (1024, 1024, 3)
```

**Solution**:

1. Check system memory:
   ```bash
   # Windows:
   wmic OS get FreePhysicalMemory

   # Linux:
   free -h
   ```

2. Close unnecessary applications

3. Increase Docker memory allocation:
   - Docker Desktop → Settings → Resources → Memory
   - Increase to at least 8 GB (16 GB recommended)

4. Reduce dataset size temporarily:
   - Train on subset of images first
   - Add more images incrementally

**Prevention**:
- Start with conservative settings:
  - Batch size: 1
  - Resolution: Match base model native (512 for SD 1.5, 1024 for SDXL)
  - Optimizer: AdamW8bit
- Monitor VRAM usage: `nvidia-smi` during training
- Use appropriate GPU for model:
  - SD 1.5: 8 GB VRAM (RTX 3060+)
  - SDXL: 16 GB VRAM (RTX 4070+)

---

## Quality Issues

### 5. Poor LoRA Output Quality

**Symptom**: Training completes successfully but generated images don't match the trained concept, look inconsistent, or produce low-quality results.

#### Cause A: Insufficient or Low-Quality Dataset

**Symptoms**:
- Generated images vary wildly (face/style changes each generation)
- Trigger word has minimal effect
- Model produces generic results similar to base model

**Solution**:

1. Verify dataset quality:
   ```bash
   cd data/datasets/my-influencer
   ls -1 *.png | wc -l
   # Should have at least 15-20 images
   ```

2. Check image diversity:
   - Multiple angles (front, side, 3/4 view)
   - Different expressions and poses
   - Varied lighting and contexts
   - NOT 20 nearly identical photos

3. Review caption quality:
   ```bash
   head -n 5 *.txt
   # Each should:
   # - Include trigger word
   # - Be specific and descriptive
   # - Describe context, NOT features to train
   ```

4. Improve dataset:
   - Add 5-10 more diverse, high-quality images
   - Review and enhance captions (more specific descriptions)
   - Remove low-quality or duplicate images

5. Retrain with improved dataset:
   ```bash
   curl -X POST http://localhost:3001/jobs \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{
       "type": "lora-training",
       "payload": {
         "datasetId": "{improved-dataset-id}",
         "loraConfigId": "{config-id}"
       }
     }'
   ```

#### Cause B: Overfitting (Training Too Long)

**Symptoms**:
- Generated images look like exact copies of training images
- Model fails with prompts different from training captions
- Saturated colors, unnatural distortions
- Loss value becomes very low (< 0.01) but quality degrades

**Solution**:

1. Use earlier epoch checkpoints:
   ```bash
   ls data/loras/my-influencer-v1/
   # Test epoch 5, 10, 15 instead of final epoch 20-30
   ```

2. Load earlier checkpoint in ComfyUI:
   - Try `my-influencer-v1-epoch-10.safetensors`
   - Compare with `my-influencer-v1-final.safetensors`
   - Earlier epochs often generalize better

3. Adjust training parameters for next training:
   ```bash
   curl -X PATCH http://localhost:3001/lora-configs/{config-id} \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{
       "epochs": 15,
       "learningRate": 0.00003
     }'
   # Reduce epochs from 30 to 15
   # Lower learning rate from 0.0001 to 0.00003
   ```

#### Cause C: Underfitting (Training Too Short)

**Symptoms**:
- Generated images don't match trained concept at all
- Trigger word has no visible effect
- Results look generic (like base model without LoRA)
- Loss value remains high (> 0.05)

**Solution**:

1. Train for more epochs:
   ```bash
   curl -X PATCH http://localhost:3001/lora-configs/{config-id} \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{
       "epochs": 30
     }'
   # Increase from 10-15 to 20-30
   ```

2. Increase learning rate:
   ```bash
   curl -X PATCH http://localhost:3001/lora-configs/{config-id} \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{
       "learningRate": 0.0001
     }'
   # Increase from 0.00003 to 0.0001
   ```

3. Verify dataset quality:
   - Check captions include trigger word consistently
   - Ensure images show the concept clearly
   - Verify dataset has sufficient examples (15+ minimum)

#### Cause D: Wrong Resolution or Base Model Mismatch

**Symptoms**:
- Blurry or pixelated outputs
- Poor detail quality
- Model doesn't integrate well with ComfyUI workflow

**Solution**:

1. Verify base model and resolution match:
   ```bash
   curl http://localhost:3001/lora-configs/{config-id} \
     -H "x-tenant-id: tenant_demo"
   # Check:
   # - modelName: "sd15" → resolution should be 512
   # - modelName: "sdxl" → resolution should be 1024
   ```

2. Retrain with correct resolution:
   ```bash
   curl -X PATCH http://localhost:3001/lora-configs/{config-id} \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{
       "resolution": 1024
     }'
   # Match your base model's native resolution
   ```

3. Verify dataset images are correct resolution:
   ```bash
   identify data/datasets/my-influencer/*.png | head -n 5
   # Should show consistent 1024x1024 or 512x512
   ```

**Prevention**:
- Use recommended presets (see [Getting Started](GETTING-STARTED.md#recommended-presets))
- Start with 20-25 diverse, high-quality images
- Test at epoch 10, 15, 20 - don't only test final epoch
- Document successful parameters for future reference
- Compare training loss over epochs (should decrease smoothly)

---

## Integration Issues

### 6. n8n Workflow Not Found or Stuck

**Symptom**: n8n workflow doesn't trigger, shows "not found" error, or gets stuck at a specific node.

#### Cause A: Workflow Not Imported

**Error Message**:
```
Workflow with ID 'lora-train' not found
```

**Solution**:

1. Access n8n UI: http://localhost:5678

2. Import workflow:
   - Click "+ Add Workflow" → "Import from File"
   - Select `apps/n8n/workflows/lora-train.json`
   - Click "Import"

3. Activate workflow:
   - Click toggle switch at top right
   - Should show "Active"

4. Test webhook:
   ```bash
   curl -X POST http://localhost:5678/webhook/lora-train \
     -H "Content-Type: application/json" \
     -d '{
       "datasetId": "test-dataset",
       "loraConfigId": "test-config"
     }'
   ```

#### Cause B: Webhook URL Incorrect

**Error Message**:
```
404 Not Found: Webhook URL does not exist
```

**Solution**:

1. Check workflow webhook settings in n8n UI:
   - Open workflow → Click "Webhook" node
   - Verify "Webhook URL" matches your request

2. Expected URL format:
   ```
   http://localhost:5678/webhook/lora-train
   ```

3. If using cloudflared tunnel (external webhooks):
   ```bash
   cloudflared tunnel create influencerai-tunnel
   cloudflared tunnel route dns influencerai-tunnel influencerai.example.com
   cloudflared tunnel run influencerai-tunnel
   ```

   Update webhook URL:
   ```
   https://influencerai.example.com/webhook/lora-train
   ```

#### Cause C: Workflow Stuck at Polling Node

**Symptom**: Workflow triggers but hangs at "Poll Job Status" node.

**Solution**:

1. Check n8n execution log:
   - n8n UI → "Executions" → Click failed/running execution
   - Identify which node is stuck

2. Verify job exists and is accessible:
   ```bash
   curl http://localhost:3001/jobs/{job-id} \
     -H "x-tenant-id: tenant_demo"
   # Should return job object
   ```

3. Check polling interval settings:
   - Open workflow → Click "Poll Job Status" node
   - Verify "Poll every" is set to reasonable value (5-10 seconds)
   - Verify "Timeout" is sufficient (2 hours for SDXL training)

4. Manually complete stuck execution:
   - n8n UI → "Executions" → Click execution
   - Click "Stop Execution"
   - Re-trigger workflow

**Prevention**:
- Test workflow with small dataset first (< 5 images, 5 epochs)
- Set up error notifications in n8n (email, Slack, webhook)
- Monitor n8n logs: `docker compose logs n8n -f`

---

### 7. API Returns 404 for Existing Resource

**Symptom**: API returns `404 Not Found` for a resource you know exists (e.g., dataset, config, job).

#### Cause A: Cross-Tenant Security (Wrong Tenant ID)

**Error Message**:
```
{
  "statusCode": 404,
  "message": "Dataset clx4k9j2k0000xyz not found"
}
```

**Explanation**: Resource exists but belongs to a different tenant. API returns 404 instead of 403 to prevent information leakage (OWASP best practice).

**Solution**:

1. Verify tenant ID in request:
   ```bash
   curl http://localhost:3001/datasets/clx4k9j2k0000xyz \
     -H "x-tenant-id: tenant_demo" \
     -v
   # Check header: x-tenant-id: tenant_demo
   ```

2. List resources for your tenant:
   ```bash
   curl http://localhost:3001/datasets \
     -H "x-tenant-id: tenant_demo"
   # Verify resource ID appears in list
   ```

3. If resource was created with different tenant, recreate with correct tenant:
   ```bash
   curl -X POST http://localhost:3001/datasets \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{...}'
   ```

#### Cause B: Invalid Resource ID Format

**Error Message**:
```
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "fieldErrors": {
      "id": ["Invalid ID format"]
    }
  }
}
```

**Solution**:

1. Verify ID format is correct (CUID):
   ```bash
   # Correct format: clx4k9j2k0000xyz (starts with "cl", alphanumeric)
   # Incorrect: 123, "dataset-1", null
   ```

2. Get correct ID from list endpoint:
   ```bash
   curl http://localhost:3001/datasets \
     -H "x-tenant-id: tenant_demo" \
     | jq '.[0].id'
   # Copy exact ID from response
   ```

#### Cause C: Resource Deleted or Never Created

**Solution**:

1. Verify resource creation succeeded:
   ```bash
   # Check response from POST request
   curl -X POST http://localhost:3001/datasets \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{...}' \
     -v
   # Should return 201 Created with resource ID
   ```

2. Check database directly:
   ```bash
   docker exec -it postgres psql -U postgres -d influencerai -c \
     "SELECT id, \"tenantId\", status FROM \"Dataset\" WHERE id = 'clx4k9j2k0000xyz';"
   ```

3. If not found, recreate resource

**Prevention**:
- Always use consistent tenant ID (`tenant_demo` for development)
- Store resource IDs after creation (don't guess or manually type)
- Add tenant ID to all API requests (headers or query params)
- Validate API responses include expected resource ID

---

## Additional Common Issues

### CORS Errors in Web Dashboard

**Error Message** (in browser console):
```
Access to fetch at 'http://localhost:3001/datasets' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution**:

1. Verify API CORS configuration in `apps/api/src/main.ts`:
   ```typescript
   app.enableCors({
     origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
     credentials: true,
   });
   ```

2. Restart API:
   ```bash
   pnpm --filter api dev
   ```

### Training Produces Empty .safetensors File

**Symptom**: Training completes but output file is 0 bytes or very small (< 1 MB).

**Solution**:

1. Check worker logs for errors:
   ```bash
   docker compose logs worker | grep -i "error\|fail"
   ```

2. Verify kohya_ss CLI path is correct:
   ```bash
   which kohya_ss
   # Should return valid path
   ```

3. Test kohya_ss directly:
   ```bash
   kohya_ss --help
   # Should show command options
   ```

4. Check output directory permissions:
   ```bash
   ls -la data/loras/
   # Should be writable by worker process
   ```

### Trigger Word Not Working in ComfyUI

**Symptom**: Generated images don't show trained concept even with trigger word in prompt.

**Solution**:

1. Verify LoRA is loaded:
   - ComfyUI → Check "Load LoRA" node shows your LoRA file
   - Verify strength_model > 0.5

2. Check trigger word spelling:
   - Prompt: `"ohwx woman portrait"`
   - Caption files: All should contain `"ohwx woman"`
   - Match exactly (case-sensitive in some models)

3. Increase LoRA strength:
   - Try strength_model: 0.8 or 0.9
   - Try strength_clip: 0.8 or 0.9

4. Verify LoRA trained correctly:
   - Check file size (should be 50-200 MB)
   - Try earlier epoch checkpoint

---

## Getting Help

If your issue isn't covered here:

1. **Check Logs**:
   - API: `docker compose logs api -f`
   - Worker: `docker compose logs worker -f`
   - Database: `docker compose logs postgres -f`
   - n8n: `docker compose logs n8n -f`

2. **Enable Debug Mode**:
   - Add to `.env`: `LOG_LEVEL=debug`
   - Restart services
   - Check logs again with verbose output

3. **Review Related Documentation**:
   - [Getting Started](GETTING-STARTED.md) - Full training workflow
   - [API Reference](API-REFERENCE.md) - Endpoint documentation
   - [Dataset Structure Guide](examples/datasets.md) - Dataset requirements
   - [Architecture Overview](../../architecture/panoramica.md) - System design

4. **Create GitHub Issue**:
   Include:
   - Symptom and error messages
   - Steps to reproduce
   - Relevant logs (API, worker, database)
   - Dataset size and configuration used
   - Environment (OS, Docker version, GPU model)

5. **Community Support**:
   - Check existing GitHub issues for similar problems
   - Join Discord/Slack (if available) for real-time help
   - Review Civitai/HuggingFace forums for LoRA training tips

---

**Remember**: Most training issues are dataset-related (quality, size, captions). Start by reviewing your dataset before adjusting complex training parameters.

Happy troubleshooting! 🔧
