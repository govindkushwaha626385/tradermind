// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Journal Trades
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  doublePrecision,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { brokerConnections } from './broker-connections';
import { tradingStrategies } from './strategies';

export const journalTrades = pgTable(
  'journal_trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brokerConnectionId: uuid('broker_connection_id')
      .notNull()
      .references(() => brokerConnections.id, { onDelete: 'cascade' }),
    tradingsymbol: varchar('tradingsymbol', { length: 100 }).notNull(),
    exchange: varchar('exchange', { length: 20 }).notNull(),
    assetClass: varchar('asset_class', { length: 30 }).notNull(),
    direction: varchar('direction', { length: 10 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('OPEN'),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),

    // Execution aggregates
    totalQuantity: integer('total_quantity').notNull().default(0),
    openQuantity: integer('open_quantity').notNull().default(0),
    avgEntryPrice: doublePrecision('avg_entry_price').notNull().default(0),
    avgExitPrice: doublePrecision('avg_exit_price'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),

    // Financial outcomes
    grossPnl: doublePrecision('gross_pnl').notNull().default(0),
    totalFeesAndTaxes: doublePrecision('total_fees_and_taxes').notNull().default(0),
    netPnl: doublePrecision('net_pnl').notNull().default(0),
    maxFavorableExcursion: doublePrecision('max_favorable_excursion'),
    maxAdverseExcursion: doublePrecision('max_adverse_excursion'),
    rMultiple: doublePrecision('r_multiple'),
    holdingPeriodMinutes: integer('holding_period_minutes'),

    // User qualitative overlay
    tradeType: varchar('trade_type', { length: 10 }), // MANUAL | ALGO
    emotions: varchar('emotions').array(),
    setupPlaybookId: uuid('setup_playbook_id'),
    strategyId: uuid('strategy_id').references(() => tradingStrategies.id, { onDelete: 'set null' }),
    ruleComplianceScore: doublePrecision('rule_compliance_score'),
    mistakeTags: varchar('mistake_tags').array(),
    traderNotes: varchar('trader_notes', { length: 5000 }),
    audioNoteUrl: varchar('audio_note_url', { length: 1024 }),
    screenshotUrls: varchar('screenshot_urls').array(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    connectionIdx: index('journal_trades_connection_idx').on(table.brokerConnectionId),
    userIdIdx: index('journal_trades_user_id_idx').on(table.userId),
    symbolIdx: index('journal_trades_symbol_idx').on(table.tradingsymbol),
    statusIdx: index('journal_trades_status_idx').on(table.status),
    openedAtIdx: index('journal_trades_opened_at_idx').on(table.openedAt),
    userStatusIdx: index('journal_trades_user_status_idx').on(table.userId, table.status),
    strategyIdx: index('journal_trades_strategy_idx').on(table.strategyId),
  }),
);

// Link table: journal_trades <-> trade_executions (M:N)
// Using raw SQL foreign key to avoid circular dependency
import { sql } from 'drizzle-orm';
import { tradeExecutions } from './trade-executions';

export const tradeExecutionLinks = pgTable(
  'trade_execution_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalTradeId: uuid('journal_trade_id')
      .notNull()
      .references(() => journalTrades.id, { onDelete: 'cascade' }),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => tradeExecutions.id, { onDelete: 'cascade' }),
    allocatedQuantity: integer('allocated_quantity').notNull(),
    allocatedFees: doublePrecision('allocated_fees').notNull().default(0),
  },
  (table) => ({
    journalTradeIdx: index('execution_links_journal_trade_idx').on(table.journalTradeId),
    executionIdx: index('execution_links_execution_idx').on(table.executionId),
    uniqueLink: uniqueIndex('execution_links_unique').on(table.journalTradeId, table.executionId),
  }),
);

export type JournalTradeSelect = typeof journalTrades.$inferSelect;
export type JournalTradeInsert = typeof journalTrades.$inferInsert;
export type TradeExecutionLinkSelect = typeof tradeExecutionLinks.$inferSelect;
