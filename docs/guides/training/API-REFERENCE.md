# LoRA Training API Reference

Complete API documentation for programmatic LoRA training workflows in InfluencerAI.

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Datasets API](#datasets-api)
- [LoRA Configs API](#lora-configs-api)
- [Jobs API](#jobs-api)
- [TypeScript SDK](#typescript-sdk)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Overview

The InfluencerAI API provides RESTful endpoints for managing LoRA training workflows:

1. **Datasets API** - Manage training datasets (image collections + captions)
2. **LoRA Configs API** - Create and manage training configurations (parameters, models)
3. **Jobs API** - Submit training jobs, monitor progress, retrieve results

**Typical workflow**:
```
POST /datasets → GET /datasets/:id (verify status) →
POST /lora-configs → POST /jobs → GET /jobs/:id (poll until complete)
```

---

## Authentication

All API endpoints require authentication via tenant context headers:

```bash
-H "x-tenant-id: tenant_demo"
```

**For production**: Use proper JWT tokens or API keys. The development environment uses simple tenant IDs for demonstration.

---

## Base URL

**Local development**:
```
http://localhost:3001
```

**Production**: Replace with your deployed API domain.

---

## Datasets API

Manage training datasets (collections of images with captions).

### Create Dataset

Register a new dataset with the system.

**Endpoint**: `POST /datasets`

**Request Body**:
```json
{
  "kind": "lora-training",
  "path": "data/datasets/my-influencer",
  "meta": {
    "imageCount": 25,
    "resolution": "1024x1024",
    "triggerWord": "ohwx"
  }
}
```

**Field Descriptions**:
- `kind` (required): Dataset type - use `"lora-training"` for LoRA training datasets
- `path` (required): Filesystem path to dataset directory (relative to project root)
- `meta` (optional): Flexible JSON metadata object
  - `imageCount`: Number of images in dataset
  - `resolution`: Image resolution (e.g., "512x512", "1024x1024")
  - `triggerWord`: Activation keyword for the LoRA

**cURL Example**:
```bash
curl -X POST http://localhost:3001/datasets \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_demo" \
  -d '{
    "kind": "lora-training",
    "path": "data/datasets/my-influencer",
    "meta": {
      "imageCount": 25,
      "resolution": "1024x1024",
      "triggerWord": "ohwx"
    }
  }'
```

**Response** (201 Created):
```json
{
  "id": "clx4k9j2k0000xyz",
  "tenantId": "tenant_demo",
  "kind": "lora-training",
  "path": "data/datasets/my-influencer",
  "meta": {
    "imageCount": 25,
    "resolution": "1024x1024",
    "triggerWord": "ohwx"
  },
  "status": "ready",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**TypeScript Example**:
```typescript
import { fetch } from 'undici';

const response = await fetch('http://localhost:3001/datasets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': 'tenant_demo',
  },
  body: JSON.stringify({
    kind: 'lora-training',
    path: 'data/datasets/my-influencer',
    meta: {
      imageCount: 25,
      resolution: '1024x1024',
      triggerWord: 'ohwx',
    },
  }),
});

const dataset = await response.json();
console.log('Dataset created:', dataset.id);
```

---

### List Datasets

Retrieve paginated list of datasets with optional filtering and sorting.

**Endpoint**: `GET /datasets`

**Query Parameters**:
- `status` (optional): Filter by status (`pending`, `processing`, `ready`, `failed`)
- `kind` (optional): Filter by dataset type (`lora-training`, `fine-tuning`)
- `take` (optional): Number of results (1-100, default: 20)
- `skip` (optional): Number of results to skip (default: 0)
- `sortBy` (optional): Sort field (`createdAt`, `updatedAt`, default: `createdAt`)
- `sortOrder` (optional): Sort direction (`asc`, `desc`, default: `desc`)

**cURL Example**:
```bash
curl -X GET "http://localhost:3001/datasets?status=ready&take=10&sortBy=createdAt&sortOrder=desc" \
  -H "x-tenant-id: tenant_demo"
```

**Response** (200 OK):
```json
[
  {
    "id": "clx4k9j2k0000xyz",
    "kind": "lora-training",
    "path": "data/datasets/my-influencer",
    "status": "ready",
    "meta": { "imageCount": 25, "resolution": "1024x1024", "triggerWord": "ohwx" },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  {
    "id": "clx4k8h1j0000abc",
    "kind": "lora-training",
    "path": "data/datasets/portrait-demo",
    "status": "ready",
    "meta": { "imageCount": 15, "resolution": "512x512", "triggerWord": "demo" },
    "createdAt": "2025-01-14T14:20:00.000Z",
    "updatedAt": "2025-01-14T14:20:00.000Z"
  }
]
```

**Response Headers**:
```
x-total-count: 42
```
Use `x-total-count` header for pagination calculations.

**TypeScript Example**:
```typescript
const params = new URLSearchParams({
  status: 'ready',
  take: '10',
  sortBy: 'createdAt',
  sortOrder: 'desc',
});

const response = await fetch(`http://localhost:3001/datasets?${params}`, {
  headers: { 'x-tenant-id': 'tenant_demo' },
});

const datasets = await response.json();
const totalCount = response.headers.get('x-total-count');

console.log(`Found ${totalCount} total datasets, showing ${datasets.length}`);
```

---

### Get Dataset by ID

Retrieve detailed information about a specific dataset.

**Endpoint**: `GET /datasets/:id`

**cURL Example**:
```bash
curl -X GET http://localhost:3001/datasets/clx4k9j2k0000xyz \
  -H "x-tenant-id: tenant_demo"
```

**Response** (200 OK):
```json
{
  "id": "clx4k9j2k0000xyz",
  "tenantId": "tenant_demo",
  "kind": "lora-training",
  "path": "data/datasets/my-influencer",
  "status": "ready",
  "meta": {
    "imageCount": 25,
    "resolution": "1024x1024",
    "triggerWord": "ohwx",
    "lastUpdatedBy": "user@example.com"
  },
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:35:00.000Z"
}
```

**Response** (404 Not Found):
```json
{
  "statusCode": 404,
  "message": "Dataset clx4k9j2k0000xyz not found"
}
```

**TypeScript Example**:
```typescript
const datasetId = 'clx4k9j2k0000xyz';

const response = await fetch(`http://localhost:3001/datasets/${datasetId}`, {
  headers: { 'x-tenant-id': 'tenant_demo' },
});

if (response.ok) {
  const dataset = await response.json();
  console.log('Dataset status:', dataset.status);
} else {
  console.error('Dataset not found');
}
```

---

### Update Dataset Status

Update the status of a dataset (e.g., from `processing` to `ready` after validation).

**Endpoint**: `PATCH /datasets/:id/status`

**Request Body**:
```json
{
  "status": "ready"
}
```

**Allowed Status Values**:
- `pending` - Dataset registered but not yet validated
- `processing` - Validation or preprocessing in progress
- `ready` - Dataset ready for training
- `failed` - Validation or preprocessing failed

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/datasets/clx4k9j2k0000xyz/status \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_demo" \
  -d '{"status": "ready"}'
```

**Response** (200 OK):
```json
{
  "id": "clx4k9j2k0000xyz",
  "status": "ready",
  "updatedAt": "2025-01-15T10:40:00.000Z"
}
```

---

## LoRA Configs API

Manage training configurations (parameters, base models, output paths).

### Create LoRA Configuration

Create a new reusable training configuration.

**Endpoint**: `POST /lora-configs`

**Request Body**:
```json
{
  "name": "My Influencer SDXL Balanced",
  "description": "Balanced configuration for SDXL training with 20 epochs",
  "modelName": "stabilityai/stable-diffusion-xl-base-1.0",
  "epochs": 20,
  "learningRate": 0.0001,
  "batchSize": 2,
  "resolution": 1024,
  "networkDim": 16,
  "networkAlpha": 8,
  "outputPath": "data/loras/my-influencer-v1",
  "meta": {
    "optimizer": "AdamW8bit",
    "lrScheduler": "cosine",
    "minSnrGamma": 5
  },
  "isDefault": false
}
```

**Field Descriptions**:
- `name` (required): Configuration name (1-100 chars, must be unique per tenant)
- `description` (optional): Human-readable description (max 500 chars)
- `modelName` (required): Base Stable Diffusion model identifier
  - Common values: `"sd15"`, `"stabilityai/stable-diffusion-xl-base-1.0"`
- `epochs` (optional): Number of training epochs (1-1000, default: 10)
- `learningRate` (optional): Training learning rate (0.000001-1.0, default: 0.0001)
- `batchSize` (optional): Batch size (1-64, default: 1)
- `resolution` (optional): Training resolution (128-2048, default: 512)
  - Use 512 for SD 1.5, 1024 for SDXL
- `networkDim` (optional): LoRA rank/dimension (1-512, default: 32)
  - Typical values: 8 (small), 16 (balanced), 32 (high quality)
- `networkAlpha` (optional): LoRA alpha scaling (1-512, default: 16)
  - Typically set to `networkDim / 2`
- `outputPath` (optional): Where to save trained .safetensors file (max 255 chars)
- `meta` (optional): Flexible JSON object for additional parameters
  - `optimizer`: `"AdamW8bit"` (less VRAM) or `"AdamW"` (more accurate)
  - `lrScheduler`: `"cosine"`, `"constant"`, `"linear"`
  - `minSnrGamma`: Stability parameter (recommended: 5)
- `isDefault` (optional): Mark as default config for this tenant (default: false)
  - Setting this to `true` will unset `isDefault` on all other configs

**cURL Example**:
```bash
curl -X POST http://localhost:3001/lora-configs \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_demo" \
  -d '{
    "name": "My Influencer SDXL Balanced",
    "description": "Balanced configuration for SDXL training with 20 epochs",
    "modelName": "stabilityai/stable-diffusion-xl-base-1.0",
    "epochs": 20,
    "learningRate": 0.0001,
    "batchSize": 2,
    "resolution": 1024,
    "networkDim": 16,
    "networkAlpha": 8,
    "outputPath": "data/loras/my-influencer-v1",
    "meta": {
      "optimizer": "AdamW8bit",
      "lrScheduler": "cosine",
      "minSnrGamma": 5
    },
    "isDefault": false
  }'
```

**Response** (201 Created):
```json
{
  "id": "clx4kb3n40000def",
  "tenantId": "tenant_demo",
  "name": "My Influencer SDXL Balanced",
  "description": "Balanced configuration for SDXL training with 20 epochs",
  "modelName": "stabilityai/stable-diffusion-xl-base-1.0",
  "epochs": 20,
  "learningRate": 0.0001,
  "batchSize": 2,
  "resolution": 1024,
  "networkDim": 16,
  "networkAlpha": 8,
  "outputPath": "data/loras/my-influencer-v1",
  "meta": {
    "optimizer": "AdamW8bit",
    "lrScheduler": "cosine",
    "minSnrGamma": 5
  },
  "isDefault": false,
  "createdAt": "2025-01-15T11:00:00.000Z",
  "updatedAt": "2025-01-15T11:00:00.000Z"
}
```

**Response** (409 Conflict) - Name already exists:
```json
{
  "statusCode": 409,
  "message": "LoRA config with name 'My Influencer SDXL Balanced' already exists"
}
```

**TypeScript Example**:
```typescript
const loraConfig = await fetch('http://localhost:3001/lora-configs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': 'tenant_demo',
  },
  body: JSON.stringify({
    name: 'My Influencer SDXL Balanced',
    modelName: 'stabilityai/stable-diffusion-xl-base-1.0',
    epochs: 20,
    learningRate: 0.0001,
    batchSize: 2,
    resolution: 1024,
    networkDim: 16,
    networkAlpha: 8,
    meta: {
      optimizer: 'AdamW8bit',
      lrScheduler: 'cosine',
      minSnrGamma: 5,
    },
  }),
});

const config = await loraConfig.json();
console.log('Config created:', config.id);
```

---

### List LoRA Configurations

Retrieve paginated list of LoRA configurations with optional filtering.

**Endpoint**: `GET /lora-configs`

**Query Parameters**:
- `isDefault` (optional): Filter by default status (`"true"`, `"false"`)
- `modelName` (optional): Filter by base model name
- `take` (optional): Number of results (1-100, default: 20)
- `skip` (optional): Number of results to skip (default: 0)
- `sortBy` (optional): Sort field (`createdAt`, `updatedAt`, `name`, default: `createdAt`)
- `sortOrder` (optional): Sort direction (`asc`, `desc`, default: `desc`)

**cURL Example**:
```bash
curl -X GET "http://localhost:3001/lora-configs?modelName=stabilityai/stable-diffusion-xl-base-1.0&take=10" \
  -H "x-tenant-id: tenant_demo"
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "clx4kb3n40000def",
      "name": "My Influencer SDXL Balanced",
      "modelName": "stabilityai/stable-diffusion-xl-base-1.0",
      "epochs": 20,
      "learningRate": 0.0001,
      "batchSize": 2,
      "resolution": 1024,
      "networkDim": 16,
      "networkAlpha": 8,
      "isDefault": false,
      "createdAt": "2025-01-15T11:00:00.000Z"
    }
  ],
  "total": 5,
  "take": 10,
  "skip": 0
}
```

**Response Headers**:
```
X-Total-Count: 5
X-Take: 10
X-Skip: 0
```

**TypeScript Example**:
```typescript
const params = new URLSearchParams({
  modelName: 'stabilityai/stable-diffusion-xl-base-1.0',
  take: '10',
});

const response = await fetch(`http://localhost:3001/lora-configs?${params}`, {
  headers: { 'x-tenant-id': 'tenant_demo' },
});

const { data, total } = await response.json();
console.log(`Found ${total} configs, showing ${data.length}`);
```

---

### Get LoRA Configuration by ID

Retrieve detailed information about a specific configuration.

**Endpoint**: `GET /lora-configs/:id`

**cURL Example**:
```bash
curl -X GET http://localhost:3001/lora-configs/clx4kb3n40000def \
  -H "x-tenant-id: tenant_demo"
```

**Response** (200 OK):
```json
{
  "id": "clx4kb3n40000def",
  "tenantId": "tenant_demo",
  "name": "My Influencer SDXL Balanced",
  "description": "Balanced configuration for SDXL training",
  "modelName": "stabilityai/stable-diffusion-xl-base-1.0",
  "epochs": 20,
  "learningRate": 0.0001,
  "batchSize": 2,
  "resolution": 1024,
  "networkDim": 16,
  "networkAlpha": 8,
  "outputPath": "data/loras/my-influencer-v1",
  "meta": {
    "optimizer": "AdamW8bit",
    "lrScheduler": "cosine",
    "minSnrGamma": 5
  },
  "isDefault": false,
  "createdAt": "2025-01-15T11:00:00.000Z",
  "updatedAt": "2025-01-15T11:00:00.000Z"
}
```

---

### Update LoRA Configuration

Update one or more fields of an existing configuration.

**Endpoint**: `PATCH /lora-configs/:id`

**Request Body** (all fields optional):
```json
{
  "epochs": 30,
  "learningRate": 0.00005,
  "isDefault": true
}
```

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/lora-configs/clx4kb3n40000def \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_demo" \
  -d '{
    "epochs": 30,
    "learningRate": 0.00005,
    "isDefault": true
  }'
```

**Response** (200 OK):
```json
{
  "id": "clx4kb3n40000def",
  "name": "My Influencer SDXL Balanced",
  "epochs": 30,
  "learningRate": 0.00005,
  "isDefault": true,
  "updatedAt": "2025-01-15T11:15:00.000Z"
}
```

**TypeScript Example**:
```typescript
const configId = 'clx4kb3n40000def';

const response = await fetch(`http://localhost:3001/lora-configs/${configId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': 'tenant_demo',
  },
  body: JSON.stringify({
    epochs: 30,
    learningRate: 0.00005,
    isDefault: true,
  }),
});

