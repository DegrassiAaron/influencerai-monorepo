import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@influencerai/sdk': path.resolve(__dirname, '../../packages/sdk/src/index.ts'),
      '@influencerai/prompts': path.resolve(__dirname, '../../packages/prompts/src/index.ts'),
    },
  },
});
