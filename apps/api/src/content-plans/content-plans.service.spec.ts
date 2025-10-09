import { ContentPlansService } from './content-plans.service';
import { validateEnv, AppConfig } from '../config/env.validation';
import { ConfigService } from '@nestjs/config';

describe('ContentPlansService', () => {
  const prismaMock: any = {
    influencer: { findUnique: jest.fn() },
    job: { create: jest.fn() },
  };
  let config: ConfigService<AppConfig, true>;
  let configValues: AppConfig;

  beforeEach(() => {
    // Configure prisma mocks
    prismaMock.influencer.findUnique.mockImplementation(async ({ where: { id } }: any) => (id === 'inf_1' ? { id, tenantId: 'ten_1', persona: { name: 'A' } } : null));
    prismaMock.job.create.mockImplementation(async ({ data }: any) => ({ id: 'job_cp_1', ...data }));
    configValues = validateEnv({ DATABASE_URL: 'postgresql://user:pass@localhost:5432/db' });
    config = {
      get: jest.fn((key: keyof AppConfig) => configValues[key]),
    } as unknown as ConfigService<AppConfig, true>;
    // Mock global fetch to simulate OpenRouter returning JSON array in content
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ choices: [{ message: { content: JSON.stringify([{ caption: 'post1', hashtags: ['x'] }]) } }] }),
    })) as any;
  });

  it('createPlan parses posts and persists job with influencer/tenant association', async () => {
    const svc = new ContentPlansService(prismaMock, config);
    const res = await svc.createPlan({ influencerId: 'inf_1', theme: 't' });
    expect(res.id).toBe('job_cp_1');
    expect(res.plan.posts[0]).toEqual({ caption: 'post1', hashtags: ['x'] });
    expect(prismaMock.job.create).toHaveBeenCalled();
    const arg = prismaMock.job.create.mock.calls[0][0];
    expect(arg.data.payload).toMatchObject({ influencerId: 'inf_1', tenantId: 'ten_1' });
    expect(arg.data.result.createdAt).toBeTruthy();
  });

  it('retries on 429 with Retry-After then succeeds', async () => {
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock)
      .mockImplementationOnce(async () => ({
        ok: false,
        status: 429,
        headers: { get: (k: string) => (k.toLowerCase() === 'retry-after' ? '0' : null) },
        json: async () => ({ error: 'rate limited' }),
        text: async () => 'rate limited',
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ choices: [{ message: { content: JSON.stringify([{ caption: 'ok', hashtags: ['h'] }]) } }] }),
      }));

    const svc = new ContentPlansService(prismaMock, config);
    const posts = await svc.generatePlanPosts('{}', 't');
    expect(posts[0]).toEqual({ caption: 'ok', hashtags: ['h'] });
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('throws after retries on timeout/network error', async () => {
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock).mockImplementation(async () => {
      const err: any = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    });
    const svc = new ContentPlansService(prismaMock, config);
    await expect(svc.generatePlanPosts('{}', 't')).rejects.toBeTruthy();
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('retries on 5xx then succeeds', async () => {
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock)
      .mockImplementationOnce(async () => ({
        ok: false,
        status: 502,
        headers: { get: () => null },
        json: async () => ({ error: 'bad gateway' }),
        text: async () => 'bad gateway',
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ choices: [{ message: { content: JSON.stringify([{ caption: 'ok2', hashtags: ['h2'] }]) } }] }),
      }));
    const svc = new ContentPlansService(prismaMock, config);
    const posts = await svc.generatePlanPosts('{}', 't');
    expect(posts[0]).toEqual({ caption: 'ok2', hashtags: ['h2'] });
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
