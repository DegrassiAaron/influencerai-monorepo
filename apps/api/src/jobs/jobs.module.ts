import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { QueuesController } from './queues.controller';
import { PrismaService } from '../prisma/prisma.service';
import { computeBullEnabled } from '../config/env.validation';

const enableBull = computeBullEnabled(process.env);
const queueImports = enableBull
  ? [
      BullModule.registerQueue(
        { name: 'content-generation' },
        { name: 'image-generation' },
        { name: 'lora-training' },
        { name: 'video-generation' }
      ),
    ]
  : [];

const queueProviders = enableBull
  ? []
  : [
      {
        provide: getQueueToken('content-generation'),
        useValue: {
          add: async () => null,
          getJobCounts: async () => ({ active: 0, waiting: 0, failed: 0 }),
        },
      },
      {
        provide: getQueueToken('image-generation'),
        useValue: {
          add: async () => null,
          getJobCounts: async () => ({ active: 0, waiting: 0, failed: 0 }),
        },
      },
      {
        provide: getQueueToken('lora-training'),
        useValue: {
          add: async () => null,
          getJobCounts: async () => ({ active: 0, waiting: 0, failed: 0 }),
        },
      },
      {
        provide: getQueueToken('video-generation'),
        useValue: {
          add: async () => null,
          getJobCounts: async () => ({ active: 0, waiting: 0, failed: 0 }),
        },
      },
    ];

@Module({
  imports: queueImports,
  controllers: [JobsController, QueuesController],
  providers: [PrismaService, JobsService, ...queueProviders],
})
export class JobsModule {}
