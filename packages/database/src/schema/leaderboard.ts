// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Leaderboard
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  doublePrecision,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * leaderboard_opt_ins — user's preference to appear on public leaderboard.
 * Primary key is user_id (one row per user).
 */
export const leaderboardOptIns = pgTable(
  'leaderboard_opt_ins',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    isPublic:    boolean('is_public').notNull().default(false),
    displayName: varchar('display_name', { length: 50 }).notNull(),
    bio:         varchar('bio', { length: 280 }),
    twitterUrl:  varchar('twitter_url', { length: 200 }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    isPublicIdx: index('leaderboard_opt_ins_public_idx').on(table.isPublic),
  }),
);

/**
 * leaderboard_snapshots — pre-computed ranked entries.
 * Rebuilt on demand (TTL = 1 hour per period) to avoid scheduled cron cost.
 */
export const leaderboardSnapshots = pgTable(
  'leaderboard_snapshots',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    userId:          uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    period:          varchar('period', { length: 20 }).notNull(),
    // WEEKLY | MONTHLY | ALL_TIME
    rank:            integer('rank').notNull(),
    displayName:     varchar('display_name', { length: 50 }).notNull(),
    avatarUrl:       varchar('avatar_url', { length: 512 }),
    bio:             varchar('bio', { length: 280 }),
    twitterUrl:      varchar('twitter_url', { length: 200 }),
    totalPnl:        doublePrecision('total_pnl').notNull().default(0),
    pnlPercent:      doublePrecision('pnl_percent').notNull().default(0),
    winRate:         doublePrecision('win_rate').notNull().default(0),
    totalTrades:     integer('total_trades').notNull().default(0),
    disciplineScore: doublePrecision('discipline_score').notNull().default(0),
    compositeScore:  doublePrecision('composite_score').notNull().default(0),
    computedAt:      timestamp('computed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    periodRankIdx: index('leaderboard_snapshots_period_rank_idx').on(table.period, table.rank),
    userPeriodIdx: uniqueIndex('leaderboard_snapshots_user_period_idx').on(table.userId, table.period),
    computedAtIdx: index('leaderboard_snapshots_computed_at_idx').on(table.computedAt),
  }),
);

export type LeaderboardOptInSelect  = typeof leaderboardOptIns.$inferSelect;
export type LeaderboardOptInInsert  = typeof leaderboardOptIns.$inferInsert;
export type LeaderboardSnapshotSelect = typeof leaderboardSnapshots.$inferSelect;
export type LeaderboardSnapshotInsert = typeof leaderboardSnapshots.$inferInsert;
