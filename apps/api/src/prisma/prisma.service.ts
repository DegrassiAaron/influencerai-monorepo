import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Use runtime import to avoid TS type resolution issues during container builds
// Types are still available in dev; in CI we fall back to any
 
const PrismaClientAny: any = require('@prisma/client').PrismaClient;

@Injectable()
export class PrismaService extends (PrismaClientAny as any) implements OnModuleInit, OnModuleDestroy {
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
