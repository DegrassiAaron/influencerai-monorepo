import { afterEach, describe, expect, it, vi } from 'vitest';
import { InfluencerAIClient } from './index';
import { APIError } from './fetch-utils';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InfluencerAIClient', () => {
  const createMockResponse = (body: unknown, init?: Partial<Response>) => ({
    ok: true,
    status: 200,
    headers: {
      get: () => 'application/json',
    },
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn(),
    ...init,
  });

  it('creates a job and validates response', async () => {
    const mockResponse = createMockResponse({ id: 'job-1', status: 'pending' });
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const client = new InfluencerAIClient('http://api.test');
    const result = await client.createJob({ type: 'content-generation', payload: {}, priority: 5 });

    expect(result.id).toBe('job-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.test/jobs',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('throws APIError when job response is missing id', async () => {
    const mockResponse = createMockResponse({ status: 'pending' });
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const client = new InfluencerAIClient('http://api.test');
    await expect(
      client.createJob({ type: 'content-generation', payload: {}, priority: 5 })
    ).rejects.toBeInstanceOf(APIError);
  });

  it('validates queue summary shape', async () => {
    const mockResponse = createMockResponse({ active: 1, waiting: 2, failed: 0 });
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const client = new InfluencerAIClient('http://api.test');
    const summary = await client.getQueuesSummary();
    expect(summary).toEqual({ active: 1, waiting: 2, failed: 0 });

    mockFetch.mockResolvedValueOnce(createMockResponse({ active: '1', waiting: 2, failed: 0 }));
    await expect(client.getQueuesSummary()).rejects.toBeInstanceOf(APIError);
  });

  it('uses default base url when none provided', async () => {
    const mockResponse = createMockResponse({ id: 'job-2' });
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const client = new InfluencerAIClient();
    await client.createJob({ type: 'content-generation', payload: {}, priority: 5 });
    expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:3001/jobs');
  });

  it('lists jobs with optional filters and validates response shape', async () => {
    const mockResponse = createMockResponse([
      { id: 'job-1', type: 'content-generation', status: 'pending' },
      { id: 'job-2', type: 'content-generation', status: 'running' },
    ]);
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const client = new InfluencerAIClient('http://api.test');
    const result = await client.listJobs({ status: 'pending', take: 5 });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'job-1' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.test/jobs?status=pending&take=5',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('throws when jobs response has unexpected shape', async () => {
    const mockResponse = createMockResponse({});
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const client = new InfluencerAIClient('http://api.test');
    await expect(client.listJobs()).rejects.toBeInstanceOf(APIError);
  });

  it('updates a job and returns validated payload', async () => {
    const mockResponse = createMockResponse({ id: 'job-1', status: 'succeeded' });
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const client = new InfluencerAIClient('http://api.test');
    const result = await client.updateJob('job-1', { status: 'succeeded' });

    expect(result).toMatchObject({ id: 'job-1', status: 'succeeded' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.test/jobs/job-1',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('lists datasets and validates payload structure', async () => {
    const datasets = [
      {
        id: 'ds-1',
        kind: 'lora-training',
        path: 'datasets/tenant/ds-1/file.zip',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        meta: { filename: 'file.zip' },
      },
    ];
    const mockResponse = createMockResponse(datasets);
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const client = new InfluencerAIClient('http://api.test');
    const result = await client.listDatasets();

    expect(result).toEqual(datasets);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.test/datasets',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('creates a dataset and returns upload information', async () => {
    const payload = {
      id: 'ds-1',
      uploadUrl: 'https://upload',
      key: 'datasets/tenant/ds-1/file.zip',
      bucket: 'uploads',
    };
    const mockResponse = createMockResponse(payload);
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const client = new InfluencerAIClient('http://api.test');
    const result = await client.createDataset({ kind: 'lora-training', filename: 'file.zip' });

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.test/datasets',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ kind: 'lora-training', filename: 'file.zip' }),
      })
    );
  });

  it('retrieves a content plan by id and validates shape', async () => {
    const plan = {
      id: 'plan-1',
      plan: {
        influencerId: 'inf-1',
        theme: 'summer vibes',
        targetPlatforms: ['instagram'],
        posts: [{ caption: 'hello', hashtags: ['#summer'] }],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    };
    const mockResponse = createMockResponse(plan);
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const client = new InfluencerAIClient('http://api.test');
    const result = await client.getContentPlan('plan-1');

    expect(result).toEqual(plan);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.test/content-plans/plan-1',
      expect.objectContaining({ method: 'GET' })
    );
  });
});
