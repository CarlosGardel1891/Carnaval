import { defineConfig } from 'vitest/config'

// Tests de integración contra el Supabase local (`pnpm supabase start`).
// Corren en serie: comparten una sola base.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globalSetup: ['./src/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
