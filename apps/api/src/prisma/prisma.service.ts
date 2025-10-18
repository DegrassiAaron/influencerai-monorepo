import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { getRequestContext } from '../lib/request-context';
import { AppConfig } from '../config/env.validation';

// Lightweight middleware parameter types compatible with multiple Prisma versions.
// We keep these intentionally minimal while providing better typings than `any`.
type PrismaMiddlewareParams = {
  model?: string;
  action?: string;
  args?: Record<string, unknown>;
  [key: string]: unknown;
};

type PrismaMiddlewareNext = (params: PrismaMiddlewareParams) => Promise<unknown>;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly databaseUrl: string;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const databaseUrl = configService.get('DATABASE_URL', { infer: true });

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
          const modelsWithTenant: Record<string, true> = {
            Influencer: true,
            Dataset: true,
            User: true,
            Job: true,
            LoraConfig: true,
          };
          if (!modelsWithTenant[params.model || '']) {
            return next(params);
          }
          const args = ensureRecord(params.args);
          params.args = args;
          if (params.action === 'findMany') {
            const where = ensureRecord(args.where);
            where.tenantId = tenantId;
            args.where = where;
          }
          if (params.action === 'findUnique' || params.action === 'findFirst') {
            const where = ensureRecord(args.where);
            if (typeof where.tenantId === 'undefined') {
              where.tenantId = tenantId;
            }
            args.where = where;
          }
          if (params.action === 'create') {
            const data = ensureRecord(args.data);
            data.tenantId = tenantId;
            args.data = data;
          }
          if (params.action === 'updateMany' || params.action === 'update') {
            const where = ensureRecord(args.where);
            where.tenantId = tenantId;
            args.where = where;
          }
          if (params.action === 'deleteMany' || params.action === 'delete') {
            const where = ensureRecord(args.where);
            where.tenantId = tenantId;
            args.where = where;
          }
          return next(params);
        };
      };

      const scopingMiddleware = applyScoping();

      const clientWithExtensions = this as unknown as {
        $extends?: (extension: {
          query: {
            $allModels: (
              params: PrismaMiddlewareParams,
              next: PrismaMiddlewareNext
            ) => Promise<unknown>;
          };
        }) => unknown;
        $use?: (
          middleware: (
            params: PrismaMiddlewareParams,
            next: PrismaMiddlewareNext
          ) => Promise<unknown>
        ) => unknown;
      };

      if (typeof clientWithExtensions.$extends === 'function') {
        // For Prisma clients or test mocks that provide $extends, register a query extension that
        // delegates to our multi-tenant scoping middleware.
        try {
          // Some Prisma versions expect an extension object; pass a lightweight extension that
          // proxies all queries through the tenant scoping middleware.
          clientWithExtensions.$extends({
            query: {
              $allModels: (params: PrismaMiddlewareParams, next: PrismaMiddlewareNext) =>
                scopingMiddleware(params, next),
            },
          });
        } catch {
          // ignore if $extends invocation isn't supported in this runtime
        }
      } else if (typeof clientWithExtensions.$use === 'function') {
        clientWithExtensions.$use(scopingMiddleware);
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
type TenantScopedOperationArgs = {
  model: string;
  operation?: string;
  args?: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
};

export const tenantScopedOperations = {
  async findMany({ model, args, query }: TenantScopedOperationArgs) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    const normalizedArgs = ensureRecord(args);
    const where = ensureRecord(normalizedArgs.where);
    if (tenantId && ['Influencer', 'Dataset', 'User', 'Job', 'LoraConfig'].includes(model)) {
      where.tenantId = tenantId;
    }
    normalizedArgs.where = where;
    return query(normalizedArgs);
  },
  async findUnique({ model, args, query }: TenantScopedOperationArgs) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    const normalizedArgs = ensureRecord(args);
    const where = ensureRecord(normalizedArgs.where);
    if (tenantId && ['Influencer', 'Dataset', 'User', 'Job', 'LoraConfig'].includes(model)) {
      if (typeof where.tenantId === 'undefined') {
        where.tenantId = tenantId;
      }
    }
    normalizedArgs.where = where;
    return query(normalizedArgs);
  },
  async create({ model, args, query }: TenantScopedOperationArgs) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    const normalizedArgs = ensureRecord(args);
    const data = ensureRecord(normalizedArgs.data);
    if (tenantId && ['Influencer', 'Dataset', 'User', 'Job', 'LoraConfig'].includes(model)) {
      data.tenantId = tenantId;
    }
    normalizedArgs.data = data;
    return query(normalizedArgs);
  },
  async update({ model, args, query }: TenantScopedOperationArgs) {
    const ctx = getRequestContext();
    const tenantId = ctx.tenantId;
    const normalizedArgs = ensureRecord(args);
    const where = ensureRecord(normalizedArgs.where);
    if (tenantId && ['Influencer', 'Dataset', 'User', 'Job', 'LoraConfig'].includes(model)) {
      if (typeof where.tenantId === 'undefined') {
        where.tenantId = tenantId;
      }
    }
    normalizedArgs.where = where;
    return query(normalizedArgs);
  },
};

function ensureRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
