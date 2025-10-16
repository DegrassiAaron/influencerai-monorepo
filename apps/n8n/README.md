# n8n Workflows for InfluencerAI

This directory contains production-ready n8n workflows for orchestrating the InfluencerAI content generation pipeline.

## Overview

The workflows automate:

- **Content Planning**: Generate content plans using OpenRouter API
- **LoRA Training**: Enqueue and monitor LoRA model training jobs
- **Content Pipeline**: End-to-end content generation (plan → image → video → autopost)
- **Publishing**: Social media posting to Instagram, TikTok, YouTube
- **Webhook Handling**: Receive ComfyUI rendering completion callbacks

## Directory Structure

```
apps/n8n/
├── workflows/              # Production workflow JSON files
│   ├── plan-generate.json          # Content plan generation
│   ├── lora-train.json             # LoRA training job orchestration
│   ├── content-run-pipeline.json   # Full content generation pipeline
│   ├── publish.json                # Social media publisher
│   ├── webhook-comfyui.json        # ComfyUI webhook receiver
│   ├── *.template.json             # Legacy templates (for reference)
│   └── README.md                   # Workflow documentation
├── scripts/                # Import/export automation
│   ├── import-workflows.js         # Node.js import script
│   ├── export-workflows.js         # Node.js export script
│   ├── import.sh                   # Shell wrapper for import
│   └── export.sh                   # Shell wrapper for export
├── package.json            # NPM scripts for workflow management
└── README.md               # This file
```

## Prerequisites

### Required Services

1. **n8n** - Running on `http://localhost:5678` (or configured URL)
2. **NestJS API** - Running on `http://localhost:3001` (or configured URL)
3. **PostgreSQL** - For API data persistence
4. **Redis** - For job queues (BullMQ)
5. **MinIO** - For asset storage (S3-compatible)

### Required Environment Variables

Configure these in your `.env` file or Docker environment:

```bash
# n8n Configuration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=                        # Optional: API key for n8n REST API
N8N_USER=                           # Optional: Basic auth username
N8N_PASSWORD=                       # Optional: Basic auth password

# API Configuration (used by workflows)
API_BASE_URL=http://api:3001       # NestJS API endpoint
API_TOKEN=dev-token                 # Bearer token for API authentication

# Default Configuration (optional)
DEFAULT_INFLUENCER_ID=influencer-001
DEFAULT_DATASET_ID=ds_example

# Social Media API Credentials (for publish workflow)
INSTAGRAM_ACCESS_TOKEN=             # Instagram Graph API token
INSTAGRAM_ACCOUNT_ID=               # Instagram Business Account ID
TIKTOK_ACCESS_TOKEN=                # TikTok Content Posting API token
YOUTUBE_ACCESS_TOKEN=               # YouTube Data API v3 token
```

## Quick Start

### 1. Start Required Services

Using Docker Compose:

```bash
cd infra
docker compose up -d
```

This starts: postgres, redis, minio, n8n, api, worker, web

### 2. Import Workflows

#### Option A: Using NPM Scripts (Recommended)

```bash
cd apps/n8n

# Import all workflows
npm run import:all

# Import specific workflow
npm run import workflows/plan-generate.json
```

#### Option B: Using Shell Scripts

```bash
cd apps/n8n/scripts

# Import all workflows
./import.sh

# Import specific workflow
./import.sh ../workflows/plan-generate.json

# Show help
./import.sh --help
```

#### Option C: Manual Import via n8n UI

1. Open n8n: `http://localhost:5678`
2. Go to **Workflows** → **Import From File**
3. Select a workflow JSON file
4. Click **Import**

### 3. Configure Workflows

After import, each workflow needs configuration:

1. Open the workflow in n8n editor
2. Verify **Environment Variables** are set correctly:
   - `$env.API_BASE_URL`
   - `$env.API_TOKEN`
   - Platform-specific tokens (for publish workflow)
3. **Test** the workflow using "Test workflow" button
4. **Activate** the workflow if it has scheduled triggers

### 4. Test Workflows

See [TESTING.md](./TESTING.md) for detailed testing instructions.

## Workflow Documentation

### 1. Content Plan Generator (`plan-generate.json`)

**Purpose**: Generate content plans using OpenRouter API via NestJS backend.

**Triggers**:

- Manual trigger (for testing)
- Schedule trigger (Monday at 9 AM)

**Features**:

- Automatic retry on API errors (3 retries with exponential backoff)
- Error handling with detailed logging
- Configurable theme and target platforms

**Input Parameters** (set via manual trigger or schedule):

```json
{
  "influencerId": "influencer-001",
  "theme": "Weekly tech trends and AI tools",
  "targetPlatforms": ["instagram", "tiktok", "youtube"]
}
```

**Output**:

- Content plan ID
- Generated posts with captions and hashtags
- Execution logs

