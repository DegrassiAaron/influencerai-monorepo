import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  if (!process.env.OPENROUTER_API_KEY && process.env.NODE_ENV !== 'test') {
    throw new Error('OPENROUTER_API_KEY is required. Set it in your environment.');
  }
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const prismaService = app.get(PrismaService);
  const logger = app.get(Logger);
  app.useLogger(logger);
  await prismaService.enableShutdownHooks(app);

  const config = new DocumentBuilder()
    .setTitle('InfluencerAI API')
    .setDescription('API for virtual influencer content generation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 3001, '0.0.0.0');
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
