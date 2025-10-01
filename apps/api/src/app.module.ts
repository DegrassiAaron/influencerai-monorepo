import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { JobsModule } from './jobs/jobs.module';
import { ContentPlansModule } from './content-plans/content-plans.module';
import { parseRedisUrl } from './lib/redis';
import { LoggerModule } from 'nestjs-pino';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { DatasetsModule } from './datasets/datasets.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

const enableBull = !(process.env.NODE_ENV === 'test' || ['1', 'true', 'yes'].includes(String(process.env.DISABLE_BULL).toLowerCase()));
const extraImports = enableBull
  ? [BullModule.forRoot({ connection: parseRedisUrl(process.env.REDIS_URL), prefix: process.env.BULL_PREFIX })]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        transport: process.env.NODE_ENV === 'production' ? undefined : {
          target: 'pino-pretty',
          options: { colorize: true, singleLine: false },
        },
      },
    }),
    PrismaModule,
    ...extraImports,
    JobsModule,
    ContentPlansModule,
    StorageModule,
    HealthModule,
    AuthModule,
    DatasetsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}

