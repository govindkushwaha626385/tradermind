// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Broker Profiles & Balances
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  doublePrecision,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { brokerConnections } from './broker-connections';

export const brokerProfiles = pgTable(
  'broker_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brokerConnectionId: uuid('broker_connection_id')
      .notNull()
      .references(() => brokerConnections.id, { onDelete: 'cascade' }),
    userName: varchar('user_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    exchangesEnabled: varchar('exchanges_enabled').array().notNull().default([]),
    userType: varchar('user_type', { length: 50 }).notNull().default('individual'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    connectionIdx: index('broker_profiles_connection_idx').on(table.brokerConnectionId),
    userIdIdx: index('broker_profiles_user_id_idx').on(table.userId),
  }),
);

export const accountBalances = pgTable(
  'account_balances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brokerConnectionId: uuid('broker_connection_id')
      .notNull()
      .references(() => brokerConnections.id, { onDelete: 'cascade' }),
    availableCash: doublePrecision('available_cash').notNull().default(0),
    usedMargin: doublePrecision('used_margin').notNull().default(0),
    totalCollateral: doublePrecision('total_collateral').notNull().default(0),
    payinAmount: doublePrecision('payin_amount').notNull().default(0),
    payoutAmount: doublePrecision('payout_amount').notNull().default(0),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    connectionIdx: index('account_balances_connection_idx').on(table.brokerConnectionId),
    connectionUnique: uniqueIndex('account_balances_connection_unique').on(table.brokerConnectionId),
  }),
);

export type BrokerProfileSelect = typeof brokerProfiles.$inferSelect;
export type AccountBalanceSelect = typeof accountBalances.$inferSelect;
