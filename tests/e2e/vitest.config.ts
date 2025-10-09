import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/specs/**/*.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
