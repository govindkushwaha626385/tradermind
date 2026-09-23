// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Risk Profiles
// Daily risk management & kill switch configuration
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const riskProfiles = pgTable(
  'risk_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique(), // FK: auth.users(id) — one profile per user

    // ── Daily Loss Limits ──────────────────────────────────────────
    dailyLossLimitAbs: numeric('daily_loss_limit_abs', { precision: 12, scale: 2 }).default('0'), // ₹ absolute max daily loss
    dailyLossLimitPct: numeric('daily_loss_limit_pct', { precision: 5, scale: 2 }).default('0'),  // % of capital max daily loss

    // ── Trade Count Limits ─────────────────────────────────────────
    maxTradesPerDay: integer('max_trades_per_day').default(0),        // 0 = unlimited
    maxConsecutiveLosses: integer('max_consecutive_losses').default(0), // 0 = unlimited

    // ── Position Size Limits ────────────────────────────────────────
    maxPositionSizePct: numeric('max_position_size_pct', { precision: 5, scale: 2 }).default('0'), // % of capital per trade
    maxOpenPositions: integer('max_open_positions').default(0),       // 0 = unlimited

    // ── Kill Switch Config ──────────────────────────────────────────
    killSwitchEnabled: boolean('kill_switch_enabled').notNull().default(false),
    killSwitchActive: boolean('kill_switch_active').notNull().default(false),  // TRUE = trading blocked today
    killSwitchResetMode: varchar('kill_switch_reset_mode', { length: 20 }).notNull().default('midnight'), // 'midnight' | 'manual' | 'admin'
    killSwitchTriggeredAt: timestamp('kill_switch_triggered_at', { withTimezone: true }),
    killSwitchReason: text('kill_switch_reason'), // e.g. "Daily loss limit ₹5,000 reached"

    // ── Cooldown ────────────────────────────────────────────────────
    cooldownMinutesAfterLoss: integer('cooldown_minutes_after_loss').default(0), // Mandatory break after consecutive losses

    // ── Notifications ───────────────────────────────────────────────
    notifyAt75Pct: boolean('notify_at_75_pct').notNull().default(true),  // Alert at 75% of daily loss limit
    notifyOnKillSwitch: boolean('notify_on_kill_switch').notNull().default(true),

    // ── Meta ────────────────────────────────────────────────────────
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('risk_profiles_user_id_idx').on(table.userId),
  }),
);

export type RiskProfileSelect = typeof riskProfiles.$inferSelect;
export type RiskProfileInsert = typeof riskProfiles.$inferInsert;
