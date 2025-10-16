import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { z } from 'zod';
import { getRequestContext } from '../lib/request-context';

export const CreateDatasetSchema = z.object({
  kind: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});
export type CreateDatasetDto = z.infer<typeof CreateDatasetSchema>;

export const UpdateDatasetStatusSchema = z.object({
  status: z.enum(['pending', 'ready', 'processing', 'failed', 'completed']).or(z.string().min(1)),
});
export type UpdateDatasetStatusDto = z.infer<typeof UpdateDatasetStatusSchema>;

@Injectable()
export class DatasetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async create(
    input: CreateDatasetDto
  ): Promise<{ id: string; uploadUrl: string; key: string; bucket: string }> {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId || 'unknown';

    // Create dataset with a deterministic S3 key
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const key = `datasets/${tenantId}/${tempId}/${input.filename}`;

    const ds = await this.prisma.dataset.create({
      data: {
        kind: input.kind,
        path: key,
        meta: { filename: input.filename, contentType: input.contentType, ...(input.meta || {}) },
        status: 'pending',
      },
    });

    // If DB created with a different id than tempId, rebuild key to include real id
    const finalKey = `datasets/${tenantId}/${ds.id}/${input.filename}`;
    if (finalKey !== key) {
      await this.prisma.dataset.update({ where: { id: ds.id }, data: { path: finalKey } });
    }

    const uploadUrl = await this.storage.getPresignedPutUrl({
      key: finalKey,
      contentType: input.contentType,
    });
    return { id: ds.id, uploadUrl, key: finalKey, bucket: this.storage.getBucketName() };
  }

  async updateStatus(id: string, input: UpdateDatasetStatusDto) {
    // Update within tenant scope thanks to Prisma middleware
    const updated = await this.prisma.dataset.update({
      where: { id },
      data: { status: input.status },
    });
    if (!updated) throw new NotFoundException('Dataset not found');
    return updated;
  }
}
