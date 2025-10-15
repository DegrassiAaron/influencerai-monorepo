import { Injectable, Optional, type LoggerService } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { JobSeriesQuery, ListJobsQuery, UpdateJobDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/env.validation';
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type JobType = 'content-generation' | 'lora-training' | 'video-generation';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('content-generation') private readonly contentQueue: Queue,
    @InjectQueue('lora-training') private readonly loraQueue: Queue,
    @InjectQueue('video-generation') private readonly videoQueue: Queue,
    private readonly config: ConfigService<AppConfig, true>,
    @Optional() private readonly logger?: LoggerService,
  ) {}

  async createJob(input: { type: JobType; payload: unknown; priority?: number }) {
    const job = await this.prisma.job.create({
      data: {
        type: input.type,
        status: 'pending',
        payload: toJsonValue(input.payload),
      },
    });

    const queue = this.getQueue(input.type);
    if (typeof this.logger?.debug === 'function') {
      this.logger.debug('Enqueueing job', { jobId: job.id, type: input.type });
    }
    const attempts = this.config.get('WORKER_JOB_ATTEMPTS', { infer: true });
    const backoffDelay = this.config.get('WORKER_JOB_BACKOFF_DELAY_MS', { infer: true });
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

  async getJobSeries(params: JobSeriesQuery) {
    const { amount, unitMs, unitName } = this.parseWindow(params.window);
    const now = new Date();
    const currentBucket = this.truncateToUnit(now, unitName);
    const from = new Date(currentBucket.getTime() - (amount - 1) * unitMs);

    const query = `
      SELECT
        date_trunc('${unitName}', "createdAt") AS bucket,
        COUNT(*) FILTER (WHERE "status" IN ('succeeded', 'completed')) AS success,
        COUNT(*) FILTER (WHERE "status" = 'failed') AS failed
      FROM "Job"
      WHERE "createdAt" >= $1
        AND "status" IN ('succeeded', 'failed', 'completed')
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const rows = (await this.prisma.$queryRawUnsafe(
      query,
      from,
    )) as Array<{ bucket: Date; success: bigint; failed: bigint }>;

    const normalized = new Map<string, { success: number; failed: number }>();
    for (const row of rows) {
      const bucketDate = row.bucket instanceof Date ? row.bucket : new Date(row.bucket);
      const key = bucketDate.toISOString();
      normalized.set(key, {
        success: Number(row.success ?? 0n),
        failed: Number(row.failed ?? 0n),
      });
    }

    const series: Array<{ t: string; success: number; failed: number }> = [];
    for (let i = amount - 1; i >= 0; i -= 1) {
      const bucketStart = new Date(currentBucket.getTime() - i * unitMs);
      const key = bucketStart.toISOString();
      const totals = normalized.get(key) ?? { success: 0, failed: 0 };
      series.push({ t: key, success: totals.success, failed: totals.failed });
    }

    return series;
  }

  async getJob(id: string) {
    return this.prisma.job.findUnique({ where: { id } });
  }

  async updateJob(id: string, input: UpdateJobDto) {
    const data: Record<string, unknown> = {};
    if (typeof input.status !== 'undefined') data.status = input.status;
    if (typeof input.result !== 'undefined') data.result = toJsonValue(input.result);
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
    } catch (error) {
      if (typeof this.logger?.warn === 'function') {
        this.logger.warn('Job update failed', error instanceof Error ? error : new Error(String(error)));
      }
      // Prisma throws if record not found
      return null;
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

  private parseWindow(window: string) {
    const match = /^([0-9]+)(m|h|d)$/.exec(window);
    if (!match) {
      throw new Error('Invalid window format. Expected something like 1h or 24h.');
    }
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Window amount must be a positive integer.');
    }

    const unitKey = match[2] as 'm' | 'h' | 'd';
    const unitConfig: Record<'m' | 'h' | 'd', { unitMs: number; unitName: 'minute' | 'hour' | 'day' }>
      = {
        m: { unitMs: 60 * 1000, unitName: 'minute' },
        h: { unitMs: 60 * 60 * 1000, unitName: 'hour' },
        d: { unitMs: 24 * 60 * 60 * 1000, unitName: 'day' },
      };

    const { unitMs, unitName } = unitConfig[unitKey];

    return { amount, unit: unitKey, unitMs, unitName };
  }

  private truncateToUnit(date: Date, unit: 'minute' | 'hour' | 'day') {
    const copy = new Date(date);
    copy.setSeconds(0, 0);
    if (unit === 'hour' || unit === 'day') {
      copy.setMinutes(0);
    }
    if (unit === 'day') {
      copy.setHours(0);
    }
    return copy;
  }
}

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item)) as JsonArray;
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<JsonObject>((acc, [key, val]) => {
      acc[key] = toJsonValue(val);
      return acc;
    }, {});
  }

  return null;
}
