// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Trading Strategies
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
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const tradingStrategies = pgTable(
  'trading_strategies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Identity
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),

    // Classification
    marketType: varchar('market_type', { length: 20 }).notNull().default('EQUITY'),
    // EQUITY | OPTIONS | FUTURES | CRYPTO | COMMODITY
    timeframe: varchar('timeframe', { length: 20 }),
    // Scalping | Intraday | Swing | Positional | Long-Term

    // Rules (free-form text so users can write detailed playbooks)
    entryCriteria: text('entry_criteria'),
    exitCriteria: text('exit_criteria'),
    riskRules: jsonb('risk_rules'),
    // e.g. { maxLossPerTrade: 1, maxDailyLoss: 3, riskRewardRatio: 2 }

    // Tags for quick filtering
    tags: varchar('tags').array(),

    // Aggregated performance stats (updated by API on each trade close)
    winCount:  integer('win_count').notNull().default(0),
    lossCount: integer('loss_count').notNull().default(0),
    totalTrades: integer('total_trades').notNull().default(0),
    totalPnl: doublePrecision('total_pnl').notNull().default(0),
    avgRMultiple: doublePrecision('avg_r_multiple'),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx:   index('strategies_user_id_idx').on(table.userId),
    activeIdx:   index('strategies_active_idx').on(table.userId, table.isActive),
    marketIdx:   index('strategies_market_type_idx').on(table.marketType),
  }),
);

export type TradingStrategySelect = typeof tradingStrategies.$inferSelect;
export type TradingStrategyInsert = typeof tradingStrategies.$inferInsert;
