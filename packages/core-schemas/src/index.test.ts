import { describe, expect, it } from 'vitest';
import {
  ContentPlanSchema,
  DatasetSpecSchema,
  JobSpecSchema,
  LoRAConfigSchema,
  QueueSummarySchema,
} from './index';

describe('core schemas', () => {
  it('validates queue summaries', () => {
    const parsed = QueueSummarySchema.parse({ active: 2, waiting: 1, failed: 0 });
    expect(parsed).toEqual({ active: 2, waiting: 1, failed: 0 });
    expect(() => QueueSummarySchema.parse({ active: -1, waiting: 0, failed: 0 })).toThrowError();
  });

  it('applies defaults for job specs', () => {
    const spec = JobSpecSchema.parse({
      type: 'content-generation',
      payload: { prompt: 'hello' },
    });
    expect(spec.priority).toBe(5);
    expect(() =>
      JobSpecSchema.parse({
        type: 'content-generation',
        payload: 'invalid',
      })
    ).toThrowError();
  });

  it('accepts image-generation job type', () => {
    const spec = JobSpecSchema.parse({
      type: 'image-generation',
      payload: { prompt: 'portrait', checkpoint: 'sdxl_base.safetensors' },
    });
    expect(spec.type).toBe('image-generation');
  });

  it('validates content plan structure', () => {
    const plan = ContentPlanSchema.parse({
      influencerId: 'abc',
      theme: 'fitness',
      targetPlatforms: ['instagram', 'tiktok'],
      posts: [
        {
          caption: 'Stay strong',
          hashtags: ['#fit'],
          scheduledAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    expect(plan.posts).toHaveLength(1);
    expect(() =>
      ContentPlanSchema.parse({
        influencerId: 'abc',
        theme: 'fitness',
        targetPlatforms: ['myspace'],
        posts: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      })
    ).toThrowError();
  });

  it('validates dataset specification', () => {
    const dataset = DatasetSpecSchema.parse({
      name: 'fitness-photos',
      kind: 'lora-training',
      path: '/tmp/data',
      imageCount: 10,
      captioned: true,
      meta: { source: 'user' },
    });
    expect(dataset.meta).toEqual({ source: 'user' });
    expect(() =>
      DatasetSpecSchema.parse({
        name: 'bad',
        kind: 'lora-training',
        path: '/tmp/data',
        imageCount: 0,
        captioned: true,
      })
    ).toThrowError();
  });

  it('applies defaults for LoRA config', () => {
    const config = LoRAConfigSchema.parse({
      modelName: 'sd',
      datasetPath: '/dataset',
      outputPath: '/output',
    });
    expect(config.epochs).toBe(10);
    expect(config.learningRate).toBeGreaterThan(0);
    expect(() =>
      LoRAConfigSchema.parse({
        modelName: 'sd',
        datasetPath: '/dataset',
        outputPath: '/output',
        batchSize: 0,
      })
    ).toThrowError();
  });
});
