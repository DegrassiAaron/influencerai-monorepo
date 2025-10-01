import { BadRequestException, Controller, Get, NotFoundException, Param, Post, Body, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContentPlansService } from './content-plans.service';
import { CreateContentPlanSchema, ListPlansQuerySchema } from './dto';

@ApiTags('content-plans')
@Controller('content-plans')
export class ContentPlansController {
  constructor(private readonly svc: ContentPlansService) {}

  @Post()
  @ApiOperation({ summary: 'Generate and persist a content plan' })
  @ApiResponse({ status: 201, description: 'Content plan created' })
  create(@Body() body: unknown) {
    const parsed = CreateContentPlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.svc.createPlan(parsed.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content plan by id' })
  async get(@Param('id') id: string) {
    const res = await this.svc.getPlan(id);
    if (!res) throw new NotFoundException('Content plan not found');
    return res;
  }

  @Get()
  @ApiOperation({ summary: 'List content plans' })
  list(
    @Query('influencerId') influencerId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const parsed = ListPlansQuerySchema.safeParse({ influencerId, take, skip });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.svc.listPlans(parsed.data);
  }
}