const updated = await response.json();
console.log('Updated config:', updated);
```

---

### Delete LoRA Configuration

Delete a configuration if no active jobs are using it.

**Endpoint**: `DELETE /lora-configs/:id`

**cURL Example**:
```bash
curl -X DELETE http://localhost:3001/lora-configs/clx4kb3n40000def \
  -H "x-tenant-id: tenant_demo"
```

**Response** (200 OK):
```json
{
  "success": true,
  "warnings": [
    "Deleted the default LoRA configuration. Consider setting a new default."
  ]
}
```

**Response** (400 Bad Request) - Active jobs exist:
```json
{
  "statusCode": 400,
  "message": "Cannot delete configuration: 3 active jobs (pending/running) are using it"
}
```

---

## Jobs API

Submit training jobs, monitor progress, and retrieve results.

### Create Job

Submit a new LoRA training job.

**Endpoint**: `POST /jobs`

**Request Body**:
```json
{
  "type": "lora-training",
  "payload": {
    "datasetId": "clx4k9j2k0000xyz",
    "loraConfigId": "clx4kb3n40000def"
  }
}
```

**Field Descriptions**:
- `type` (required): Job type - use `"lora-training"` for LoRA training
- `payload` (required): Job-specific parameters
  - `datasetId`: ID of the dataset to train on
  - `loraConfigId`: ID of the LoRA configuration to use

**cURL Example**:
```bash
curl -X POST http://localhost:3001/jobs \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_demo" \
  -d '{
    "type": "lora-training",
    "payload": {
      "datasetId": "clx4k9j2k0000xyz",
      "loraConfigId": "clx4kb3n40000def"
    }
  }'
