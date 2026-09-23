// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Cache Entries
// PostgreSQL-backed key-value cache table.
// TTL-based expiry is enforced on read; a periodic
// cleanup job removes stale rows.
// ──────────────────────────────────────────────

import { pgTable, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const cacheEntries = pgTable(
  'cache_entries',
  {
    key: text('key').primaryKey(),
    value: jsonb('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    expiresIdx: index('cache_entries_expires_idx').on(table.expiresAt),
  }),
);

export type CacheEntrySelect = typeof cacheEntries.$inferSelect;
export type CacheEntryInsert = typeof cacheEntries.$inferInsert;
