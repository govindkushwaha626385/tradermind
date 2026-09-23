// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: API Rate Limits
// PostgreSQL atomic UPSERT per 1-minute window.
// ──────────────────────────────────────────────

import {
  pgTable,
  text,
  integer,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

export const apiRateLimits = pgTable(
  'api_rate_limits',
  {
    // Identifier: authenticated user ID or raw IP address
    identifier: text('identifier').notNull(),
    // Truncated to the minute — one row per (identifier, minute)
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    requestCount: integer('request_count').notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.windowStart] }),
    identifierWindowIdx: index('api_rate_limits_identifier_window_idx').on(
      table.identifier,
      table.windowStart,
    ),
  }),
);

export type ApiRateLimitSelect = typeof apiRateLimits.$inferSelect;
export type ApiRateLimitInsert = typeof apiRateLimits.$inferInsert;
