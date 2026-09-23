// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Subscriptions & Plans
//
// Handles payment/subscription lifecycle:
// - plans:      defines available pricing tiers (free, pro, elite)
// - subscriptions: tracks each user's active subscription
// - invoices:    records payment history from Stripe/Razorpay
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

/**
 * Available subscription plans (seeded via admin, not hardcoded).
 */
export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Human-readable identifier used in code (e.g. 'free', 'pro_monthly', 'elite_yearly')
    slug: varchar('slug', { length: 50 }).notNull().unique(),

    // Display name shown to users (e.g. 'Pro Monthly', 'Elite Annual')
    name: varchar('name', { length: 100 }).notNull(),

    // Short description of what this plan includes
    description: varchar('description', { length: 500 }),

    // Price in smallest currency unit (paise for INR, cents for USD)
    // 0 = free plan
    amount: integer('amount').notNull().default(0),

    // ISO currency code (INR, USD)
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),

    // Billing interval: 'month' | 'year' | 'one-time' | 'free'
    interval: varchar('interval', { length: 10 }).notNull().default('month'),

    // Feature flags stored as JSON
    // Example: { "maxTradesPerMonth": 100, "maxBrokerConnections": 1, "aiInsights": false }
    features: jsonb('features').notNull().default({}),

    // Whether this plan is currently available for purchase
    isActive: boolean('is_active').notNull().default(true),

    // Display order (lower = shown first)
    sortOrder: integer('sort_order').notNull().default(0),

    // Whether this is highlighted as "Most Popular"
    isPopular: boolean('is_popular').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    slugUnique: uniqueIndex('plans_slug_unique').on(table.slug),
    activeIdx: index('plans_active_idx').on(table.isActive),
    sortIdx: index('plans_sort_idx').on(table.sortOrder),
  }),
);

/**
 * Active subscriptions for each user.
 * One user can have only one active subscription at a time.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(), // One subscription per user

    // The plan this subscription is for
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),

    // Payment provider: 'stripe' | 'razorpay'
    provider: varchar('provider', { length: 20 }).notNull(),

    // Provider-specific subscription ID (e.g. 'sub_xxxx' from Stripe)
    providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }),

    // Provider-specific customer ID
    providerCustomerId: varchar('provider_customer_id', { length: 255 }),

    // Current status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'expired'
    status: varchar('status', { length: 20 }).notNull().default('active'),

    // Current period start/end (for billing cycles)
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),

    // If the subscription was canceled, when it will/was end(ed)
    canceledAt: timestamp('canceled_at', { withTimezone: true }),

    // If trialing, when the trial ends
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdUnique: uniqueIndex('subscriptions_user_id_unique').on(table.userId),
    planIdIdx: index('subscriptions_plan_id_idx').on(table.planId),
    statusIdx: index('subscriptions_status_idx').on(table.status),
    providerSubIdx: index('subscriptions_provider_sub_idx').on(table.providerSubscriptionId),
  }),
);

/**
 * Invoice / payment records.
 */
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id')
      .references(() => subscriptions.id),

    // Provider: 'stripe' | 'razorpay'
    provider: varchar('provider', { length: 20 }).notNull(),

    // Provider invoice ID
    providerInvoiceId: varchar('provider_invoice_id', { length: 255 }),

    // Amount in smallest currency unit
    amountPaid: integer('amount_paid').notNull().default(0),

    // ISO currency code
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),

    // Status: 'paid' | 'open' | 'void' | 'uncollectible'
    status: varchar('status', { length: 20 }).notNull().default('paid'),

    // When this invoice was paid
    paidAt: timestamp('paid_at', { withTimezone: true }),

    // Raw provider response for audit
    rawProviderData: jsonb('raw_provider_data'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('invoices_user_id_idx').on(table.userId),
    subscriptionIdx: index('invoices_subscription_idx').on(table.subscriptionId),
    providerInvIdx: index('invoices_provider_inv_idx').on(table.providerInvoiceId),
    userStatusIdx: index('invoices_user_status_idx').on(table.userId, table.status),
  }),
);

export type PlanSelect = typeof plans.$inferSelect;
export type PlanInsert = typeof plans.$inferInsert;
export type SubscriptionSelect = typeof subscriptions.$inferSelect;
export type SubscriptionInsert = typeof subscriptions.$inferInsert;
export type InvoiceSelect = typeof invoices.$inferSelect;
export type InvoiceInsert = typeof invoices.$inferInsert;
