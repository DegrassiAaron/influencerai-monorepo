import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { JobsModule } from './jobs/jobs.module';
import { ContentPlansModule } from './content-plans/content-plans.module';
import { parseRedisUrl } from './lib/redis';

const enableBull = !(process.env.NODE_ENV === 'test' || ['1', 'true', 'yes'].includes(String(process.env.DISABLE_BULL).toLowerCase()));
const extraImports = enableBull
  ? [BullModule.forRoot({ connection: parseRedisUrl(process.env.REDIS_URL) })]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ...extraImports,
    JobsModule,
    ContentPlansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

