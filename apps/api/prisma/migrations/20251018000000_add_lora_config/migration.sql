-- CreateTable
CREATE TABLE "LoraConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modelName" TEXT NOT NULL,
    "epochs" INTEGER NOT NULL DEFAULT 10,
    "learningRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0001,
    "batchSize" INTEGER NOT NULL DEFAULT 1,
    "resolution" INTEGER NOT NULL DEFAULT 512,
    "networkDim" INTEGER NOT NULL DEFAULT 32,
    "networkAlpha" INTEGER NOT NULL DEFAULT 16,
    "outputPath" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoraConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoraConfig_tenantId_name_key" ON "LoraConfig"("tenantId", "name");

-- CreateIndex
CREATE INDEX "LoraConfig_tenantId_idx" ON "LoraConfig"("tenantId");

-- CreateIndex
CREATE INDEX "LoraConfig_tenantId_isDefault_idx" ON "LoraConfig"("tenantId", "isDefault");

-- CreateIndex
CREATE INDEX "LoraConfig_tenantId_modelName_idx" ON "LoraConfig"("tenantId", "modelName");

-- CreateIndex
CREATE INDEX "LoraConfig_tenantId_createdAt_idx" ON "LoraConfig"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "LoraConfig" ADD CONSTRAINT "LoraConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
