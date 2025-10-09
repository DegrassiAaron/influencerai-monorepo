import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { Logger } from 'nestjs-pino';
import { AppConfig } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService<AppConfig, true>);
  const prismaService = app.get(PrismaService);
  const logger = app.get(Logger);
  app.useLogger(logger);
  await prismaService.enableShutdownHooks(app);

  const nodeEnv = configService.get('NODE_ENV', { infer: true });
  const apiKey = configService.get('OPENROUTER_API_KEY', { infer: true });
  if (!apiKey && nodeEnv !== 'test') {
    throw new Error('OPENROUTER_API_KEY is required. Set it in your environment.');
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('InfluencerAI API')
    .setDescription('API for virtual influencer content generation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const port = configService.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
