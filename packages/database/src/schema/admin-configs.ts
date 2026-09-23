// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Admin Configs & Tax Rates
// Fully dynamic — no hardcoded values
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  doublePrecision,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { brokerConnections } from './broker-connections';

export const adminConfigs = pgTable(
  'admin_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 255 }).notNull(),
    value: jsonb('value').notNull(),
    type: varchar('type', { length: 20 }).notNull().default('string'),
    label: varchar('label', { length: 255 }).notNull(),
    description: varchar('description', { length: 2000 }),
    category: varchar('category', { length: 100 }).notNull().default('general'),
    isPublic: boolean('is_public').notNull().default(false),
    updatedBy: varchar('updated_by', { length: 255 }), // tracks who made the change
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    keyUnique: uniqueIndex('admin_configs_key_unique').on(table.key),
    categoryIdx: index('admin_configs_category_idx').on(table.category),
  }),
);

export const taxRates = pgTable(
  'tax_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    segment: varchar('segment', { length: 30 }).notNull(),
    transactionType: varchar('transaction_type', { length: 10 }),
    rateType: varchar('rate_type', { length: 15 }).notNull().default('percentage'),
    rateValue: doublePrecision('rate_value').notNull(),
    appliedOn: varchar('applied_on', { length: 10 }).notNull().default('both'),
    maxCap: doublePrecision('max_cap'),
    minAmount: doublePrecision('min_amount'),
    isActive: boolean('is_active').notNull().default(true),
    priority: integer('priority').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    segmentIdx: index('tax_rates_segment_idx').on(table.segment),
    activeIdx: index('tax_rates_active_idx').on(table.isActive),
  }),
);

export const syncLogs = pgTable(
  'sync_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brokerConnectionId: uuid('broker_connection_id')
      .notNull()
      .references(() => brokerConnections.id, { onDelete: 'cascade' }),
    syncType: varchar('sync_type', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('RUNNING'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    executionsImported: integer('executions_imported').notNull().default(0),
    tradesCreated: integer('trades_created').notNull().default(0),
    tradesUpdated: integer('trades_updated').notNull().default(0),
    errorMessage: varchar('error_message', { length: 2000 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    connectionIdx: index('sync_logs_connection_idx').on(table.brokerConnectionId),
    userIdIdx: index('sync_logs_user_id_idx').on(table.userId),
    statusIdx: index('sync_logs_status_idx').on(table.status),
  }),
);

/** Immutable audit trail for privileged administrative actions. */
export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorEmail: varchar('actor_email', { length: 255 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: varchar('entity_id', { length: 255 }),
    metadata: jsonb('metadata'),
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    actorIdx: index('admin_audit_logs_actor_idx').on(table.actorId),
    entityIdx: index('admin_audit_logs_entity_idx').on(table.entityType, table.entityId),
    createdIdx: index('admin_audit_logs_created_idx').on(table.createdAt),
  }),
);

export type AdminConfigSelect = typeof adminConfigs.$inferSelect;
export type TaxRateSelect = typeof taxRates.$inferSelect;
export type SyncLogSelect = typeof syncLogs.$inferSelect;
export type AdminAuditLogSelect = typeof adminAuditLogs.$inferSelect;
