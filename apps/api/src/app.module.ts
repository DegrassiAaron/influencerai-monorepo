import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { AppConfig, computeBullEnabled, validateEnv } from './config/env.validation';

const enableBull = computeBullEnabled(process.env);
const extraImports = enableBull
  ? [
      BullModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService<AppConfig, true>) => ({
          connection: parseRedisUrl(config.get('REDIS_URL', { infer: true })),
          prefix: config.get('BULL_PREFIX', { infer: true }),
        }),
      }),
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const pretty = config.get('LOGGER_PRETTY', { infer: true });
        return {
          pinoHttp: {
            level: config.get('LOG_LEVEL', { infer: true }),
            transport: pretty
              ? {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: false },
                }
              : undefined,
          },
        };
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

