import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  APIError,
  fetchWithTimeout,
  handleResponse,
  NotFoundError,
  TooManyRequestsError,
} from './fetch-utils';

type IsAny<T> = 0 extends 1 & T ? true : false;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('handleResponse', () => {
  const createResponse = (overrides: Partial<Response> = {}) => {
    const status = overrides.status ?? 200;
    const body = overrides.body ?? JSON.stringify({ ok: true });
    const headers = overrides.headers ?? new Headers({ 'content-type': 'application/json' });
    const base = new Response(body, { status, headers });

    Object.defineProperty(base, 'json', {
      value: overrides.json ?? vi.fn().mockResolvedValue(JSON.parse(body)),
      configurable: true,
    });

    Object.defineProperty(base, 'text', {
      value: overrides.text ?? vi.fn().mockResolvedValue(body),
      configurable: true,
    });

    return base;
  };

  it('parses json body on success', async () => {
    const response = createResponse({});
    const result = await handleResponse<{ ok: boolean }>(response);
    expect(result).toEqual({ ok: true });
    expect(response.json).toHaveBeenCalled();
  });

  it('parses text when content type is not json', async () => {
    const response = createResponse({
      headers: new Headers({ 'content-type': 'text/plain' }),
      body: 'ok',
      json: vi.fn().mockRejectedValue(new Error('unexpected json call')),
      text: vi.fn().mockResolvedValue('ok'),
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

  it('maintains strong typing for Response arguments and return type', async () => {
    const response = createResponse({});
    expectTypeOf(handleResponse(response)).not.toEqualTypeOf<Promise<any>>();
    expectTypeOf(handleResponse(response)).toEqualTypeOf<Promise<unknown>>();
    await handleResponse(response);
  });

  it('rejects non-Response inputs at compile time', () => {
    type Param = Parameters<typeof handleResponse>[0];
    expectTypeOf<Param>().not.toEqualTypeOf<any>();
    expectTypeOf<Param>().toEqualTypeOf<Response>();
    type ParamIsAny = IsAny<Param>;
    const ensureNotAny: ParamIsAny extends true ? never : true = true;
    void ensureNotAny;
    // @ts-expect-error -- numeric values are not valid Response objects
    const invalid: Param = 123;
    void invalid;
  });
});

describe('fetchWithTimeout', () => {
  it('returns fetch response when successful', async () => {
    const mockResponse = new Response(null, { status: 204 });
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);
    const response = await fetchWithTimeout('http://example.com', { method: 'POST' }, 50);
    expect(response).toBe(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://example.com',
      expect.objectContaining({ method: 'POST' })
    );
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

    await expect(
      fetchWithTimeout('http://broken.test', { method: 'DELETE' }, 50)
    ).rejects.toMatchObject({
      status: 0,
      url: 'http://broken.test',
      method: 'DELETE',
    });
  });

  it('returns a typed Response instance', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchWithTimeout('http://typed.test');
    expect(result).toBe(mockResponse);
    expectTypeOf(result).toEqualTypeOf<Response>();
  });

  it('requires supported request inputs', () => {
    type Input = Parameters<typeof fetchWithTimeout>[0];
    expectTypeOf<Input>().not.toEqualTypeOf<any>();
    type InputIsAny = IsAny<Input>;
    const ensureNotAny: InputIsAny extends true ? never : true = true;
    void ensureNotAny;
    // @ts-expect-error -- fetchWithTimeout expects RequestInfo or URL
    const invalid: Input = 42 as never;
    void invalid;
  });
});
