# n8n Pipeline Workflow Implementation Guide

**Issue**: #178 - End-to-End LoRA Training to Content Generation Pipeline
**Status**: Phase 1 Complete (Backend API + Schemas)
**Next Phase**: n8n Workflow Visual Implementation

---

## Overview

This guide provides the complete blueprint for implementing the n8n workflows in the visual editor. The backend API is fully implemented and tested - this document describes how to create the n8n workflows that orchestrate the pipeline.

**Architecture**: Hybrid approach with reusable notification sub-workflow
- **Main Workflow**: `lora-to-content-pipeline.json` (~40-50 nodes)
- **Notification Sub-Workflow**: `notification-sender.json` (~10 nodes)
- **Error Handler**: `pipeline-error-handler.json` (~6 nodes)

---

## Prerequisites

### Backend API Endpoints (✅ Implemented)

All endpoints are available at `$env.API_BASE_URL` (default: `http://api:3001`):

- **POST /pipelines** - Initialize pipeline execution tracking
- **GET /pipelines/:executionId** - Get pipeline progress
- **PATCH /pipelines/:executionId** - Update pipeline state
- **POST /jobs** - Create async jobs (training, image gen, video gen)
- **GET /jobs/:id** - Poll job status

### Environment Variables Required

Configure in n8n settings or docker-compose.yml:

```bash
# Core API Integration
API_BASE_URL=http://api:3001
API_TOKEN=dev-token-change-in-production

# Timeout Configuration
MAX_TRAINING_TIMEOUT_MS=3600000      # 1 hour
MAX_IMAGE_GEN_TIMEOUT_MS=600000      # 10 minutes
MAX_VIDEO_GEN_TIMEOUT_MS=1200000     # 20 minutes

# Polling Intervals (seconds)
TRAINING_POLL_INTERVAL_SEC=30
IMAGE_POLL_INTERVAL_SEC=15
VIDEO_POLL_INTERVAL_SEC=15

# Max Iterations (timeout protection)
TRAINING_MAX_ITERATIONS=120          # 120 × 30s = 1 hour
IMAGE_MAX_ITERATIONS=40              # 40 × 15s = 10 min
VIDEO_MAX_ITERATIONS=80              # 80 × 15s = 20 min

# Notifications
WEBHOOK_NOTIFICATION_URL=https://your-app.com/api/webhooks/pipeline-progress
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Security
PIPELINE_WEBHOOK_SECRET=your-secret-token-here
```

---

## Workflow 1: Main Pipeline (`lora-to-content-pipeline.json`)

### Stage 0: Webhook Trigger + Validation (6 nodes)

**Node 1: Webhook Trigger**
- Type: `Webhook`
- Settings:
  - Path: `/start-lora-pipeline`
  - Method: `POST`
  - Authentication: `Header Auth`
  - Header Name: `Authorization`
  - Header Value: `$env.PIPELINE_WEBHOOK_SECRET`
  - Response Mode: `When Last Node Finishes`

**Node 2: Validate Payload (Code Node)**
```javascript
// Validate required fields
const payload = $input.first().json;

const required = ['datasetId', 'trainingName', 'influencerId'];
const missing = required.filter(field => !payload[field]);

if (missing.length > 0) {
  throw new Error(`Missing required fields: ${missing.join(', ')}`);
}

// Validate trainingName format
if (!/^[a-zA-Z0-9-_]+$/.test(payload.trainingName)) {
  throw new Error('trainingName must be alphanumeric with hyphens/underscores only');
}

// Set defaults
return [{
  json: {
    ...payload,
    testPrompts: payload.testPrompts || ['portrait photo of a woman'],
    generateVideo: payload.generateVideo ?? false,
    notificationChannels: payload.notificationChannels || ['webhook'],
    totalStages: 6,
    dryRun: payload.dryRun ?? false,
  }
}];
```

**Node 3: Initialize Pipeline Tracking**
- Type: `HTTP Request`
- Method: `POST`
- URL: `={{ $env.API_BASE_URL }}/pipelines`
- Headers:
  - `Authorization`: `Bearer {{ $env.API_TOKEN }}`
  - `Content-Type`: `application/json`
