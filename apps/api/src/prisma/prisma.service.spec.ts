import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { requestContext } from '../lib/request-context';

jest.mock('@prisma/client', () => {
  const db: Record<string, any[]> = {
    Influencer: [],
    Dataset: [],
    User: [],
  };

  class PrismaClientMock {
    influencer: any;
    dataset: any;
    user: any;
    private queryExtension?: (params: any, next: any) => Promise<any>;

    constructor() {
      this.influencer = {
        findMany: (args?: any) => this.findMany('Influencer', args),
        findUnique: (args?: any) => this.findUnique('Influencer', args),
      };
      this.dataset = {
        findMany: (args?: any) => this.findMany('Dataset', args),
        findUnique: (args?: any) => this.findUnique('Dataset', args),
      };
      this.user = {
        findMany: (args?: any) => this.findMany('User', args),
        findUnique: (args?: any) => this.findUnique('User', args),
      };
    }

    static __setData(model: string, data: any[]): void {
      db[model] = data;
    }

    $extends(extension: any) {
      this.queryExtension = extension?.query?.$allModels;
      return this;
    }

    $connect(): Promise<void> {
      return Promise.resolve();
    }

    $disconnect(): Promise<void> {
      return Promise.resolve();
    }

    private async executeQuery(
      model: string,
      action: string,
      args: any,
      handler: (finalArgs: any) => any,
    ) {
      const params = { model, action, args };
      const next = async (nextParams: any) => handler(nextParams.args ?? args);
      if (this.queryExtension) {
        return this.queryExtension(params, next);
      }
      return handler(args);
    }

    private async findMany(model: string, args?: any) {
      return this.executeQuery(model, 'findMany', args, (finalArgs: any) => {
        const where = finalArgs?.where ?? {};
        return db[model].filter((item) =>
          Object.entries(where).every(([key, value]) => item[key] === value),
        );
      });
    }

    private async findUnique(model: string, args?: any) {
      return this.executeQuery(model, 'findUnique', args, (finalArgs: any) => {
        const where = finalArgs?.where ?? {};
        return db[model].find((item) =>
          Object.entries(where).every(([key, value]) => item[key] === value),
        );
      });
    }
  }

  return {
    PrismaClient: PrismaClientMock,
    Prisma: {
      defineExtension: (extension: any) => extension,
    },
  };
});

import { PrismaService, tenantScopedOperations } from './prisma.service';

const runWithContext = async <T>(ctx: Record<string, any>, fn: () => Promise<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    requestContext.run(ctx, async () => {
      try {
        resolve(await fn());
      } catch (error) {
        reject(error);
      }
    });
  });
};

