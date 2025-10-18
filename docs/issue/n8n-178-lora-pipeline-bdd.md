# Issue #178: End-to-End n8n LoRA Pipeline - BDD Scenarios

**Issue**: [#178](https://github.com/your-org/influencerai-monorepo/issues/178)
**Feature**: Complete LoRA Training to Content Generation Pipeline
**Status**: In Development
**Branch**: `feature/n8n-178-lora-pipeline`

---

## Feature Overview

Build comprehensive n8n workflow that orchestrates the complete pipeline from dataset upload through LoRA training, image generation with the trained LoRA, video generation, and final content delivery - demonstrating the full system capabilities.

---

## BDD Scenarios

### Scenario 1: Happy Path - Complete Pipeline with Images Only

```gherkin
Feature: LoRA Training to Content Pipeline
  As a content creator
  I want to train a LoRA and generate test images automatically
  So that I can validate the LoRA quality without manual steps

Scenario: Successful pipeline execution with image generation only
  Given I have a valid dataset "portrait_photos" with 10 images
  And the dataset is uploaded to MinIO
  And all services (API, n8n, ComfyUI) are running
  When I POST to n8n webhook "/webhook/start-lora-pipeline" with:
    """json
    {
      "datasetId": "ds_portrait_001",
      "trainingName": "influencer_v1",
      "influencerId": "inf_456",
      "testPrompts": [
        "portrait photo of a woman smiling, professional lighting",
        "woman wearing sunglasses at the beach, sunset"
      ],
      "generateVideo": false,
      "notificationChannels": ["webhook"]
    }
    """
  Then the workflow should create a pipeline execution record
  And the workflow should start a LoRA training job
  And the training job should poll every 30 seconds
  And after 30-60 minutes the training should complete successfully
  And the workflow should extract the LoRA artifact path
  And the workflow should create 2 image generation jobs
  And each image job should poll every 15 seconds
  And after 10-20 minutes all images should be generated
  And the workflow should aggregate results with:
    | Field              | Value                       |
    | status             | completed                   |
    | imagesGenerated    | 2                           |
    | videosGenerated    | 0                           |
    | totalDuration      | 40-80 minutes               |
    | loraPath           | data/loras/influencer_v1... |
  And the workflow should send success notification via webhook
  And the PipelineExecution record should have status "COMPLETED"
```

---

### Scenario 2: Complete Pipeline with Video Generation

```gherkin
Scenario: Successful pipeline execution with image and video generation
  Given I have a valid dataset "portrait_photos" with 10 images
  And the dataset is uploaded to MinIO
  And ComfyUI is running with video generation support
  When I POST to n8n webhook with generateVideo=true:
    """json
    {
      "datasetId": "ds_portrait_001",
      "trainingName": "influencer_v2",
      "influencerId": "inf_456",
      "testPrompts": [
        "portrait photo of a woman smiling, professional lighting"
      ],
      "generateVideo": true,
      "videoConfig": {
        "durationSec": 3,
        "fps": 24
      },
      "notificationChannels": ["webhook", "slack"]
    }
    """
  Then the workflow should complete LoRA training successfully
  And the workflow should generate 1 image
  And the workflow should create 1 video generation job
  And the video job should poll every 15 seconds
  And after 15-20 minutes the video should be generated
  And the workflow should aggregate results with:
    | Field              | Value                       |
    | status             | completed                   |
    | imagesGenerated    | 1                           |
    | videosGenerated    | 1                           |
    | totalDuration      | 45-90 minutes               |
  And the workflow should send notifications to webhook AND Slack
  And the PipelineExecution record should have status "COMPLETED"
  And the PipelineExecution should have 1 image asset ID
  And the PipelineExecution should have 1 video asset ID
```

---

### Scenario 3: Training Job Fails - Error Recovery

```gherkin
Scenario: Training job fails due to invalid dataset
  Given I have a dataset "bad_dataset" with corrupted images
  When I trigger the pipeline with this dataset
  Then the workflow should create a training job
  And the job should start processing
  And after polling, the job status should be "failed"
  And the job result should contain error: "Invalid image format in dataset"
  Then the workflow should update PipelineExecution status to "FAILED"
  And the workflow should update errorStage to "training"
  And the workflow should capture error message
  And the workflow should trigger the error handler workflow
  And the error handler should send Slack alert with:
    | Field              | Value                                      |
    | title              | Pipeline Failed: Training Error            |
    | pipelineId         | <execution-id>                             |
    | stage              | training                                   |
    | error              | Invalid image format in dataset            |
    | actionRequired     | Fix dataset and retry                      |
  And the PipelineExecution should have completedAt timestamp
  And the workflow should return error response to client
```

---

### Scenario 4: Partial Success - Some Images Fail

```gherkin
Scenario: Training succeeds but some image generation jobs timeout
  Given I have a valid dataset
  And ComfyUI is running but under heavy load
  When I trigger pipeline with 5 test prompts
  Then training should complete successfully
  And the workflow should create 5 image generation jobs
  And jobs 1, 2, 3 should succeed
  And job 4 should timeout after 40 polling attempts (10 minutes)
  And job 5 should succeed
  Then the workflow should continue to aggregation
  And the workflow should aggregate partial results:
    | Field              | Value                                      |
    | status             | completed                                  |
    | imagesGenerated    | 4                                          |
    | imagesFailed       | 1                                          |
  And the PipelineExecution status should be "COMPLETED"
  And the PipelineExecution errorMessage should mention "1 image timeout"
  And the workflow should send warning notification:
    | Field              | Value                                      |
    | severity           | warning                                    |
    | message            | Pipeline completed with 1 image timeout    |
    | successfulImages   | 4/5                                        |
```

---

### Scenario 5: Dry-Run Mode - Fast Testing

```gherkin
Scenario: Pipeline execution in dry-run mode for rapid testing
  Given I have dry-run mode enabled in backend
  When I POST to webhook with dryRun=true:
    """json
    {
      "datasetId": "ds_test",
      "trainingName": "test_lora",
      "influencerId": "inf_test",
      "testPrompts": ["test prompt 1", "test prompt 2"],
      "generateVideo": true,
      "dryRun": true
    }
    """
  Then the workflow should create a training job
  And the backend should return instant success with mock LoRA path
  And the workflow should create 2 image jobs
  And the backend should return instant success with mock asset IDs
  And the workflow should create 2 video jobs
  And the backend should return instant success with mock video IDs
  Then the entire pipeline should complete in < 2 minutes
  And the results should contain mock data:
    | Field              | Value                                      |
    | loraPath           | mock/lora/path.safetensors                 |
    | imagesGenerated    | 2                                          |
    | videosGenerated    | 2                                          |
    | totalDuration      | < 120 seconds                              |
  And the PipelineExecution should be marked with metadata.dryRun=true
```

---

### Scenario 6: Webhook Authentication Failure

```gherkin
Scenario: Unauthorized webhook request is rejected
  Given n8n webhook is configured with secret token
  When I POST to "/webhook/start-lora-pipeline" without auth header
  Then the webhook should return 401 Unauthorized
  And the error message should say "Missing or invalid authentication token"
  And no pipeline execution should be created
  And no jobs should be created
```

---

### Scenario 7: Invalid Payload Validation

```gherkin
Scenario: Webhook rejects invalid payload
  Given I POST to webhook with invalid payload:
    """json
    {
      "datasetId": "",
      "trainingName": "invalid chars!@#",
      "testPrompts": []
    }
    """
  Then the webhook should return 400 Bad Request
  And the validation errors should include:
    | Field           | Error                                         |
    | datasetId       | Dataset ID is required                        |
    | trainingName    | Must be alphanumeric with hyphens/underscores |
    | influencerId    | Influencer ID is required                     |
    | testPrompts     | At least 1 test prompt required               |
  And no pipeline execution should be created
```

---

### Scenario 8: Concurrency Limit Enforcement

```gherkin
Scenario: 6th concurrent pipeline is queued
  Given n8n concurrency limit is set to 5
  And there are already 5 pipelines running
  When I trigger a 6th pipeline
  Then the workflow should be queued
  And the workflow should wait until a slot is available
  And once a running pipeline completes, the queued workflow should start
  And the queued workflow should execute normally
```

---

### Scenario 9: Progress Tracking During Execution

```gherkin
Scenario: External system tracks pipeline progress in real-time
  Given I have triggered a pipeline
  And the pipeline has executionId "exec_12345"
  When I poll GET /pipelines/exec_12345 every 10 seconds
  Then I should see progress updates:
    | Time (min) | status              | currentStage        | progressPercent |
    | 0          | STARTED             | Webhook received    | 0               |
    | 1          | TRAINING            | LoRA training       | 16              |
    | 30         | TRAINING_COMPLETE   | Training done       | 33              |
    | 35         | GENERATING_IMAGES   | Image 1/3           | 50              |
    | 40         | GENERATING_IMAGES   | Image 2/3           | 66              |
    | 45         | GENERATING_IMAGES   | Image 3/3           | 83              |
    | 50         | AGGREGATING         | Collecting results  | 95              |
    | 51         | COMPLETED           | Pipeline complete   | 100             |
  And the PipelineExecution should be updated after each stage transition
```

---

### Scenario 10: Cost Tracking Accumulation

```gherkin
Scenario: Pipeline accurately tracks OpenRouter token costs
  Given OpenRouter charges $0.001 per 1000 tokens
  And training job uses 5000 tokens (caption generation)
  And each image prompt uses 500 tokens (refinement)
  When I run pipeline with 3 test images
  Then the training job should have costTok = 5000
  And each image job should have costTok = 500
  And the aggregation should calculate:
    | Calculation                     | Value   |
    | Training cost                   | 5000    |
    | Image costs (3 × 500)           | 1500    |
    | Total tokens                    | 6500    |
    | Total cost USD (6500 × 0.000001)| $0.0065 |
  And the PipelineExecution should store totalCostTok = 6500
  And the notification should include formatted cost: "$0.01" (rounded)
```

---

## Acceptance Criteria Mapping

| DoD Item | Scenarios Covering |
|----------|-------------------|
| lora-train.json updated with post-training steps | Scenarios 1, 2, 5 |
| lora-to-content-pipeline.json created with all 6 stages | Scenarios 1, 2 |
| lora-pipeline-test.json dry-run workflow created | Scenario 5 |
| All workflows imported into n8n via UI | Manual verification |
| End-to-end test: Upload 10 images, train LoRA, generate 2 images, 2 videos | Scenario 2 |
| Pipeline completes successfully in <2 hours total | Scenarios 1, 2 (timing assertions) |
| Error scenarios tested | Scenarios 3, 4, 6, 7 |
| Notifications sent at each stage | Scenarios 1, 2, 3, 4 |
| Results aggregation produces complete asset manifest | Scenarios 1, 2, 9 |
| Cloudflared tunnel documented | Documentation task |
| README with setup instructions, workflow diagrams | Documentation task |
| Screenshots of workflow in n8n UI | Documentation task |
| Video walkthrough | Documentation task |

---

## Implementation Phases (Aligned with Strategic Plan)

### Phase 1: Core Pipeline - LoRA + Images (Days 1-2)

**Scenarios to Implement:**
- Scenario 1 (happy path images only)
- Scenario 5 (dry-run mode for fast testing)
- Scenario 6 (auth validation)
- Scenario 7 (payload validation)

**Exit Criteria:**
- Dry-run completes in <60 seconds
- Real test generates 1-3 images successfully
- Auth and validation errors return proper responses

---

### Phase 2: Video Generation + Error Handling (Days 3-4)

**Scenarios to Implement:**
- Scenario 2 (complete pipeline with videos)
- Scenario 3 (training failure recovery)
- Scenario 4 (partial success handling)

**Exit Criteria:**
- End-to-end with video completes successfully
- Training failure triggers error workflow
- Partial image failures don't stop pipeline

---

### Phase 3: Production Hardening (Day 5)

**Scenarios to Implement:**
- Scenario 8 (concurrency limits)
- Scenario 9 (progress tracking)
- Scenario 10 (cost tracking)

**Exit Criteria:**
- Concurrency enforced (5 max)
- Progress API returns real-time updates
- Cost calculations accurate

---

## Testing Strategy

### Unit Tests (Backend)
- `PipelinesController` CRUD operations
- `PipelinesService` business logic
- Payload validation (Zod schemas)

### Integration Tests (API + DB)
- Pipeline creation workflow
- Progress update workflow
- Error state transitions

### E2E Tests (n8n + API)
- Dry-run mode (fast, automated in CI)
- Real pipeline with minimal dataset (1 image, manual)

### Manual Testing
- Full pipeline with 10 images + 3 videos (production-like)
- Error scenarios (ComfyUI offline, bad dataset)
- Notification delivery (webhook, Slack)

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Pipeline Success Rate | >95% | (Completed / Total) × 100 |
| Average Duration (images only) | <60 min | Median of real test runs |
| Average Duration (with videos) | <90 min | Median with 2-3 videos |
| Dry-run Speed | <2 min | Automated test timing |
| Error Recovery Time | <15 min | Manual intervention to restart |
| Test Coverage (Backend) | >80% | Jest coverage report |

---

**Generated with Claude Code**
**Date**: 2025-10-18
**Author**: Strategic Advisor + System Architect Agents