- Body (JSON):
```json
{
  "executionId": "={{ $execution.id }}",
  "workflowId": "={{ $workflow.id }}",
  "status": "STARTED",
  "payload": "={{ $json }}",
  "totalStages": 6
}
```
- On Error: `continueErrorOutput`
- Retry: 3 attempts, 2s wait

**Node 4: Update Status - Validating**
- Type: `HTTP Request`
- Method: `PATCH`
- URL: `={{ $env.API_BASE_URL }}/pipelines/{{ $execution.id }}`
- Body:
```json
{
  "status": "VALIDATING",
  "currentStage": "Payload Validation",
  "stagesCompleted": 1,
  "progressPercent": 16
}
```

---

### Stage 1: LoRA Training (10 nodes)

**Node 5: Create Training Job**
- Type: `HTTP Request`
- Method: `POST`
- URL: `={{ $env.API_BASE_URL }}/jobs`
- Body:
```json
{
  "type": "lora-training",
  "payload": {
    "datasetId": "={{ $json.datasetId }}",
    "name": "={{ $json.trainingName }}",
    "epochs": "={{ $json.epochs || 10 }}",
    "learningRate": "={{ $json.learningRate || 0.0001 }}",
    "resolution": "={{ $json.resolution || 512 }}",
    "dryRun": "={{ $json.dryRun }}"
  }
}
```
- Store in variable: `$node.trainingJob`

**Node 6: Update Status - Training Started**
- Type: `HTTP Request`
- Method: `PATCH`
- URL: `={{ $env.API_BASE_URL }}/pipelines/{{ $execution.id }}`
- Body:
```json
{
  "status": "TRAINING",
  "currentStage": "LoRA Training",
  "trainingJobId": "={{ $node.trainingJob.json.id }}",
  "stagesCompleted": 1,
  "progressPercent": 16
}
```

**Node 7: Poll Training Job (Loop Node)**
- Type: `splitInBatches`
- Batch Size: `1`
- Input: Single item array `[{ jobId: "{{ $node.trainingJob.json.id }}" }]`

**Node 8: Wait Before Polling**
- Type: `Wait`
- Amount: `={{ $env.TRAINING_POLL_INTERVAL_SEC || 30 }}`
- Unit: `seconds`

**Node 9: Check Job Status**
- Type: `HTTP Request`
- Method: `GET`
- URL: `={{ $env.API_BASE_URL }}/jobs/{{ $json.jobId }}`

**Node 10: Evaluate Job Finished**
- Type: `IF`
- Condition: `={{ $json.status === 'succeeded' || $json.status === 'failed' }}`
- If `false`: Loop back to Node 7 (max {{ $env.TRAINING_MAX_ITERATIONS }} iterations)
- If `true`: Continue to Node 11

**Node 11: Check Training Success**
- Type: `IF`
- Condition: `={{ $json.status === 'succeeded' }}`
- If `false`: Go to Error Path (Node ERROR_1)
- If `true`: Continue to Node 12

**Node 12: Extract LoRA Path (Code Node)**
```javascript
const job = $input.first().json;
const result = job.result || {};
const artifacts = result.artifacts || [];

const loraArtifact = artifacts.find(a => a.type === 'lora');
if (!loraArtifact) {
  throw new Error('No LoRA artifact found in training job result');
}

return [{
  json: {
    jobId: job.id,
    loraPath: loraArtifact.url,
    loraName: loraArtifact.name || 'lora',
    trainingDuration: job.finishedAt && job.startedAt
      ? Math.round((new Date(job.finishedAt) - new Date(job.startedAt)) / 1000)
      : 0,
    costTok: job.costTok || 0,
  }
}];
```

**Node 13: Update Status - Training Complete**
- Type: `HTTP Request`
- Method: `PATCH`
- URL: `={{ $env.API_BASE_URL }}/pipelines/{{ $execution.id }}`
- Body:
```json
{
  "status": "TRAINING_COMPLETE",
  "currentStage": "LoRA Training Complete",
  "loraPath": "={{ $json.loraPath }}",
  "stagesCompleted": 2,
  "progressPercent": 33
}
```

**Node 14: Send Training Complete Notification**
- Type: `executeWorkflow`
- Workflow: `notification-sender` (use ID from $env.NOTIFICATION_WORKFLOW_ID)
- Input:
```json
{
  "channel": "webhook",
  "severity": "info",
  "title": "LoRA Training Complete",
  "message": "Training job {{ $node.trainingJob.json.id }} completed successfully",
  "metadata": {
    "pipelineId": "={{ $execution.id }}",
    "loraPath": "={{ $json.loraPath }}",
    "duration": "={{ $json.trainingDuration }} seconds"
  }
}
```

