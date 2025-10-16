import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    deps: {
      optimizer: {
        ssr: {
          exclude: ['yaml'],
        },
      },
    },
    coverage: {
      enabled: false,
    },
  },
});