```

**Response** (201 Created):
```json
{
  "id": "clx4kd5m70000ghi",
  "tenantId": "tenant_demo",
  "type": "lora-training",
  "status": "pending",
  "payload": {
    "datasetId": "clx4k9j2k0000xyz",
    "loraConfigId": "clx4kb3n40000def"
  },
  "result": null,
  "costTok": null,
  "startedAt": null,
  "finishedAt": null,
  "createdAt": "2025-01-15T11:30:00.000Z",
  "updatedAt": "2025-01-15T11:30:00.000Z"
}
```

**TypeScript Example**:
```typescript
const job = await fetch('http://localhost:3001/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': 'tenant_demo',
  },
  body: JSON.stringify({
    type: 'lora-training',
    payload: {
      datasetId: 'clx4k9j2k0000xyz',
      loraConfigId: 'clx4kb3n40000def',
    },
  }),
});

const createdJob = await job.json();
console.log('Job created:', createdJob.id);

// Poll for completion
const pollInterval = setInterval(async () => {
  const status = await fetch(`http://localhost:3001/jobs/${createdJob.id}`, {
    headers: { 'x-tenant-id': 'tenant_demo' },
  });
  const jobData = await status.json();

  console.log('Job status:', jobData.status);

  if (jobData.status === 'completed' || jobData.status === 'failed') {
    clearInterval(pollInterval);
    console.log('Job finished:', jobData.result);
  }
}, 5000); // Poll every 5 seconds
```

---

### List Jobs

Retrieve paginated list of jobs with optional filtering.

**Endpoint**: `GET /jobs`

**Query Parameters**:
- `status` (optional): Filter by status (`pending`, `running`, `completed`, `failed`)
- `type` (optional): Filter by job type (`lora-training`, `content-generation`, etc.)
- `take` (optional): Number of results (1-100, default: 20)
- `skip` (optional): Number of results to skip (default: 0)

**cURL Example**:
```bash
curl -X GET "http://localhost:3001/jobs?type=lora-training&status=completed&take=10" \
  -H "x-tenant-id: tenant_demo"
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "clx4kd5m70000ghi",
      "type": "lora-training",
      "status": "completed",
      "payload": {
        "datasetId": "clx4k9j2k0000xyz",
        "loraConfigId": "clx4kb3n40000def"
      },
      "result": {
        "loraPath": "data/loras/my-influencer-v1/my-influencer-v1-final.safetensors",
        "checkpoints": [
          "my-influencer-v1-epoch-5.safetensors",
          "my-influencer-v1-epoch-10.safetensors",
          "my-influencer-v1-epoch-15.safetensors",
          "my-influencer-v1-final.safetensors"
        ],
        "finalLoss": 0.0123,
        "trainingTimeMinutes": 95
      },
      "startedAt": "2025-01-15T11:31:00.000Z",
      "finishedAt": "2025-01-15T13:06:00.000Z",
      "createdAt": "2025-01-15T11:30:00.000Z"
    }
  ],
  "total": 12,
  "take": 10,
  "skip": 0
}
```

---

### Get Job by ID

Retrieve detailed information about a specific job.

**Endpoint**: `GET /jobs/:id`

**cURL Example**:
```bash
curl -X GET http://localhost:3001/jobs/clx4kd5m70000ghi \
  -H "x-tenant-id: tenant_demo"
