#!/usr/bin/env tsx
// ──────────────────────────────────────────────
// TradeMind — Seed CLI
//
// Usage: npx tsx src/seeds/run.ts
//        npx tsx src/seeds/run.ts --force   (re-seed all)
// ──────────────────────────────────────────────

import { seedDatabase } from './index';

const force = process.argv.includes('--force');

seedDatabase({ force })
  .then(() => {
    console.log('✅ Seeding complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