---

### Stage 2: Image Generation (10 nodes)

**Node 15: Update Status - Generating Images**
- Type: `HTTP Request`
- Method: `PATCH`
- Body:
```json
{
  "status": "GENERATING_IMAGES",
  "currentStage": "Image Generation",
  "stagesCompleted": 3,
  "progressPercent": 50
}
```

**Node 16: Split Test Prompts (Loop)**
- Type: `splitInBatches`
- Batch Size: `1`
- Input: `={{ $node["Validate Payload"].json.testPrompts }}`

**Node 17: Create Image Job**
- Type: `HTTP Request`
- Method: `POST`
- URL: `={{ $env.API_BASE_URL }}/jobs`
- Body:
```json
{
  "type": "image-generation",
  "payload": {
    "prompt": "={{ $json.item }}",
    "loraPath": "={{ $node["Extract LoRA Path"].json.loraPath }}",
    "width": "={{ $node["Validate Payload"].json.imageConfig?.width || 512 }}",
    "height": "={{ $node["Validate Payload"].json.imageConfig?.height || 512 }}",
    "steps": "={{ $node["Validate Payload"].json.imageConfig?.steps || 20 }}",
    "cfg": "={{ $node["Validate Payload"].json.imageConfig?.cfg || 7.5 }}",
    "dryRun": "={{ $node["Validate Payload"].json.dryRun }}"
  }
}
```

**Node 18-23: Poll Image Job Loop** (Similar to training poll, nodes 18-23)
- Wait {{ $env.IMAGE_POLL_INTERVAL_SEC }} seconds
- GET /jobs/:id
- Check if finished (succeeded/failed)
- Max {{ $env.IMAGE_MAX_ITERATIONS }} iterations
- Continue even if timeout (best-effort)

**Node 24: Aggregate Image Results (Code Node)**
```javascript
// Collect all image job results from loop
const items = $input.all();
const successful = items.filter(item => item.json.status === 'succeeded');
const failed = items.filter(item => item.json.status !== 'succeeded');

const imageAssets = successful.map(item => ({
  jobId: item.json.id,
  assetId: item.json.result?.assetId,
  url: item.json.result?.assetUrl,
  costTok: item.json.costTok || 0,
}));

const totalImageCost = imageAssets.reduce((sum, img) => sum + img.costTok, 0);

return [{
  json: {
    imageAssets,
    imagesGenerated: successful.length,
    imagesFailed: failed.length,
    totalImageCost,
    assetIds: imageAssets.map(img => img.assetId).filter(Boolean),
  }
}];
```

**Node 25: Update Pipeline with Image Assets**
- Type: `HTTP Request`
- Method: `PATCH`
- Body:
```json
{
  "status": "IMAGES_COMPLETE",
  "currentStage": "Images Generated",
  "imageJobIds": "={{ $json.imageAssets.map(img => img.jobId) }}",
  "assetIds": "={{ $json.assetIds }}",
  "stagesCompleted": 4,
  "progressPercent": 66
}
```

---

### Stage 3: Video Generation (Conditional, 9 nodes)

**Node 26: Check Generate Video**
- Type: `IF`
- Condition: `={{ $node["Validate Payload"].json.generateVideo === true }}`
- If `false`: Skip to Stage 4 (Node 35)
- If `true`: Continue to Node 27

**Node 27-34: Video Generation Loop** (Similar pattern to images)
- For each image asset, create video job
- Poll with {{ $env.VIDEO_POLL_INTERVAL_SEC }} interval
- Max {{ $env.VIDEO_MAX_ITERATIONS }} iterations
- Aggregate results
- Update pipeline status to "VIDEOS_COMPLETE"

---

### Stage 4: Results Aggregation (3 nodes)

**Node 35: Update Status - Aggregating**
- Type: `HTTP Request`
- Method: `PATCH`
- Body:
```json
{
  "status": "AGGREGATING",
  "currentStage": "Aggregating Results",
  "stagesCompleted": 5,
  "progressPercent": 95
}
```

