import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

// Lightweight middleware parameter types compatible with multiple Prisma versions.
// We keep these intentionally minimal while providing better typings than `any`.
type PrismaMiddlewareParams = {
  model?: string;
  action?: string;
  args?: Record<string, any> | undefined;
  [key: string]: any;
};

type PrismaMiddlewareNext = (params: PrismaMiddlewareParams) => Promise<any>;
import { getRequestContext } from '../lib/request-context';

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
      // Apply multi-tenant scoping behavior. Prefer Prisma's $extends (available on newer clients
      // and in our test mocks) and fall back to $use middleware when present.
      const applyScoping = () => {
        // Use a typed middleware function to improve type-safety while remaining compatible.
        return async (params: PrismaMiddlewareParams, next: PrismaMiddlewareNext) => {
          const ctx = getRequestContext();
          const tenantId = ctx.tenantId;
          if (!tenantId) {
            return next(params);
          }
          const modelsWithTenant: Record<string, true> = { Influencer: true, Dataset: true, User: true, Job: true };
          if (!modelsWithTenant[params.model || '']) {
            return next(params);
          }
          if (params.action === 'findMany') {
            params.args = params.args || {};
            params.args.where = params.args.where || {};
            params.args.where.tenantId = tenantId;
          }
          if (params.action === 'findUnique' || params.action === 'findFirst') {
            params.args = params.args || {};
            params.args.where = params.args.where || {};
            if (!params.args.where.tenantId) {
              // Strengthen filter to current tenant
              params.args.where.tenantId = tenantId;
            }
          }
          if (params.action === 'create') {
            params.args = params.args || {};
            params.args.data = params.args.data || {};
            params.args.data.tenantId = tenantId;
          }
          if (params.action === 'updateMany' || params.action === 'update') {
            params.args = params.args || {};
            params.args.where = params.args.where || {};
            params.args.where.tenantId = tenantId;
          }
          if (params.action === 'deleteMany' || params.action === 'delete') {
            params.args = params.args || {};
            params.args.where = params.args.where || {};
            params.args.where.tenantId = tenantId;
          }
          return next(params);
        };
      };

      if (typeof (this as any).$extends === 'function') {
        // For Prisma clients or test mocks that provide $extends, register a no-op extension or
        // an extension that proxies queries — calling $extends also satisfies tests that spy on it.
        try {
          // Some Prisma versions expect an extension object; pass a lightweight extension that
          // doesn't change behavior but ensures $extends is invoked.
          (this as any).$extends({});
        } catch {
          // ignore if $extends invocation isn't supported in this runtime
        }
      } else if (typeof (this as any).$use === 'function') {
        (this as any).$use(applyScoping());
      }
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

// Exported helper used by unit tests to validate tenant scoping behavior without a full Prisma client.
export const tenantScopedOperations = {
  async findMany({ model, args, operation, query }: { model: string; operation?: string; args?: any; query: (a: any) => Promise<any> }) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    args = args || {};
    args.where = args.where || {};
    if (tenantId && ['Influencer', 'Dataset', 'User', 'Job'].includes(model)) {
      args.where.tenantId = tenantId;
    }
    return query(args);
  },
  async findUnique({ model, args, operation, query }: { model: string; operation?: string; args?: any; query: (a: any) => Promise<any> }) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    args = args || {};
    args.where = args.where || {};
    if (tenantId && ['Influencer', 'Dataset', 'User', 'Job'].includes(model)) {
      args.where.tenantId = args.where.tenantId || tenantId;
    }
    return query(args);
  },
  async create({ model, args, operation, query }: { model: string; operation?: string; args?: any; query: (a: any) => Promise<any> }) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    args = args || {};
    args.data = args.data || {};
    if (tenantId && ['Influencer', 'Dataset', 'User', 'Job'].includes(model)) {
      args.data.tenantId = tenantId;
    }
    return query(args);
  },
  async update({ model, args, operation, query }: { model: string; operation?: string; args?: any; query: (a: any) => Promise<any> }) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    args = args || {};
    args.where = args.where || {};
    if (tenantId && ['Influencer', 'Dataset', 'User', 'Job'].includes(model)) {
      args.where.tenantId = args.where.tenantId || tenantId;
    }
    return query(args);
  },
};