describe('PrismaService', () => {
  const databaseUrl = 'postgresql://user:pass@localhost:5432/db?schema=public';

  const createConfigService = (value?: string): ConfigService => {
    return {
      get: jest.fn((key: string) => (key === 'DATABASE_URL' ? value : undefined)),
    } as unknown as ConfigService;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws if DATABASE_URL is not configured', () => {
    expect(() => new PrismaService(createConfigService(undefined))).toThrow(
      /DATABASE_URL/,
    );
  });

  it('connects on module init', async () => {
    const service = new PrismaService(createConfigService(databaseUrl));
    const extendsSpy = jest.spyOn<any, any>(service as any, '$extends').mockReturnValue(service);
    const connectSpy = jest.spyOn<any, any>(service as any, '$connect').mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(extendsSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('rethrows errors raised during connection', async () => {
    const service = new PrismaService(createConfigService(databaseUrl));
    jest.spyOn<any, any>(service as any, '$extends').mockReturnValue(service);
    const error = new Error('boom');
    jest.spyOn<any, any>(service as any, '$connect').mockRejectedValue(error);

    await expect(service.onModuleInit()).rejects.toThrow(error);
  });

  it('disconnects on module destroy', async () => {
    const service = new PrismaService(createConfigService(databaseUrl));
    const disconnectSpy = jest
      .spyOn<any, any>(service as any, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('registers process hooks to close the Nest app', async () => {
    const service = new PrismaService(createConfigService(databaseUrl));
    const close = jest.fn().mockResolvedValue(undefined);
    const app = { close } as unknown as INestApplication;

    const callbacks: Record<string, (...args: any[]) => Promise<void> | void> = {};
    const procOnSpy = jest
      .spyOn(process, 'on')
      .mockImplementation(((event: any, cb: any) => {
        callbacks[event] = cb;
        return process as any;
      }) as any);

    await service.enableShutdownHooks(app);

    expect(procOnSpy).toHaveBeenCalled();
    expect(Object.keys(callbacks).length).toBeGreaterThan(0);

    // Simulate beforeExit
    await (callbacks['beforeExit']?.(0) as any);
    expect(close).toHaveBeenCalledTimes(1);

    procOnSpy.mockRestore();
  });

  describe('tenant scoping extension', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('applies tenant filter to findMany operations', async () => {
      const query = jest.fn().mockResolvedValue(['influencer']);

      await runWithContext({ tenantId: 'tenant_a' }, () =>
        tenantScopedOperations.findMany({
          model: 'Influencer',
          operation: 'findMany',
          args: { where: { status: 'active' }, orderBy: { createdAt: 'desc' } },
          query,
        }),
      );

      expect(query).toHaveBeenCalledWith({
        where: { status: 'active', tenantId: 'tenant_a' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('preserves explicit tenant filters on findUnique', async () => {
      const query = jest.fn().mockResolvedValue({ id: 'inf_1' });

      await runWithContext({ tenantId: 'tenant_a' }, () =>
        tenantScopedOperations.findUnique({
          model: 'Influencer',
          operation: 'findUnique',
          args: { where: { id: 'inf_1', tenantId: 'tenant_b' } },
          query,
        }),
      );

      expect(query).toHaveBeenCalledWith({ where: { id: 'inf_1', tenantId: 'tenant_b' } });
    });

    it('injects tenant id when creating tenant-scoped records', async () => {
      const query = jest.fn().mockResolvedValue({ id: 'inf_1' });

      await runWithContext({ tenantId: 'tenant_a' }, () =>
        tenantScopedOperations.create({
          model: 'Influencer',
          operation: 'create',
          args: { data: { name: 'Jane Doe' } },
          query,
        }),
      );

      expect(query).toHaveBeenCalledWith({ data: { name: 'Jane Doe', tenantId: 'tenant_a' } });
    });

    it('enforces tenant constraint on updates while leaving other models untouched', async () => {
      const updateQuery = jest.fn().mockResolvedValue({ id: 'inf_1' });
      const passthroughQuery = jest.fn().mockResolvedValue({ id: 'tenant_1' });

      await runWithContext({ tenantId: 'tenant_a' }, async () => {
        await tenantScopedOperations.update({
          model: 'Influencer',
          operation: 'update',
          args: { where: { id: 'inf_1' }, data: { name: 'Updated' } },
          query: updateQuery,
        });

        await tenantScopedOperations.update({
          model: 'Tenant',
          operation: 'update',
          args: { where: { id: 'tenant_1' }, data: { name: 'Other' } },
          query: passthroughQuery,
        });
      });

      expect(updateQuery).toHaveBeenCalledWith({
        where: { id: 'inf_1', tenantId: 'tenant_a' },
        data: { name: 'Updated' },
      });
      expect(passthroughQuery).toHaveBeenCalledWith({
        where: { id: 'tenant_1' },
        data: { name: 'Other' },
      });
    });

    it('skips scoping when no tenant is present in the request context', async () => {
      const query = jest.fn().mockResolvedValue([]);

      await runWithContext({}, () =>
        tenantScopedOperations.findMany({
          model: 'Influencer',
          operation: 'findMany',
          args: { where: { status: 'active' } },
          query,
        }),
      );

      expect(query).toHaveBeenCalledWith({ where: { status: 'active' } });
    });
  });

  describe('$extends tenant scoping integration', () => {
    const setModelData = (model: string, data: any[]) => {
      (PrismaClient as any).__setData(model, data);
    };

    afterEach(() => {
      setModelData('Influencer', []);
      setModelData('User', []);
      setModelData('Dataset', []);
    });

    it('scopes findMany queries to the active tenant', async () => {
      setModelData('Influencer', [
        { id: 'inf_a1', tenantId: 'tenant_a' },
        { id: 'inf_b1', tenantId: 'tenant_b' },
      ]);

      const service = new PrismaService(createConfigService(databaseUrl));
      await service.onModuleInit();

      const results = await runWithContext({ tenantId: 'tenant_a' }, () =>
        (service as any).influencer.findMany({}),
      );

      expect(results).toEqual([{ id: 'inf_a1', tenantId: 'tenant_a' }]);
    });

    it('prevents cross-tenant reads on findUnique', async () => {
      setModelData('Influencer', [
        { id: 'inf_a1', tenantId: 'tenant_a' },
        { id: 'inf_b1', tenantId: 'tenant_b' },
      ]);

      const service = new PrismaService(createConfigService(databaseUrl));
      await service.onModuleInit();

      const result = await runWithContext({ tenantId: 'tenant_a' }, () =>
        (service as any).influencer.findUnique({ where: { id: 'inf_b1' } }),
      );

      expect(result).toBeUndefined();
    });
  });
});