```

**Response** (200 OK) - Pending job:
```json
{
  "id": "clx4kd5m70000ghi",
  "type": "lora-training",
  "status": "pending",
  "payload": {
    "datasetId": "clx4k9j2k0000xyz",
    "loraConfigId": "clx4kb3n40000def"
  },
  "result": null,
  "createdAt": "2025-01-15T11:30:00.000Z",
  "updatedAt": "2025-01-15T11:30:00.000Z"
}
```

**Response** (200 OK) - Running job:
```json
{
  "id": "clx4kd5m70000ghi",
  "type": "lora-training",
  "status": "running",
  "payload": {
    "datasetId": "clx4k9j2k0000xyz",
    "loraConfigId": "clx4kb3n40000def"
  },
  "result": {
    "progress": {
      "currentEpoch": 12,
      "totalEpochs": 20,
      "loss": 0.0234,
      "estimatedTimeRemaining": "45 minutes"
    }
  },
  "startedAt": "2025-01-15T11:31:00.000Z",
  "createdAt": "2025-01-15T11:30:00.000Z",
  "updatedAt": "2025-01-15T12:15:00.000Z"
}
```

**Response** (200 OK) - Completed job:
```json
{
  "id": "clx4kd5m70000ghi",
  "type": "lora-training",
  "status": "completed",
  "payload": {
    "datasetId": "clx4k9j2k0000xyz",
    "loraConfigId": "clx4kb3n40000def"
  },
  "result": {
    "loraPath": "data/loras/my-influencer-v1/my-influencer-v1-final.safetensors",
    "checkpoints": [
      "my-influencer-v1-epoch-5.safetensors",
      "my-influencer-v1-epoch-10.safetensors",
      "my-influencer-v1-epoch-15.safetensors",
      "my-influencer-v1-final.safetensors"
    ],
    "finalLoss": 0.0123,
    "trainingTimeMinutes": 95
  },
  "startedAt": "2025-01-15T11:31:00.000Z",
  "finishedAt": "2025-01-15T13:06:00.000Z",
  "createdAt": "2025-01-15T11:30:00.000Z",
  "updatedAt": "2025-01-15T13:06:00.000Z"
}
```

**Response** (200 OK) - Failed job:
```json
{
  "id": "clx4kd5m70000ghi",
  "type": "lora-training",
  "status": "failed",
  "payload": {
    "datasetId": "clx4k9j2k0000xyz",
    "loraConfigId": "clx4kb3n40000def"
  },
  "result": {
    "error": "CUDA out of memory: tried to allocate 2.00 GiB",
    "epoch": 3,
    "partialCheckpoints": [
      "my-influencer-v1-epoch-1.safetensors",
      "my-influencer-v1-epoch-2.safetensors"
    ]
  },
  "startedAt": "2025-01-15T11:31:00.000Z",
  "finishedAt": "2025-01-15T11:45:00.000Z",
  "createdAt": "2025-01-15T11:30:00.000Z",
  "updatedAt": "2025-01-15T11:45:00.000Z"
}
```

---

### Update Job

Update job status, result, or cost tracking (typically used by worker processes).

**Endpoint**: `PATCH /jobs/:id`

**Request Body** (all fields optional):
```json
{
  "status": "running",
  "result": {
    "progress": {
      "currentEpoch": 5,
      "totalEpochs": 20,
      "loss": 0.0456
    }
  }
}
```

**cURL Example**:
```bash
curl -X PATCH http://localhost:3001/jobs/clx4kd5m70000ghi \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_demo" \
  -d '{
    "status": "running",
    "result": {
      "progress": {
        "currentEpoch": 5,
        "totalEpochs": 20,
        "loss": 0.0456
      }
    }
  }'
