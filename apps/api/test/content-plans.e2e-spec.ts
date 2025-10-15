import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getQueueToken } from '@nestjs/bullmq';
import { ContentPlansService } from '../src/content-plans/content-plans.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { getAuthHeader } from './utils/test-auth';

describe('Content Plans (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const svcMock: Partial<ContentPlansService> = {
      createPlan: jest.fn(async (dto: any) => ({
        id: 'cp_1',
        plan: {
          influencerId: dto.influencerId,
          theme: dto.theme,
          targetPlatforms: dto.targetPlatforms ?? ['instagram'],
          posts: [ { caption: 'Hello world', hashtags: ['hi'] } ],
          createdAt: new Date().toISOString(),
        },
      })),
      getPlan: jest.fn(async (id: string) => ({
        id,
        plan: ({
          influencerId: 'inf_1',
          theme: 'tech',
          targetPlatforms: ['instagram'],
          posts: [{ caption: 'c', hashtags: [] as string[] }],
          createdAt: new Date().toISOString(),
        } as any),
      })),
      listPlans: jest.fn(async () => ([{
        id: 'cp_1',
        plan: ({ influencerId: 'inf_1', theme: 'tech', targetPlatforms: ['instagram'], posts: [{ caption: 'c', hashtags: [] as string[] }], createdAt: new Date().toISOString() } as any)
      }]))
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('content-generation')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(getQueueToken('lora-training')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(getQueueToken('video-generation')).useValue({ add: jest.fn(async () => null) })
      .overrideProvider(ContentPlansService).useValue(svcMock)
      .overrideProvider(PrismaService).useValue({ onModuleInit: jest.fn(), onModuleDestroy: jest.fn(), enableShutdownHooks: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as any).ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('POST /content-plans creates a plan', async () => {
    const res = await request(app.getHttpServer())
      .post('/content-plans')
      .set(getAuthHeader())
      .send({ influencerId: 'inf_1', theme: 'tech' })
      .expect(201);
    expect(res.body.id).toBe('cp_1');
    expect(res.body.plan).toBeTruthy();
  });

  it('GET /content-plans lists plans', async () => {
    const res = await request(app.getHttpServer())
      .get('/content-plans')
      .set(getAuthHeader())
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /content-plans/:id returns a plan', async () => {
    const res = await request(app.getHttpServer())
      .get('/content-plans/cp_1')
      .set(getAuthHeader())
      .expect(200);
    expect(res.body.id).toBe('cp_1');
  });
});
