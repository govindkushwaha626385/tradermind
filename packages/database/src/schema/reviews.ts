// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: User Reviews
//
// Stores trader-submitted testimonials with admin
// moderation before public display on landing page.
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * User-submitted product/platform reviews.
 * Admin approves before public display.
 */
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Star rating 1-5
    rating: integer('rating').notNull().default(5),

    // Short headline (e.g. "Best trading journal I've used")
    headline: varchar('headline', { length: 150 }).notNull(),

    // Full review text
    body: text('body').notNull(),

    // Trading persona displayed with the review
    traderType: varchar('trader_type', { length: 100 }),

    // Whether this review is publicly visible (admin toggles this)
    isApproved: boolean('is_approved').notNull().default(false),

    // Whether marked as featured (shown prominently)
    isFeatured: boolean('is_featured').notNull().default(false),

    // Admin notes (internal, not shown to user)
    adminNotes: text('admin_notes'),

    // Display name (user can optionally override their profile name for anonymity)
    displayName: varchar('display_name', { length: 100 }),

    // Platform (e.g. 'web', 'mobile')
    platform: varchar('platform', { length: 20 }).notNull().default('web'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('reviews_user_id_idx').on(table.userId),
    approvedIdx: index('reviews_approved_idx').on(table.isApproved),
    featuredIdx: index('reviews_featured_idx').on(table.isFeatured),
    ratingIdx: index('reviews_rating_idx').on(table.rating),
    createdIdx: index('reviews_created_idx').on(table.createdAt),
  }),
);

export type ReviewSelect = typeof reviews.$inferSelect;
export type ReviewInsert = typeof reviews.$inferInsert;
