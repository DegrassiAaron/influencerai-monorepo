import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup-tests.ts'],
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
