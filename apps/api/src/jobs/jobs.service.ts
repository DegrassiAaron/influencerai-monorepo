import { Injectable, Logger as NestLogger, LoggerService, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListJobsQuery } from './dto';

type JobType = 'content-generation' | 'lora-training' | 'video-generation';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('content-generation') private readonly contentQueue: Queue,
    @InjectQueue('lora-training') private readonly loraQueue: Queue,
    @InjectQueue('video-generation') private readonly videoQueue: Queue,
    @Optional() private readonly logger?: LoggerService,
  ) {}

  async createJob(input: { type: JobType; payload: Prisma.InputJsonValue; priority?: number }) {
    const job = await this.prisma.job.create({
      data: {
        type: input.type,
        status: 'pending',
        payload: input.payload,
      },
    });

    const queue = this.getQueue(input.type);
    this.logger?.debug?.({ jobId: job.id, type: input.type } as any, 'Enqueueing job');
    await queue.add(input.type, { jobId: job.id, payload: input.payload }, {
      priority: input.priority ?? 1,
      removeOnComplete: true,
      removeOnFail: false,
    });

    return job;
  }

  async listJobs(params: ListJobsQuery) {
    const take = params.take ?? 20;
    const skip = params.skip ?? 0;
    return this.prisma.job.findMany({
      where: {
        status: params.status,
        type: params.type,
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async getJob(id: string) {
    return this.prisma.job.findUnique({ where: { id } });
  }

  private getQueue(type: JobType): Queue {
    switch (type) {
      case 'content-generation':
        return this.contentQueue;
      case 'lora-training':
        return this.loraQueue;
      case 'video-generation':
        return this.videoQueue;
      default:
        return this.contentQueue;
    }
  }
}
