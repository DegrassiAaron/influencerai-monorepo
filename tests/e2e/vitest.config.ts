import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['specs/**/*.spec.ts'],
    threads: false,
    testTimeout: 60000,
    hookTimeout: 60000
  },
  browser: {
    enabled: false,
    headless: true,
    screenshotFailures: false
  }
});