```

**Response** (200 OK):
```json
{
  "id": "clx4kd5m70000ghi",
  "status": "running",
  "result": {
    "progress": {
      "currentEpoch": 5,
      "totalEpochs": 20,
      "loss": 0.0456
    }
  },
  "updatedAt": "2025-01-15T11:45:00.000Z"
}
```

---

### Get Job Series (Analytics)

Retrieve aggregated job outcomes over time for analytics and monitoring.

**Endpoint**: `GET /jobs/series`

**Query Parameters**:
- `window` (optional): Time window (`"day"`, `"week"`, `"month"`, default: `"week"`)

**cURL Example**:
```bash
curl -X GET "http://localhost:3001/jobs/series?window=week" \
  -H "x-tenant-id: tenant_demo"
```

**Response** (200 OK):
```json
{
  "window": "week",
  "data": [
    {
      "date": "2025-01-08",
      "completed": 12,
      "failed": 2,
      "pending": 1,
      "running": 3
    },
    {
      "date": "2025-01-15",
      "completed": 18,
      "failed": 1,
      "pending": 0,
      "running": 2
    }
  ]
}
```

---

## TypeScript SDK

For a more ergonomic development experience, use the official TypeScript SDK.

### Installation

```bash
pnpm add @influencerai/sdk
```

### Usage Example

```typescript
import { InfluencerAIClient } from '@influencerai/sdk';

