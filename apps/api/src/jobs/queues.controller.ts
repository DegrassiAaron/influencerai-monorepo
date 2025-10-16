import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Queue } from 'bullmq';

import { QueueSummarySchema } from '@influencerai/core-schemas';
import type { QueueSummaryDto } from './dto';

@ApiTags('queues')
@Controller('queues')
export class QueuesController {
  constructor(
    @InjectQueue('content-generation')
    private readonly contentGenerationQueue: Queue,
    @InjectQueue('lora-training')
    private readonly loraTrainingQueue: Queue,
    @InjectQueue('video-generation')
    private readonly videoGenerationQueue: Queue
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated BullMQ queue counts' })
  @ApiResponse({
    status: 200,
    description: 'Aggregated counts for active, waiting and failed jobs',
  })
  async summary(): Promise<QueueSummaryDto> {
    const [content, lora, video] = await Promise.all([
      this.contentGenerationQueue.getJobCounts(),
      this.loraTrainingQueue.getJobCounts(),
      this.videoGenerationQueue.getJobCounts(),
    ]);

    const aggregate = [content, lora, video].reduce<QueueSummaryDto>(
      (totals, counts) => ({
        active: totals.active + (counts.active ?? 0),
        waiting: totals.waiting + (counts.waiting ?? 0),
        failed: totals.failed + (counts.failed ?? 0),
      }),
      { active: 0, waiting: 0, failed: 0 }
    );

    return QueueSummarySchema.parse(aggregate);
  }
}
