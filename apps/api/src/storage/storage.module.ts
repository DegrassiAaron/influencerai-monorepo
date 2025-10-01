import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [ConfigModule],
  providers: [StorageService],
  controllers: [StorageController],
  exports: [StorageService],
})
export class StorageModule implements OnModuleInit {
  constructor(private readonly storage: StorageService) {}
  async onModuleInit() {
    try {
      await this.storage.ensureBucket();
    } catch (e: any) {
      if (process.env.NODE_ENV === 'test' || process.env.SKIP_S3_INIT === 'true' || process.env.SKIP_S3_INIT === '1') {
        // eslint-disable-next-line no-console
        console.warn('[storage] ensureBucket skipped due to test/skip flag:', e?.message || String(e));
        return;
      }
      throw e;
    }
  }
}
