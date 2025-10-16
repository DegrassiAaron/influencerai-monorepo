import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { AppConfig } from '../config/env.validation';

@Module({
  imports: [ConfigModule],
  providers: [StorageService],
  controllers: [StorageController],
  exports: [StorageService],
})
export class StorageModule implements OnModuleInit {
  private readonly logger = new Logger(StorageModule.name);
  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService<AppConfig, true>
  ) {}
  async onModuleInit() {
    try {
      await this.storage.ensureBucket();
    } catch (error: unknown) {
      const nodeEnv = this.config.get('NODE_ENV', { infer: true });
      const skipInit = this.config.get('SKIP_S3_INIT', { infer: true });
      if (nodeEnv === 'test' || skipInit) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[storage] ensureBucket skipped due to test/skip flag: ${message}`);
        return;
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
