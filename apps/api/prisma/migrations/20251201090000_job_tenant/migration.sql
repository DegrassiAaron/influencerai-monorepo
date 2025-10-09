-- Prisma Migration: Add tenant relation to Job

-- Add tenantId column nullable to allow backfill
ALTER TABLE "Job" ADD COLUMN "tenantId" TEXT;

-- Backfill tenantId from payload. Prefer explicit tenantId property when available
UPDATE "Job"
SET "tenantId" = payload ->> 'tenantId'
WHERE "tenantId" IS NULL
  AND payload ? 'tenantId';

-- Fallback: infer tenant via influencerId embedded in payload
UPDATE "Job" AS j
SET "tenantId" = i."tenantId"
FROM "Influencer" AS i
WHERE j."tenantId" IS NULL
  AND (j.payload ->> 'influencerId') = i."id";

-- Ensure no orphaned rows remain before enforcing constraint
UPDATE "Job"
SET "tenantId" = t."id"
FROM "Tenant" AS t
WHERE "Job"."tenantId" IS NULL
  AND t."id" = ("Job".payload ->> 'tenantId');

-- Finally require tenantId and add relational constraints
ALTER TABLE "Job"
ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "Job_tenantId_idx" ON "Job"("tenantId");

ALTER TABLE "Job" ADD CONSTRAINT "Job_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