// Initialize client
const client = new InfluencerAIClient({
  baseUrl: 'http://localhost:3001',
  tenantId: 'tenant_demo',
});

// Create dataset
const dataset = await client.datasets.create({
  kind: 'lora-training',
  path: 'data/datasets/my-influencer',
  meta: {
    imageCount: 25,
    resolution: '1024x1024',
    triggerWord: 'ohwx',
  },
});

// Create LoRA configuration
const config = await client.loraConfigs.create({
  name: 'SDXL Balanced',
  modelName: 'stabilityai/stable-diffusion-xl-base-1.0',
  epochs: 20,
  learningRate: 0.0001,
  batchSize: 2,
  resolution: 1024,
  networkDim: 16,
  networkAlpha: 8,
});

// Submit training job
const job = await client.jobs.create({
  type: 'lora-training',
  payload: {
    datasetId: dataset.id,
    loraConfigId: config.id,
  },
});

// Poll for completion with built-in helpers
await client.jobs.waitForCompletion(job.id, {
  onProgress: (jobData) => {
    console.log(`Epoch ${jobData.result.progress.currentEpoch}/${jobData.result.progress.totalEpochs}`);
  },
  pollInterval: 5000, // 5 seconds
  timeout: 7200000, // 2 hours
});

console.log('Training complete!');
```

---

## Error Handling

All endpoints return standard HTTP status codes with JSON error responses.

### Common Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| **200** | OK | Successful GET, PATCH, DELETE |
| **201** | Created | Successful POST (resource created) |
| **400** | Bad Request | Validation error, malformed JSON |
| **401** | Unauthorized | Missing or invalid authentication |
| **404** | Not Found | Resource doesn't exist or cross-tenant access |
| **409** | Conflict | Duplicate resource (e.g., name already exists) |
| **500** | Internal Server Error | Unexpected server error |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "fieldErrors": {
      "learningRate": ["Number must be greater than 0.000001"]
    }
  }
}
```

