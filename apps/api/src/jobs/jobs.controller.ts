import { Controller, Get, Param, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobSchema, JobTypeSchema, ListJobsQuerySchema } from './dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  create(@Body() body: unknown) {
    const parsed = CreateJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.jobsService.createJob(parsed.data);
  }

  @Get()
  list(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const parsed = ListJobsQuerySchema.safeParse({ status, type, take, skip });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.jobsService.listJobs(parsed.data);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.jobsService.getJob(id);
  }
}
