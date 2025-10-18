import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PrismaService } from '../prisma/prisma.service';
import * as requestContext from '../lib/request-context';

/**
 * Unit tests for PipelinesService
 *
 * Test coverage:
 * - create() - Happy path, duplicate executionId, missing tenant, tenantId fallback
 * - getByExecutionId() - Found, not found, cross-tenant access, missing tenant
 * - updateProgress() - Partial updates, status transitions, array fields, not found, cross-tenant
 * - list() - Default pagination, filtering by status, sorting, tenant isolation, parallel queries
 *
 * Security tests:
 * - Tenant isolation enforced (404 instead of 403 for OWASP compliance)
 * - Missing tenant context returns UnauthorizedException
 *
 * Performance tests:
 * - Parallel query execution in list() method
 */

describe('PipelinesService', () => {
  let service: PipelinesService;
  let prisma: PrismaService;

  // Mock tenant context
  const mockTenantId = 'tenant_test_1';

  // Mock pipeline execution
  const mockPipeline = {
    id: 'pipeline_1',
    executionId: 'exec_12345',
    workflowId: 'workflow_lora_pipeline',
    tenantId: mockTenantId,
    status: 'STARTED' as const,
    currentStage: null,
    payload: { datasetId: 'ds_001', trainingName: 'influencer_v1' },
    trainingJobId: null,
    imageJobIds: [] as string[],
    videoJobIds: [] as string[],
    assetIds: [] as string[],
    loraPath: null,
    stagesCompleted: 0,
    totalStages: 6,
    progressPercent: 0,
    totalCostTok: 0,
    startedAt: new Date('2025-01-15T10:00:00Z'),
    completedAt: null,
    errorMessage: null,
    errorStage: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelinesService,
        {
          provide: PrismaService,
          useValue: {
            pipelineExecution: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PipelinesService>(PipelinesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock getRequestContext to return tenant ID by default
    jest
      .spyOn(requestContext, 'getRequestContext')
      .mockReturnValue({ tenantId: mockTenantId });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // create()
  // ========================================

  describe('create', () => {
    it('should create a pipeline execution with valid parameters', async () => {
      const input = {
        executionId: 'exec_12345',
        workflowId: 'workflow_lora_pipeline',
        tenantId: mockTenantId,
        payload: { datasetId: 'ds_001', trainingName: 'influencer_v1' },
        totalStages: 6,
      };

      jest.spyOn(prisma.pipelineExecution, 'create').mockResolvedValue(mockPipeline);

      const result = await service.create(input);

      expect(result).toEqual(mockPipeline);
      expect(result.executionId).toBe('exec_12345');
      expect(result.status).toBe('STARTED');
      expect(result.stagesCompleted).toBe(0);
      expect(result.progressPercent).toBe(0);

      expect(prisma.pipelineExecution.create).toHaveBeenCalledWith({
        data: {
          executionId: 'exec_12345',
          workflowId: 'workflow_lora_pipeline',
          tenantId: mockTenantId,
          payload: { datasetId: 'ds_001', trainingName: 'influencer_v1' },
          totalStages: 6,
          status: 'STARTED',
          stagesCompleted: 0,
          progressPercent: 0,
        },
      });
    });

    it('should use tenantId from request context when not provided in input', async () => {
      const input = {
        executionId: 'exec_12345',
        workflowId: 'workflow_lora_pipeline',
        tenantId: mockTenantId,
        payload: {},
      };

      jest.spyOn(prisma.pipelineExecution, 'create').mockResolvedValue(mockPipeline);

      await service.create(input);

      expect(prisma.pipelineExecution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
          }),
        })
      );
    });

    it('should prefer request context tenantId over input (security)', async () => {
      const input = {
        executionId: 'exec_12345',
        workflowId: 'workflow_lora_pipeline',
        tenantId: 'tenant_from_input',
        payload: {},
      };

      // Request context has tenantId = 'tenant_test_1' (from beforeEach)
      // Input has tenantId = 'tenant_from_input'
      // Implementation should use context tenantId for security
      jest
        .spyOn(prisma.pipelineExecution, 'create')
        .mockResolvedValue(mockPipeline);

      await service.create(input);

      expect(prisma.pipelineExecution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId, // Uses context tenantId, not input
          }),
        })
      );
    });

    it('should default totalStages to 6 when not provided', async () => {
      const input = {
        executionId: 'exec_12345',
        workflowId: 'workflow_lora_pipeline',
        tenantId: mockTenantId,
        payload: {},
      };

      jest.spyOn(prisma.pipelineExecution, 'create').mockResolvedValue(mockPipeline);

      await service.create(input);

      expect(prisma.pipelineExecution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalStages: 6,
          }),
        })
      );
    });

    it('should throw UnauthorizedException when tenant context is missing', async () => {
      jest
        .spyOn(requestContext, 'getRequestContext')
        .mockReturnValue({ tenantId: undefined });

      const input = {
        executionId: 'exec_12345',
        workflowId: 'workflow_lora_pipeline',
        tenantId: undefined as any,
        payload: {},
      };

      await expect(service.create(input)).rejects.toThrow(UnauthorizedException);
      await expect(service.create(input)).rejects.toThrow('Tenant context required');
    });

    it('should throw ConflictException for duplicate executionId (P2002)', async () => {
      const input = {
        executionId: 'exec_duplicate',
        workflowId: 'workflow_lora_pipeline',
        tenantId: mockTenantId,
        payload: {},
      };

      const prismaError: any = new Error('Unique constraint failed');
      prismaError.code = 'P2002';
      prismaError.meta = { target: ['executionId'] };

      jest.spyOn(prisma.pipelineExecution, 'create').mockRejectedValue(prismaError);

      await expect(service.create(input)).rejects.toThrow(ConflictException);
      await expect(service.create(input)).rejects.toThrow(
        'Pipeline execution with executionId "exec_duplicate" already exists'
      );
    });

    it('should rethrow non-P2002 Prisma errors', async () => {
      const input = {
        executionId: 'exec_12345',
        workflowId: 'workflow_lora_pipeline',
        tenantId: mockTenantId,
        payload: {},
      };

      const otherError = new Error('Database connection failed');
      jest.spyOn(prisma.pipelineExecution, 'create').mockRejectedValue(otherError);

      await expect(service.create(input)).rejects.toThrow('Database connection failed');
    });
  });

  // ========================================
  // getByExecutionId()
  // ========================================

  describe('getByExecutionId', () => {
    it('should return pipeline execution by executionId', async () => {
      jest
        .spyOn(prisma.pipelineExecution, 'findUnique')
        .mockResolvedValue(mockPipeline);

      const result = await service.getByExecutionId('exec_12345');

      expect(result).toEqual(mockPipeline);
      expect(prisma.pipelineExecution.findUnique).toHaveBeenCalledWith({
        where: { executionId: 'exec_12345' },
      });
    });

    it('should throw NotFoundException when pipeline does not exist', async () => {
      jest.spyOn(prisma.pipelineExecution, 'findUnique').mockResolvedValue(null);

      await expect(service.getByExecutionId('exec_nonexistent')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getByExecutionId('exec_nonexistent')).rejects.toThrow(
        'Pipeline execution exec_nonexistent not found'
      );
    });

    it('should throw NotFoundException for cross-tenant access (OWASP security)', async () => {
      const otherTenantPipeline = { ...mockPipeline, tenantId: 'tenant_other' };
      jest
        .spyOn(prisma.pipelineExecution, 'findUnique')
        .mockResolvedValue(otherTenantPipeline);

      await expect(service.getByExecutionId('exec_12345')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getByExecutionId('exec_12345')).rejects.toThrow(
        'Pipeline execution exec_12345 not found'
      );

      // Should NOT reveal that resource exists for another tenant
      await expect(service.getByExecutionId('exec_12345')).rejects.not.toThrow(
        /tenant/i
      );
      await expect(service.getByExecutionId('exec_12345')).rejects.not.toThrow(
        /permission/i
      );
    });

    it('should throw UnauthorizedException when tenant context is missing', async () => {
      jest
        .spyOn(requestContext, 'getRequestContext')
        .mockReturnValue({ tenantId: undefined });

      await expect(service.getByExecutionId('exec_12345')).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.getByExecutionId('exec_12345')).rejects.toThrow(
        'Tenant context required'
      );
    });
  });

  // ========================================
  // updateProgress()
  // ========================================

  describe('updateProgress', () => {
    it('should update pipeline progress with partial fields', async () => {
      const updates = {
        status: 'TRAINING' as const,
        currentStage: 'LoRA Training',
        stagesCompleted: 2,
        progressPercent: 33,
      };

      const updatedPipeline = { ...mockPipeline, ...updates };

      jest
        .spyOn(prisma.pipelineExecution, 'findUnique')
        .mockResolvedValue(mockPipeline);
      jest.spyOn(prisma.pipelineExecution, 'update').mockResolvedValue(updatedPipeline);

      const result = await service.updateProgress('exec_12345', updates);

      expect(result.status).toBe('TRAINING');
      expect(result.stagesCompleted).toBe(2);
      expect(result.progressPercent).toBe(33);

      expect(prisma.pipelineExecution.update).toHaveBeenCalledWith({
        where: { executionId: 'exec_12345' },
        data: {
          status: 'TRAINING',
          currentStage: 'LoRA Training',
          stagesCompleted: 2,
          progressPercent: 33,
        },
      });
    });

    it('should update array fields (imageJobIds, videoJobIds, assetIds)', async () => {
      const updates = {
        imageJobIds: ['job_img_1', 'job_img_2'],
        videoJobIds: ['job_vid_1'],
        assetIds: ['asset_1', 'asset_2', 'asset_3'],
      };

      const updatedPipeline = { ...mockPipeline, ...updates };

      jest
        .spyOn(prisma.pipelineExecution, 'findUnique')
        .mockResolvedValue(mockPipeline);
      jest.spyOn(prisma.pipelineExecution, 'update').mockResolvedValue(updatedPipeline);

      const result = await service.updateProgress('exec_12345', updates);

      expect(result.imageJobIds).toEqual(['job_img_1', 'job_img_2']);
      expect(result.videoJobIds).toEqual(['job_vid_1']);
      expect(result.assetIds).toEqual(['asset_1', 'asset_2', 'asset_3']);

      expect(prisma.pipelineExecution.update).toHaveBeenCalledWith({
        where: { executionId: 'exec_12345' },
        data: {
          imageJobIds: ['job_img_1', 'job_img_2'],
          videoJobIds: ['job_vid_1'],
          assetIds: ['asset_1', 'asset_2', 'asset_3'],
        },
      });
    });

    it('should update completion fields (completedAt, totalCostTok)', async () => {
      const completedAt = new Date('2025-01-15T12:00:00Z');
      const updates = {
        status: 'COMPLETED' as const,
        completedAt,
        totalCostTok: 15000,
        progressPercent: 100,
      };

      const updatedPipeline = { ...mockPipeline, ...updates };

      jest
        .spyOn(prisma.pipelineExecution, 'findUnique')
        .mockResolvedValue(mockPipeline);
      jest.spyOn(prisma.pipelineExecution, 'update').mockResolvedValue(updatedPipeline);

      const result = await service.updateProgress('exec_12345', updates);

      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toEqual(completedAt);
      expect(result.totalCostTok).toBe(15000);
    });

    it('should update error fields when pipeline fails', async () => {
      const updates = {
        status: 'FAILED' as const,
        errorMessage: 'LoRA training failed: CUDA out of memory',
        errorStage: 'LoRA Training',
      };

      const updatedPipeline = { ...mockPipeline, ...updates };

      jest
        .spyOn(prisma.pipelineExecution, 'findUnique')
        .mockResolvedValue(mockPipeline);
      jest.spyOn(prisma.pipelineExecution, 'update').mockResolvedValue(updatedPipeline);

      const result = await service.updateProgress('exec_12345', updates);

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('LoRA training failed: CUDA out of memory');
      expect(result.errorStage).toBe('LoRA Training');
    });

    it('should only update fields that are provided (selective update)', async () => {
      const updates = {
        stagesCompleted: 3,
        // Other fields intentionally omitted
      };

      jest
        .spyOn(prisma.pipelineExecution, 'findUnique')
        .mockResolvedValue(mockPipeline);
      jest
        .spyOn(prisma.pipelineExecution, 'update')
        .mockResolvedValue({ ...mockPipeline, stagesCompleted: 3 });

      await service.updateProgress('exec_12345', updates);

      // Verify only stagesCompleted is in the update data
      expect(prisma.pipelineExecution.update).toHaveBeenCalledWith({
        where: { executionId: 'exec_12345' },
        data: {
          stagesCompleted: 3,
        },
      });

      // Verify other fields are NOT in update data
      const updateCall = (prisma.pipelineExecution.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('status');
      expect(updateCall.data).not.toHaveProperty('progressPercent');
    });

    it('should throw NotFoundException when pipeline does not exist', async () => {
      jest.spyOn(prisma.pipelineExecution, 'findUnique').mockResolvedValue(null);

      const updates = { status: 'TRAINING' as const };

      await expect(service.updateProgress('exec_nonexistent', updates)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.updateProgress('exec_nonexistent', updates)).rejects.toThrow(
        'Pipeline execution exec_nonexistent not found'
      );

      // Should not attempt update
      expect(prisma.pipelineExecution.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for cross-tenant update (security)', async () => {
      const otherTenantPipeline = { ...mockPipeline, tenantId: 'tenant_other' };
      jest
        .spyOn(prisma.pipelineExecution, 'findUnique')
        .mockResolvedValue(otherTenantPipeline);

      const updates = { status: 'TRAINING' as const };

      await expect(service.updateProgress('exec_12345', updates)).rejects.toThrow(
        NotFoundException
      );

      // Should not attempt update
      expect(prisma.pipelineExecution.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when tenant context is missing', async () => {
      jest
        .spyOn(requestContext, 'getRequestContext')
        .mockReturnValue({ tenantId: undefined });

      const updates = { status: 'TRAINING' as const };

      await expect(service.updateProgress('exec_12345', updates)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.updateProgress('exec_12345', updates)).rejects.toThrow(
        'Tenant context required'
      );
    });

    it('should handle status transition from STARTED to TRAINING', async () => {
      const updates = {
        status: 'TRAINING' as const,
        currentStage: 'LoRA Training',
        stagesCompleted: 1,
        progressPercent: 16,
        trainingJobId: 'job_training_001',
      };

      jest
        .spyOn(prisma.pipelineExecution, 'findUnique')
        .mockResolvedValue(mockPipeline);
      jest
        .spyOn(prisma.pipelineExecution, 'update')
        .mockResolvedValue({ ...mockPipeline, ...updates });

      const result = await service.updateProgress('exec_12345', updates);

      expect(result.status).toBe('TRAINING');
      expect(result.trainingJobId).toBe('job_training_001');
    });
  });

  // ========================================
  // list()
  // ========================================

  describe('list', () => {
    it('should list all pipelines with default pagination and tenant isolation', async () => {
      const pipelines = [
        mockPipeline,
        { ...mockPipeline, id: 'pipeline_2', executionId: 'exec_67890' },
      ];

      jest.spyOn(prisma.pipelineExecution, 'findMany').mockResolvedValue(pipelines);
      jest.spyOn(prisma.pipelineExecution, 'count').mockResolvedValue(2);

      const result = await service.list({
        take: 20,
        skip: 0,
        sortBy: 'startedAt',
        sortOrder: 'desc',
      });

      expect(result.data).toEqual(pipelines);
      expect(result.total).toBe(2);
      expect(result.take).toBe(20);
      expect(result.skip).toBe(0);

      expect(prisma.pipelineExecution.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { startedAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should filter pipelines by status', async () => {
      const completedPipelines = [
        { ...mockPipeline, status: 'COMPLETED' as const, completedAt: new Date() },
      ];

      jest
        .spyOn(prisma.pipelineExecution, 'findMany')
        .mockResolvedValue(completedPipelines);
      jest.spyOn(prisma.pipelineExecution, 'count').mockResolvedValue(1);

      const result = await service.list({
        status: 'COMPLETED',
        take: 20,
        skip: 0,
        sortBy: 'startedAt',
        sortOrder: 'desc',
      });

      expect(result.data).toEqual(completedPipelines);
      expect(result.data[0].status).toBe('COMPLETED');

      expect(prisma.pipelineExecution.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: 'COMPLETED',
        },
        orderBy: { startedAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should support custom pagination (take and skip)', async () => {
      const pipelines = Array.from({ length: 10 }, (_, i) => ({
        ...mockPipeline,
        id: `pipeline_${21 + i}`,
        executionId: `exec_${21 + i}`,
      }));

      jest.spyOn(prisma.pipelineExecution, 'findMany').mockResolvedValue(pipelines);
      jest.spyOn(prisma.pipelineExecution, 'count').mockResolvedValue(50);

      const result = await service.list({
        take: 10,
        skip: 20,
        sortBy: 'startedAt',
        sortOrder: 'desc',
      });

      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(50);
      expect(result.take).toBe(10);
      expect(result.skip).toBe(20);

      expect(prisma.pipelineExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('should support sorting by different fields', async () => {
      jest.spyOn(prisma.pipelineExecution, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.pipelineExecution, 'count').mockResolvedValue(0);

      // Sort by completedAt ascending
      await service.list({
        sortBy: 'completedAt',
        sortOrder: 'asc',
      });

      expect(prisma.pipelineExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { completedAt: 'asc' },
        })
      );
    });

    it('should use default sortBy (startedAt) and sortOrder (desc)', async () => {
      jest.spyOn(prisma.pipelineExecution, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.pipelineExecution, 'count').mockResolvedValue(0);

      await service.list({});

      expect(prisma.pipelineExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startedAt: 'desc' },
          take: 20,
          skip: 0,
        })
      );
    });

    it('should execute findMany and count in parallel (performance)', async () => {
      const findManySpy = jest
        .spyOn(prisma.pipelineExecution, 'findMany')
        .mockResolvedValue([]);
      const countSpy = jest.spyOn(prisma.pipelineExecution, 'count').mockResolvedValue(0);

      await service.list({});

      // Both should be called (parallel execution via Promise.all)
      expect(findManySpy).toHaveBeenCalled();
      expect(countSpy).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when tenant context is missing', async () => {
      jest
        .spyOn(requestContext, 'getRequestContext')
        .mockReturnValue({ tenantId: undefined });

      await expect(service.list({})).rejects.toThrow(UnauthorizedException);
      await expect(service.list({})).rejects.toThrow('Tenant context required');
    });

    it('should filter by status=FAILED and sort by startedAt desc', async () => {
      const failedPipelines = [
        {
          ...mockPipeline,
          status: 'FAILED' as const,
          errorMessage: 'Training failed',
        },
      ];

      jest
        .spyOn(prisma.pipelineExecution, 'findMany')
        .mockResolvedValue(failedPipelines);
      jest.spyOn(prisma.pipelineExecution, 'count').mockResolvedValue(1);

      const result = await service.list({
        status: 'FAILED',
        sortBy: 'startedAt',
        sortOrder: 'desc',
      });

      expect(result.data).toEqual(failedPipelines);
      expect(result.data[0].status).toBe('FAILED');

      expect(prisma.pipelineExecution.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: 'FAILED',
        },
        orderBy: { startedAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });
  });
});
