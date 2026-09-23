// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Holdings & Positions
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  doublePrecision,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { brokerConnections } from './broker-connections';

export const portfolioHoldings = pgTable(
  'portfolio_holdings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brokerConnectionId: uuid('broker_connection_id')
      .notNull()
      .references(() => brokerConnections.id, { onDelete: 'cascade' }),
    isin: varchar('isin', { length: 20 }),
    tradingsymbol: varchar('tradingsymbol', { length: 100 }).notNull(),
    exchange: varchar('exchange', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull().default(0),
    authorizedQuantity: integer('authorized_quantity'),
    averagePrice: doublePrecision('average_price').notNull().default(0),
    currentPrice: doublePrecision('current_price').notNull().default(0),
    pnl: doublePrecision('pnl').notNull().default(0),
    dayChangePercentage: doublePrecision('day_change_percentage').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    connectionIdx: index('holdings_connection_idx').on(table.brokerConnectionId),
    userIdIdx: index('holdings_user_id_idx').on(table.userId),
    symbolIdx: index('holdings_symbol_idx').on(table.tradingsymbol),
    userConnectionIdx: index('holdings_user_connection_idx').on(table.userId, table.brokerConnectionId),
  }),
);

export const positions = pgTable(
  'positions',
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
    segment: varchar('segment', { length: 30 }).notNull(),
    productType: varchar('product_type', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull().default(0),
    buyQuantity: integer('buy_quantity').notNull().default(0),
    sellQuantity: integer('sell_quantity').notNull().default(0),
    buyAveragePrice: doublePrecision('buy_average_price').notNull().default(0),
    sellAveragePrice: doublePrecision('sell_average_price').notNull().default(0),
    realizedPnl: doublePrecision('realized_pnl').notNull().default(0),
    unrealizedPnl: doublePrecision('unrealized_pnl').notNull().default(0),
    multiplier: doublePrecision('multiplier').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    connectionIdx: index('positions_connection_idx').on(table.brokerConnectionId),
    userIdIdx: index('positions_user_id_idx').on(table.userId),
    symbolSegmentIdx: index('positions_symbol_segment_idx').on(
      table.tradingsymbol,
      table.segment,
    ),
    userConnectionIdx: index('positions_user_connection_idx').on(table.userId, table.brokerConnectionId),
  }),
);

export type PortfolioHoldingSelect = typeof portfolioHoldings.$inferSelect;
export type PositionSelect = typeof positions.$inferSelect;
