import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { WebhooksController } from './webhooks.controller';
import { PipelineWebhookAuthGuard } from './webhook-auth.guard';

@Module({
  imports: [ConfigModule, PipelinesModule],
  controllers: [WebhooksController],
  providers: [PipelineWebhookAuthGuard],
})
export class WebhooksModule {}
