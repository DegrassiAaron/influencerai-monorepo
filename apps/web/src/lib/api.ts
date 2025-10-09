const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type ApiRequestInit = globalThis.RequestInit;

export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiRequest<T>(path: string, init: ApiRequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError("Missing NEXT_PUBLIC_API_BASE_URL environment variable");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiGet<T>(path: string, init?: ApiRequestInit): Promise<T> {
  return apiRequest<T>(path, { method: "GET", ...init });
}

export async function apiPost<T>(path: string, body: unknown, init?: ApiRequestInit): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
    ...init,
  });
}

export async function apiPatch<T>(path: string, body: unknown, init?: ApiRequestInit): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
    ...init,
  });
}
