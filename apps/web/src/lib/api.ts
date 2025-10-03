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

export async function apiGet<T>(path: string, init?: ApiRequestInit): Promise<T> {
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

  return response.json() as Promise<T>;
}
