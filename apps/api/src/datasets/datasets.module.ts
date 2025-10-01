import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [DatasetsController],
  providers: [PrismaService, StorageService, DatasetsService],
})
export class DatasetsModule {}

