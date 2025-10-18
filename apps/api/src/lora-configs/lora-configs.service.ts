import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../lib/request-context';
import type {
  CreateLoraConfigInput,
  UpdateLoraConfigInput,
  ListLoraConfigsQuery,
} from './dto';

/**
 * Service layer for LoRA configuration management.
 *
 * Responsibilities:
 * - CRUD operations for LoRA training configurations
 * - Default configuration management (only one per tenant)
 * - Delete protection (prevent deletion if active jobs exist)
 * - Multi-tenant isolation via request context
 */
@Injectable()
export class LoraConfigsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new LoRA configuration.
   *
   * Business logic:
   * - Validates tenant context exists
   * - If isDefault=true, unsets all other defaults for this tenant (transaction)
   * - Applies default values for optional training parameters
   *
   * @throws ConflictException if name already exists for this tenant
   * @throws BadRequestException if tenant context is missing
   */
  async create(input: CreateLoraConfigInput) {
    const { tenantId } = getRequestContext();
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    // Check for duplicate name within tenant
    const existing = await this.prisma.loraConfig.findFirst({
      where: {
        tenantId,
        name: input.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        `LoRA configuration with name "${input.name}" already exists`
      );
    }

    // If setting as default, unset all other defaults in a transaction
    if (input.isDefault === true) {
      return this.prisma.$transaction(async (tx: any) => {
        // Unset all existing defaults for this tenant
        await tx.loraConfig.updateMany({
          where: {
            tenantId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });

        // Create new config as default
        return tx.loraConfig.create({
          data: {
            ...input,
            tenantId,
          },
        });
      });
    }

    // Standard create without default handling
    return this.prisma.loraConfig.create({
      data: {
        ...input,
        tenantId,
      },
    });
  }

  /**
   * List LoRA configurations with optional filters, pagination, and sorting.
   *
   * Performance optimizations:
   * - Parallel execution of count and data queries via Promise.all()
   * - Efficient indexing on tenantId, isDefault, and modelName columns
   *
   * @returns Paginated result with data, total count, and pagination metadata
   */
  async list(query: ListLoraConfigsQuery) {
    const { tenantId } = getRequestContext();
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const { isDefault, modelName, take, skip, sortBy, sortOrder } = query;

    // Build WHERE clause for filters
    const where: any = {
      tenantId,
      ...(isDefault !== undefined && { isDefault }),
      ...(modelName && { modelName }),
    };

    // Build ORDER BY clause
    const orderBy: Record<string, 'asc' | 'desc'> = {
      [sortBy as string]: sortOrder,
    };

    // Execute count and data queries in parallel for performance
    const [data, total] = await Promise.all([
      this.prisma.loraConfig.findMany({
        where,
        orderBy,
        take,
        skip,
      }),
      this.prisma.loraConfig.count({ where }),
    ]);

    return {
      data,
      total,
      take,
      skip,
    };
  }

  /**
   * Get a single LoRA configuration by ID.
   *
   * Security: Returns 404 if config doesn't exist OR belongs to different tenant
   * (no 403 to avoid leaking existence of cross-tenant resources)
   *
   * @throws NotFoundException if config not found or belongs to different tenant
   */
  async getById(id: string) {
    const { tenantId } = getRequestContext();
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const config = await this.prisma.loraConfig.findFirst({
      where: {
        id,
        tenantId, // Ensures tenant isolation
      },
    });

    if (!config) {
      throw new NotFoundException(`LoRA configuration with ID "${id}" not found`);
    }

    return config;
  }

  /**
   * Update an existing LoRA configuration.
   *
   * Business logic:
   * - If updating isDefault to true, unsets all other defaults (transaction)
   * - Validates name uniqueness if name is being changed
   * - Partial updates supported (only provided fields are updated)
   *
   * @throws NotFoundException if config not found
   * @throws ConflictException if new name conflicts with existing config
   */
  async update(
    id: string,
    input: UpdateLoraConfigInput
  ) {
    const { tenantId } = getRequestContext();
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    // Verify config exists and belongs to tenant
    const existing = await this.getById(id);

    // If changing name, check for conflicts
    if (input.name && input.name !== existing.name) {
      const duplicate = await this.prisma.loraConfig.findFirst({
        where: {
          tenantId,
          name: input.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `LoRA configuration with name "${input.name}" already exists`
        );
      }
    }

    // If setting as default, unset all other defaults in a transaction
    if (input.isDefault === true) {
      return this.prisma.$transaction(async (tx: any) => {
        // Unset all existing defaults for this tenant
        await tx.loraConfig.updateMany({
          where: {
            tenantId,
            isDefault: true,
            id: { not: id },
          },
          data: {
            isDefault: false,
          },
        });

        // Update the target config
        return tx.loraConfig.update({
          where: { id },
          data: input,
        });
      });
    }

    // Standard update without default handling
    return this.prisma.loraConfig.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Delete a LoRA configuration.
   *
   * Delete protection:
   * - Prevents deletion if any jobs with status 'pending' or 'running' reference this config
   * - Allows deletion if only completed/failed jobs exist
   * - Returns warning in response if deleting the default config
   *
   * @returns Object with success status and optional warnings
   * @throws NotFoundException if config not found
   * @throws BadRequestException if active jobs prevent deletion
   */
  async delete(id: string): Promise<{
    success: boolean;
    warnings?: string[];
  }> {
    const { tenantId } = getRequestContext();
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    // Verify config exists and belongs to tenant
    const config = await this.getById(id);

    // Check for active jobs using this config
    // Jobs store config ID in payload.configId (see LoraTrainingPayload type in worker)
    const activeJobsCount = await this.prisma.job.count({
      where: {
        tenantId,
        payload: {
          path: ['configId'],
          equals: id,
        },
        status: {
          in: ['pending', 'running'],
        },
      },
    });

    if (activeJobsCount > 0) {
      throw new BadRequestException(
        `Cannot delete LoRA configuration "${config.name}" because ${activeJobsCount} active job(s) are using it. Wait for jobs to complete or cancel them first.`
      );
    }

    // Perform deletion
    await this.prisma.loraConfig.delete({
      where: { id },
    });

    const warnings: string[] = [];
    if (config.isDefault) {
      warnings.push(
        'Deleted the default LoRA configuration. Consider setting a new default.'
      );
    }

    return {
      success: true,
      ...(warnings.length > 0 && { warnings }),
    };
  }
}
