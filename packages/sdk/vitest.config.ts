import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    typecheck: {
      tsconfig: './tsconfig.vitest.json',
    },
  },
  resolve: {
    alias: {
      '@influencerai/core-schemas': resolve(__dirname, '../core-schemas/src'),
    },
  },
});
