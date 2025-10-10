import { describe, expect, it } from 'vitest';
import {
  ContentPlanSchema,
  DatasetSpecSchema,
  JobSpecSchema,
  LoRAConfigSchema,
  QueueSummarySchema,
} from '../src';

describe('JobSpecSchema', () => {
  it('applies default priority when omitted', () => {
    const result = JobSpecSchema.safeParse({
      type: 'content-generation',
      payload: { foo: 'bar' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(5);
    }
  });

  it('rejects priority outside the allowed range', () => {
    const result = JobSpecSchema.safeParse({
      type: 'video-generation',
      priority: 15,
      payload: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/less than or equal to 10/);
    }
  });
});

describe('ContentPlanSchema', () => {
  const basePlan = {
    influencerId: 'influencer-123',
    theme: 'travel',
    targetPlatforms: ['instagram', 'tiktok'] as const,
    posts: [
      {
        caption: 'Exploring the city',
        hashtags: ['#travel', '#fun'],
      },
    ],
    createdAt: new Date().toISOString(),
  };

  it('accepts known platforms', () => {
    const result = ContentPlanSchema.safeParse(basePlan);

    expect(result.success).toBe(true);
  });

  it('rejects unknown platforms', () => {
    const result = ContentPlanSchema.safeParse({
      ...basePlan,
      targetPlatforms: ['instagram', 'snapchat'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/Invalid enum value/);
    }
  });
});

describe('DatasetSpecSchema', () => {
  it('accepts valid dataset specifications', () => {
    const result = DatasetSpecSchema.safeParse({
      name: 'dataset',
      kind: 'reference',
      path: '/data/reference',
      imageCount: 12,
      captioned: false,
      meta: { source: 'user-upload' },
    });

    expect(result.success).toBe(true);
  });

  it('requires a positive imageCount', () => {
    const result = DatasetSpecSchema.safeParse({
      name: 'dataset',
      kind: 'lora-training',
      path: '/data/dataset',
      imageCount: 0,
      captioned: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/greater than 0/);
    }
  });
});

describe('LoRAConfigSchema', () => {
  it('provides defaults for optional hyperparameters', () => {
    const result = LoRAConfigSchema.safeParse({
      modelName: 'model',
      datasetPath: '/data',
      outputPath: '/output',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        epochs: 10,
        learningRate: 1e-4,
        batchSize: 1,
        resolution: 512,
        networkDim: 32,
        networkAlpha: 16,
      });
    }
  });
});

describe('QueueSummarySchema', () => {
  it('accepts non-negative integers for all counters', () => {
    const result = QueueSummarySchema.safeParse({
      active: 4,
      waiting: 10,
      failed: 0,
    });

    expect(result.success).toBe(true);
  });

  it('rejects negative counters', () => {
    const result = QueueSummarySchema.safeParse({
      active: -1,
      waiting: 2,
      failed: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/greater than or equal to 0/);
    }
  });
});
