import { Injectable, Optional, type LoggerService } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { JobSeriesQuery, ListJobsQuery, UpdateJobDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/env.validation';
import { toInputJson } from '../lib/json';

type JobType = 'content-generation' | 'image-generation' | 'lora-training' | 'video-generation';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('content-generation') private readonly contentQueue: Queue,
    @InjectQueue('image-generation') private readonly imageQueue: Queue,
    @InjectQueue('lora-training') private readonly loraQueue: Queue,
    @InjectQueue('video-generation') private readonly videoQueue: Queue,
    private readonly config: ConfigService<AppConfig, true>,
    @Optional() private readonly logger?: LoggerService
  ) {}

  async createJob(input: { type: JobType; payload: unknown; priority?: number; dryRun?: boolean }) {
    // Check if dry-run mode is enabled (from payload or parameter)
    const payloadData = input.payload as any;
    const isDryRun = input.dryRun || payloadData?.dryRun || false;

    const job = await this.prisma.job.create({
      data: {
        type: input.type,
        status: 'pending',
        payload: toInputJson(input.payload),
      },
    });

    // If dry-run mode, immediately mark job as succeeded with mock results
    if (isDryRun) {
      if (typeof this.logger?.debug === 'function') {
        this.logger.debug('Dry-run mode: Instantly completing job with mock results', {
          jobId: job.id,
          type: input.type,
        });
      }

      // Generate mock results based on job type
      const mockResult = this.generateMockResult(input.type);

      // Update job to succeeded status with mock result
      const completedJob = await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          result: mockResult,
          costTok: 0, // No cost for dry-run
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      });

      return completedJob;
    }

    // Normal processing: enqueue job to BullMQ
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

    const rows = (await this.prisma.$queryRawUnsafe(query, from)) as Array<{
      bucket: Date;
      success: bigint;
      failed: bigint;
    }>;

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
    if (typeof input.result !== 'undefined') data.result = toInputJson(input.result);
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
        this.logger.warn(
          'Job update failed',
          error instanceof Error ? error : new Error(String(error))
        );
      }
      // Prisma throws if record not found
      return null;
    }
  }

  /**
   * Generate mock results for dry-run mode
   * Returns realistic-looking mock data without actually processing the job
   *
   * @param type - Job type (lora-training, content-generation, video-generation)
   * @returns Mock result object matching expected job result schema
   */
  private generateMockResult(type: JobType): Record<string, unknown> {
    const timestamp = new Date().toISOString();
    const mockId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    switch (type) {
      case 'lora-training':
        return {
          success: true,
          dryRun: true,
          artifacts: [
            {
              type: 'lora',
              name: `mock_lora_${mockId}.safetensors`,
              url: `mock/loras/mock_lora_${mockId}.safetensors`,
              path: `data/loras/mock_lora_${mockId}.safetensors`,
              size: 144000000, // ~144MB (realistic LoRA size)
            },
          ],
          duration: 1000, // 1 second instead of 30-60 minutes
          completedAt: timestamp,
          message: 'Dry-run: LoRA training completed instantly with mock results',
        };

      case 'content-generation':
        return {
          success: true,
          dryRun: true,
          assets: [
            {
              id: `asset_${mockId}`,
              type: 'image',
              url: `mock/images/mock_image_${mockId}.png`,
              width: 512,
              height: 768,
              format: 'png',
            },
          ],
          duration: 500, // 0.5 seconds instead of 5-10 minutes
          completedAt: timestamp,
          message: 'Dry-run: Image generation completed instantly with mock results',
        };

      case 'image-generation':
        return {
          success: true,
          dryRun: true,
          prompt: 'Dry-run mock prompt',
          seed: 123456,
          cfgScale: 7.5,
          steps: 20,
          loraUsed: ['models/loras/mock_lora.safetensors'],
          s3Key: `mock/images/${mockId}.png`,
          s3Url: `https://example.com/mock/images/${mockId}.png`,
          assetId: `asset_${mockId}`,
          message: 'Dry-run: Standalone image generation completed instantly with mock results',
        };

      case 'video-generation':
        return {
          success: true,
          dryRun: true,
          assets: [
            {
              id: `asset_${mockId}`,
              type: 'video',
              url: `mock/videos/mock_video_${mockId}.mp4`,
              width: 512,
              height: 768,
              duration: 3,
              fps: 24,
              format: 'mp4',
            },
          ],
          duration: 800, // 0.8 seconds instead of 10-20 minutes
          completedAt: timestamp,
          message: 'Dry-run: Video generation completed instantly with mock results',
        };

      default:
        return {
          success: true,
          dryRun: true,
          duration: 100,
          completedAt: timestamp,
          message: `Dry-run: Job type ${type} completed instantly with mock results`,
        };
    }
  }

  private getQueue(type: JobType): Queue {
    switch (type) {
      case 'content-generation':
        return this.contentQueue;
      case 'image-generation':
        return this.imageQueue;
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
    const unitConfig: Record<
      'm' | 'h' | 'd',
      { unitMs: number; unitName: 'minute' | 'hour' | 'day' }
    > = {
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
