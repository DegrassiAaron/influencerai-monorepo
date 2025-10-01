import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../prisma/prisma.service';

const enableBull = !(process.env.NODE_ENV === 'test' || ['1', 'true', 'yes'].includes(String(process.env.DISABLE_BULL).toLowerCase()));
const queueImports = enableBull
  ? [
      BullModule.registerQueue(
        { name: 'content-generation' },
        { name: 'lora-training' },
        { name: 'video-generation' },
      ),
    ]
  : [];

const queueProviders = enableBull
  ? []
  : [
      { provide: getQueueToken('content-generation'), useValue: { add: async () => null } },
      { provide: getQueueToken('lora-training'), useValue: { add: async () => null } },
      { provide: getQueueToken('video-generation'), useValue: { add: async () => null } },
    ];

@Module({
  imports: queueImports,
  controllers: [JobsController],
  providers: [PrismaService, JobsService, ...queueProviders],
})
export class JobsModule {}
