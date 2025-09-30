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

  it('wires the beforeExit hook to close the Nest app', async () => {
    const service = new PrismaService(createConfigService(databaseUrl));
    const onSpy = jest.spyOn<any, any>(service as any, '$on');
    const close = jest.fn().mockResolvedValue(undefined);
    const app = { close } as unknown as INestApplication;

    const callbacks: Record<string, () => Promise<void>> = {};
    onSpy.mockImplementation((event: string, cb: () => Promise<void>) => {
      callbacks[event] = cb;
      return service;
    });

    await service.enableShutdownHooks(app);

    expect(onSpy).toHaveBeenCalledWith('beforeExit', expect.any(Function));
    const callback = callbacks['beforeExit'];
    expect(callback).toBeDefined();

    await callback?.();

    expect(close).toHaveBeenCalledTimes(1);
  });
});