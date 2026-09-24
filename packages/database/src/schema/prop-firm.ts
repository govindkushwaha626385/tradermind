// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Prop Firm Accounts
//
// Tracks prop firm evaluation challenges & funded accounts
// (FTMO, FundedNext, Apex, Topstep, The5ers, Funding Pips, etc.)
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const propFirmAccounts = pgTable(
  'prop_firm_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    firmName: varchar('firm_name', { length: 100 }).notNull(),
    accountName: varchar('account_name', { length: 150 }).notNull(),
    accountSize: numeric('account_size', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    phase: varchar('phase', { length: 50 }).notNull().default('Phase 1'),

    startingBalance: numeric('starting_balance', { precision: 14, scale: 2 }).notNull(),
    currentBalance: numeric('current_balance', { precision: 14, scale: 2 }).notNull(),
    highWaterMark: numeric('high_water_mark', { precision: 14, scale: 2 }).notNull(),

    dailyLossLimitPct: numeric('daily_loss_limit_pct', { precision: 5, scale: 2 }).notNull().default('5.00'),
    maxDrawdownPct: numeric('max_drawdown_pct', { precision: 5, scale: 2 }).notNull().default('10.00'),
    profitTargetPct: numeric('profit_target_pct', { precision: 5, scale: 2 }).notNull().default('10.00'),

    minTradingDays: integer('min_trading_days').notNull().default(4),
    tradingDaysCompleted: integer('trading_days_completed').notNull().default(0),
    todayPnl: numeric('today_pnl', { precision: 14, scale: 2 }).notNull().default('0.00'),

    weekendHoldingAllowed: boolean('weekend_holding_allowed').notNull().default(false),
    newsTradingAllowed: boolean('news_trading_allowed').notNull().default(true),

    status: varchar('status', { length: 30 }).notNull().default('ACTIVE'), // ACTIVE, PASSED, FAILED, ARCHIVED
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_prop_firm_accounts_user_id').on(table.userId),
    statusIdx: index('idx_prop_firm_accounts_status').on(table.status),
  })
);

export type PropFirmAccount = typeof propFirmAccounts.$inferSelect;
export type NewPropFirmAccount = typeof propFirmAccounts.$inferInsert;
