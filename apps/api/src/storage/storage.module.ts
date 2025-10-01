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
    await this.storage.ensureBucket();
  }
}

