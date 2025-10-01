/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIError, fetchWithTimeout, handleResponse } from '../src/fetch-utils';

describe('handleResponse', () => {
  it('parses JSON on success', async () => {
    const data = { ok: true };
    const res = new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    await expect(handleResponse(res)).resolves.toEqual(data);
  });

  it('returns text on non-JSON', async () => {
    const res = new Response('hello world', { status: 200, headers: { 'content-type': 'text/plain' } });
    await expect(handleResponse<string>(res)).resolves.toBe('hello world');
  });

  it('throws APIError on non-OK with JSON body', async () => {
    const errBody = { error: 'boom' };
    const res = new Response(JSON.stringify(errBody), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
    await expect(handleResponse(res)).rejects.toMatchObject({
      name: 'APIError',
      status: 500,
      body: errBody,
    });
  });
});

describe('fetchWithTimeout', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    globalThis.fetch = realFetch;
  });

  it('wraps network errors into APIError(status=0)', async () => {
    vi.spyOn(globalThis, 'fetch' as never).mockImplementation(() => Promise.reject(new Error('ECONNRESET'))) as unknown as typeof fetch;
    await expect(fetchWithTimeout('https://api.test.example')).rejects.toMatchObject({
      name: 'APIError',
      status: 0,
    });
  });

  it('times out after default 30s and throws APIError(408)', async () => {
    // Mock fetch that rejects when aborted
    vi.spyOn(globalThis, 'fetch' as never).mockImplementation(((input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;
      return new Promise<Response>((_resolve, reject) => {
        const onAbort = () => {
          const err = new Error('Aborted');
          (err as any).name = 'AbortError';
          reject(err);
        };
        signal?.addEventListener('abort', onAbort, { once: true });
      });
    }) as unknown as typeof fetch);

    const p = fetchWithTimeout('https://api.test.example');
    vi.advanceTimersByTime(30_001);
    await expect(p).rejects.toMatchObject({ name: 'APIError', status: 408 });
  });

  it('returns successful response', async () => {
    const res = new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    vi.spyOn(globalThis, 'fetch' as never).mockResolvedValue(res as unknown as Response);
    const r = await fetchWithTimeout('https://api.test.example');
    expect(r).toBe(res);
  });
});

