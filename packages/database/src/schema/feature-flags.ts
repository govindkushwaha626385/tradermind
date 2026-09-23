// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Feature Flags
//
// Admin-controlled feature toggles with rollouts
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    isEnabled: boolean('is_enabled').default(false).notNull(),
    rules: jsonb('rules'), // e.g. { allowedRoles: ['PRO', 'ENTERPRISE'], percentage: 100 }
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('feature_flags_name_idx').on(table.name),
  }),
);

export type FeatureFlagSelect = typeof featureFlags.$inferSelect;
export type FeatureFlagInsert = typeof featureFlags.$inferInsert;
