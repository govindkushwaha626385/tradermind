// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Trade Executions (Raw Fills)
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  doublePrecision,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { brokerConnections } from './broker-connections';

export const tradeExecutions = pgTable(
  'trade_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brokerConnectionId: uuid('broker_connection_id')
      .notNull()
      .references(() => brokerConnections.id, { onDelete: 'cascade' }),
    brokerExecutionId: varchar('broker_execution_id', { length: 100 }).notNull(),
    brokerOrderId: varchar('broker_order_id', { length: 100 }).notNull(),
    exchangeOrderId: varchar('exchange_order_id', { length: 100 }),
    tradingsymbol: varchar('tradingsymbol', { length: 100 }).notNull(),
    exchange: varchar('exchange', { length: 20 }).notNull(),
    segment: varchar('segment', { length: 30 }).notNull(),
    transactionType: varchar('transaction_type', { length: 10 }).notNull(),
    orderType: varchar('order_type', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull(),
    executionPrice: doublePrecision('execution_price').notNull(),
    executionTimestamp: timestamp('execution_timestamp', { withTimezone: true }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),

    // Tax & Fees
    brokerageFee: doublePrecision('brokerage_fee').notNull().default(0),
    sttTax: doublePrecision('stt_tax').notNull().default(0),
    exchangeTurnoverFee: doublePrecision('exchange_turnover_fee').notNull().default(0),
    gstFee: doublePrecision('gst_fee').notNull().default(0),
    sebiCharges: doublePrecision('sebi_charges').notNull().default(0),
    stampDuty: doublePrecision('stamp_duty').notNull().default(0),
    totalCharges: doublePrecision('total_charges').notNull().default(0),

    // Deduplication
    fillHash: varchar('fill_hash', { length: 128 }).notNull(),
    rawPayload: jsonb('raw_payload'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    connectionIdx: index('executions_connection_idx').on(table.brokerConnectionId),
    symbolIdx: index('executions_symbol_idx').on(table.tradingsymbol),
    timestampIdx: index('executions_timestamp_idx').on(table.executionTimestamp),
    fillHashUnique: uniqueIndex('executions_fill_hash_unique').on(table.fillHash),
    userSymbolTimestampIdx: index('executions_user_symbol_ts_idx').on(
      table.userId,
      table.tradingsymbol,
      table.executionTimestamp,
    ),
  }),
);

export type TradeExecutionSelect = typeof tradeExecutions.$inferSelect;
export type TradeExecutionInsert = typeof tradeExecutions.$inferInsert;