**Environment Variables Used**:

- `API_BASE_URL` - NestJS API endpoint
- `API_TOKEN` - Bearer token for authentication
- `DEFAULT_INFLUENCER_ID` - Fallback influencer ID

---

### 2. LoRA Training Job (`lora-train.json`)

**Purpose**: Enqueue LoRA training jobs and poll for completion.

**Triggers**:

- Manual trigger

**Features**:

- Job creation via `/jobs` endpoint
- Polling loop with 30-second intervals
- Maximum 1 hour execution (120 iterations)
- Automatic retry on job creation failures

**Input Parameters**:

```json
{
  "datasetId": "ds_123",
  "epochs": 10,
  "learningRate": 0.0001,
  "batchSize": 1,
  "resolution": 512,
  "networkDim": 32,
  "networkAlpha": 16,
  "modelName": "sd15",
  "priority": 5
}
```

**Output**:

- Job ID
- Final status (succeeded/failed/completed)
- Training result data
- Cost tracking (tokens used)

**Flow**:

1. Create job via `POST /jobs`
2. Wait 30 seconds
3. Poll job status via `GET /jobs/{id}`
4. Repeat until status is `succeeded`, `failed`, or `completed`
5. Log final result

---

### 3. Content Generation Pipeline (`content-run-pipeline.json`)

**Purpose**: Complete end-to-end content generation workflow.

**Triggers**:

- Manual trigger (for testing)
- Schedule trigger (Tuesday and Thursday at 10 AM)

**Features**:

- Multi-step pipeline with error handling
- Post-by-post processing (sequential)
- Job polling with 1-minute intervals
- Maximum 30 minutes per content job

**Pipeline Stages**:

1. **Create Content Plan**
   - Calls `POST /content-plans`
   - Validates plan has posts

2. **For Each Post**:
   - Create content generation job (`POST /jobs`)
   - Wait 1 minute
   - Poll job status (`GET /jobs/{id}`)
   - Repeat until complete

3. **Logging**:
   - Success: Asset ID and URL
   - Failure: Error stage and details

**Input Parameters**:

```json
{
  "influencerId": "influencer-001",
  "theme": "Daily tech news and creator tips",
  "targetPlatforms": ["instagram", "tiktok"]
}
```

**Output**:

- Plan ID
- Asset IDs for each generated content
- Asset URLs (MinIO S3 links)
- Execution logs per post

---

### 4. Social Media Publisher (`publish.json`)

**Purpose**: Publish content to social media platforms.

**Triggers**:

- Manual trigger
- Can be called by other workflows

**Features**:

- Channel routing (Instagram, TikTok, YouTube)
- Platform-specific formatting
- Mock implementation (requires API integration)

**Input Parameters**:

```json
{
  "assetId": "asset_123",
  "channel": "instagram",
  "caption": "Check out my latest content!",
  "hashtags": ["#content", "#creator"],
  "scheduledAt": "2025-01-15T10:00:00Z"
}
```

**Platform Notes**:

- **Instagram**: Uses Graph API (requires Business/Creator account)
  - Needs: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`
  - API: `https://graph.facebook.com/v18.0/{account-id}/media`

- **TikTok**: Uses Content Posting API (limited access)
  - Needs: `TIKTOK_ACCESS_TOKEN`
  - API: `https://open-api.tiktok.com/share/video/upload/`

- **YouTube**: Uses Data API v3 for Shorts
  - Needs: `YOUTUBE_ACCESS_TOKEN`
  - API: `https://www.googleapis.com/upload/youtube/v3/videos`

**Current Implementation**: Mock nodes that log publish actions. Replace with actual API calls when credentials are available.

---

### 5. ComfyUI Webhook Receiver (`webhook-comfyui.json`)

**Purpose**: Receive rendering completion callbacks from ComfyUI.

**Triggers**:

- Webhook: `POST /webhook/comfyui-callback`

**Features**:

- Webhook payload validation
- Job status update via PATCH `/jobs/{id}`
- Error handling for invalid payloads
- Automatic retry on API failures

**Expected Webhook Payload**:

```json
{
  "jobId": "job_123",
  "status": "success",
  "outputPath": "/data/outputs/render_001.mp4",
  "error": null
}
```

**Flow**:

1. Receive webhook POST
2. Parse and validate payload
3. Map render status to job status
4. Update job via `PATCH /jobs/{id}`
5. Log result

**Webhook URL** (with cloudflared tunnel):

```
https://your-tunnel.trycloudflare.com/webhook/comfyui-callback
```

**Testing**: See [TESTING.md](./TESTING.md) for webhook testing with curl.

---

## Import/Export Scripts

### Import Workflows

The import script uploads workflow JSON files to n8n via REST API.

**Usage**:

