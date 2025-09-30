import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  create(@Body() body: { type: 'content-generation' | 'lora-training' | 'video-generation'; payload: Record<string, any>; priority?: number }) {
    return this.jobsService.createJob(body);
  }

  @Get()
  list(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.jobsService.listJobs({ status, type, take: take ? parseInt(take) : undefined, skip: skip ? parseInt(skip) : undefined });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.jobsService.getJob(id);
  }
}

