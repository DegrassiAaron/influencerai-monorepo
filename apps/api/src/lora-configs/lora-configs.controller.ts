import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Res,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { LoraConfigsService } from './lora-configs.service';
import {
  CreateLoraConfigSchema,
  UpdateLoraConfigSchema,
  ListLoraConfigsQuerySchema,
  GetLoraConfigParamSchema,
  type CreateLoraConfigInput,
  type UpdateLoraConfigInput,
  type ListLoraConfigsQuery,
} from './dto';

/**
 * REST API controller for LoRA training configuration management.
 *
 * All endpoints require authentication and operate within tenant context.
 * Follows RESTful conventions and OpenAPI specification.
 */
@ApiTags('lora-configs')
@Controller('lora-configs')
export class LoraConfigsController {
  constructor(private readonly loraConfigsService: LoraConfigsService) {}

  /**
   * Create a new LoRA training configuration.
   *
   * Request body validation:
   * - Name: 1-100 chars, must be unique per tenant
   * - modelName: Required base model identifier
   * - All training parameters have sensible defaults
   * - isDefault: If true, unsets all other defaults for this tenant
   *
   * @param body - Raw request body (validated against CreateLoraConfigSchema)
   * @returns Created LoRA configuration with generated ID and timestamps
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new LoRA training configuration',
    description: `
      Creates a new LoRA training configuration for the authenticated tenant.

      Key behaviors:
      - Name must be unique within the tenant
      - If isDefault is true, all other configs for this tenant will have isDefault set to false
      - Training parameters use sensible defaults if not provided
      - Returns 409 if a configuration with the same name already exists
    `,
  })
  @ApiBody({
    description: 'LoRA configuration parameters',
    schema: {
      type: 'object',
      required: ['name', 'modelName'],
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          example: 'My Influencer Style',
        },
        description: {
          type: 'string',
          maxLength: 500,
          example: 'Configuration for training realistic portrait style',
        },
        modelName: {
          type: 'string',
          example: 'sd15',
        },
        epochs: {
          type: 'number',
          minimum: 1,
          maximum: 1000,
          default: 10,
          example: 20,
        },
        learningRate: {
          type: 'number',
          minimum: 0.000001,
          maximum: 1,
          default: 0.0001,
          example: 0.0001,
        },
        batchSize: {
          type: 'number',
          minimum: 1,
          maximum: 64,
          default: 1,
          example: 2,
        },
        resolution: {
          type: 'number',
          minimum: 128,
          maximum: 2048,
          default: 512,
          example: 512,
        },
        networkDim: {
          type: 'number',
          minimum: 1,
          maximum: 512,
          default: 32,
          example: 64,
        },
        networkAlpha: {
          type: 'number',
          minimum: 1,
          maximum: 512,
          default: 16,
          example: 32,
        },
        outputPath: {
          type: 'string',
          maxLength: 255,
          example: '/data/loras/my-influencer',
        },
        meta: {
          type: 'object',
          additionalProperties: true,
          example: { optimizer: 'AdamW8bit', lr_scheduler: 'cosine' },
        },
        isDefault: {
          type: 'boolean',
          default: false,
          example: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'LoRA configuration created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - configuration with this name already exists',
  })
  async create(@Body() body: unknown) {
    const result = CreateLoraConfigSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten();
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.fieldErrors,
      });
    }

    return this.loraConfigsService.create(result.data);
  }

  /**
   * List LoRA configurations with optional filtering, pagination, and sorting.
   *
   * Query parameters:
   * - isDefault: Filter by default status (true/false)
   * - modelName: Filter by base model name
   * - take: Number of results (1-100, default 20)
   * - skip: Number of results to skip (default 0)
   * - sortBy: Field to sort by (createdAt/updatedAt/name, default createdAt)
   * - sortOrder: Sort direction (asc/desc, default desc)
   *
   * @param query - URL query parameters
   * @param res - Fastify response object for setting headers
   * @returns Paginated list with data array, total count, and pagination metadata
   */
  @Get()
  @ApiOperation({
    summary: 'List LoRA configurations',
    description: `
      Retrieve a paginated list of LoRA configurations for the authenticated tenant.

      Supports filtering by:
      - isDefault flag (get the default config)
      - modelName (configs for a specific base model)

      Results are paginated and sortable by createdAt, updatedAt, or name.
    `,
  })
  @ApiQuery({
    name: 'isDefault',
    required: false,
    type: String,
    enum: ['true', 'false'],
    description: 'Filter by default status',
  })
  @ApiQuery({
    name: 'modelName',
    required: false,
    type: String,
    description: 'Filter by base model name',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of results to return (1-100)',
    example: 20,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of results to skip',
    example: 0,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt', 'name'],
    description: 'Field to sort by',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction',
    example: 'desc',
  })
  @ApiResponse({
    status: 200,
    description: 'List of LoRA configurations',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        total: {
          type: 'number',
          example: 42,
        },
        take: {
          type: 'number',
          example: 20,
        },
        skip: {
          type: 'number',
          example: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async list(
    @Query() query: unknown,
    @Res({ passthrough: true }) res?: FastifyReply
  ) {
    const result = ListLoraConfigsQuerySchema.safeParse(query);

    if (!result.success) {
      const errors = result.error.flatten();
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.fieldErrors,
      });
    }

    const response = await this.loraConfigsService.list(result.data);

    // Set pagination headers for client convenience
    if (res) {
      res.header('X-Total-Count', response.total.toString());
      res.header('X-Take', response.take.toString());
      res.header('X-Skip', response.skip.toString());
    }

    return response;
  }

  /**
   * Get a single LoRA configuration by ID.
   *
   * Security: Returns 404 if config doesn't exist OR belongs to a different tenant.
   * This prevents information leakage about cross-tenant resources.
   *
   * @param id - Configuration ID (UUID)
   * @returns Full LoRA configuration object
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a LoRA configuration by ID',
    description: `
      Retrieve detailed information about a specific LoRA configuration.

      Returns 404 if:
      - Configuration with this ID doesn't exist
      - Configuration belongs to a different tenant (no 403 to avoid info leakage)
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'LoRA configuration ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'LoRA configuration details',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuration not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getById(@Param('id') id: string) {
    const result = GetLoraConfigParamSchema.safeParse({ id });

    if (!result.success) {
      const errors = result.error.flatten();
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.fieldErrors,
      });
    }

    return this.loraConfigsService.getById(id);
  }

  /**
   * Update an existing LoRA configuration.
   *
   * Partial updates are supported - only provided fields will be updated.
   *
   * Special behaviors:
   * - If changing name, validates uniqueness within tenant
   * - If setting isDefault=true, unsets all other defaults
   *
   * @param id - Configuration ID
   * @param body - Fields to update (all optional)
   * @returns Updated configuration object
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a LoRA configuration',
    description: `
      Update one or more fields of an existing LoRA configuration.

      Key behaviors:
      - Partial updates supported (only send fields you want to change)
      - Name must be unique within tenant if changing it
      - If setting isDefault to true, all other configs will have isDefault set to false
      - Returns 404 if config doesn't exist or belongs to different tenant
      - Returns 409 if new name conflicts with existing config
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'LoRA configuration ID',
  })
  @ApiBody({
    description: 'Fields to update (all optional)',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 500 },
        modelName: { type: 'string', maxLength: 50 },
        epochs: { type: 'number', minimum: 1, maximum: 1000 },
        learningRate: { type: 'number', minimum: 0.000001, maximum: 1 },
        batchSize: { type: 'number', minimum: 1, maximum: 64 },
        resolution: { type: 'number', minimum: 128, maximum: 2048 },
        networkDim: { type: 'number', minimum: 1, maximum: 512 },
        networkAlpha: { type: 'number', minimum: 1, maximum: 512 },
        outputPath: { type: 'string', maxLength: 255 },
        meta: { type: 'object', additionalProperties: true },
        isDefault: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuration not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - name already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async update(@Param('id') id: string, @Body() body: unknown) {
    const paramResult = GetLoraConfigParamSchema.safeParse({ id });
    if (!paramResult.success) {
      const errors = paramResult.error.flatten();
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.fieldErrors,
      });
    }

    const bodyResult = UpdateLoraConfigSchema.safeParse(body);
    if (!bodyResult.success) {
      const errors = bodyResult.error.flatten();
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.fieldErrors,
      });
    }

    return this.loraConfigsService.update(id, bodyResult.data);
  }

  /**
   * Delete a LoRA configuration.
   *
   * Delete protection:
   * - Prevents deletion if any active jobs (pending/running) use this config
   * - Allows deletion if only completed/failed jobs exist
   * - Returns warning if deleting the default config
   *
   * @param id - Configuration ID
   * @returns Success status with optional warnings
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a LoRA configuration',
    description: `
      Delete a LoRA configuration if no active jobs are using it.

      Delete protection:
      - Returns 400 if any jobs with status 'pending' or 'running' reference this config
      - Successfully deletes if only completed/failed jobs exist
      - Returns warning in response if deleting the default config

      Response includes:
      - success: boolean indicating deletion completed
      - warnings: optional array of warning messages
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'LoRA configuration ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        warnings: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Deleted the default LoRA configuration. Consider setting a new default.',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete - active jobs are using this configuration',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuration not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async delete(@Param('id') id: string) {
    const result = GetLoraConfigParamSchema.safeParse({ id });

    if (!result.success) {
      const errors = result.error.flatten();
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.fieldErrors,
      });
    }

    return this.loraConfigsService.delete(id);
  }
}
