import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'tests/**/*.spec.ts'],
    // e2e specs boot real MySQL containers via Testcontainers — give them room.
    testTimeout: 120_000,
    hookTimeout: 180_000,
    pool: 'forks',
  },
});
