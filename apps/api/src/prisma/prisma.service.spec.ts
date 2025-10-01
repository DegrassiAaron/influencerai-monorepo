import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const databaseUrl = 'postgresql://user:pass@localhost:5432/db?schema=public';

  const createConfigService = (value?: string): ConfigService => {
    return {
      get: jest.fn((key: string) => (key === 'DATABASE_URL' ? value : undefined)),
    } as unknown as ConfigService;
  };

  it('throws if DATABASE_URL is not configured', () => {
    expect(() => new PrismaService(createConfigService(undefined))).toThrow(
      /DATABASE_URL/,
    );
  });

  it('connects on module init', async () => {
    const service = new PrismaService(createConfigService(databaseUrl));
    const connectSpy = jest.spyOn<any, any>(service as any, '$connect').mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('rethrows errors raised during connection', async () => {
    const service = new PrismaService(createConfigService(databaseUrl));
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
});
