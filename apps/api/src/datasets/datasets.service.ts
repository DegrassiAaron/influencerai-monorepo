import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { getRequestContext } from '../lib/request-context';
import {
  CreateDatasetDto,
  UpdateDatasetStatusDto,
  ListDatasetsQuery,
} from './dto';
import type { Dataset } from '@prisma/client';

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

  /**
   * List datasets with filtering, sorting, and pagination
   * Returns datasets for current tenant only
   */
  async list(query: ListDatasetsQuery): Promise<{
    data: Dataset[];
    total: number;
    take: number;
    skip: number;
  }> {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    // Build where clause with tenant isolation and optional filters
    const where: any = {
      tenantId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.kind) {
      where.kind = query.kind;
    }

    // Build orderBy clause from sortBy and sortOrder
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy: Record<string, 'asc' | 'desc'> = { [sortBy]: sortOrder };

    // Pagination parameters
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    // Execute parallel queries for data and total count
    const [data, total] = await Promise.all([
      this.prisma.dataset.findMany({
        where,
        orderBy,
        take,
        skip,
      }),
      this.prisma.dataset.count({ where }),
    ]);

    return { data, total, take, skip };
  }

  /**
   * Get a single dataset by ID
   * Returns 404 if not found or belongs to different tenant (security)
   * Note: In production, Prisma middleware handles tenant filtering automatically.
   * In tests (without middleware), we perform manual validation for security.
   */
  async getById(id: string): Promise<Dataset> {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    const dataset = await this.prisma.dataset.findUnique({
      where: { id },
    });

    // Return 404 if not found
    if (!dataset) {
      throw new NotFoundException(`Dataset ${id} not found`);
    }

    // Defensive security check: Verify tenant ownership
    // In production: Prisma middleware already filters by tenantId, so this is redundant but harmless
    // In tests: Middleware is mocked, so we need explicit validation
    // Return 404 instead of 403 to avoid information disclosure (OWASP best practice)
    if (dataset.tenantId !== tenantId) {
      throw new NotFoundException(`Dataset ${id} not found`);
    }

    return dataset;
  }
}
