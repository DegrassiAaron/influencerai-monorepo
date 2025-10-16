export class HTTPError extends Error {
  status: number;
  body?: unknown;
  url?: string;
  method?: string;
  constructor(
    message: string,
    opts: { status: number; body?: unknown; url?: string; method?: string }
  ) {
    super(message);
    this.name = 'HTTPError';
    this.status = opts.status;
    this.body = opts.body;
    this.url = opts.url;
    this.method = opts.method;
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 60000
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res as Response;
  } finally {
    clearTimeout(t);
  }
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function parseRetryAfter(header: string | null | undefined): number | null {
  if (!header) return null;
  const asInt = Number(header);
  if (!Number.isNaN(asInt) && asInt >= 0) {
    return asInt * 1000; // seconds -> ms
  }
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const delta = date - Date.now();
    return delta > 0 ? delta : 0;
  }
  return null;
}

export function shouldRetry(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

export function backoffDelay(attempt: number, baseMs = 250, jitterMs = 100): number {
  const base = baseMs * Math.pow(2, attempt - 1);
  const jitter = jitterMs > 0 ? Math.floor(Math.random() * jitterMs) : 0;
  return base + jitter;
}
