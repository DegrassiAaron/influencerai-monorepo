export class APIError extends Error {
  readonly status: number;
  readonly body?: unknown;
  readonly url?: string;
  readonly method?: string;
  readonly isAPIError = true as const;

  constructor(message: string, opts: { status: number; body?: unknown; url?: string; method?: string; cause?: unknown } = { status: 0 }) {
    super(message);
    this.name = 'APIError';
    this.status = opts.status;
    this.body = opts.body;
    this.url = opts.url;
    this.method = opts.method;
    if (opts.cause) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).cause = opts.cause;
    }
  }
}

export async function handleResponse<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let errorBody: unknown = undefined;
    try {
      errorBody = isJson ? await response.json() : await response.text();
    } catch (_) {
      // ignore body parse errors
    }
    throw new APIError(
      `Request failed with status ${response.status}`,
      {
        status: response.status,
        body: errorBody,
        url: response.url,
        method: (response as unknown as { method?: string }).method,
      }
    );
  }

  // Success path
  if (!isJson) {
    return (await response.text()) as unknown as T;
  }
  return (await response.json()) as T;
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const method = init.method || 'GET';
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } catch (err) {
    // Abort or network error
    const url = typeof input === 'string' ? input : (input as URL).toString();
    if ((err as Error)?.name === 'AbortError') {
      throw new APIError('Request timed out', { status: 408, url, method, cause: err });
    }
    throw new APIError('Network error', { status: 0, url, method, cause: err });
  } finally {
    clearTimeout(timeout);
  }
}

export type { APIError as InfluencerAIAPIError };
