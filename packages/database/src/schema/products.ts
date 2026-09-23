// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Digital Products Store
//
// Tables:
// - products:       admin-managed digital products (PDFs, videos, courses)
// - product_orders: payment transactions for product purchases
// - product_access: granted access after successful payment
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Digital products listed in the store.
 * Admin creates and manages these.
 */
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Product title shown to users
    title: varchar('title', { length: 200 }).notNull(),

    // Short description (for cards)
    description: text('description').notNull(),

    // Long markdown description for product detail page
    longDescription: text('long_description'),

    // Product category: 'PDF' | 'VIDEO' | 'COURSE' | 'BUNDLE' | 'TEMPLATE'
    productType: varchar('product_type', { length: 20 }).notNull().default('PDF'),

    // Price in paise (INR) or cents (USD) — 0 means free
    price: integer('price').notNull().default(0),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),

    // URL to the product file / download (for paid access after purchase)
    // Stored as encrypted/signed URL — never exposed publicly
    downloadUrl: text('download_url'),

    // YouTube/Vimeo video URL (for VIDEO type)
    videoUrl: text('video_url'),

    // Preview/thumbnail image URL (publicly accessible)
    previewImageUrl: text('preview_image_url'),

    // Tags for filtering (JSON array of strings)
    tags: jsonb('tags').notNull().default([]),

    // Additional metadata (author, pages, duration, level, etc.)
    metadata: jsonb('metadata').notNull().default({}),

    // Whether product is published and visible to users
    isActive: boolean('is_active').notNull().default(true),

    // Whether product is free (no payment required)
    isFree: boolean('is_free').notNull().default(false),

    // Display order
    sortOrder: integer('sort_order').notNull().default(0),

    // Sales stats (denormalized for performance)
    totalSales: integer('total_sales').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    activeIdx: index('products_active_idx').on(table.isActive),
    typeIdx: index('products_type_idx').on(table.productType),
    sortIdx: index('products_sort_idx').on(table.sortOrder),
  }),
);

/**
 * Payment orders for product purchases.
 * Created when user initiates a purchase, updated on payment completion.
 */
export const productOrders = pgTable(
  'product_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    // Price at time of purchase (may differ from current product price)
    amountPaid: integer('amount_paid').notNull().default(0),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),

    // Payment gateway: 'razorpay' | 'stripe' | 'free'
    provider: varchar('provider', { length: 20 }).notNull().default('razorpay'),

    // Provider order/payment IDs for verification and refunds
    providerOrderId: varchar('provider_order_id', { length: 255 }),
    providerPaymentId: varchar('provider_payment_id', { length: 255 }),
    providerSignature: varchar('provider_signature', { length: 512 }),

    // Status: 'pending' | 'paid' | 'failed' | 'refunded'
    status: varchar('status', { length: 20 }).notNull().default('pending'),

    // Raw gateway response for audit
    rawProviderData: jsonb('raw_provider_data'),

    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('product_orders_user_id_idx').on(table.userId),
    productIdIdx: index('product_orders_product_id_idx').on(table.productId),
    statusIdx: index('product_orders_status_idx').on(table.status),
    providerOrderIdx: uniqueIndex('product_orders_provider_order_unique').on(table.providerOrderId),
    userProductIdx: index('product_orders_user_product_idx').on(table.userId, table.productId),
  }),
);

/**
 * Tracks which users have access to which products.
 * Created automatically on successful payment or for free products.
 */
export const productAccess = pgTable(
  'product_access',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    // The order that granted this access (null for free products)
    orderId: uuid('order_id').references(() => productOrders.id),

    // How access was granted: 'purchased' | 'free' | 'admin_granted' | 'subscription_benefit'
    grantReason: varchar('grant_reason', { length: 50 }).notNull().default('purchased'),

    // Download/access count for analytics
    downloadCount: integer('download_count').notNull().default(0),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),

    accessGrantedAt: timestamp('access_granted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // One access record per user per product
    userProductUnique: uniqueIndex('product_access_user_product_unique').on(table.userId, table.productId),
    userIdIdx: index('product_access_user_id_idx').on(table.userId),
    productIdIdx: index('product_access_product_id_idx').on(table.productId),
  }),
);

export type ProductSelect = typeof products.$inferSelect;
export type ProductInsert = typeof products.$inferInsert;
export type ProductOrderSelect = typeof productOrders.$inferSelect;
export type ProductOrderInsert = typeof productOrders.$inferInsert;
export type ProductAccessSelect = typeof productAccess.$inferSelect;
export type ProductAccessInsert = typeof productAccess.$inferInsert;