**Node 36: Calculate Pipeline Results (Code Node)**
```javascript
const training = $node["Extract LoRA Path"].json;
const images = $node["Aggregate Image Results"].json;
const videos = $node["Aggregate Video Results"]?.json || { videoAssets: [], videosGenerated: 0, totalVideoCost: 0 };
const payload = $node["Validate Payload"].json;

const totalCost = (training.costTok || 0) + images.totalImageCost + videos.totalVideoCost;
const startedAt = $workflow.createdAt;
const completedAt = new Date().toISOString();
const duration = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000);

return [{
  json: {
    pipelineId: $execution.id,
    status: 'completed',
    training: {
      jobId: training.jobId,
      loraPath: training.loraPath,
      loraName: training.loraName,
      duration: training.trainingDuration,
      costTok: training.costTok,
    },
    images: images.imageAssets,
    videos: videos.videoAssets,
    summary: {
      totalDuration: duration,
      totalCostTok: totalCost,
      totalCostUSD: totalCost * 0.000001, // Adjust based on OpenRouter pricing
      imagesGenerated: images.imagesGenerated,
      videosGenerated: videos.videosGenerated,
      assetsCreated: images.imagesGenerated + videos.videosGenerated,
    },
    startedAt,
    completedAt,
    influencerId: payload.influencerId,
    trainingName: payload.trainingName,
  }
}];
```

**Node 37: Update Pipeline - Completed**
- Type: `HTTP Request`
- Method: `PATCH`
- Body:
```json
{
  "status": "COMPLETED",
  "currentStage": "Pipeline Complete",
  "totalCostTok": "={{ $json.summary.totalCostTok }}",
  "completedAt": "={{ $json.completedAt }}",
  "stagesCompleted": 6,
  "progressPercent": 100
}
```

---

### Stage 5: Final Notification (2 nodes)

**Node 38: Send Success Notification**
- Type: `executeWorkflow`
- Workflow: `notification-sender`
- Input:
```json
{
  "channels": "={{ $node["Validate Payload"].json.notificationChannels }}",
  "severity": "success",
  "title": "Pipeline Complete: {{ $node["Validate Payload"].json.trainingName }}",
  "message": "Successfully generated {{ $json.summary.imagesGenerated }} images and {{ $json.summary.videosGenerated }} videos",
  "metadata": {
    "pipelineId": "={{ $execution.id }}",
    "duration": "={{ $json.summary.totalDuration }} seconds",
    "cost": "${{ $json.summary.totalCostUSD.toFixed(4) }}",
    "loraPath": "={{ $json.training.loraPath }}",
    "assets": "={{ $json.images.concat($json.videos).map(a => a.url) }}"
  },
  "webhookUrl": "={{ $node["Validate Payload"].json.webhookUrl }}"
}
```

**Node 39: Return Results to Client**
- Type: `Respond to Webhook`
- Status Code: `200`
- Body: `={{ $json }}`

---

### Error Handling Nodes

**Node ERROR_1: Training Failed Error Path**
- Type: `HTTP Request`
- Method: `PATCH`
- Body:
```json
{
  "status": "FAILED",
  "errorStage": "training",
  "errorMessage": "={{ $json.result?.error || 'Training job failed' }}",
  "completedAt": "={{ new Date().toISOString() }}"
}
```

**Node ERROR_2: Trigger Error Workflow**
- Type: `executeWorkflow`
- Workflow: `pipeline-error-handler`
- Input:
```json
{
  "pipelineId": "={{ $execution.id }}",
  "stage": "training",
  "error": "={{ $json.result?.error }}",
  "jobId": "={{ $node.trainingJob.json.id }}"
}
```

**Node ERROR_3: Send Error Notification**
- Type: `executeWorkflow`
- Workflow: `notification-sender`
- Input:
```json
{
  "channels": ["slack", "webhook"],
  "severity": "error",
  "title": "Pipeline Failed: Training Error",
  "message": "{{ $json.result?.error }}",
  "metadata": {
    "pipelineId": "={{ $execution.id }}",
    "stage": "training",
    "jobId": "={{ $node.trainingJob.json.id }}"
  }
}
```

---

## Workflow 2: Notification Sender (`notification-sender.json`)

**Purpose**: Reusable notification workflow for all channels

### Nodes:

**Node 1: Workflow Trigger**
- Type: `Execute Workflow Trigger`

