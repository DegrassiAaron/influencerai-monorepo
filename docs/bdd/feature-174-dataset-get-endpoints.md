# Feature: Dataset GET Endpoints

**Issue**: #174
**Title**: Implement Dataset GET endpoints for listing and retrieving datasets
**Type**: Backend API Feature
**Priority**: P0 (Critical)

## Background

The datasets API currently only supports creating datasets (POST) and updating status (PATCH). To enable UI and n8n workflows to browse, filter, and retrieve dataset information for LoRA training workflows, we need GET endpoints.

## Strategic Decision (from strategic-advisor)

**Approach**: Hybrid/Pragmatic Balance (Option C)
- Return bare array (consistent with jobs.controller.ts pattern)
- Include `X-Total-Count` header for progressive enhancement
- Add compound database indexes for future query optimization
- Fixed sorting by `createdAt DESC` initially (can add dynamic sorting later)
- DTOs in separate `dto.ts` file (following jobs pattern)

## Architecture (from system-architect)

**Pattern**: RESTful Query-Based Architecture
```
Client → Controller (@Query) → Zod Validation → Service → Prisma (with tenant filter) → PostgreSQL
```

**Key Decisions**:
- Manual Zod validation with `safeParse()` (proven pattern)
- Offset-based pagination (take/skip with max 100 limit)
- Multi-layer tenant isolation (middleware + service check + post-fetch verification)
- Composite database index: `(tenantId, status, kind, createdAt DESC)`

## Feature Scenarios

### Scenario 1: List all datasets for tenant with default pagination

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**And** the following datasets exist:

| id | tenantId | kind | status | createdAt |
|----|----------|------|--------|-----------|
| ds_1 | tenant_1 | lora-training | ready | 2025-01-15T10:00:00Z |
| ds_2 | tenant_1 | reference | pending | 2025-01-15T09:00:00Z |
| ds_3 | tenant_2 | lora-training | ready | 2025-01-15T08:00:00Z |

**When** I send GET /datasets
**Then** the response status should be 200
**And** the response should contain 2 datasets (only from tenant_1)
**And** datasets should be ordered by createdAt DESC
**And** the response header "X-Total-Count" should be "2"
**And** the first dataset should have id "ds_1"
**And** the second dataset should have id "ds_2"

---

### Scenario 2: Filter datasets by status

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**And** the following datasets exist:

| id | tenantId | kind | status | createdAt |
|----|----------|------|--------|-----------|
| ds_1 | tenant_1 | lora-training | ready | 2025-01-15T10:00:00Z |
| ds_2 | tenant_1 | lora-training | pending | 2025-01-15T09:00:00Z |
| ds_3 | tenant_1 | reference | ready | 2025-01-15T08:00:00Z |

**When** I send GET /datasets?status=ready
**Then** the response status should be 200
**And** the response should contain 2 datasets
**And** all datasets should have status "ready"
**And** dataset ids should be ["ds_1", "ds_3"] in that order

---

### Scenario 3: Filter datasets by kind

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**And** the following datasets exist:

| id | tenantId | kind | status |
|----|----------|------|--------|
| ds_1 | tenant_1 | lora-training | ready |
| ds_2 | tenant_1 | reference | ready |
| ds_3 | tenant_1 | lora-training | pending |

**When** I send GET /datasets?kind=lora-training
**Then** the response status should be 200
**And** the response should contain 2 datasets
**And** all datasets should have kind "lora-training"
**And** dataset ids should include ["ds_1", "ds_3"]

---

### Scenario 4: Paginate datasets with take and skip

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**And** there are 50 datasets for tenant "tenant_1"
**When** I send GET /datasets?take=10&skip=20
**Then** the response status should be 200
**And** the response should contain 10 datasets
**And** the response header "X-Total-Count" should be "50"
**And** the datasets should be from position 21 to 30 (ordered by createdAt DESC)

---

### Scenario 5: Enforce maximum take limit

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**When** I send GET /datasets?take=500
**Then** the response status should be 400
**And** the response error should contain "take" field error
**And** the error message should mention "max 100"

---

