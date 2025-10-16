import type { Logger } from 'pino';

import type { FetchLike } from './types';

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_ATTEMPTS = 120;

export type ComfyClientConfig = {
  baseUrl: string;
  clientId: string;
  fetch: FetchLike;
  workflowPayload?: Record<string, unknown>;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
};

export type SubmitVideoJobOptions = {
  metadata: Record<string, unknown>;
  inputs: Record<string, unknown>;
  logger?: Pick<Logger, 'info' | 'warn' | 'error'>;
};

export type SubmitVideoJobResult = {
  comfyJobId: string;
  assetUrl: string;
  buffer: Buffer;
};

type ComfyOutputAsset = {
  filename?: string;
  subfolder?: string;
  type?: string;
  url?: string;
};

type HistoryState =
  | { state: 'running' }
  | { state: 'succeeded' }
  | { state: 'failed'; error?: string };

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function cloneWorkflowPayload(payload?: Record<string, unknown>) {
  if (!payload) return undefined;
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

function attachPromptMetadata(
  base: Record<string, unknown> | undefined,
  metadata: Record<string, unknown>,
  inputs: Record<string, unknown>
) {
  const prompt = base ? { ...base } : {};
  const existingInputs = (prompt.inputs as Record<string, unknown> | undefined) ?? {};
  prompt.inputs = { ...existingInputs, ...inputs };

  const extraData = (prompt.extra_data as Record<string, unknown> | undefined) ?? {};
  const existingMeta = (extraData.metadata as Record<string, unknown> | undefined) ?? {};
  extraData.metadata = { ...existingMeta, ...metadata };
  prompt.extra_data = extraData;

  return prompt;
}

function parseHistoryState(history: any): HistoryState {
  if (!history || typeof history !== 'object') {
    return { state: 'running' };
  }

  const status = history.status ?? history;
  const statusText = typeof status?.status === 'string' ? status.status.toLowerCase() : undefined;
  const completed =
    status?.completed === true || statusText === 'completed' || statusText === 'success';
  const failed =
    statusText === 'error' ||
    statusText === 'failed' ||
    statusText === 'cancelled' ||
    status?.failed === true;
  const error = status?.error ?? status?.err ?? status?.message;

  if (failed) {
    return { state: 'failed', error: typeof error === 'string' ? error : 'ComfyUI job failed' };
  }

  if (completed) {
    return { state: 'succeeded' };
  }

  if (typeof error === 'string' && error.trim()) {
    return { state: 'failed', error };
  }

  return { state: 'running' };
}

function extractVideoAsset(history: any): ComfyOutputAsset | null {
  const outputs = history?.outputs;
  if (!outputs || typeof outputs !== 'object') return null;

  const outputArrays = Object.values(outputs).filter(Array.isArray) as ComfyOutputAsset[][];
  for (const arr of outputArrays) {
    for (const entry of arr) {
      if (!entry || typeof entry !== 'object') continue;
      if (
        entry.type === 'video' ||
        entry.type === 'output' ||
        entry.url ||
        (entry.filename && entry.filename.endsWith('.mp4'))
      ) {
        return entry;
      }
    }
  }
  return null;
}
function resolveHistoryEntry(historyJson: any, comfyJobId: string) {
  if (!historyJson || typeof historyJson !== 'object') {
    return historyJson;
  }

  const directMatch = (historyJson as Record<string, unknown>)[comfyJobId];
  if (directMatch && typeof directMatch === 'object') {
    return directMatch;
  }

  const containers = ['history', 'histories', 'jobs', 'prompts'] as const;
  for (const key of containers) {
    const container = (historyJson as Record<string, unknown>)[key];
    if (container && typeof container === 'object') {
      const nested = (container as Record<string, unknown>)[comfyJobId];
      if (nested && typeof nested === 'object') {
        return nested;
      }
    }
  }

  const singleJob = (historyJson as Record<string, unknown>).job;
  if (singleJob && typeof singleJob === 'object') {
    return singleJob;
  }

  return historyJson;
}

function buildAssetUrl(baseUrl: string, asset: ComfyOutputAsset): string {
  if (asset.url) {
    const trimmed = asset.url.trim();
    if (/^https?:/i.test(trimmed)) return trimmed;
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${base}/${trimmed.replace(/^\//, '')}`;
  }

  const filename = asset.filename;
  if (!filename) {
    throw new Error('ComfyUI output is missing filename');
  }
  const subfolder = asset.subfolder ?? '';
  const type = asset.type ?? 'output';
  const url = new URL('/view', baseUrl);
  url.searchParams.set('filename', filename);
  url.searchParams.set('subfolder', subfolder);
  url.searchParams.set('type', type);
  return url.toString();
}

async function pollForCompletion(
  config: ComfyClientConfig,
  comfyJobId: string,
  logger?: Pick<Logger, 'info' | 'warn' | 'error'>
) {
  const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxPollAttempts = config.maxPollAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let attempt = 0;
  let finalHistory: any = null;

  while (attempt < maxPollAttempts) {
    attempt += 1;
    const historyRes = await config.fetch(
      `${config.baseUrl.replace(/\/$/, '')}/history/${encodeURIComponent(comfyJobId)}`
    );
    if (historyRes.status === 404) {
      await sleep(pollIntervalMs);
      continue;
    }

    if (!historyRes.ok) {
      throw new Error(`ComfyUI history request failed with status ${historyRes.status}`);
    }

    let historyJson: any;
    try {
      historyJson = await historyRes.json();
    } catch (err) {
      logger?.warn({ err }, 'Unable to parse ComfyUI history response');
      await sleep(pollIntervalMs);
      continue;
    }

    const historyEntry = resolveHistoryEntry(historyJson, comfyJobId);
    finalHistory = historyEntry;
    const state = parseHistoryState(historyEntry);

    logger?.info({ comfyJobId, attempt, state: state.state }, 'Polled ComfyUI job');

    if (state.state === 'failed') {
      throw new Error(state.error || 'ComfyUI job failed');
    }

    if (state.state === 'succeeded') {
      break;
    }

    await sleep(pollIntervalMs);
  }

  if (!finalHistory) {
    throw new Error('Timed out waiting for ComfyUI job history');
  }

  const finalState = parseHistoryState(finalHistory);
  if (finalState.state !== 'succeeded') {
    throw new Error('ComfyUI job did not complete successfully');
  }

  const asset = extractVideoAsset(finalHistory);
  if (!asset) {
    throw new Error('ComfyUI history did not contain a video output');
  }

  const assetUrl = buildAssetUrl(config.baseUrl, asset);
  return { assetUrl };
}

export function createComfyClient(config: ComfyClientConfig) {
  return {
    async submitVideoJob({
      metadata,
      inputs,
      logger,
    }: SubmitVideoJobOptions): Promise<SubmitVideoJobResult> {
      const promptPayload = attachPromptMetadata(
        cloneWorkflowPayload(config.workflowPayload),
        metadata,
        inputs
      );

      const requestBody = {
        client_id: config.clientId,
        prompt: promptPayload,
      } as Record<string, unknown>;

      logger?.info({ comfyRequest: { clientId: config.clientId } }, 'Submitting ComfyUI prompt');

      const res = await config.fetch(`${config.baseUrl.replace(/\/$/, '')}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`ComfyUI prompt failed with status ${res.status}`);
      }

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      const comfyJobId =
        (json?.prompt_id as string | undefined) ||
        (json?.id as string | undefined) ||
        (json?.job_id as string | undefined);

      if (!comfyJobId) {
        throw new Error('ComfyUI prompt response missing job identifier');
      }

      logger?.info({ comfyJobId }, 'ComfyUI prompt accepted');

      const { assetUrl } = await pollForCompletion(config, comfyJobId, logger);

      logger?.info({ comfyJobId, assetUrl }, 'Downloading ComfyUI video output');
      const downloadRes = await config.fetch(assetUrl);
      if (!downloadRes.ok) {
        throw new Error(`Failed to download ComfyUI output (${downloadRes.status})`);
      }

      const arrayBuffer = await downloadRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return { comfyJobId, assetUrl, buffer };
    },
  };
}

export const __testUtils = {
  sleep,
  cloneWorkflowPayload,
  attachPromptMetadata,
  parseHistoryState,
  extractVideoAsset,
  buildAssetUrl,
  resolveHistoryEntry,
};
