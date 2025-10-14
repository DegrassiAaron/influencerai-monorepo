import { afterEach, describe, expect, it, vi } from 'vitest';
import { APIError, fetchWithTimeout, handleResponse } from './fetch-utils';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('handleResponse', () => {
  const createResponse = (overrides: Partial<Response>) => ({
    ok: true,
    status: 200,
    headers: {
      get: vi.fn().mockReturnValue('application/json'),
    },
    json: vi.fn().mockResolvedValue({ ok: true }),
    text: vi.fn().mockResolvedValue('ok'),
    ...overrides,
  });

  it('parses json body on success', async () => {
    const response = createResponse({});
    const result = await handleResponse<{ ok: boolean }>(response);
    expect(result).toEqual({ ok: true });
    expect(response.json).toHaveBeenCalled();
  });

  it('parses text when content type is not json', async () => {
    const response = createResponse({
      headers: { get: vi.fn().mockReturnValue('text/plain') },
    });
    const result = await handleResponse<string>(response);
    expect(result).toBe('ok');
    expect(response.text).toHaveBeenCalled();
  });

  it('throws APIError on failure with parsed body when available', async () => {
    const response = createResponse({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ message: 'boom' }),
    });
    await expect(handleResponse(response)).rejects.toMatchObject({
      status: 500,
      body: { message: 'boom' },
    });
  });
});

describe('fetchWithTimeout', () => {
  it('returns fetch response when successful', async () => {
    const mockResponse = { ok: true };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);
    const response = await fetchWithTimeout('http://example.com', { method: 'POST' }, 50);
    expect(response).toBe(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith('http://example.com', expect.objectContaining({ method: 'POST' }));
  });

  it('throws APIError on timeout', async () => {
    vi.useFakeTimers();
    const abortableFetch = vi.fn((_, init: RequestInit) =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        });
      })
    );
    vi.stubGlobal('fetch', abortableFetch);

    const promise = fetchWithTimeout('http://slow.test', undefined, 100);
    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).rejects.toBeInstanceOf(APIError);
    await expect(promise).rejects.toMatchObject({ status: 408, url: 'http://slow.test', method: 'GET' });
  });

  it('wraps network errors in APIError', async () => {
    const networkError = new Error('boom');
    const failingFetch = vi.fn().mockRejectedValue(networkError);
    vi.stubGlobal('fetch', failingFetch);

    await expect(fetchWithTimeout('http://broken.test', { method: 'DELETE' }, 50)).rejects.toMatchObject({
      status: 0,
      url: 'http://broken.test',
      method: 'DELETE',
    });
  });
});
