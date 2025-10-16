import { createRequire } from 'node:module';

const defaultRequire = createRequire(import.meta.url);
type ResolveFunction = typeof defaultRequire.resolve;

const globalResolver = (
  globalThis as {
    __influenceraiResolveFont__?: ResolveFunction;
  }
).__influenceraiResolveFont__;

const resolveFont: ResolveFunction = globalResolver ?? defaultRequire.resolve.bind(defaultRequire);

export const interFontSources = {
  normal: resolveFont('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
  italic: resolveFont('@fontsource-variable/inter/files/inter-latin-wght-italic.woff2'),
} as const;
