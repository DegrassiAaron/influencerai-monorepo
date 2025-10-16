# n8n Workflows Testing Guide

This document provides comprehensive testing instructions for all n8n workflows.

## Prerequisites

Before testing, ensure all services are running:

```bash
cd infra
docker compose up -d

# Verify all services are healthy
docker compose ps
```

Expected output:
```
NAME                 STATUS
postgres             Up (healthy)
redis                Up (healthy)
minio                Up (healthy)
n8n                  Up
api                  Up
worker               Up
web                  Up
```

## Testing Environment Setup

### 1. Import Workflows

```bash
cd apps/n8n
npm run import:all
```

Verify import success:
```
✓ Created workflow "Content Plan Generator" (ID: 1)
✓ Created workflow "LoRA Training Job" (ID: 2)
✓ Created workflow "Content Generation Pipeline" (ID: 3)
✓ Created workflow "Social Media Publisher" (ID: 4)
✓ Created workflow "ComfyUI Webhook Receiver" (ID: 5)
```

### 2. Verify Environment Variables

Check n8n container environment:

```bash
docker exec -it <n8n-container-name> env | grep -E 'API_BASE_URL|API_TOKEN'
```

Expected output:
```
API_BASE_URL=http://api:3001
API_TOKEN=dev-token
```

If missing, update `.env` file and restart:

```bash
echo "API_BASE_URL=http://api:3001" >> .env
echo "API_TOKEN=dev-token" >> .env
docker compose restart n8n
```

### 3. Verify API is Accessible

From n8n container:

```bash
docker exec -it <n8n-container-name> curl http://api:3001/health
```

Expected output:
```json
{"status":"ok"}
```

## Test Cases

---

## 1. Content Plan Generator (`plan-generate.json`)

### Test 1.1: Manual Trigger with Default Parameters

**Objective**: Verify content plan creation with default configuration.

**Steps**:

1. Open n8n: `http://localhost:5678`
2. Navigate to **Content Plan Generator** workflow
3. Click **Execute Workflow** (play button)
4. Wait for execution to complete (~10-30 seconds)

**Expected Results**:

✓ Workflow completes successfully (green checkmarks on all nodes)
✓ "Create Content Plan" node returns:
```json
{
  "id": "clxxxxx...",
  "influencerId": "influencer-001",
  "theme": "Weekly tech trends and AI tools for content creators",
  "targetPlatforms": ["instagram", "tiktok", "youtube"],
  "posts": [
    {
      "caption": "Generated caption...",
      "hashtags": ["#tech", "#ai", "..."]
    }
  ],
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```
✓ "Log Success" node shows:
```json
{
  "message": "Content plan created successfully",
  "level": "info",
  "planId": "clxxxxx...",
  "postCount": 3,
  "timestamp": "2025-01-15T10:00:05.000Z"
}
```

**Verification**:

Query the API to confirm plan was saved:

```bash
curl http://localhost:3001/content-plans/<plan-id>
```

---

### Test 1.2: Manual Trigger with Custom Parameters

**Objective**: Verify workflow accepts and processes custom input.

**Steps**:

1. Open **Content Plan Generator** workflow
2. Click **Manual Trigger** node
3. Click **Execute Node** (test node)
4. In the "Set Plan Payload" node, edit the test data:
   ```json
   {
     "theme": "AI art generation for beginners",
     "targetPlatforms": ["instagram"]
   }
   ```
5. Click **Execute Workflow**

**Expected Results**:

✓ Workflow uses custom theme
✓ Plan targets only Instagram platform
✓ Posts are relevant to "AI art generation"

---

### Test 1.3: Error Handling - API Unavailable

**Objective**: Verify workflow handles API errors gracefully.

**Steps**:

1. Stop the API container:
   ```bash
   docker stop <api-container-name>
   ```
2. Execute the workflow
3. Observe error handling
4. Restart API:
   ```bash
   docker start <api-container-name>
   ```

**Expected Results**:

