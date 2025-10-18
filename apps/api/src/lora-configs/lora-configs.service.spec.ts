import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { LoraConfigsService } from './lora-configs.service';
import { PrismaService } from '../prisma/prisma.service';
import * as requestContext from '../lib/request-context';

/**
 * Unit tests for LoraConfigsService
 *
 * Test coverage:
 * - Create with valid/invalid parameters
 * - Create with duplicate name (expect ConflictException)
 * - Create with isDefault=true (unsets others)
 * - List with filters (isDefault, modelName)
 * - List with pagination and sorting
 * - getById with valid/invalid ID
 * - getById with cross-tenant access (expect NotFoundException)
 * - Update with valid changes
 * - Update to set as default
 * - Delete unused config
 * - Delete default config (with warning)
 * - Delete config with active jobs (expect BadRequestException)
 * - Delete config with only completed jobs (success)
 */

describe('LoraConfigsService', () => {
  let service: LoraConfigsService;
  let prisma: PrismaService;

  // Mock tenant context
  const mockTenantId = 'tenant-123';

  // Mock LoRA configs
  const mockLoraConfig = {
    id: 'config-1',
    tenantId: mockTenantId,
    name: 'Test Config',
    description: 'Test description',
    modelName: 'sd15',
    epochs: 10,
    learningRate: 0.0001,
    batchSize: 1,
    resolution: 512,
    networkDim: 32,
    networkAlpha: 16,
    outputPath: null as string | null,
    meta: {} as Record<string, unknown>,
    isDefault: false,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockDefaultConfig = {
    ...mockLoraConfig,
    id: 'config-2',
    name: 'Default Config',
    isDefault: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoraConfigsService,
        {
          provide: PrismaService,
          useValue: {
            loraConfig: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
            },
            job: {
              count: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LoraConfigsService>(LoraConfigsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock getRequestContext to return tenant ID
    jest
      .spyOn(requestContext, 'getRequestContext')
      .mockReturnValue({ tenantId: mockTenantId });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a LoRA config with valid parameters', async () => {
      const input = {
        name: 'New Config',
        modelName: 'sdxl',
        epochs: 20,
        learningRate: 0.0002,
      };

      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.loraConfig, 'create').mockResolvedValue({
        ...mockLoraConfig,
        ...input,
        outputPath: null,
      } as any);

      const result = await service.create(input);

      expect(result.name).toBe('New Config');
      expect(result.modelName).toBe('sdxl');
      expect(prisma.loraConfig.create).toHaveBeenCalledWith({
        data: {
          ...input,
          tenantId: mockTenantId,
        },
      });
    });

    it('should throw ConflictException for duplicate name', async () => {
      const input = {
        name: 'Test Config',
        modelName: 'sd15',
      };

      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(mockLoraConfig);

      await expect(service.create(input)).rejects.toThrow(ConflictException);
      await expect(service.create(input)).rejects.toThrow(
        'LoRA configuration with name "Test Config" already exists'
      );
    });

    it('should throw BadRequestException if tenant context is missing', async () => {
      jest
        .spyOn(requestContext, 'getRequestContext')
        .mockReturnValue({ tenantId: null });

      const input = {
        name: 'New Config',
        modelName: 'sd15',
      };

      await expect(service.create(input)).rejects.toThrow(BadRequestException);
      await expect(service.create(input)).rejects.toThrow(
        'Tenant context is required'
      );
    });

    it('should unset other defaults when creating with isDefault=true', async () => {
      const input = {
        name: 'New Default',
        modelName: 'sd15',
        isDefault: true,
      };

      const newConfig = { ...mockLoraConfig, ...input };

      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          loraConfig: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            create: jest.fn().mockResolvedValue(newConfig),
          },
        };
        return callback(tx as any);
      });

      const result = await service.create(input);

      expect(result.isDefault).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list all configs with default pagination', async () => {
      const configs = [mockLoraConfig, mockDefaultConfig];

      jest.spyOn(prisma.loraConfig, 'findMany').mockResolvedValue(configs);
      jest.spyOn(prisma.loraConfig, 'count').mockResolvedValue(2);

      const result = await service.list({
        take: 20,
        skip: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.data).toEqual(configs);
      expect(result.total).toBe(2);
      expect(result.take).toBe(20);
      expect(result.skip).toBe(0);
    });

    it('should filter by isDefault flag', async () => {
      jest.spyOn(prisma.loraConfig, 'findMany').mockResolvedValue([mockDefaultConfig]);
      jest.spyOn(prisma.loraConfig, 'count').mockResolvedValue(1);

      const result = await service.list({
        isDefault: true,
        take: 20,
        skip: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.data).toEqual([mockDefaultConfig]);
      expect(prisma.loraConfig.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          isDefault: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should filter by modelName', async () => {
      jest.spyOn(prisma.loraConfig, 'findMany').mockResolvedValue([mockLoraConfig]);
      jest.spyOn(prisma.loraConfig, 'count').mockResolvedValue(1);

      const result = await service.list({
        modelName: 'sd15',
        take: 20,
        skip: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.data).toHaveLength(1);
      expect(prisma.loraConfig.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          modelName: 'sd15',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should support custom pagination and sorting', async () => {
      jest.spyOn(prisma.loraConfig, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.loraConfig, 'count').mockResolvedValue(0);

      await service.list({
        take: 10,
        skip: 5,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(prisma.loraConfig.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { name: 'asc' },
        take: 10,
        skip: 5,
      });
    });

    it('should execute count and findMany in parallel', async () => {
      const findManySpy = jest
        .spyOn(prisma.loraConfig, 'findMany')
        .mockResolvedValue([]);
      const countSpy = jest.spyOn(prisma.loraConfig, 'count').mockResolvedValue(0);

      await service.list({
        take: 20,
        skip: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Both should be called (parallel execution via Promise.all)
      expect(findManySpy).toHaveBeenCalled();
      expect(countSpy).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return config by ID', async () => {
      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(mockLoraConfig);

      const result = await service.getById('config-1');

      expect(result).toEqual(mockLoraConfig);
      expect(prisma.loraConfig.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'config-1',
          tenantId: mockTenantId,
        },
      });
    });

    it('should throw NotFoundException for non-existent ID', async () => {
      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(null);

      await expect(service.getById('invalid-id')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getById('invalid-id')).rejects.toThrow(
        'LoRA configuration with ID "invalid-id" not found'
      );
    });

    it('should throw NotFoundException for cross-tenant access', async () => {
      // Mock returns null because tenantId doesn't match
      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(null);

      await expect(service.getById('config-other-tenant')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    it('should update config with valid changes', async () => {
      const updates = {
        epochs: 30,
        learningRate: 0.0003,
      };

      const updatedConfig = { ...mockLoraConfig, ...updates };

      jest
        .spyOn(prisma.loraConfig, 'findFirst')
        .mockResolvedValueOnce(mockLoraConfig); // getById call
      jest.spyOn(prisma.loraConfig, 'update').mockResolvedValue(updatedConfig);

      const result = await service.update('config-1', updates);

      expect(result.epochs).toBe(30);
      expect(result.learningRate).toBe(0.0003);
      expect(prisma.loraConfig.update).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: updates,
      });
    });

    it('should throw ConflictException when updating to duplicate name', async () => {
      const updates = { name: 'Existing Name' };

      const existingOther = { ...mockLoraConfig, id: 'config-other', name: 'Existing Name' };

      // First call will check and return the config being updated
      // Second call will check for duplicate name and find existing other config
      jest
        .spyOn(prisma.loraConfig, 'findFirst')
        .mockResolvedValueOnce(mockLoraConfig) // getById
        .mockResolvedValueOnce(existingOther); // duplicate check

      await expect(service.update('config-1', updates)).rejects.toThrow(
        ConflictException
      );

      // Reset mock for second expectation
      jest
        .spyOn(prisma.loraConfig, 'findFirst')
        .mockResolvedValueOnce(mockLoraConfig) // getById
        .mockResolvedValueOnce(existingOther); // duplicate check

      await expect(service.update('config-1', updates)).rejects.toThrow(
        'LoRA configuration with name "Existing Name" already exists'
      );
    });

    it('should allow updating to same name (no conflict)', async () => {
      const updates = { name: 'Test Config', epochs: 15 };

      jest
        .spyOn(prisma.loraConfig, 'findFirst')
        .mockResolvedValueOnce(mockLoraConfig) // getById
        .mockResolvedValueOnce(null); // no duplicate (same config excluded)

      jest
        .spyOn(prisma.loraConfig, 'update')
        .mockResolvedValue({ ...mockLoraConfig, epochs: 15 });

      const result = await service.update('config-1', updates);

      expect(result.epochs).toBe(15);
    });

    it('should unset other defaults when updating to isDefault=true', async () => {
      const updates = { isDefault: true };
      const updatedConfig = { ...mockLoraConfig, isDefault: true };

      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(mockLoraConfig);
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          loraConfig: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            update: jest.fn().mockResolvedValue(updatedConfig),
          },
        };
        return callback(tx as any);
      });

      const result = await service.update('config-1', updates);

      expect(result.isDefault).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent config', async () => {
      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(null);

      await expect(
        service.update('invalid-id', { epochs: 20 })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete unused config successfully', async () => {
      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(mockLoraConfig);
      jest.spyOn(prisma.job, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.loraConfig, 'delete').mockResolvedValue(mockLoraConfig);

      const result = await service.delete('config-1');

      expect(result.success).toBe(true);
      expect(result.warnings).toBeUndefined();
      expect(prisma.loraConfig.delete).toHaveBeenCalledWith({
        where: { id: 'config-1' },
      });
    });

    it('should return warning when deleting default config', async () => {
      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(mockDefaultConfig);
      jest.spyOn(prisma.job, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.loraConfig, 'delete').mockResolvedValue(mockDefaultConfig);

      const result = await service.delete('config-2');

      expect(result.success).toBe(true);
      expect(result.warnings).toEqual([
        'Deleted the default LoRA configuration. Consider setting a new default.',
      ]);
    });

    it('should throw BadRequestException when active jobs exist', async () => {
      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(mockLoraConfig);
      jest.spyOn(prisma.job, 'count').mockResolvedValue(3); // 3 active jobs

      await expect(service.delete('config-1')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.delete('config-1')).rejects.toThrow(
        'Cannot delete LoRA configuration "Test Config" because 3 active job(s) are using it'
      );
      expect(prisma.loraConfig.delete).not.toHaveBeenCalled();
    });

    it('should succeed when only completed jobs exist', async () => {
      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(mockLoraConfig);
      jest.spyOn(prisma.job, 'count').mockResolvedValue(0); // No active jobs
      jest.spyOn(prisma.loraConfig, 'delete').mockResolvedValue(mockLoraConfig);

      const result = await service.delete('config-1');

      expect(result.success).toBe(true);
      expect(prisma.job.count).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          meta: {
            path: ['loraConfigId'],
            equals: 'config-1',
          },
          status: {
            in: ['pending', 'running'],
          },
        },
      });
    });

    it('should throw NotFoundException for non-existent config', async () => {
      jest.spyOn(prisma.loraConfig, 'findFirst').mockResolvedValue(null);

      await expect(service.delete('invalid-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
