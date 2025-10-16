# n8n Workflows

This directory contains production-ready and template workflows for the InfluencerAI platform.

## Directory Contents

### Production Workflows (Ready to Use)

These workflows include comprehensive error handling, retry logic, and logging:

| File                        | Name                        | Description                               | Status        |
| --------------------------- | --------------------------- | ----------------------------------------- | ------------- |
| `plan-generate.json`        | Content Plan Generator      | Generate content plans via OpenRouter API | ✅ Production |
| `lora-train.json`           | LoRA Training Job           | Enqueue and monitor LoRA training jobs    | ✅ Production |
| `content-run-pipeline.json` | Content Generation Pipeline | Full end-to-end content generation        | ✅ Production |
| `publish.json`              | Social Media Publisher      | Publish to Instagram/TikTok/YouTube       | ✅ Production |
| `webhook-comfyui.json`      | ComfyUI Webhook Receiver    | Receive ComfyUI completion callbacks      | ✅ Production |

### Legacy Templates (Reference Only)

These are the original minimal templates, kept for reference:

| File                               | Description                   | Status    |
| ---------------------------------- | ----------------------------- | --------- |
| `content-plan.template.json`       | Basic content plan creation   | 📦 Legacy |
| `content-generation.template.json` | Basic content job creation    | 📦 Legacy |
| `lora-training.template.json`      | Basic LoRA job creation       | 📦 Legacy |
| `autopost.template.json`           | Basic social posting skeleton | 📦 Legacy |

**Note**: Use production workflows instead of templates for new deployments.

## Quick Import

### Using Scripts (Recommended)

```bash
cd apps/n8n
npm run import:all
```

### Manual Import

1. Open n8n: `http://localhost:5678`
2. Go to **Workflows** → **Import From File**
3. Select a workflow JSON file
4. Click **Import**

## Environment Variables

All workflows use these environment variables (configured in docker-compose.yml):

```bash
API_BASE_URL=http://api:3001      # NestJS API endpoint
API_TOKEN=dev-token                # Bearer token for authentication
DEFAULT_INFLUENCER_ID=influencer-001  # Optional: default influencer
DEFAULT_DATASET_ID=ds_example      # Optional: default dataset
```

## Workflow Features

### Error Handling

All production workflows include:

- ✅ Retry logic (3 retries with exponential backoff)
- ✅ Error output continuation (no workflow crashes)
- ✅ Conditional error checking
- ✅ Dedicated error logging nodes

### Logging

All workflows log:

- Execution start/end
- Success with results
- Errors with details
- Timestamps (ISO 8601)

### Monitoring

View execution logs:

1. Go to **Executions** tab in n8n UI
2. Click on an execution to see details
3. Review node outputs and errors

## Workflow Triggers

| Workflow                    | Manual | Scheduled       | Webhook |
| --------------------------- | ------ | --------------- | ------- |
| Content Plan Generator      | ✅     | ✅ Mon 9AM      | ❌      |
| LoRA Training Job           | ✅     | ❌              | ❌      |
| Content Generation Pipeline | ✅     | ✅ Tue/Thu 10AM | ❌      |
| Social Media Publisher      | ✅     | ❌              | ❌      |
| ComfyUI Webhook Receiver    | ❌     | ❌              | ✅      |

## Testing

See `../TESTING.md` for comprehensive testing instructions including:

- Manual trigger tests
- Scheduled execution tests
- Error handling tests
- Integration tests
- Performance tests

Quick test example:

```bash
# 1. Import workflows
npm run import:all

# 2. Open n8n
open http://localhost:5678

# 3. Open "Content Plan Generator"
# 4. Click "Execute Workflow"
# 5. Verify success in execution log
```

## Documentation

- **Main Documentation**: `../README.md` - Complete guide with setup, usage, and troubleshooting
- **Testing Guide**: `../TESTING.md` - 21 test cases with step-by-step instructions
- **Implementation Summary**: `../IMPLEMENTATION.md` - Technical details and architecture

## Updating Workflows

After making changes in n8n UI:

```bash
# Export updated workflows
cd apps/n8n
npm run export:all

# Commit changes
git add workflows/
git commit -m "Update workflows: <description>"
```

## Support

For issues or questions:

1. Check `../README.md` troubleshooting section
2. Review workflow execution logs in n8n UI
3. Check API logs: `docker logs <api-container>`
4. Open issue with full error details

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0
