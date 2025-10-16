import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  BadRequestException,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobSchema, JobSeriesQuerySchema, ListJobsQuerySchema, UpdateJobSchema } from './dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a job and enqueue it' })
  @ApiResponse({ status: 201, description: 'Job created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() body: unknown) {
    const parsed = CreateJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.jobsService.createJob(parsed.data);
  }

  @Get()
  @ApiOperation({ summary: 'List jobs with optional filters' })
  @ApiResponse({ status: 200, description: 'Jobs list' })
  list(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string
  ) {
    const parsed = ListJobsQuerySchema.safeParse({ status, type, take, skip });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.jobsService.listJobs(parsed.data);
  }

  @Get('series')
  @ApiOperation({ summary: 'Get aggregated job outcomes over time' })
  @ApiResponse({ status: 200, description: 'Aggregated job series' })
  series(@Query('window') window?: string) {
    const parsed = JobSeriesQuerySchema.safeParse({ window });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.jobsService.getJobSeries(parsed.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by id' })
  @ApiResponse({ status: 200, description: 'Job found' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  get(@Param('id') id: string) {
    return this.jobsService.getJob(id).then((job) => {
      if (!job) throw new NotFoundException('Job not found');
      return job;
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job (status, result, costTok)' })
  @ApiResponse({ status: 200, description: 'Job updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const updated = await this.jobsService.updateJob(id, parsed.data);
    if (!updated) throw new NotFoundException('Job not found');
    return updated;
  }
}
