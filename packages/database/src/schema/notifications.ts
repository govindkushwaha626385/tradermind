// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Notifications & Onboarding
//
// - notifications:     stores outbound email records and user preferences
// - user_onboarding:   tracks each user's progress through setup steps
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Notification log and preferences.
 *
 * Each row represents either:
 * - A notification preference (preferences are upserted by type)
 * - A sent notification record for audit
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Type of notification: 'daily_summary' | 'weekly_report' | 'token_expiry' |
    //                      'unlogged_trade' | 'sync_complete' | 'sync_failed' |
    //                      'behavioral_insight' | 'marketing'
    type: varchar('type', { length: 50 }).notNull(),

    // Channel: 'email' | 'in_app' | 'push'
    channel: varchar('channel', { length: 20 }).notNull().default('email'),

    // Subject line (for emails)
    subject: varchar('subject', { length: 500 }),

    // Body content (HTML for emails, text for in-app)
    body: varchar('body', { length: 10000 }),

    // Whether the user has enabled this notification type
    isEnabled: boolean('is_enabled').notNull().default(true),

    // Whether this notification has been sent/read
    isDelivered: boolean('is_delivered').notNull().default(false),

    // When it was delivered
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),

    // Metadata for template rendering (JSON)
    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    typeIdx: index('notifications_type_idx').on(table.type),
    deliveredIdx: index('notifications_delivered_idx').on(table.isDelivered),
    userTypeIdx: index('notifications_user_type_idx').on(table.userId, table.type),
  }),
);

/**
 * User onboarding progress tracker.
 *
 * Tracks which setup steps a user has completed so we
 * can show/hide the onboarding wizard appropriately.
 */
export const userOnboarding = pgTable(
  'user_onboarding',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),

    // Step flags — each becomes true when the user completes that step
    hasCompletedWelcome: boolean('has_completed_welcome').notNull().default(false),
    hasConnectedBroker: boolean('has_connected_broker').notNull().default(false),
    hasImportedTrades: boolean('has_imported_trades').notNull().default(false),
    hasJournaledFirstTrade: boolean('has_journaled_first_trade').notNull().default(false),
    hasViewedInsights: boolean('has_viewed_insights').notNull().default(false),

    // Whether onboarding is fully complete
    isComplete: boolean('is_complete').notNull().default(false),

    // When the user completed onboarding
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdUnique: uniqueIndex('onboarding_user_id_unique').on(table.userId),
  }),
);

export type NotificationSelect = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;
export type UserOnboardingSelect = typeof userOnboarding.$inferSelect;
export type UserOnboardingInsert = typeof userOnboarding.$inferInsert;
