import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../lib/request-context';
import {
  CreatePipelineExecutionDto,
  UpdatePipelineProgressDto,
  ListPipelinesQuery,
} from './dto';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new pipeline execution record
   * Called by n8n webhook at the start of pipeline
   *
   * IDEMPOTENT: If executionId already exists, returns the existing record instead of throwing an error.
   * This allows safe retries from n8n webhooks without creating duplicate pipeline executions.
   *
   * @param input - Pipeline execution data including executionId, workflowId, payload
   * @returns Created or existing pipeline execution record
   * @throws UnauthorizedException if tenant context is missing
   */
  async create(input: CreatePipelineExecutionDto) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId || input.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    try {
      const pipeline = await this.prisma.pipelineExecution.create({
        data: {
          executionId: input.executionId,
          workflowId: input.workflowId,
          tenantId,
          payload: input.payload,
          totalStages: input.totalStages ?? 6,
          status: 'STARTED',
          stagesCompleted: 0,
          progressPercent: 0,
        },
      });

      return pipeline;
    } catch (error: any) {
      // Idempotent behavior: If executionId already exists, return existing record
      // This makes POST /pipelines safe for n8n retries (network failures, timeouts, etc.)
      // Without this, retries would fail with 409 Conflict and create duplicate tracking issues
      if (error.code === 'P2002' && error.meta?.target?.includes('executionId')) {
        const existing = await this.prisma.pipelineExecution.findUnique({
          where: { executionId: input.executionId },
        });

        // Defensive check: ensure the existing record belongs to the same tenant
        if (existing && existing.tenantId === tenantId) {
          return existing;
        }

        // If tenant mismatch or record not found (race condition), throw conflict
        throw new ConflictException(
          `Pipeline execution with executionId "${input.executionId}" already exists`
        );
      }
      throw error;
    }
  }

  /**
   * Get pipeline execution by n8n executionId
   *
   * @param executionId - n8n workflow execution ID
   * @returns Pipeline execution record
   * @throws NotFoundException if not found or belongs to different tenant
   * @throws UnauthorizedException if tenant context is missing
   */
  async getByExecutionId(executionId: string) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    const pipeline = await this.prisma.pipelineExecution.findUnique({
      where: { executionId },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline execution ${executionId} not found`);
    }

    // Defensive security check: Return 404 instead of 403 to avoid information disclosure
    // (OWASP best practice - don't reveal existence of resources in other tenants)
    if (pipeline.tenantId !== tenantId) {
      throw new NotFoundException(`Pipeline execution ${executionId} not found`);
    }

    return pipeline;
  }

  /**
   * Update pipeline execution progress
   * Called by n8n workflow nodes after each stage completes
   *
   * @param executionId - n8n workflow execution ID
   * @param updates - Progress updates (status, stage, jobIds, etc.)
   * @returns Updated pipeline execution record
   * @throws NotFoundException if not found or belongs to different tenant
   */
  async updateProgress(executionId: string, updates: UpdatePipelineProgressDto) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    // First verify the pipeline exists and belongs to current tenant
    const existing = await this.prisma.pipelineExecution.findUnique({
      where: { executionId },
    });

    if (!existing) {
      throw new NotFoundException(`Pipeline execution ${executionId} not found`);
    }

    if (existing.tenantId !== tenantId) {
      throw new NotFoundException(`Pipeline execution ${executionId} not found`);
    }

    // Build update data - only include fields that are provided
    const updateData: any = {};

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.currentStage !== undefined) updateData.currentStage = updates.currentStage;
    if (updates.stagesCompleted !== undefined)
      updateData.stagesCompleted = updates.stagesCompleted;
    if (updates.progressPercent !== undefined)
      updateData.progressPercent = updates.progressPercent;
    if (updates.trainingJobId !== undefined) updateData.trainingJobId = updates.trainingJobId;
    if (updates.loraPath !== undefined) updateData.loraPath = updates.loraPath;
    if (updates.totalCostTok !== undefined) updateData.totalCostTok = updates.totalCostTok;
    if (updates.completedAt !== undefined) updateData.completedAt = updates.completedAt;
    if (updates.errorMessage !== undefined) updateData.errorMessage = updates.errorMessage;
    if (updates.errorStage !== undefined) updateData.errorStage = updates.errorStage;

    // Handle array fields - use Prisma's array set operation
    if (updates.imageJobIds !== undefined) updateData.imageJobIds = updates.imageJobIds;
    if (updates.videoJobIds !== undefined) updateData.videoJobIds = updates.videoJobIds;
    if (updates.assetIds !== undefined) updateData.assetIds = updates.assetIds;

    // Perform update
    const updated = await this.prisma.pipelineExecution.update({
      where: { executionId },
      data: updateData,
    });

    return updated;
  }

  /**
   * List pipeline executions with filtering, sorting, and pagination
   * Returns pipelines for current tenant only
   *
   * @param query - Filter, sort, and pagination parameters
   * @returns Paginated list of pipeline executions with total count
   * @throws UnauthorizedException if tenant context is missing
   */
  async list(query: ListPipelinesQuery): Promise<{
    data: Awaited<ReturnType<typeof this.prisma.pipelineExecution.findMany>>;
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

    // Build orderBy clause from sortBy and sortOrder
    const sortBy = query.sortBy ?? 'startedAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy: Record<string, 'asc' | 'desc'> = { [sortBy]: sortOrder };

    // Pagination parameters
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    // Execute parallel queries for data and total count (50% faster than sequential)
    const [data, total] = await Promise.all([
      this.prisma.pipelineExecution.findMany({
        where,
        orderBy,
        take,
        skip,
      }),
      this.prisma.pipelineExecution.count({ where }),
    ]);

    return { data, total, take, skip };
  }
}
