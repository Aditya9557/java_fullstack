import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include:     ['src/__tests__/**/*.test.ts'],
    // No globals — tests use explicit imports from 'vitest'
  },
});
