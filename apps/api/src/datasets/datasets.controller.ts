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
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { DatasetsService } from './datasets.service';
import {
  CreateDatasetSchema,
  UpdateDatasetStatusSchema,
  ListDatasetsQuerySchema,
  GetDatasetParamSchema,
} from './dto';

@ApiTags('datasets')
@Controller('datasets')
export class DatasetsController {
  constructor(private readonly svc: DatasetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create dataset record and return presigned upload URL' })
  @ApiResponse({ status: 201, description: 'Dataset created with upload URL' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() body: unknown) {
    const parsed = CreateDatasetSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.create(parsed.data);
  }

  @Get()
  @ApiOperation({ summary: 'List datasets with optional filters and pagination' })
  @ApiResponse({ status: 200, description: 'Datasets list with x-total-count header' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing tenant context' })
  async list(
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Res({ passthrough: true }) res?: FastifyReply
  ) {
    // Validate query parameters with Zod
    const parsed = ListDatasetsQuerySchema.safeParse({
      status,
      kind,
      take,
      skip,
      sortBy,
      sortOrder,
    });

    if (!parsed.success) {
      // Format Zod error as a readable message
      const formatted = parsed.error.flatten();
      const errorMessage = Object.entries(formatted.fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
        .join('; ') || formatted.formErrors.join('; ') || 'Validation error';
      throw new BadRequestException(errorMessage);
    }

    // Get datasets from service
    const result = await this.svc.list(parsed.data);

    // Set x-total-count header for pagination
    if (res) {
      res.header('x-total-count', result.total.toString());
    }

    // Return array of datasets (not wrapped in object)
    return result.data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dataset by ID' })
  @ApiResponse({ status: 200, description: 'Dataset found' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing tenant context' })
  async getById(@Param('id') id: string) {
    // Optional: Validate ID parameter
    const parsed = GetDatasetParamSchema.safeParse({ id });
    if (!parsed.success) {
      const formatted = parsed.error.flatten();
      const errorMessage = Object.entries(formatted.fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
        .join('; ') || formatted.formErrors.join('; ') || 'Validation error';
      throw new BadRequestException(errorMessage);
    }

    return this.svc.getById(parsed.data.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update dataset status' })
  async updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateDatasetStatusSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.updateStatus(id, parsed.data);
  }
}
