import { BadRequestException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PipelinesService } from '../pipelines/pipelines.service';
import * as requestContextModule from '../lib/request-context';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let pipelinesService: jest.Mocked<PipelinesService>;
  let enterWithSpy: jest.SpyInstance;

  beforeEach(() => {
    pipelinesService = {
      create: jest.fn(),
      updateProgress: jest.fn(),
    } as unknown as jest.Mocked<PipelinesService>;

    controller = new WebhooksController(pipelinesService);
    enterWithSpy = jest.spyOn(requestContextModule.requestContext, 'enterWith');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('startPipeline', () => {
    it('should delegate to pipelinesService with validated payload', async () => {
      const payload = {
        executionId: 'exec_123',
        workflowId: 'workflow_abc',
        tenantId: 'tenant_1',
        payload: { datasetId: 'ds_1' },
        totalStages: 6,
      };
      const expectedResult = { id: 'pipeline_1' };
      pipelinesService.create.mockResolvedValue(expectedResult as any);

      const result = await controller.startPipeline(payload);

      expect(enterWithSpy).toHaveBeenCalledWith({ tenantId: payload.tenantId });
      expect(pipelinesService.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException for invalid payload', async () => {
      await expect(
        controller.startPipeline({ workflowId: 'missing_fields' })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(pipelinesService.create).not.toHaveBeenCalled();
    });
  });

  describe('updatePipelineProgress', () => {
    it('should validate payload and call updateProgress', async () => {
      const payload = {
        tenantId: 'tenant_1',
        executionId: 'exec_123',
        updates: { status: 'COMPLETED', progressPercent: 100 },
      };
      const expectedResult = { executionId: payload.executionId };
      pipelinesService.updateProgress.mockResolvedValue(expectedResult as any);

      const result = await controller.updatePipelineProgress(payload);

      expect(enterWithSpy).toHaveBeenCalledWith({ tenantId: payload.tenantId });
      expect(pipelinesService.updateProgress).toHaveBeenCalledWith(
        payload.executionId,
        payload.updates
      );
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException when updates are empty', async () => {
      const invalidPayload = {
        tenantId: 'tenant_1',
        executionId: 'exec_123',
        updates: {},
      };

      await expect(controller.updatePipelineProgress(invalidPayload)).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(pipelinesService.updateProgress).not.toHaveBeenCalled();
    });
  });
});
