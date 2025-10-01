import { Module } from '@nestjs/common';
import { ContentPlansController } from './content-plans.controller';
import { ContentPlansService } from './content-plans.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ContentPlansController],
  providers: [PrismaService, ContentPlansService],
})
export class ContentPlansModule {}

