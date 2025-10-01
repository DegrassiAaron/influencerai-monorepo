/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InfluencerAIClient } from '../src';
import { InfluencerAIAPIError } from '../src';

describe('InfluencerAIClient error handling', () => {
  const realFetch = globalThis.fetch;
  const client = new InfluencerAIClient('https://api.test.example');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('createJob returns parsed JSON on success', async () => {
    const res = new Response(JSON.stringify({ id: 'j1' }), { status: 200, headers: { 'content-type': 'application/json' } });
    vi.spyOn(globalThis, 'fetch' as never).mockResolvedValue(res as unknown as Response);
    const out = await client.createJob({} as any);
    expect(out).toEqual({ id: 'j1' });
  });

  it('getJob throws InfluencerAIAPIError on non-OK', async () => {
    const res = new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    vi.spyOn(globalThis, 'fetch' as never).mockResolvedValue(res as unknown as Response);
    await expect(client.getJob('missing')).rejects.toBeInstanceOf(InfluencerAIAPIError as any);
  });
});

