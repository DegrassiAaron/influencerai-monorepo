import { afterEach, describe, expect, it, vi } from 'vitest';
import { APIError, fetchWithTimeout, handleResponse, NotFoundError, TooManyRequestsError } from './fetch-utils';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('handleResponse', () => {
  const createResponse = (overrides: Partial<Response>) => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
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
      headers: new Headers({ 'content-type': 'text/plain' }),
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

  it('translates 404 responses into NotFoundError', async () => {
    const response = createResponse({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ message: 'missing' }),
    });
    await expect(handleResponse(response)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('translates 429 responses into TooManyRequestsError', async () => {
    const response = createResponse({
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValue({ message: 'slow down' }),
    });
    await expect(handleResponse(response)).rejects.toBeInstanceOf(TooManyRequestsError);
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
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    const abortableFetch = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal('fetch', abortableFetch);

    await expect(fetchWithTimeout('http://slow.test', undefined, 100)).rejects.toMatchObject({
      status: 408,
      url: 'http://slow.test',
      method: 'GET',
    });
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
