import { Module } from '@nestjs/common';
import { LoraConfigsController } from './lora-configs.controller';
import { LoraConfigsService } from './lora-configs.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * NestJS module for LoRA configuration management.
 *
 * Provides:
 * - REST API endpoints via LoraConfigsController
 * - Business logic via LoraConfigsService
 * - Database access via PrismaModule
 *
 * Imported by AppModule to register routes under /lora-configs
 */
@Module({
  imports: [PrismaModule],
  controllers: [LoraConfigsController],
  providers: [LoraConfigsService],
  exports: [LoraConfigsService], // Export for use in other modules (e.g., Jobs module)
})
export class LoraConfigsModule {}
