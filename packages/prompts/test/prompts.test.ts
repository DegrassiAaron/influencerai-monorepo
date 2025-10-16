import { describe, expect, it } from 'vitest';
import { contentPlanPrompt, imageCaptionPrompt, videoScriptPrompt } from '../src';

describe('prompts factories', () => {
  it('contentPlanPrompt interpolates persona and theme and requests JSON array format', () => {
    const persona = 'Galactic storyteller';
    const theme = 'interstellar travel tips';

    const prompt = contentPlanPrompt(persona, theme);

    expect(prompt).toContain(persona);
    expect(prompt).toContain(`Theme: ${theme}`);
    expect(prompt).toContain('Return the response as a JSON array');
    expect(prompt).toMatch(/\[\s*\{/);
    expect(prompt).toContain('Generate 3-5 post ideas');
  });

  it('imageCaptionPrompt interpolates context and keeps bullet guidance', () => {
    const context = 'sunset over neon city skyline';

    const prompt = imageCaptionPrompt(context);

    expect(prompt).toContain(`Context: ${context}`);
    expect(prompt).toContain('- Subject appearance and pose');
    expect(prompt).toContain('- Lighting and atmosphere');
    expect(prompt).toContain('- Background and setting');
    expect(prompt).toContain('- Style and mood');
    expect(prompt).toContain('Provide a concise, detailed caption');
  });

  it('videoScriptPrompt interpolates caption and duration with bullet formatting', () => {
    const caption = 'New product reveal livestream';
    const duration = 45;

    const prompt = videoScriptPrompt(caption, duration);

    expect(prompt).toContain(`${duration}-second video script`);
    expect(prompt).toContain(caption);
    expect(prompt).toContain('- Opening hook (1-2 seconds)');
    expect(prompt).toContain('- Main content beats');
    expect(prompt).toContain('- Call to action');
    expect(prompt).toContain('Format as timestamped beats');
  });
});