### TypeScript Error Handling

```typescript
try {
  const job = await client.jobs.create({ /* ... */ });
} catch (error) {
  if (error.statusCode === 400) {
    console.error('Validation error:', error.message);
    console.error('Field errors:', error.errors);
  } else if (error.statusCode === 409) {
    console.error('Resource conflict:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Rate Limiting

**Current Status**: No rate limiting in development environment.

**Production**: Implement rate limiting at the API gateway level:
- 100 requests per minute per tenant for GET endpoints
- 10 requests per minute per tenant for POST/PATCH/DELETE endpoints
- Job creation limited to 5 concurrent training jobs per tenant

**Headers** (when implemented):
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Complete Workflow Example

Putting it all together - full LoRA training workflow via API:

```bash
#!/bin/bash

TENANT_ID="tenant_demo"
API_URL="http://localhost:3001"

# Step 1: Create dataset
DATASET_RESPONSE=$(curl -s -X POST "$API_URL/datasets" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "kind": "lora-training",
    "path": "data/datasets/my-influencer",
    "meta": {"imageCount": 25, "resolution": "1024x1024", "triggerWord": "ohwx"}
  }')

DATASET_ID=$(echo $DATASET_RESPONSE | jq -r '.id')
echo "Dataset created: $DATASET_ID"

