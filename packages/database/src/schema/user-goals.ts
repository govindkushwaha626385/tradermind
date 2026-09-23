// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: User Goals
//
// Stores user-defined performance & discipline targets
// (P&L goals, win-rate goals, discipline score goals).
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const userGoals = pgTable(
  'user_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Goal identity
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    // Type of goal
    type: varchar('type', { length: 50 }).notNull(),
    // e.g. 'pnl', 'win_rate', 'profit_factor', 'discipline_score',
    //      'max_drawdown', 'trade_count', 'avg_rr', 'streak'

    // Target value and period
    targetValue: numeric('target_value', { precision: 18, scale: 4 }).notNull(),
    period: varchar('period', { length: 20 }).notNull().default('MONTHLY'),
    // 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ALL_TIME'

    // Period boundaries (optional for ALL_TIME)
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),

    // Current progress (synced by background job or on-read)
    currentValue: numeric('current_value', { precision: 18, scale: 4 }).default('0'),
    progressPct: numeric('progress_pct', { precision: 6, scale: 2 }).default('0'),
    // 0-100 percentage

    // Status
    isCompleted: boolean('is_completed').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Meta
    emoji: varchar('emoji', { length: 10 }).default('🎯'),
    color: varchar('color', { length: 20 }).default('blue'),
    // 'blue', 'emerald', 'violet', 'amber', 'rose'

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('user_goals_user_id_idx').on(table.userId),
    userActiveIdx: index('user_goals_user_active_idx').on(table.userId, table.isActive),
    typeIdx: index('user_goals_type_idx').on(table.type),
  }),
);

export type UserGoalSelect = typeof userGoals.$inferSelect;
export type UserGoalInsert = typeof userGoals.$inferInsert;
