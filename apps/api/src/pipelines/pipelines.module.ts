import { Module } from '@nestjs/common';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * PipelinesModule
 *
 * Provides pipeline execution tracking functionality for n8n workflows.
 * Exposes REST API endpoints for creating, updating, and querying pipeline progress.
 *
 * Dependencies:
 * - PrismaModule: Database access for PipelineExecution model
 *
 * Exports:
 * - PipelinesService: For use by other modules if needed
 */
@Module({
  imports: [PrismaModule],
  controllers: [PipelinesController],
  providers: [PipelinesService],
  exports: [PipelinesService],
})
export class PipelinesModule {}
