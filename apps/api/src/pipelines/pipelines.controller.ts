import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';
import { PipelinesService } from './pipelines.service';
import {
  CreatePipelineExecutionSchema,
  UpdatePipelineProgressSchema,
  ListPipelinesQuerySchema,
  GetPipelineParamSchema,
} from './dto';

/**
 * PipelinesController
 *
 * Provides REST API endpoints for tracking n8n pipeline executions.
 * Used by n8n workflows to initialize, update, and query pipeline progress.
 *
 * Endpoints:
 * - POST /pipelines - Create new pipeline execution
 * - GET /pipelines/:executionId - Get pipeline progress by n8n execution ID
 * - PATCH /pipelines/:executionId - Update pipeline progress
 * - GET /pipelines - List all pipelines with filtering and pagination
 *
 * Security: Rate limited to 10 requests per minute per IP to prevent DoS attacks
 * and ensure fair resource usage across n8n workflow executions.
 */
@ApiTags('pipelines')
@Controller('pipelines')
@UseGuards(ThrottlerGuard)
export class PipelinesController {
  constructor(private readonly svc: PipelinesService) {}

  /**
   * Create a new pipeline execution record
   *
   * Called by n8n webhook at the start of pipeline to initialize tracking.
   * The executionId must be unique and typically comes from n8n's $execution.id.
   *
   * @example
   * POST /pipelines
   * {
   *   "executionId": "exec_12345",
   *   "workflowId": "workflow_lora_pipeline",
   *   "tenantId": "tenant_1",
   *   "payload": {
   *     "datasetId": "ds_001",
   *     "trainingName": "influencer_v1"
   *   }
   * }
   */
  @Post()
  @ApiOperation({
    summary: 'Create pipeline execution (idempotent)',
    description:
      'Creates a new pipeline execution record for tracking progress. Called by n8n webhook at pipeline start. ' +
      'IDEMPOTENT: If executionId already exists, returns the existing record (200) instead of throwing 409 Conflict. ' +
      'This allows safe retries from n8n webhooks without duplicate executions.',
  })
  @ApiResponse({ status: 201, description: 'Pipeline execution created successfully' })
  @ApiResponse({ status: 200, description: 'Pipeline execution already exists (idempotent retry)' })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid parameters or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing tenant context',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded - too many requests (max 10 per minute)',
  })
  async create(@Body() body: unknown) {
    const parsed = CreatePipelineExecutionSchema.safeParse(body);
    if (!parsed.success) {
      const formatted = parsed.error.flatten();
      const errorMessage =
        Object.entries(formatted.fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
          .join('; ') ||
        formatted.formErrors.join('; ') ||
        'Validation error';
      throw new BadRequestException(errorMessage);
    }
    return this.svc.create(parsed.data);
  }

  /**
   * List pipeline executions with optional filters and pagination
   *
   * Returns paginated list of pipelines for the current tenant.
   * Supports filtering by status and sorting by various fields.
   * Total count is returned in the x-total-count response header.
   *
   * @example
   * GET /pipelines?status=COMPLETED&take=10&skip=0&sortBy=startedAt&sortOrder=desc
   */
  @Get()
  @ApiOperation({
    summary: 'List pipeline executions',
    description:
      'List pipeline executions with optional filters (status), sorting, and pagination. Total count in x-total-count header.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pipelines list with x-total-count header',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing tenant context',
  })
  async list(
    @Query('status') status?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Res({ passthrough: true }) res?: FastifyReply
  ) {
    // Validate query parameters with Zod
    const parsed = ListPipelinesQuerySchema.safeParse({
      status,
      take,
      skip,
      sortBy,
      sortOrder,
    });

    if (!parsed.success) {
      const formatted = parsed.error.flatten();
      const errorMessage =
        Object.entries(formatted.fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
          .join('; ') ||
        formatted.formErrors.join('; ') ||
        'Validation error';
      throw new BadRequestException(errorMessage);
    }

    // Get pipelines from service
    const result = await this.svc.list(parsed.data);

    // Set x-total-count header for pagination (Fastify pattern)
    if (res) {
      res.header('x-total-count', result.total.toString());
    }

    // Return array of pipelines (not wrapped in object)
    return result.data;
  }

  /**
   * Get pipeline execution by n8n execution ID
   *
   * Returns current state of pipeline including progress, status, job IDs, and errors.
   * Used by external systems to poll pipeline progress.
   *
   * @example
   * GET /pipelines/exec_12345
   */
  @Get(':executionId')
  @ApiOperation({
    summary: 'Get pipeline execution by ID',
    description:
      'Get pipeline execution progress and state by n8n execution ID. Returns 404 if not found or belongs to different tenant.',
  })
  @ApiResponse({ status: 200, description: 'Pipeline execution found' })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid executionId format',
  })
  @ApiResponse({
    status: 404,
    description: 'Pipeline execution not found or does not belong to current tenant',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing tenant context',
  })
  async getByExecutionId(@Param('executionId') executionId: string) {
    // Validate executionId parameter
    const parsed = GetPipelineParamSchema.safeParse({ executionId });
    if (!parsed.success) {
      const formatted = parsed.error.flatten();
      const errorMessage =
        Object.entries(formatted.fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
          .join('; ') ||
        formatted.formErrors.join('; ') ||
        'Validation error';
      throw new BadRequestException(errorMessage);
    }

    return this.svc.getByExecutionId(parsed.data.executionId);
  }

  /**
   * Update pipeline execution progress
   *
   * Called by n8n workflow nodes after each stage completes.
   * Updates status, progress percentage, job IDs, asset IDs, costs, etc.
   * Supports partial updates - only provided fields are updated.
   *
   * @example
   * PATCH /pipelines/exec_12345
   * {
   *   "status": "GENERATING_IMAGES",
   *   "currentStage": "Image Generation",
   *   "stagesCompleted": 2,
   *   "progressPercent": 33,
   *   "trainingJobId": "job_training_001"
   * }
   */
  @Patch(':executionId')
  @ApiOperation({
    summary: 'Update pipeline execution progress',
    description:
      'Update pipeline execution state and progress. Called by n8n workflow nodes after each stage. Supports partial updates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pipeline execution updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Pipeline execution not found or does not belong to current tenant',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing tenant context',
  })
  async updateProgress(
    @Param('executionId') executionId: string,
    @Body() body: unknown
  ) {
    // Validate executionId parameter
    const paramParsed = GetPipelineParamSchema.safeParse({ executionId });
    if (!paramParsed.success) {
      const formatted = paramParsed.error.flatten();
      const errorMessage =
        Object.entries(formatted.fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
          .join('; ') ||
        formatted.formErrors.join('; ') ||
        'Validation error';
      throw new BadRequestException(errorMessage);
    }

    // Validate request body
    const bodyParsed = UpdatePipelineProgressSchema.safeParse(body);
    if (!bodyParsed.success) {
      const formatted = bodyParsed.error.flatten();
      const errorMessage =
        Object.entries(formatted.fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
          .join('; ') ||
        formatted.formErrors.join('; ') ||
        'Validation error';
      throw new BadRequestException(errorMessage);
    }

    return this.svc.updateProgress(paramParsed.data.executionId, bodyParsed.data);
  }
}
