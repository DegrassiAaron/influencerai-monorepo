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
    const result = await client.createJob({ type: 'content-generation', payload: {} });

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
    await expect(client.createJob({ type: 'content-generation', payload: {} })).rejects.toBeInstanceOf(APIError);
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
    await client.createJob({ type: 'content-generation', payload: {} });
    expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:3001/jobs');
  });
});