✓ "Create Content Plan" node fails after 3 retries
✓ Error flows to "Log Error" node
✓ Error log contains:
```json
{
  "message": "Failed to create content plan",
  "level": "error",
  "errorCode": "ECONNREFUSED",
  "errorDetail": "connect ECONNREFUSED ..."
}
```
✓ Workflow completes (doesn't hang)

---

### Test 1.4: Scheduled Execution

**Objective**: Verify workflow can be scheduled.

**Steps**:

1. Open **Content Plan Generator** workflow
2. **Activate** workflow (toggle in top-right)
3. Verify "Schedule Trigger" is listening
4. Wait for next Monday at 9 AM (or modify cron for testing)

**Alternative** (for immediate testing):

1. Edit "Schedule Trigger" node
2. Change cron to `*/5 * * * *` (every 5 minutes)
3. Save and activate
4. Wait 5 minutes
5. Check **Executions** tab for automatic run

**Expected Results**:

✓ Workflow executes automatically on schedule
✓ Execution appears in **Executions** tab
✓ Content plan is created successfully

---

## 2. LoRA Training Job (`lora-train.json`)

### Test 2.1: Create Training Job with Default Parameters

**Objective**: Verify job creation and polling loop.

**Steps**:

1. Open **LoRA Training Job** workflow
2. Click **Execute Workflow**
3. Observe job creation and polling

**Expected Results**:

✓ "Create LoRA Training Job" returns:
```json
{
  "id": "job_xxx",
  "type": "lora-training",
  "status": "pending",
  "payload": {
    "datasetId": "ds_example",
    "epochs": 10,
    "learningRate": 0.0001,
    ...
  }
}
```
✓ "Save Job ID" node extracts job ID
✓ Polling loop starts
✓ "Poll Job Status" queries API every 30 seconds

**Note**: Job will remain in "pending" status until worker processes it. For testing, you can manually update job status:

```bash
curl -X PATCH http://localhost:3001/jobs/<job-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{"status": "succeeded", "result": {"outputPath": "/test/lora.safetensors"}}'
```

After manual update:
✓ Next poll detects "succeeded" status
✓ Loop exits
✓ "Log Job Complete" shows final status

---

### Test 2.2: Custom Training Parameters

**Objective**: Verify custom parameters are passed to job.

**Steps**:

1. Open workflow
2. Edit "Set LoRA Job Payload" node test data:
   ```json
   {
     "datasetId": "ds_custom",
     "epochs": 20,
     "learningRate": 0.0002,
     "batchSize": 2,
     "priority": 8
   }
   ```
3. Execute workflow

**Expected Results**:

✓ Job payload contains custom parameters
✓ Priority is set to 8
✓ Job is created successfully

**Verification**:

```bash
curl http://localhost:3001/jobs/<job-id>
```

Check payload matches custom parameters.

---

### Test 2.3: Job Polling Timeout

**Objective**: Verify workflow doesn't run indefinitely.

**Steps**:

1. Create a job that never completes (leave in "pending")
2. Execute workflow
3. Let it run for 1 hour (or speed up for testing)

**Expected Results**:

✓ Polling loop runs max 120 iterations
✓ After 1 hour, workflow stops polling
✓ Last status is logged

**Speed up for testing**:
- Edit "Wait Before Polling" to 5 seconds
- Edit "Loop Until Complete" maxIterations to 5
- Job should timeout after 25 seconds (5 iterations × 5 seconds)

---

## 3. Content Generation Pipeline (`content-run-pipeline.json`)

### Test 3.1: Full Pipeline Execution

**Objective**: Test complete content generation flow.

**Steps**:

1. Open **Content Generation Pipeline** workflow
2. Click **Execute Workflow**
3. Monitor progress through all stages

**Expected Results**:

**Stage 1: Create Content Plan**
✓ Plan created with 3+ posts
✓ Plan data saved

**Stage 2: Split Posts**
✓ Posts array split into individual items
✓ Loop processes one post at a time

**Stage 3: Create Content Jobs**
✓ For each post, creates a "content-generation" job
✓ Job includes planId, postIndex, caption, hashtags

**Stage 4: Poll Content Jobs**
✓ Each job is polled every 60 seconds
✓ Polling continues until job status is "succeeded" or "completed"

**Stage 5: Log Results**
✓ Asset ID and URL logged for each successful post
✓ Errors logged for failed posts

**Full Execution Time**: ~3-10 minutes (depending on content generation speed)

---

### Test 3.2: Pipeline with Single Platform

**Objective**: Verify pipeline works with reduced scope.

**Steps**:

1. Edit "Set Pipeline Config" test data:
   ```json
   {
     "influencerId": "influencer-001",
     "theme": "Quick tech tip",
     "targetPlatforms": ["instagram"]
   }
   ```
2. Execute workflow

**Expected Results**:

✓ Plan created for Instagram only
✓ Fewer posts generated (1-2 instead of 3-6)
✓ Faster execution

---

### Test 3.3: Error Handling - Plan Creation Fails

**Objective**: Verify pipeline stops gracefully if plan creation fails.

**Steps**:

1. Stop API temporarily
2. Execute workflow
3. Observe error handling
4. Restart API

**Expected Results**:

✓ "Step 1: Create Content Plan" fails
✓ "Check Plan Success" routes to "Log Pipeline Error"
✓ Error logged with stage: "plan-creation"
✓ Workflow stops (doesn't proceed to job creation)

---

### Test 3.4: Scheduled Pipeline Execution

**Objective**: Verify scheduled content generation.

**Steps**:

1. Activate workflow
2. For testing, edit "Schedule Trigger" to run soon (e.g., `*/10 * * * *` for every 10 minutes)
3. Wait for scheduled execution

**Expected Results**:

✓ Workflow runs automatically on schedule
✓ Multiple posts generated
✓ Executions visible in **Executions** tab

---

## 4. Social Media Publisher (`publish.json`)

### Test 4.1: Instagram Publishing (Mock)

**Objective**: Verify Instagram routing and formatting.

**Steps**:

1. Open **Social Media Publisher** workflow
2. Edit "Manual Trigger" test data:
   ```json
   {
     "assetId": "asset_test_001",
     "channel": "instagram",
     "caption": "My awesome AI-generated content!",
     "hashtags": ["#ai", "#art", "#tech"]
   }
   ```
3. Execute workflow

**Expected Results**:

✓ "Route by Channel" outputs to Instagram branch
✓ "Prepare Instagram Post" formats caption:
```
My awesome AI-generated content!

#ai #art #tech
```
✓ "Mock Instagram Publish" shows:
```json
{
  "publishStatus": "mock_success",
  "message": "Instagram publish would execute here...",
  "assetId": "asset_test_001"
}
```

---

### Test 4.2: TikTok Publishing (Mock)

**Objective**: Verify TikTok routing and formatting.

**Steps**:

1. Edit test data with `"channel": "tiktok"`
2. Execute workflow

**Expected Results**:

✓ Routes to TikTok branch
✓ Caption formatted for TikTok
✓ Mock publish logged

---

### Test 4.3: YouTube Publishing (Mock)

**Objective**: Verify YouTube routing and formatting.

**Steps**:

1. Edit test data with `"channel": "youtube"`
2. Execute workflow

**Expected Results**:

✓ Routes to YouTube branch
✓ Title limited to 100 characters
✓ Description includes caption + hashtags
✓ Mock publish logged

---

### Test 4.4: Multiple Platforms

**Objective**: Verify workflow can handle multiple channels.

**Steps**:

1. Execute workflow 3 times with different channels
2. Verify each routes correctly

**Expected Results**:

✓ All three platforms can be published to
✓ Formatting is platform-specific
✓ No errors

**Note**: For actual publishing, replace mock nodes with real API calls:

**Instagram**:
```javascript
// In HTTP Request node
POST https://graph.facebook.com/v18.0/{{$env.INSTAGRAM_ACCOUNT_ID}}/media
Headers: Authorization: Bearer {{$env.INSTAGRAM_ACCESS_TOKEN}}
Body: {
  "image_url": "<asset-url>",
  "caption": "{{$json.caption}}"
}
```

**TikTok**: Requires Content Posting API access (application required)

**YouTube**: Use resumable upload with Data API v3

---

## 5. ComfyUI Webhook Receiver (`webhook-comfyui.json`)

### Test 5.1: Successful Rendering Callback

**Objective**: Verify webhook receives and processes success payload.

**Steps**:

1. Open **ComfyUI Webhook Receiver** workflow
2. Activate workflow (webhook must be active to receive requests)
3. Note the webhook URL (shown in workflow)
4. Create a test job:
   ```bash
   curl -X POST http://localhost:3001/jobs \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer dev-token" \
     -d '{
       "type": "video-generation",
       "payload": {"test": true}
     }'
   ```
5. Copy the job ID from response
6. Send webhook callback:
   ```bash
   curl -X POST http://localhost:5678/webhook/comfyui-callback \
     -H "Content-Type: application/json" \
     -d '{
       "jobId": "<job-id>",
       "status": "success",
       "outputPath": "/data/outputs/test-render.mp4"
     }'
   ```

**Expected Results**:

✓ Webhook receives POST request
✓ "Parse Webhook Data" extracts:
  - `jobId`: `<job-id>`
  - `renderStatus`: `success`
  - `outputPath`: `/data/outputs/test-render.mp4`
✓ "Validate Webhook" passes (has job ID and valid status)
✓ "Map to Job Update" converts `success` → `succeeded`
✓ "Update Job Status" PATCHes job with:
```json
{
  "status": "succeeded",
  "result": {
    "outputPath": "/data/outputs/test-render.mp4",
    "renderStatus": "success",
    "receivedAt": "2025-01-15T10:00:00.000Z"
  }
}
```
✓ "Log Webhook Success" logs completion

**Verification**:

```bash
curl http://localhost:3001/jobs/<job-id>
```

Check job status is now "succeeded" and result contains output path.

---

### Test 5.2: Failed Rendering Callback

**Objective**: Verify webhook handles failure status.

**Steps**:

1. Create test job (same as above)
2. Send failure webhook:
   ```bash
   curl -X POST http://localhost:5678/webhook/comfyui-callback \
     -H "Content-Type: application/json" \
     -d '{
       "jobId": "<job-id>",
       "status": "failed",
       "error": "GPU out of memory"
     }'
   ```

**Expected Results**:

✓ Webhook received
✓ Status mapped to "failed"
✓ Job updated with status "failed"
✓ Error message included in result

---

### Test 5.3: Invalid Webhook Payload

**Objective**: Verify webhook rejects malformed requests.

**Steps**:

1. Send invalid payload (missing job ID):
   ```bash
   curl -X POST http://localhost:5678/webhook/comfyui-callback \
     -H "Content-Type: application/json" \
     -d '{
       "status": "success"
     }'
   ```

**Expected Results**:

✓ "Validate Webhook" fails (no job ID)
✓ Routes to "Log Webhook Invalid"
✓ Warning logged with payload details
✓ No API call made (job not updated)

---

### Test 5.4: Webhook with Authentication

**Objective**: Test webhook security (future enhancement).

**Current Status**: Webhook accepts any request (no auth)

**Future Implementation**:

Add signature verification:

```javascript
// In "Parse Webhook Data" node
const signature = $('Webhook Trigger').item.json.headers['x-signature'];
const secret = $env.WEBHOOK_SECRET;
const payload = JSON.stringify($json.body);
const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

---

## Integration Testing

### End-to-End Test: Plan → Generate → Publish

**Objective**: Test complete workflow from planning to publishing.

**Steps**:

1. **Create Plan**:
   - Execute "Content Plan Generator"
   - Note plan ID

2. **Generate Content**:
   - Execute "Content Generation Pipeline" with plan ID
   - Wait for all jobs to complete
   - Note asset IDs

3. **Publish Content**:
   - For each asset ID, execute "Social Media Publisher"
   - Verify publish logs

**Expected Results**:

✓ Plan created with 3+ posts
✓ Content generated for each post
✓ Assets stored in MinIO
✓ Publishing workflow completes for all platforms

**Total Time**: ~10-30 minutes

---

### Test with Real Worker Processing

**Objective**: Verify jobs are actually processed by worker.

**Prerequisites**: Worker must be running and configured correctly.

**Steps**:

1. Verify worker is running:
   ```bash
   docker logs -f <worker-container-name>
   ```

2. Execute "LoRA Training Job" or "Content Generation Pipeline"

3. Monitor worker logs for job processing:
   ```
   [Worker] Processing job: job_xxx (type: lora-training)
   [Worker] Job job_xxx completed successfully
   ```

4. Verify job status updates in workflow

**Expected Results**:

✓ Worker picks up job from queue
✓ Worker processes job (may take minutes to hours for LoRA)
✓ Worker updates job status to "succeeded" or "failed"
✓ Workflow polling loop detects status change
✓ Workflow completes with final status

---

## API Stub Testing

For testing without actual AI generation, you can create API stubs.

### Stub Server Setup

Create `apps/api/src/stubs/content-stub.controller.ts`:

```typescript
import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';

@Controller('stubs')
export class StubController {
  private jobs = new Map();
  private jobCounter = 0;

  @Post('jobs')
  createJob(@Body() dto: any) {
    const jobId = `stub_job_${++this.jobCounter}`;
    this.jobs.set(jobId, {
      id: jobId,
      ...dto,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // Auto-complete after 5 seconds
    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'succeeded';
        job.result = {
          assetId: `asset_${jobId}`,
          url: `http://minio:9000/assets/${jobId}.mp4`,
        };
      }
    }, 5000);

    return this.jobs.get(jobId);
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.jobs.get(id) || { error: 'Job not found' };
  }

  @Patch('jobs/:id')
  updateJob(@Param('id') id: string, @Body() dto: any) {
    const job = this.jobs.get(id);
    if (!job) return { error: 'Job not found' };

    Object.assign(job, dto);
    return job;
  }
}
```

Register in `app.module.ts` and use `/stubs/jobs` endpoint in workflows for instant testing.

---

## Performance Testing

### Load Test: Multiple Concurrent Workflows

**Objective**: Verify system handles concurrent workflow executions.

**Steps**:

1. Activate all workflows
2. Trigger multiple executions simultaneously:
   - Plan generation × 3
   - Content pipeline × 2
   - LoRA training × 1

3. Monitor system resources:
   ```bash
   docker stats
   ```

4. Check for:
   - CPU usage
   - Memory usage
   - Queue depth
   - API response times

**Expected Results**:

✓ All workflows complete successfully
✓ No system crashes
✓ Queue processes jobs in order
✓ Response times remain acceptable (<5s for API calls)

---

## Regression Testing Checklist

Before releasing workflow changes:

- [ ] All workflows import successfully
- [ ] Manual triggers work for all workflows
- [ ] Scheduled triggers activate correctly
- [ ] Error handling works (API down, invalid input)
- [ ] Job polling completes successfully
- [ ] Webhooks receive and process callbacks
- [ ] Logs are informative and complete
- [ ] No sensitive data in logs
- [ ] Environment variables work across all nodes
- [ ] Retry logic triggers on failures
- [ ] Timeouts are reasonable
- [ ] Export produces valid JSON files

---

## Common Issues and Solutions

### Issue: Workflow shows "Waiting for webhook call"

**Cause**: Webhook trigger is listening but not activated.

**Solution**: Activate workflow or click "Listen for test event".

---

### Issue: "Cannot read property 'json' of undefined"

**Cause**: Referencing data from previous node that didn't execute.

**Solution**: Check node connections and ensure previous nodes completed successfully.

---

### Issue: HTTP Request returns 404

**Cause**: Wrong API endpoint or API not running.

**Solution**:
1. Verify API is running: `docker ps`
2. Check endpoint in HTTP Request node matches API routes
3. Test endpoint directly: `curl http://localhost:3001/<endpoint>`

---

### Issue: Polling loop never exits

**Cause**: Job status never changes to terminal state.

**Solution**:
1. Check worker is processing jobs: `docker logs <worker>`
2. Manually update job status via API
3. Verify polling condition checks correct status values

---

## Next Steps

After completing testing:

1. **Document Issues**: Create tickets for any bugs found
2. **Update Workflows**: Apply fixes and improvements
3. **Export Changes**: `npm run export:all`
4. **Commit to Git**: Version control updated workflows
5. **Deploy to Production**: Follow deployment checklist

---

## Support

For testing issues:

1. Check workflow execution logs in n8n UI
2. Check API logs: `docker logs <api-container>`
3. Check worker logs: `docker logs <worker-container>`
4. Review this testing guide
5. Open issue with full error details and steps to reproduce

---

## Appendix: Test Data

### Sample Influencer Profile

```json
{
  "id": "influencer-001",
  "name": "AI Art Creator",
  "persona": {
    "style": "tech-focused",
    "tone": "friendly and educational",
    "topics": ["AI art", "creative tools", "tutorials"]
  },
  "platforms": ["instagram", "tiktok", "youtube"]
}
```

### Sample Dataset

```json
{
  "id": "ds_example",
  "name": "Portrait Dataset",
  "path": "/data/datasets/portraits",
  "imageCount": 50,
  "captioned": true
}
```

### Sample Content Plan

```json
{
  "influencerId": "influencer-001",
  "theme": "AI tools for creators",
  "targetPlatforms": ["instagram", "tiktok"],
  "posts": [
    {
      "caption": "Try this amazing AI art generator!",
      "hashtags": ["#aiart", "#midjourney", "#digitalart"]
    },
    {
      "caption": "5 tips for better AI-generated portraits",
      "hashtags": ["#aitips", "#portrait", "#creator"]
    }
  ]
}
```

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0
