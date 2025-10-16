import { BadRequestException, Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DatasetsService,
  CreateDatasetSchema,
  UpdateDatasetStatusSchema,
} from './datasets.service';

@ApiTags('datasets')
@Controller('datasets')
export class DatasetsController {
  constructor(private readonly svc: DatasetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create dataset record and return presigned upload URL' })
  async create(@Body() body: unknown) {
    const parsed = CreateDatasetSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.create(parsed.data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update dataset status' })
  async updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateDatasetStatusSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.updateStatus(id, parsed.data);
  }
}
