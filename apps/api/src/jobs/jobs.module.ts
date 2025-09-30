import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'content-generation' },
      { name: 'lora-training' },
      { name: 'video-generation' },
    ),
  ],
  controllers: [JobsController],
  providers: [PrismaService, JobsService],
})
export class JobsModule {}

