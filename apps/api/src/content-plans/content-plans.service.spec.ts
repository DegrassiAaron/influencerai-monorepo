import { ContentPlansService } from './content-plans.service';

describe('ContentPlansService', () => {
  const prismaMock: any = {
    influencer: { findUnique: jest.fn() },
    job: { create: jest.fn() },
  };

  beforeEach(() => {
    // Configure prisma mocks
    prismaMock.influencer.findUnique.mockImplementation(async ({ where: { id } }: any) => (id === 'inf_1' ? { id, tenantId: 'ten_1', persona: { name: 'A' } } : null));
    prismaMock.job.create.mockImplementation(async ({ data }: any) => ({ id: 'job_cp_1', ...data }));
    // Mock global fetch to simulate OpenRouter returning JSON array in content
    global.fetch = jest.fn(async () => ({
      json: async () => ({ choices: [{ message: { content: JSON.stringify([{ caption: 'post1', hashtags: ['x'] }]) } }] }),
    })) as any;
  });

  it('createPlan parses posts and persists job with influencer/tenant association', async () => {
    const svc = new ContentPlansService(prismaMock);
    const res = await svc.createPlan({ influencerId: 'inf_1', theme: 't' });
    expect(res.id).toBe('job_cp_1');
    expect(res.plan.posts[0]).toEqual({ caption: 'post1', hashtags: ['x'] });
    expect(prismaMock.job.create).toHaveBeenCalled();
    const arg = prismaMock.job.create.mock.calls[0][0];
    expect(arg.data.payload).toMatchObject({ influencerId: 'inf_1', tenantId: 'ten_1' });
    expect(arg.data.result.createdAt).toBeTruthy();
  });
});
