import { Injectable, Logger as NestLogger, LoggerService, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ListJobsQuery, UpdateJobDto } from './dto';

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

  async createJob(input: { type: JobType; payload: unknown; priority?: number }) {
    const job = await this.prisma.job.create({
      data: {
        type: input.type,
        status: 'pending',
        payload: input.payload as any,
      },
    });

    const queue = this.getQueue(input.type);
    this.logger?.debug?.({ jobId: job.id, type: input.type } as any, 'Enqueueing job');
    const attempts = Number(process.env.WORKER_JOB_ATTEMPTS || 3);
    const backoffDelay = Number(process.env.WORKER_JOB_BACKOFF_DELAY_MS || 5000);
    await queue.add(
      input.type,
      { jobId: job.id, payload: input.payload },
      {
        priority: input.priority ?? 1,
        removeOnComplete: true,
        removeOnFail: false,
        attempts,
        backoff: { type: 'exponential', delay: backoffDelay },
      }
    );

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

  async updateJob(id: string, input: UpdateJobDto) {
    const data: Record<string, unknown> = {};
    if (typeof input.status !== 'undefined') data.status = input.status;
    if (typeof input.result !== 'undefined') data.result = input.result as any;
    if (typeof input.costTok !== 'undefined') data.costTok = input.costTok;

    // Auto-manage timestamps for common status transitions
    const status = input.status;
    const now = new Date();
    if (status === 'running') {
      data.startedAt = now;
    }
    if (status === 'succeeded' || status === 'failed' || status === 'completed') {
      data.finishedAt = now;
      if (!data.startedAt) {
        // Ensure startedAt exists if finishing without a start set
        data.startedAt = now;
      }
    }

    try {
      return await this.prisma.job.update({ where: { id }, data });
    } catch (e) {
      // Prisma throws if record not found
      return null as any;
    }
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
