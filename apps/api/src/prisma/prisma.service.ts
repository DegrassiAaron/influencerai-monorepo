import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRequestContext } from '../lib/request-context';

type PrismaModule = typeof import('@prisma/client');

let prismaModule: PrismaModule;

try {
  prismaModule = require('@prisma/client');
} catch {
  prismaModule = {
    PrismaClient: class {
      $extends() {
        return this;
      }

      async $connect() {}

      async $disconnect() {}
    },
    Prisma: {
      defineExtension: (extension: unknown) => extension,
    },
  } as unknown as PrismaModule;
}

const { Prisma, PrismaClient } = prismaModule;

type TenantQueryOptions = {
  model?: string;
  operation?: string;
  args: Record<string, any>;
  query: (args: Record<string, any>) => Promise<unknown>;
};
type TenantQueryCallback = (options: TenantQueryOptions) => Promise<unknown>;

const TENANT_SCOPED_MODELS = new Set(['Influencer', 'Dataset', 'User']);

type TenantScopedOperationKey =
  | 'findMany'
  | 'findUnique'
  | 'findFirst'
  | 'create'
  | 'update'
  | 'updateMany'
  | 'delete'
  | 'deleteMany';

type TenantQueryTransform = (
  args: Record<string, any>,
  tenantId: string,
) => Record<string, any>;

const cloneArgs = (args: TenantQueryOptions['args']): Record<string, any> => {
  if (!args || typeof args !== 'object') {
    return {};
  }

  return { ...(args as Record<string, any>) };
};

const withTenantWhere = (overrideExisting: boolean): TenantQueryTransform => {
  return (args, tenantId) => {
    const where = { ...(args.where ?? {}) };

    if (!overrideExisting && where.tenantId) {
      return { ...args, where };
    }

    return { ...args, where: { ...where, tenantId } };
  };
};

const withTenantData: TenantQueryTransform = (args, tenantId) => {
  return {
    ...args,
    data: { ...(args.data ?? {}), tenantId },
  };
};

const executeScopedQuery = async (
  options: TenantQueryOptions,
  transform: TenantQueryTransform,
) => {
  const { model, args, query } = options;

  if (!model || !TENANT_SCOPED_MODELS.has(model)) {
    return query(args);
  }

  const tenantId = getRequestContext().tenantId;

  if (!tenantId) {
    return query(args);
  }

  const baseArgs = cloneArgs(args);
  const nextArgs = transform(baseArgs, tenantId);

  return query(nextArgs as typeof args);
};

type TenantScopedOperations = Record<TenantScopedOperationKey, TenantQueryCallback>;

export const tenantScopedOperations: TenantScopedOperations = {
  findMany: (options: TenantQueryOptions) =>
    executeScopedQuery(options, withTenantWhere(true)),
  findUnique: (options: TenantQueryOptions) =>
    executeScopedQuery(options, withTenantWhere(false)),
  findFirst: (options: TenantQueryOptions) =>
    executeScopedQuery(options, withTenantWhere(false)),
  create: (options: TenantQueryOptions) =>
    executeScopedQuery(options, withTenantData),
  update: (options: TenantQueryOptions) =>
    executeScopedQuery(options, withTenantWhere(true)),
  updateMany: (options: TenantQueryOptions) =>
    executeScopedQuery(options, withTenantWhere(true)),
  delete: (options: TenantQueryOptions) =>
    executeScopedQuery(options, withTenantWhere(true)),
  deleteMany: (options: TenantQueryOptions) =>
    executeScopedQuery(options, withTenantWhere(true)),
};

export const tenantScopingExtension = Prisma.defineExtension({
  name: 'tenant-scoping',
  query: {
    $allModels: tenantScopedOperations,
  },
});

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly databaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not configured');
    }

    super({ datasources: { db: { url: databaseUrl } } });
    this.databaseUrl = databaseUrl;
  }

  async onModuleInit(): Promise<void> {
    try {
      this.$extends(tenantScopingExtension);
      await this.$connect();
      this.logger.log(`Connected to database: ${this.maskDatabaseUrl(this.databaseUrl)}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to establish Prisma connection', err.stack);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma connection closed');
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    const closeApp = async (reason: string): Promise<void> => {
      this.logger.log(`${reason} - closing Nest application`);
      await app.close();
    };

    // Prisma 5+ with library engine no longer supports $on('beforeExit').
    // Attach to Node process events instead to ensure graceful shutdown.
    process.on('beforeExit', async () => {
      await closeApp('process beforeExit');
    });
    process.on('SIGINT', async () => {
      await closeApp('SIGINT');
    });
    process.on('SIGTERM', async () => {
      await closeApp('SIGTERM');
    });
    process.on('SIGQUIT', async () => {
      await closeApp('SIGQUIT');
    });
  }

  private maskDatabaseUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = '***';
      }
      if (parsed.username) {
        parsed.username = '***';
      }
      return parsed.toString();
    } catch {
      return '***';
    }
  }
}
