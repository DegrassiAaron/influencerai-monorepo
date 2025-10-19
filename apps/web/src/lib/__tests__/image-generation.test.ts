import { describe, expect, it } from 'vitest';
import type { JobResponse } from '@influencerai/sdk';
import {
  extractLoraArtifacts,
  inferInfluencerId,
  parseImageGenerationResult,
} from '../image-generation';

describe('image-generation helpers', () => {
  describe('parseImageGenerationResult', () => {
    it('maps known fields from result object', () => {
      const result = parseImageGenerationResult({
        success: true,
        prompt: 'hello world',
        seed: 123,
        cfgScale: 7.5,
        steps: 30,
        loraUsed: ['mock-lora'],
        s3Key: 'mock/key.png',
        s3Url: 'https://example.com/key.png',
        assetId: 'asset_1',
        comfyPromptId: 'prompt_123',
        message: 'completed',
      });

      expect(result).toEqual({
        success: true,
        prompt: 'hello world',
        seed: 123,
        cfgScale: 7.5,
        steps: 30,
        loraUsed: ['mock-lora'],
        s3Key: 'mock/key.png',
        s3Url: 'https://example.com/key.png',
        assetId: 'asset_1',
        comfyPromptId: 'prompt_123',
        message: 'completed',
      });
    });

    it('returns null for non-object input', () => {
      expect(parseImageGenerationResult(null)).toBeNull();
      expect(parseImageGenerationResult('invalid')).toBeNull();
    });
  });

  describe('extractLoraArtifacts', () => {
    it('returns normalized artifacts when available', () => {
      const job = {
        id: 'job_1',
        status: 'succeeded',
        result: {
          artifacts: [
            { filename: 'model.safetensors', key: 'loras/job_1/model.safetensors', url: 'https://example.com/model' },
            { filename: 'alt.safetensors' },
          ],
        },
      } as unknown as JobResponse;

      expect(extractLoraArtifacts(job)).toEqual([
        {
          filename: 'model.safetensors',
          key: 'loras/job_1/model.safetensors',
          url: 'https://example.com/model',
        },
        {
          filename: 'alt.safetensors',
          key: undefined,
          url: undefined,
        },
      ]);
    });

    it('returns empty array when artifacts are missing', () => {
      const job = {
        id: 'job_2',
        status: 'succeeded',
        result: { message: 'no artifacts' },
      } as unknown as JobResponse;

      expect(extractLoraArtifacts(job)).toEqual([]);
    });
  });

  describe('inferInfluencerId', () => {
    it('returns influencerId from payload when available', () => {
      const job = {
        id: 'job_3',
        status: 'succeeded',
        payload: { influencerId: 'inf_123' },
      } as unknown as JobResponse;

      expect(inferInfluencerId(job)).toBe('inf_123');
    });

    it('falls back to persona.id if influencerId missing', () => {
      const job = {
        id: 'job_4',
        status: 'succeeded',
        payload: { persona: { id: 'persona_1' } },
      } as unknown as JobResponse;

      expect(inferInfluencerId(job)).toBe('persona_1');
    });

    it('returns null when not inferrable', () => {
      const job = { id: 'job_5', status: 'pending', payload: {} } as unknown as JobResponse;
      expect(inferInfluencerId(job)).toBeNull();
    });
  });
});
