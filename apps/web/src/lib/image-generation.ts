import type { JobResponse } from '@influencerai/sdk';

export interface ImageGenerationJobResult {
  success?: boolean;
  prompt?: string;
  seed?: number;
  cfgScale?: number;
  steps?: number;
  loraUsed?: string[];
  s3Key?: string;
  s3Url?: string;
  assetId?: string;
  comfyPromptId?: string;
  message?: string;
}

export interface LoraArtifact {
  key?: string;
  filename: string;
  url?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseImageGenerationResult(
  value: unknown
): ImageGenerationJobResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const result: ImageGenerationJobResult = {};

  if (typeof value.success === 'boolean') {
    result.success = value.success;
  }
  if (typeof value.prompt === 'string') {
    result.prompt = value.prompt;
  }
  if (typeof value.seed === 'number') {
    result.seed = value.seed;
  }
  if (typeof value.cfgScale === 'number') {
    result.cfgScale = value.cfgScale;
  }
  if (typeof value.steps === 'number') {
    result.steps = value.steps;
  }
  if (Array.isArray(value.loraUsed)) {
    result.loraUsed = value.loraUsed.filter(
      (item): item is string => typeof item === 'string'
    );
  }
  if (typeof value.s3Key === 'string') {
    result.s3Key = value.s3Key;
  }
  if (typeof value.s3Url === 'string') {
    result.s3Url = value.s3Url;
  }
  if (typeof value.assetId === 'string') {
    result.assetId = value.assetId;
  }
  if (typeof value.comfyPromptId === 'string') {
    result.comfyPromptId = value.comfyPromptId;
  }
  if (typeof value.message === 'string') {
    result.message = value.message;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function extractLoraArtifacts(job: JobResponse | undefined): LoraArtifact[] {
  if (!job || !isRecord(job.result)) {
    return [];
  }

  const artifacts = (job.result as Record<string, unknown>).artifacts;
  if (!Array.isArray(artifacts)) {
    return [];
  }

  return artifacts
    .map((artifact) => {
      if (!isRecord(artifact)) return null;
      const filename = artifact.filename;
      if (typeof filename !== 'string' || filename.trim().length === 0) {
        return null;
      }

      const key = typeof artifact.key === 'string' ? artifact.key : undefined;
      const url = typeof artifact.url === 'string' ? artifact.url : undefined;

      return { filename, key, url };
    })
    .filter((artifact): artifact is LoraArtifact => artifact !== null);
}

export function inferInfluencerId(job: JobResponse | undefined): string | null {
  if (!job || !isRecord(job.payload)) {
    return null;
  }

  const payload = job.payload as Record<string, unknown>;

  if (typeof payload.influencerId === 'string' && payload.influencerId.trim()) {
    return payload.influencerId.trim();
  }

  if (isRecord(payload.persona) && typeof payload.persona.id === 'string') {
    return payload.persona.id.trim() || null;
  }

  return null;
}