### Scenario 6: Get single dataset by ID

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**And** a dataset with id "ds_123" exists:
```json
{
  "id": "ds_123",
  "tenantId": "tenant_1",
  "kind": "lora-training",
  "path": "datasets/tenant_1/my-lora-dataset",
  "status": "ready",
  "meta": {
    "filename": "dataset.zip",
    "imageCount": 50,
    "captioned": true
  },
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

**When** I send GET /datasets/ds_123
**Then** the response status should be 200
**And** the response should match the dataset object above
**And** all fields should be present (id, tenantId, kind, path, status, meta, createdAt, updatedAt)

---

### Scenario 7: Return 404 for non-existent dataset

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**And** no dataset with id "ds_nonexistent" exists
**When** I send GET /datasets/ds_nonexistent
**Then** the response status should be 404
**And** the response error message should be "Dataset with id ds_nonexistent not found"

---

### Scenario 8: Return 404 for dataset from different tenant (security)

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**And** a dataset with id "ds_other" exists with tenantId "tenant_2"
**When** I send GET /datasets/ds_other
**Then** the response status should be 404
**And** the response error message should be "Dataset with id ds_other not found"
**And** the response should NOT reveal that the dataset exists for another tenant

---

### Scenario 9: Return 401 when tenant context is missing

**Given** I send a request without authentication
**When** I send GET /datasets
**Then** the response status should be 401
**And** the response error message should be "Unauthorized"

---

### Scenario 10: Validate invalid status filter

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**When** I send GET /datasets?status=invalid_status
**Then** the response status should be 400
**And** the response should contain Zod validation error
**And** the error should reference "status" field
**And** the error should list valid enum values

---

### Scenario 11: Validate invalid sortBy parameter

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**When** I send GET /datasets?sortBy=invalidField
**Then** the response status should be 400
**And** the response should contain Zod validation error
**And** the error should reference "sortBy" field

---

### Scenario 12: Sort datasets by updatedAt descending

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**And** the following datasets exist:

| id | tenantId | createdAt | updatedAt |
|----|----------|-----------|-----------|
| ds_1 | tenant_1 | 2025-01-15T08:00:00Z | 2025-01-15T12:00:00Z |
| ds_2 | tenant_1 | 2025-01-15T09:00:00Z | 2025-01-15T11:00:00Z |
| ds_3 | tenant_1 | 2025-01-15T10:00:00Z | 2025-01-15T13:00:00Z |

**When** I send GET /datasets?sortBy=updatedAt&sortOrder=desc
**Then** the response status should be 200
**And** dataset ids should be ["ds_3", "ds_1", "ds_2"] in that order

---

### Scenario 13: Combine multiple filters and sorting

**Given** I am authenticated as user "user_1" from tenant "tenant_1"
**And** the following datasets exist:

| id | tenantId | kind | status | createdAt |
|----|----------|------|--------|-----------|
| ds_1 | tenant_1 | lora-training | ready | 2025-01-15T10:00:00Z |
| ds_2 | tenant_1 | lora-training | pending | 2025-01-15T09:00:00Z |
| ds_3 | tenant_1 | lora-training | ready | 2025-01-15T08:00:00Z |
| ds_4 | tenant_1 | reference | ready | 2025-01-15T07:00:00Z |

**When** I send GET /datasets?kind=lora-training&status=ready&sortBy=createdAt&sortOrder=asc
**Then** the response status should be 200
**And** the response should contain 2 datasets
**And** dataset ids should be ["ds_3", "ds_1"] in that order

---

## Acceptance Criteria (Definition of Done)

- [ ] GET /datasets endpoint implemented with filtering and pagination
- [ ] GET /datasets/:id endpoint implemented
- [ ] Zod schemas created in dto.ts for query parameters and responses
- [ ] Tenant isolation enforced (multi-layer: middleware + service check)
- [ ] OpenAPI documentation added with @ApiOperation decorators
- [ ] Service methods: `list()` and `getById()` implemented
- [ ] Database indexes created: compound indexes on (tenantId, status), (tenantId, kind), (tenantId, createdAt)
- [ ] Unit/Integration tests for all scenarios above (13 total)
- [ ] Error handling: 404 for non-existent dataset, 400 for invalid query params, 401 for missing auth
- [ ] X-Total-Count header included in list response
- [ ] Default sorting by createdAt DESC
- [ ] Max take limit of 100 enforced
- [ ] All tests passing (RED → GREEN)

## Technical Notes

**Files to Create/Modify**:
1. `apps/api/src/datasets/dto.ts` - NEW (Zod schemas)
2. `apps/api/src/datasets/datasets.service.ts` - UPDATE (add list, getById methods)
3. `apps/api/src/datasets/datasets.controller.ts` - UPDATE (add GET endpoints)
4. `apps/api/prisma/schema.prisma` - UPDATE (add indexes to Dataset model)
5. `apps/api/test/datasets.e2e-spec.ts` - UPDATE (add BDD test scenarios)

**Migration Command**:
```bash
cd apps/api && pnpm dlx prisma migrate dev --name add_dataset_indexes
```

**Index Definition** (schema.prisma):
```prisma
model Dataset {
  // ... existing fields
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, kind])
  @@index([tenantId, createdAt])
}
```

## Related Issues

- Depends on: N/A (standalone feature)
- Blocks: LoRA training UI, n8n workflow dataset browsing
- Related: Jobs controller pattern (reference implementation)

## Effort Estimation

**S (2-4 hours)** - Straightforward implementation following proven patterns

**Breakdown**:
- DTOs creation: 30 minutes
- Service implementation: 45 minutes
- Controller implementation: 30 minutes
- Database migration: 15 minutes
- Tests implementation: 90 minutes
- Documentation: 30 minutes

---

**Generated with Claude Code**
**Co-Authored-By**: Claude <noreply@anthropic.com>