```bash
# Import all workflows from workflows/ directory
node scripts/import-workflows.js

# Import specific workflow(s)
node scripts/import-workflows.js workflows/plan-generate.json
node scripts/import-workflows.js file1.json file2.json

# Using shell wrapper
./scripts/import.sh
./scripts/import.sh workflows/plan-generate.json

# Using NPM
npm run import:all
npm run import workflows/plan-generate.json
```

**Features**:

- Detects existing workflows by name
- Updates existing workflows instead of duplicating
- Validates workflow structure before import
- Connection testing before import
- Detailed error reporting

**Environment Variables**:

- `N8N_BASE_URL` - n8n server URL (default: `http://localhost:5678`)
- `N8N_API_KEY` - API key for authentication (optional)
- `N8N_USER` - Username for basic auth (optional)
- `N8N_PASSWORD` - Password for basic auth (optional)

---

### Export Workflows

The export script downloads workflows from n8n via REST API.

**Usage**:

```bash
# Export all workflows
node scripts/export-workflows.js --all

# Export specific workflow by ID
node scripts/export-workflows.js <workflow-id>

# Using shell wrapper
./scripts/export.sh --all
./scripts/export.sh <workflow-id>

# Using NPM
npm run export:all
```

**Features**:

- Cleans server-generated fields (id, createdAt, updatedAt)
- Generates safe filenames from workflow names
- Creates `workflows/` directory if missing
- Overwrites existing files (version control friendly)

**Output Format**:

- Files saved to `workflows/` directory
- Filename format: `workflow-name.json` (kebab-case)
- Pretty-printed JSON (2-space indentation)

---

## Error Handling

All workflows include production-ready error handling:

### Retry Logic

**HTTP Request Nodes**:

- Max retries: 3
- Retry on status codes: `429, 500, 502, 503, 504`
- Wait between retries: 2-3 seconds (exponential backoff)
- Timeout: 10-60 seconds (depending on operation)

### Error Output

**Configuration**:

- `onError: "continueErrorOutput"` on all HTTP nodes
- Errors flow to dedicated error logging nodes
- Errors don't stop the entire workflow

### Conditional Error Checks

**If Nodes**:

- Validate response structure before proceeding
- Check for required fields (`id`, `status`, etc.)
- Route errors to logging branch

### Logging

**Log Nodes** (Set nodes) include:

- `level`: `info`, `warning`, `error`
- `message`: Human-readable description
- `timestamp`: ISO 8601 format
- Error details: Original error message and code

---

## Monitoring and Observability

### Execution Logs

View workflow executions in n8n UI:

1. Go to **Executions** tab
2. Filter by workflow name
3. Click execution to see detailed logs

### Job Status Tracking

Query jobs via API:

```bash
# List all jobs
curl http://localhost:3001/jobs

# Get specific job
curl http://localhost:3001/jobs/<job-id>

# Filter by status
curl "http://localhost:3001/jobs?status=running"

# Filter by type
curl "http://localhost:3001/jobs?type=lora-training"
```

### Queue Monitoring

Check BullMQ queue status:

```bash
curl http://localhost:3001/queues/summary
```

Returns:

```json
{
  "active": 2,
  "waiting": 5,
  "failed": 1
}
```

---

## Scheduling

Workflows can run on schedules using **Schedule Trigger** nodes.

### Current Schedules

| Workflow               | Schedule       | Cron Expression | Description       |
| ---------------------- | -------------- | --------------- | ----------------- |
| Content Plan Generator | Monday 9 AM    | `0 9 * * 1`     | Weekly planning   |
| Content Pipeline       | Tue, Thu 10 AM | `0 10 * * 2,4`  | Bi-weekly content |

### Modifying Schedules

1. Open workflow in n8n editor
2. Click **Schedule Trigger** node
3. Edit **Cron Expression**
4. Click **Save**
5. **Activate** workflow

**Cron Format**: `minute hour day month weekday`

Examples:

- `0 9 * * 1` - Monday at 9:00 AM
- `0 10 * * 2,4` - Tuesday and Thursday at 10:00 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight

---

## Webhook Configuration

### Local Development

For local testing, webhooks are accessible at:

```
http://localhost:5678/webhook/comfyui-callback
```

### Production (with cloudflared tunnel)

1. Install cloudflared: `https://github.com/cloudflare/cloudflared`

2. Start tunnel:

   ```bash
   cloudflared tunnel --url http://localhost:5678
   ```

3. Copy the generated URL (e.g., `https://random-name.trycloudflare.com`)

4. Use webhook URL:

   ```
   https://random-name.trycloudflare.com/webhook/comfyui-callback
   ```

5. Configure ComfyUI to send callbacks to this URL

### Webhook Security

**Current**: No authentication (development only)

**Production Recommendations**:

1. Add webhook signature verification
2. Use API key in query parameter or header
3. Implement IP whitelisting
4. Use HTTPS with valid certificate

