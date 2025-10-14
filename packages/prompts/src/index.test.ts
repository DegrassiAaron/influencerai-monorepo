import { describe, expect, it } from 'vitest';
import { contentPlanPrompt, imageCaptionPrompt, videoScriptPrompt } from './index';

describe('prompt templates', () => {
  it('generates content plan prompt with persona and theme', () => {
    const prompt = contentPlanPrompt('Energetic fitness coach', 'Strength training');
    expect(prompt).toContain('Energetic fitness coach');
    expect(prompt).toContain('Strength training');
    expect(prompt).toContain('Generate 3-5 post ideas');
  });

  it('generates caption prompt with guidance', () => {
    const prompt = imageCaptionPrompt('Sunset yoga session');
    expect(prompt).toContain('Sunset yoga session');
    expect(prompt).toContain('Provide a concise, detailed caption');
    expect(prompt.split('\n')).toContain('- Lighting and atmosphere');
  });

  it('generates video script prompt with duration and caption', () => {
    const prompt = videoScriptPrompt('Try this HIIT routine!', 30);
    expect(prompt).toContain('30-second video script');
    expect(prompt).toContain('Try this HIIT routine!');
    expect(prompt).toContain('Opening hook');
    expect(prompt).toContain('Format as timestamped beats.');
  });
});
