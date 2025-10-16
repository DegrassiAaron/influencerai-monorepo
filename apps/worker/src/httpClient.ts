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

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(
  url: string,
  init: any = {},
  timeoutMs = 60000
): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url as any, { ...init, signal: controller.signal } as any);
    return res as any;
  } finally {
    clearTimeout(t);
  }
}

export function parseRetryAfter(header: string | null | undefined): number | null {
  if (!header) return null;
  const asInt = Number(header);
  if (!Number.isNaN(asInt) && asInt >= 0) return asInt * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
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

export async function safeReadBody(res: any) {
  try {
    const ct = (res.headers as any)?.get?.('content-type') || '';
    if (typeof ct === 'string' && ct.includes('application/json')) return await res.json();
    return await res.text();
  } catch {
    return null;
  }
}

export type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type CallOpenRouterOptions = {
  responseFormat?: 'json_object' | 'text';
};

export type CallOpenRouterResult = {
  content: string;
  usage?: OpenRouterUsage;
};

export type CallOpenRouter = (
  messages: OpenRouterMessage[],
  opts?: CallOpenRouterOptions
) => Promise<CallOpenRouterResult>;

export const callOpenRouter: CallOpenRouter = async (messages, opts) => {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const maxAttempts = Number(process.env.OPENROUTER_MAX_RETRIES || 3);
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS || 60000);
  const backoffBaseMs = Number(process.env.OPENROUTER_BACKOFF_BASE_MS || 250);
  const backoffJitterMs = Number(process.env.OPENROUTER_BACKOFF_JITTER_MS || 100);

  let attempt = 0;
  let lastErr: unknown = undefined;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'openrouter/auto',
            messages,
            ...(opts?.responseFormat ? { response_format: { type: opts.responseFormat } } : {}),
          }),
        },
        timeoutMs
      );

      if (!res.ok) {
        const status = (res as any).status ?? 500;
        const body = await safeReadBody(res);
        if (shouldRetry(status) && attempt < maxAttempts) {
          const ra = parseRetryAfter((res as any).headers?.get?.('Retry-After'));
          const delay = Math.max(ra ?? 0, backoffDelay(attempt, backoffBaseMs, backoffJitterMs));
          await sleep(delay);
          continue;
        }
        throw new HTTPError('OpenRouter request failed', { status, body, url, method: 'POST' });
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content as string | undefined;
      const usage = json?.usage as OpenRouterUsage | undefined;
      return { content: content ?? '', usage };
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await sleep(backoffDelay(attempt, backoffBaseMs, backoffJitterMs));
        continue;
      }
      throw err;
    }
  }
  if (lastErr) throw lastErr;
  return { content: '', usage: undefined };
};
