// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: AI Cache
//
// Caches AI-generated analysis results (trade autopsies, debriefs)
// to avoid redundant API calls and keep costs at $0.
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const aiCache = pgTable(
  'ai_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Composite key: e.g., "autopsy:<tradeId>" | "debrief:2024-01-15" | "shield"
    cacheKey: text('cache_key').notNull(),

    // The JSON result from the AI model
    result: jsonb('result').notNull(),

    // Which provider was used (for observability)
    provider: varchar('provider', { length: 50 }),

    // Approximate tokens used (for monitoring)
    tokensUsed: integer('tokens_used'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    userKeyIdx: uniqueIndex('ai_cache_user_key_idx').on(table.userId, table.cacheKey),
    expiresIdx: index('ai_cache_expires_idx').on(table.expiresAt),
  }),
);

export type AiCacheSelect = typeof aiCache.$inferSelect;
export type AiCacheInsert = typeof aiCache.$inferInsert;
