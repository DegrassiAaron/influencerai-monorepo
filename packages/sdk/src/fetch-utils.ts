export interface APIErrorOptions {
  status: number;
  body?: unknown;
  url?: string;
  method?: string;
  cause?: unknown;
}

export class APIError extends Error {
  readonly status: number;
  readonly body?: unknown;
  readonly url?: string;
  readonly method?: string;
  readonly isAPIError = true as const;

  constructor(message: string, opts: APIErrorOptions = { status: 0 }) {
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

export class ClientError extends APIError {
  constructor(message: string, opts: APIErrorOptions) {
    super(message, opts);
    this.name = 'ClientError';
  }
}

export class ServerError extends APIError {
  constructor(message: string, opts: APIErrorOptions) {
    super(message, opts);
    this.name = 'ServerError';
  }
}

export class BadRequestError extends ClientError {
  constructor(opts: APIErrorOptions) {
    super('Bad request', opts);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ClientError {
  constructor(opts: APIErrorOptions) {
    super('Unauthorized', opts);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ClientError {
  constructor(opts: APIErrorOptions) {
    super('Forbidden', opts);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ClientError {
  constructor(opts: APIErrorOptions) {
    super('Resource not found', opts);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ClientError {
  constructor(opts: APIErrorOptions) {
    super('Conflict', opts);
    this.name = 'ConflictError';
  }
}

export class UnprocessableEntityError extends ClientError {
  constructor(opts: APIErrorOptions) {
    super('Unprocessable entity', opts);
    this.name = 'UnprocessableEntityError';
  }
}

export class TooManyRequestsError extends ClientError {
  constructor(opts: APIErrorOptions) {
    super('Too many requests', opts);
    this.name = 'TooManyRequestsError';
  }
}

export class RequestTimeoutError extends ClientError {
  constructor(opts: APIErrorOptions) {
    super('Request timed out', opts);
    this.name = 'RequestTimeoutError';
  }
}

export class NetworkError extends APIError {
  constructor(opts: APIErrorOptions) {
    super('Network error', opts);
    this.name = 'NetworkError';
  }
}

type ErrorFactory = (opts: APIErrorOptions) => APIError;

function resolveErrorFactory(status: number): ErrorFactory {
  if (status === 400) return (opts) => new BadRequestError(opts);
  if (status === 401) return (opts) => new UnauthorizedError(opts);
  if (status === 403) return (opts) => new ForbiddenError(opts);
  if (status === 404) return (opts) => new NotFoundError(opts);
  if (status === 409) return (opts) => new ConflictError(opts);
  if (status === 422) return (opts) => new UnprocessableEntityError(opts);
  if (status === 429) return (opts) => new TooManyRequestsError(opts);
  if (status === 408) return (opts) => new RequestTimeoutError(opts);
  if (status >= 500 && status <= 599) return (opts) => new ServerError('Server error', opts);
  if (status >= 400 && status <= 499) return (opts) => new ClientError('Client error', opts);
  return (opts) => new APIError('Request failed', opts);
}

export async function handleResponse<T = unknown>(response: any): Promise<T> {
  const contentType = (response.headers?.get?.('content-type') || '') as string;
  const isJson = typeof contentType === 'string' && contentType.includes('application/json');

  if (!response.ok) {
    let errorBody: unknown = undefined;
    try {
      errorBody = isJson ? await response.json() : await response.text();
    } catch (_) {
      // ignore body parse errors
    }
    const createError = resolveErrorFactory(response.status ?? 0);
    throw createError({
      status: response.status ?? 0,
      body: errorBody,
      url: response.url,
      method: (response as unknown as { method?: string }).method,
    });
  }

  // Success path
  if (!isJson) {
    return (await response.text()) as unknown as T;
  }
  return (await response.json()) as T;
}

export async function fetchWithTimeout(input: any, init: any = {}, timeoutMs = 30_000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const method = init?.method || 'GET';
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } catch (err) {
    // Abort or network error
    const url = typeof input === 'string' ? input : String(input);
    if ((err as Error)?.name === 'AbortError') {
      throw new RequestTimeoutError({ status: 408, url, method, cause: err });
    }
    throw new NetworkError({ status: 0, url, method, cause: err });
  } finally {
    clearTimeout(timeout);
  }
}

export type { APIError as InfluencerAIAPIError };
