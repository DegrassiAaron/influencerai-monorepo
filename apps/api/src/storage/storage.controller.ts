import { Controller, Get, HttpException, HttpStatus, Put, Query } from '@nestjs/common';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get('health')
  async health() {
    try {
      await this.storage.ensureBucket();
      return { ok: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpException({ ok: false, error: message }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Put('test-object')
  async put(@Query('key') key = 'connectivity.txt', @Query('content') content = 'hello from api') {
    await this.storage.putTextObject(key, content);
    const readBack = await this.storage.getTextObject(key);
    return { ok: true, key, roundtrip: readBack };
  }
}

