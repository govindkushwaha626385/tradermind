// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Partners (Affiliate Directory)
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const partners = pgTable(
  'partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    logoUrl: varchar('logo_url', { length: 1024 }),
    websiteUrl: varchar('website_url', { length: 1024 }),
    affiliateUrl: varchar('affiliate_url', { length: 2048 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }).notNull().default('discount'), // 'discount', 'full_service', 'crypto', 'algo', 'platform'
    country: varchar('country', { length: 50 }).notNull().default('IN'),
    isFeatured: boolean('is_featured').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    commissionNote: varchar('commission_note', { length: 500 }), // e.g. "₹0 Brokerage on Equity Delivery | Flat ₹20 on F&O"
    tag: varchar('tag', { length: 100 }), // e.g. 'Recommended', 'Most Popular', 'Best for Options', 'Zero AMC'
    features: varchar('features').array().notNull().default([]), // key highlights e.g. ['TradingView Charts', 'Fast Execution', 'API Trading']
    rating: varchar('rating', { length: 10 }).default('4.8'),
    accountOpeningFee: varchar('account_opening_fee', { length: 100 }).default('Free'),
    maintenanceCharges: varchar('maintenance_charges', { length: 100 }).default('₹0 for 1st Year'),
    clickCount: integer('click_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    activeOrderIdx: index('partners_active_order_idx').on(table.isActive, table.displayOrder),
    categoryIdx: index('partners_category_idx').on(table.category),
    slugIdx: index('partners_slug_idx').on(table.slug),
  }),
);

export type PartnerSelect = typeof partners.$inferSelect;
export type PartnerInsert = typeof partners.$inferInsert;