---

## Troubleshooting

### Import Fails with "Connection refused"

**Cause**: n8n is not running or wrong URL

**Solution**:

```bash
# Check n8n is running
docker ps | grep n8n

# Start n8n if needed
cd infra && docker compose up -d n8n

# Verify URL
curl http://localhost:5678/healthz
```

---

### API Returns 401 Unauthorized

**Cause**: Missing or invalid `API_TOKEN`

**Solution**:

1. Check environment variables in n8n container:

   ```bash
   docker exec -it <n8n-container> env | grep API_TOKEN
   ```

2. Update `.env` file:

   ```bash
   API_TOKEN=dev-token
   ```

3. Restart n8n:
   ```bash
   docker compose restart n8n
   ```

---

### Workflow Execution Times Out

**Cause**: Long-running jobs exceed workflow timeout

**Solution**:

1. Open workflow in n8n editor
2. Click **Workflow Settings** (gear icon)
3. Set **Execution Timeout**: `3600` (1 hour) or higher
4. Save and re-run

---

### Job Stuck in "running" Status

**Cause**: Worker crashed or job failed without updating status

**Solution**:

1. Check worker logs:

   ```bash
   docker logs <worker-container>
   ```

2. Manually update job status:

   ```bash
   curl -X PATCH http://localhost:3001/jobs/<job-id> \
     -H "Content-Type: application/json" \
     -d '{"status": "failed"}'
   ```

3. Restart worker:
   ```bash
   docker compose restart worker
   ```

---

### Webhook Not Receiving Callbacks

**Cause**: ComfyUI can't reach webhook URL

**Solution**:

1. Verify webhook is active in n8n:
   - Open workflow
   - Check "Listening for test event" message

2. Test webhook locally:

   ```bash
   curl -X POST http://localhost:5678/webhook/comfyui-callback \
     -H "Content-Type: application/json" \
     -d '{"jobId": "test", "status": "success", "outputPath": "/test"}'
   ```

3. For external webhooks, use cloudflared tunnel (see above)

---

## API Endpoint Reference

### Content Plans

```bash
# Create content plan
POST /content-plans
{
  "influencerId": "string",
  "theme": "string",
  "targetPlatforms": ["instagram", "tiktok", "youtube"]
}

# Get content plan
GET /content-plans/:id

# List content plans
GET /content-plans?influencerId=string&take=20&skip=0
```

### Jobs

```bash
# Create job
POST /jobs
{
  "type": "content-generation" | "lora-training" | "video-generation",
  "payload": object,
  "priority": number (1-10)
}

# Get job
GET /jobs/:id

# List jobs
GET /jobs?status=string&type=string&take=20&skip=0

# Update job
PATCH /jobs/:id
{
  "status": "pending" | "running" | "succeeded" | "failed" | "completed",
  "result": object,
  "costTok": number
}
```

### Queue Status

```bash
# Get queue summary
GET /queues/summary
```

---

## Best Practices

### 1. Version Control

- **Commit workflows** after changes via n8n UI
- **Export workflows** regularly: `npm run export:all`
- **Review diffs** before committing to catch unintended changes

### 2. Testing

- **Test manually** before activating scheduled workflows
- **Use mock data** during development
- **Monitor executions** in n8n UI after activation

### 3. Error Handling

- **Never ignore errors** - always log and investigate
- **Set up alerts** for failed executions (n8n can send notifications)
- **Monitor job costs** to prevent unexpected OpenRouter charges

### 4. Security

- **Never commit** API tokens or credentials
- **Use environment variables** for all sensitive data
- **Rotate tokens** regularly
- **Limit API token scopes** to minimum required permissions

### 5. Performance

- **Avoid polling** where possible - use webhooks
- **Limit concurrent jobs** to prevent resource exhaustion
- **Use job priorities** to manage queue order
- **Set execution timeouts** to prevent runaway workflows

---

## Migration from Templates

If you were using the old template files (`*.template.json`):

1. **Export your configured workflows** from n8n UI
2. **Compare with new production workflows** to identify customizations
3. **Merge customizations** into new workflows
4. **Import new workflows** using scripts above
5. **Test thoroughly** before activating
6. **Remove old templates** (kept for reference)

---

## Contributing

When adding new workflows:

1. **Create workflow** in n8n UI
2. **Test thoroughly** with various scenarios
3. **Export workflow**: `npm run export:all`
4. **Document workflow** in this README
5. **Add testing instructions** to TESTING.md
6. **Commit changes** with descriptive message

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review [n8n documentation](https://docs.n8n.io/)
3. Check NestJS API logs: `docker logs <api-container>`
4. Check worker logs: `docker logs <worker-container>`
5. Open issue in repository with full error details

---

## License

UNLICENSED - Internal use only for InfluencerAI project.