**Node 2: Route by Channel (Switch Node)**
- Mode: `expression`
- Expression: `={{ $json.channels }}`
- Routes:
  - `webhook`: Go to Node 3
  - `slack`: Go to Node 4
  - `email`: Go to Node 5

**Node 3: Send Webhook Notification**
- Type: `HTTP Request`
- Method: `POST`
- URL: `={{ $json.webhookUrl || $env.WEBHOOK_NOTIFICATION_URL }}`
- Body:
```json
{
  "severity": "={{ $json.severity }}",
  "title": "={{ $json.title }}",
  "message": "={{ $json.message }}",
  "metadata": "={{ $json.metadata }}",
  "timestamp": "={{ new Date().toISOString() }}"
}
```
- Timeout: `10s`
- Retry: 1 attempt
- On Error: `continueRegularOutput`

**Node 4: Send Slack Notification**
- Type: `HTTP Request`
- Method: `POST`
- URL: `={{ $env.SLACK_WEBHOOK_URL }}`
- Body:
```json
{
  "text": "{{ $json.severity.toUpperCase() }}: {{ $json.title }}",
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "{{ $json.title }}" }
    },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "{{ $json.message }}" }
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "*Pipeline ID:* {{ $json.metadata.pipelineId }}" },
        { "type": "mrkdwn", "text": "*Duration:* {{ $json.metadata.duration }}" }
      ]
    }
  ]
}
```

**Node 5: Send Email Notification**
- Type: `Send Email`
- (Configure SMTP settings in n8n credentials)

---

## Workflow 3: Error Handler (`pipeline-error-handler.json`)

**Purpose**: Centralized error handling and logging

### Nodes:

**Node 1: Error Workflow Trigger**
- Type: `Error Trigger`
- Settings: `This Workflow + Sub-Workflows`

**Node 2: Log Error to Database (Optional)**
- Type: `HTTP Request`
- Method: `POST`
- URL: `={{ $env.API_BASE_URL }}/error-logs`
- Body: Full error context

**Node 3: Send Slack Alert**
- Type: `executeWorkflow`
- Workflow: `notification-sender`
- Severity: `error`

---

## Testing Guide

### Phase 1: Dry-Run Testing

1. **Set Environment Variable**: `dryRun=true` in webhook payload
2. **Expected Behavior**:
   - Training job completes instantly with mock LoRA path
   - Image jobs complete instantly with mock asset IDs
   - Total pipeline duration < 2 minutes
3. **Validation**: Check `GET /pipelines/{executionId}` shows COMPLETED status

### Phase 2: Single Image Test

1. **Payload**:
```json
{
  "datasetId": "ds_test_001",
  "trainingName": "test_lora_v1",
  "influencerId": "inf_test",
  "testPrompts": ["portrait photo of a woman"],
  "generateVideo": false,
  "dryRun": false
}
```
2. **Expected Duration**: 40-60 minutes
3. **Validation**: 1 LoRA file + 1 image asset created

### Phase 3: Full Pipeline Test

1. **Payload**: 3 images + 2 videos
2. **Expected Duration**: 60-90 minutes
3. **Validation**: All assets created, costs tracked

---

## Deployment Checklist

- [ ] Create all 3 workflows in n8n UI
- [ ] Set all environment variables
- [ ] Test webhook authentication
- [ ] Run dry-run test (should complete in <2 min)
- [ ] Run single image test (validate real training)
- [ ] Test error scenarios (invalid dataset, ComfyUI offline)
- [ ] Verify notifications (webhook, Slack)
- [ ] Document workflow IDs in .env
- [ ] Take screenshots for documentation
- [ ] Record walkthrough video

---

## Next Steps

1. **Import to n8n**: Manually create workflows following node specifications above
2. **Configure Credentials**: Set API tokens, Slack webhooks in n8n UI
3. **Test Incrementally**: Start with dry-run, then single asset, then full pipeline
4. **Monitor Logs**: Watch n8n execution logs and API logs for errors
5. **Iterate**: Adjust polling intervals and timeouts based on real performance

**Note**: These are JSON-compatible node configurations that can be manually created in n8n's visual editor. For automated import, export each workflow as JSON after creation.

---

**Generated with Claude Code**
**Date**: 2025-10-18
**Issue**: #178 Phase 1 Complete
