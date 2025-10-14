/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InfluencerAIClient } from '../src';
import { InfluencerAIAPIError } from '../src';
import * as fetchUtils from '../src/fetch-utils';

describe('InfluencerAIClient error handling', () => {
  const realFetch = globalThis.fetch;
  const client = new InfluencerAIClient('https://api.test.example');
  const jsonResponse = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

  let fetchWithTimeoutSpy: ReturnType<typeof vi.spyOn<typeof fetchUtils, 'fetchWithTimeout'>>;
  let handleResponseSpy: ReturnType<typeof vi.spyOn<typeof fetchUtils, 'handleResponse'>>;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = realFetch;
    fetchWithTimeoutSpy = vi.spyOn(fetchUtils, 'fetchWithTimeout');
    handleResponseSpy = vi.spyOn(fetchUtils, 'handleResponse');
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('createJob returns parsed JSON on success', async () => {
    const res = jsonResponse({ id: 'j1' });
    vi.spyOn(globalThis, 'fetch' as never).mockResolvedValue(res as unknown as Response);
    const out = await client.createJob({} as any);
    expect(out).toEqual({ id: 'j1' });
  });

  it('createJob result is typed as JobResponse and id is accessible', async () => {
    const res = jsonResponse({ id: 'j-typed', status: 'pending' });
    vi.spyOn(globalThis, 'fetch' as never).mockResolvedValue(res as unknown as Response);
    const out = await client.createJob({} as any);
    // Access id without casting to ensure the type is present at compile time
    const id: string = out.id;
    expect(id).toBe('j-typed');
    expect(out.status).toBe('pending');
  });

  it('createJob throws InfluencerAIAPIError when response lacks id', async () => {
    const response = {} as Response;
    fetchWithTimeoutSpy.mockResolvedValue(response);
    handleResponseSpy.mockResolvedValue({} as any);
    await expect(client.createJob({} as any)).rejects.toBeInstanceOf(InfluencerAIAPIError as any);
    expect(handleResponseSpy).toHaveBeenCalledWith(response);
  });

  it('getJob throws InfluencerAIAPIError on non-OK', async () => {
    const res = new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
    vi.spyOn(globalThis, 'fetch' as never).mockResolvedValue(res as unknown as Response);
    await expect(client.getJob('missing')).rejects.toBeInstanceOf(InfluencerAIAPIError as any);
  });

  it('listJobs delegates to fetchWithTimeout and handleResponse', async () => {
    const response = {} as Response;
    fetchWithTimeoutSpy.mockResolvedValue(response);
    handleResponseSpy.mockResolvedValue([{ id: 'job-1' }] as any);
    const result = await client.listJobs();
    expect(fetchWithTimeoutSpy).toHaveBeenCalledWith(
      'https://api.test.example/jobs',
      expect.objectContaining({ method: 'GET' }),
      undefined
    );
    expect(handleResponseSpy).toHaveBeenCalledWith(response);
    expect(result).toEqual([{ id: 'job-1' }]);
  });

  it('updateJob sends PATCH with payload and returns handled response', async () => {
    const response = {} as Response;
    const update = { status: 'done' };
    fetchWithTimeoutSpy.mockResolvedValue(response);
    handleResponseSpy.mockResolvedValue({ id: 'job-42', status: 'done' } as any);
    const result = await client.updateJob('job-42', update);
    expect(fetchWithTimeoutSpy).toHaveBeenCalledWith('https://api.test.example/jobs/job-42', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    }, undefined);
    expect(handleResponseSpy).toHaveBeenCalledWith(response);
    expect(result).toEqual({ id: 'job-42', status: 'done' });
  });

  it('getQueuesSummary fetches queue summary and validates shape', async () => {
    const response = {} as Response;
    fetchWithTimeoutSpy.mockResolvedValue(response);
    handleResponseSpy.mockResolvedValue({ active: 3, waiting: 4, failed: 1 } as any);

    const result = await client.getQueuesSummary();

    expect(fetchWithTimeoutSpy).toHaveBeenCalledWith(
      'https://api.test.example/queues/summary',
      expect.objectContaining({ method: 'GET' }),
      undefined
    );
    expect(handleResponseSpy).toHaveBeenCalledWith(response);
    expect(result).toEqual({ active: 3, waiting: 4, failed: 1 });
  });

  it('getQueuesSummary throws InfluencerAIAPIError on invalid shape', async () => {
    const response = {} as Response;
    fetchWithTimeoutSpy.mockResolvedValue(response);
    handleResponseSpy.mockResolvedValue({ active: 1 } as any);

    await expect(client.getQueuesSummary()).rejects.toBeInstanceOf(InfluencerAIAPIError as any);
  });

  it('createContentPlan uses POST and returns handled response', async () => {
    const response = {} as Response;
    const plan = { title: 'Plan' } as any;
    fetchWithTimeoutSpy.mockResolvedValue(response);
    handleResponseSpy.mockResolvedValue({
      id: 'plan-1',
      plan: {
        influencerId: 'inf-1',
        theme: 'theme',
        targetPlatforms: ['instagram'],
        posts: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    } as any);
    const result = await client.createContentPlan(plan);
    expect(fetchWithTimeoutSpy).toHaveBeenCalledWith(
      'https://api.test.example/content-plans',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      },
      undefined
    );
    expect(handleResponseSpy).toHaveBeenCalledWith(response);
    expect(result).toMatchObject({ id: 'plan-1' });
  });

  it('health checks API status via fetchWithTimeout and handleResponse', async () => {
    const response = {} as Response;
    fetchWithTimeoutSpy.mockResolvedValue(response);
    handleResponseSpy.mockResolvedValue({ status: 'ok' } as any);
    const result = await client.health();
    expect(fetchWithTimeoutSpy).toHaveBeenCalledWith(
      'https://api.test.example/health',
      expect.objectContaining({ method: 'GET' }),
      undefined
    );
    expect(handleResponseSpy).toHaveBeenCalledWith(response);
    expect(result).toEqual({ status: 'ok' });
  });
});

