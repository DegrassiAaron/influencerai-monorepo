type ApiRequestInit = globalThis.RequestInit;

export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiRequest<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();

  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string, init?: ApiRequestInit): Promise<T> {
  return apiRequest<T>(path, init);
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new ApiError("Missing NEXT_PUBLIC_API_BASE_URL environment variable");
  }

  return baseUrl;
}

export async function apiPost<TBody, TResponse>(
  path: string,
  body: TBody,
  init?: ApiRequestInit
): Promise<TResponse> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");

  return apiRequest<TResponse>(path, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiPatch<TBody, TResponse>(
  path: string,
  body: TBody,
  init?: ApiRequestInit
): Promise<TResponse> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");

  return apiRequest<TResponse>(path, {
    ...init,
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}
