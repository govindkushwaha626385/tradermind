// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Users & Auth
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('USER'),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    preferredCurrency: varchar('preferred_currency', { length: 10 }).notNull().default('INR'),
    timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Kolkata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
  }),
);

export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