# Step 2: Create LoRA config
CONFIG_RESPONSE=$(curl -s -X POST "$API_URL/lora-configs" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "name": "Auto-Generated SDXL Config",
    "modelName": "stabilityai/stable-diffusion-xl-base-1.0",
    "epochs": 20,
    "learningRate": 0.0001,
    "batchSize": 2,
    "resolution": 1024,
    "networkDim": 16,
    "networkAlpha": 8,
    "meta": {"optimizer": "AdamW8bit", "lrScheduler": "cosine", "minSnrGamma": 5}
  }')

CONFIG_ID=$(echo $CONFIG_RESPONSE | jq -r '.id')
echo "Config created: $CONFIG_ID"

# Step 3: Submit job
JOB_RESPONSE=$(curl -s -X POST "$API_URL/jobs" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"type\": \"lora-training\",
    \"payload\": {
      \"datasetId\": \"$DATASET_ID\",
      \"loraConfigId\": \"$CONFIG_ID\"
    }
  }")

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.id')
echo "Job submitted: $JOB_ID"

# Step 4: Poll until complete
while true; do
  JOB_STATUS=$(curl -s -X GET "$API_URL/jobs/$JOB_ID" \
    -H "x-tenant-id: $TENANT_ID")

  STATUS=$(echo $JOB_STATUS | jq -r '.status')
  echo "Job status: $STATUS"

  if [ "$STATUS" == "completed" ]; then
    echo "Training completed!"
    LORA_PATH=$(echo $JOB_STATUS | jq -r '.result.loraPath')
    echo "LoRA saved to: $LORA_PATH"
    break
  elif [ "$STATUS" == "failed" ]; then
    echo "Training failed!"
    ERROR=$(echo $JOB_STATUS | jq -r '.result.error')
    echo "Error: $ERROR"
    exit 1
  fi

  sleep 10
done
```

---

## Next Steps

- [Getting Started Guide](GETTING-STARTED.md) - Complete walkthrough with UI
- [n8n Workflow Integration](06-n8n-workflow.md) - Automate with n8n
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common API issues
- [Architecture Overview](../../architecture/panoramica.md) - System design

---

**Questions?**
- OpenAPI Spec: `http://localhost:3001/api` (Swagger UI)
- Check logs: `docker compose logs api -f`
- GitHub Issues: Report API bugs or request features

Happy integrating! 🚀
