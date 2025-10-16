import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Body,
  Query,
  BadGatewayException,
  ServiceUnavailableException,
  RequestTimeoutException,
  HttpException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContentPlansService } from './content-plans.service';
import { CreateContentPlanSchema, ListPlansQuerySchema } from './dto';
import { HTTPError } from '../lib/http-utils';

@ApiTags('content-plans')
@Controller('content-plans')
export class ContentPlansController {
  constructor(private readonly svc: ContentPlansService) {}

  @Post()
  @ApiOperation({ summary: 'Generate and persist a content plan' })
  @ApiResponse({ status: 201, description: 'Content plan created' })
  async create(@Body() body: unknown) {
    const parsed = CreateContentPlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    try {
      return await this.svc.createPlan(parsed.data);
    } catch (e: unknown) {
      throw mapUpstreamError(e);
    }
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
    @Query('skip') skip?: string
  ) {
    const parsed = ListPlansQuerySchema.safeParse({ influencerId, take, skip });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.svc.listPlans(parsed.data);
  }
}

function mapUpstreamError(e: unknown): HttpException {
  if (e instanceof HTTPError) {
    if (e.status === 429)
      return new HttpException({ message: 'Rate limited by upstream', detail: e.body }, 429);
    if (e.status >= 500 && e.status <= 599)
      return new BadGatewayException({ message: 'Upstream error', status: e.status });
    // For other statuses, bubble up as a generic HttpException with original status if possible
    return new HttpException({ message: 'Upstream request failed' }, e.status || 502);
  }
  // Timeout/Abort
  if (
    typeof e === 'object' &&
    e !== null &&
    'name' in e &&
    (e as { name?: string }).name === 'AbortError'
  ) {
    return new RequestTimeoutException({ message: 'Upstream timeout' });
  }
  // Network or unknown error
  return new ServiceUnavailableException({ message: 'Upstream unavailable' });
}
