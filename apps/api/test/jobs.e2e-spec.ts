import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JobsService } from '../src/jobs/jobs.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Jobs (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db?schema=public';

    const jobsServiceMock: Partial<JobsService> = {
      createJob: jest.fn(async ({ type, payload }) => ({ id: 'job_2', type, status: 'pending', payload } as any)),
      listJobs: jest.fn(async () => [{ id: 'job_1', type: 'content-generation', status: 'pending', payload: { foo: 'bar' } } as any]),
      getJob: jest.fn(async (id: string) => ({ id, type: 'content-generation', status: 'pending', payload: {} } as any)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_GUARD)
      .useValue({ canActivate: () => true })
      .overrideProvider(JobsService)
      .useValue(jobsServiceMock)
      .overrideProvider(PrismaService)
      .useValue({ onModuleInit: jest.fn(), onModuleDestroy: jest.fn(), enableShutdownHooks: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /jobs creates a job and enqueues', async () => {
    const res = await request(app.getHttpServer())
      .post('/jobs')
      .send({ type: 'content-generation', payload: { foo: 'bar' } })
      .expect(201);
    expect(res.body).toMatchObject({ id: 'job_2', type: 'content-generation', status: 'pending' });
  });

  it('GET /jobs lists jobs', async () => {
    const res = await request(app.getHttpServer())
      .get('/jobs')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: 'job_1' });
  });

  it('GET /jobs/:id returns job', async () => {
    const res = await request(app.getHttpServer())
      .get('/jobs/job_42')
      .expect(200);
    expect(res.body).toMatchObject({ id: 'job_42' });
  });
});
