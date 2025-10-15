import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@influencerai/core-schemas': resolve(rootDir, '../../packages/core-schemas/src/index.ts'),
      '@influencerai/sdk': resolve(rootDir, '../../packages/sdk/src/index.ts'),
      '@influencerai/prompts': resolve(rootDir, '../../packages/prompts/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
