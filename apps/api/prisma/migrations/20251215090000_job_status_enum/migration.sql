-- Prisma Migration: Convert Job.status to JobStatus enum

-- Create the enum type aligned with schema.prisma
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'completed');

-- Prepare new column with the enum type and default
ALTER TABLE "Job" ADD COLUMN "status_new" "JobStatus" NOT NULL DEFAULT 'pending';

-- Preserve existing status values where they match the allowed set
UPDATE "Job"
SET "status_new" = CASE
    WHEN "status" = 'pending' THEN 'pending'::"JobStatus"
    WHEN "status" = 'running' THEN 'running'::"JobStatus"
    WHEN "status" = 'succeeded' THEN 'succeeded'::"JobStatus"
    WHEN "status" = 'failed' THEN 'failed'::"JobStatus"
    WHEN "status" = 'completed' THEN 'completed'::"JobStatus"
    ELSE 'pending'::"JobStatus"
  END;

-- Rebuild column and indexes on the enum type
DROP INDEX IF EXISTS "Job_status_idx";
ALTER TABLE "Job" DROP COLUMN "status";
ALTER TABLE "Job" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'pending'::"JobStatus";

CREATE INDEX "Job_status_idx" ON "Job"("status");
