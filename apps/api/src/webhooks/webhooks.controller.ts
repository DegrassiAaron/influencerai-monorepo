import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { requestContext } from '../lib/request-context';
import { PipelinesService } from '../pipelines/pipelines.service';
import {
  PipelineProgressWebhookSchema,
  PipelineStartWebhookSchema,
} from './dto';
import { PipelineWebhookAuthGuard } from './webhook-auth.guard';

function formatZodErrors(error: import('zod').ZodError): string {
  const formatted = error.flatten();
  const fieldErrors = Object.entries(formatted.fieldErrors)
    .map(([field, messages]) => `${field}: ${messages?.join(', ')}`)
    .filter(Boolean);
  const formErrors = formatted.formErrors;
  return [...fieldErrors, ...formErrors].join('; ') || 'Validation error';
}

@UseGuards(PipelineWebhookAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly pipelines: PipelinesService) {}

  @Post('pipeline/start')
  async startPipeline(@Body() body: unknown) {
    const parsed = PipelineStartWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(formatZodErrors(parsed.error));
    }

    const payload = parsed.data;
    requestContext.enterWith({ tenantId: payload.tenantId });
    return this.pipelines.create(payload);
  }

  @Post('pipeline/progress')
  async updatePipelineProgress(@Body() body: unknown) {
    const parsed = PipelineProgressWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(formatZodErrors(parsed.error));
    }

    const payload = parsed.data;
    requestContext.enterWith({ tenantId: payload.tenantId });
    return this.pipelines.updateProgress(payload.executionId, payload.updates);
  }
}
