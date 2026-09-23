// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Trade Ratings
//
// After each trade, the user rates their own execution
// quality, emotional state, and adds reflections.
// This powers the psychology & discipline analytics.
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  doublePrecision,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { journalTrades } from './journal-trades';

export const tradeRatings = pgTable(
  'trade_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    journalTradeId: uuid('journal_trade_id')
      .notNull()
      .references(() => journalTrades.id, { onDelete: 'cascade' }),

    // ── Self-rating (1-5 scale) ──────────────
    executionRating: doublePrecision('execution_rating'), // 1-5: How well did you execute?
    planRating: doublePrecision('plan_rating'),           // 1-5: How good was the plan?
    psychologyRating: doublePrecision('psychology_rating'), // 1-5: Mental state during trade

    // ── Emotional & behavioral tags ──────────
    emotions: varchar('emotions').array(),
    mistakeTags: varchar('mistake_tags').array(),

    // ── Reflection ───────────────────────────
    reflection: varchar('reflection', { length: 5000 }), // What did you learn?
    lessonLearned: varchar('lesson_learned', { length: 2000 }), // Key takeaway

    // ── Post-trade analysis ──────────────────
    followedPlan: boolean('followed_plan'),
    wouldChange: boolean('would_change'), // Would you do anything differently?
    whatWouldChange: varchar('what_would_change', { length: 2000 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('tr_user_id_idx').on(table.userId),
    tradeIdx: index('tr_trade_id_idx').on(table.journalTradeId),
    userTradeUnique: uniqueIndex('tr_user_trade_unique').on(table.userId, table.journalTradeId),
  }),
);

export type TradeRatingSelect = typeof tradeRatings.$inferSelect;
export type TradeRatingInsert = typeof tradeRatings.$inferInsert;
