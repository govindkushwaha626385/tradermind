// ──────────────────────────────────────────────
// TradeMind — Vitest Configuration
// ──────────────────────────────────────────────

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@trademind/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@trademind/database': path.resolve(__dirname, '../../packages/database/src'),
      '@trademind/config': path.resolve(__dirname, '../../packages/config/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 10000,
    reporters: ['default'],
  },
});
