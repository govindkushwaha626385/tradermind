// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Broker Connections
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const brokerConnections = pgTable(
  'broker_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brokerId: varchar('broker_id', { length: 50 }).notNull(),
    brokerClientId: varchar('broker_client_id', { length: 100 }).notNull(),
    label: varchar('label', { length: 255 }).notNull().default(''),
    authType: varchar('auth_type', { length: 30 }).notNull(),
    accessToken: text('access_token').default('').notNull(),
    refreshToken: text('refresh_token'),
    apiKey: text('api_key'),
    apiSecret: text('api_secret'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('broker_connections_user_id_idx').on(table.userId),
    brokerIdIdx: index('broker_connections_broker_id_idx').on(table.brokerId),
    statusIdx: index('broker_connections_status_idx').on(table.status),
    userBrokerUnique: uniqueIndex('broker_connections_user_broker_unique').on(
      table.userId,
      table.brokerId,
      table.brokerClientId,
    ),
  }),
);

export type BrokerConnectionSelect = typeof brokerConnections.$inferSelect;
export type BrokerConnectionInsert = typeof brokerConnections.$inferInsert;
