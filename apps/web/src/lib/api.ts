type ApiRequestInit = Omit<globalThis.RequestInit, 'body'> & { body?: globalThis.BodyInit | null };

const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new ApiError('Missing NEXT_PUBLIC_API_BASE_URL environment variable');
  }
  return baseUrl;
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload && typeof payload.message === 'string') {
        return payload.message;
      }
    } catch {
      // ignore JSON parsing errors
    }
  }

  try {
    const text = await response.text();
    if (text) {
      return text;
    }
  } catch {
    // ignore text parsing errors
  }

  return `Request failed with status ${response.status}`;
}

async function apiRequest<TResponse>(path: string, init: ApiRequestInit = {}): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      cache: 'no-store',
      ...init,
      signal: init.signal ?? controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(await readErrorMessage(response), response.status);
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as TResponse;
    }

    return undefined as TResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function apiGet<TResponse>(path: string, init?: ApiRequestInit): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'GET', ...init });
}

export function apiPost<TBody, TResponse>(
  path: string,
  body: TBody,
  init?: ApiRequestInit
): Promise<TResponse> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return apiRequest<TResponse>(path, {
    ...init,
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export function apiPatch<TBody, TResponse>(
  path: string,
  body: TBody,
  init?: ApiRequestInit
): Promise<TResponse> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return apiRequest<TResponse>(path, {
    ...init,
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
}
