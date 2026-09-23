// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Daily Pre-Market Plans
//
// Allows traders to define their market bias, risk budget,
// trade limits, and pre-flight checklist before market open.
// Directly integrated with Behavioral Shield to prevent breaches.
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  doublePrecision,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const dailyPremarketPlans = pgTable(
  'daily_premarket_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Date in YYYY-MM-DD format
    date: varchar('date', { length: 10 }).notNull(),

    // Market bias for the session
    marketBias: varchar('market_bias', { length: 20 })
      .notNull()
      .default('NEUTRAL'), // 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE'

    // Macro context & key levels (e.g., Nifty / BankNifty S/R)
    keyLevels: text('key_levels'),

    // Session risk parameters
    maxDailyLoss: doublePrecision('max_daily_loss'), // ₹ budget limit for the day
    maxDailyTrades: integer('max_daily_trades'), // max number of trades allowed today
    maxRiskPerTrade: doublePrecision('max_risk_per_trade'), // ₹ risk allowed on a single trade

    // Morning checklist items: [{ id: string, label: string, checked: boolean }]
    checklistItems: jsonb('checklist_items').default([]),

    // Planned watchlist: [{ symbol: string, notes: string, direction: 'LONG'|'SHORT'|'WATCH', triggerPrice?: number }]
    watchlist: jsonb('watchlist').default([]),

    // Trader's emotional readiness: 'calm' | 'energized' | 'fatigued' | 'anxious' | 'neutral'
    mentalState: varchar('mental_state', { length: 50 }),

    // General prep notes & game plan
    notes: text('notes'),

    // Once locked, session has started and guardrails are strictly active
    isLocked: boolean('is_locked').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userDateIdx: uniqueIndex('dpp_user_date_idx').on(table.userId, table.date),
    userIdIdx: index('dpp_user_id_idx').on(table.userId),
    dateIdx: index('dpp_date_idx').on(table.date),
  }),
);

export type DailyPremarketPlanSelect = typeof dailyPremarketPlans.$inferSelect;
export type DailyPremarketPlanInsert = typeof dailyPremarketPlans.$inferInsert;
