// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Trade Plans
//
// Before entering a trade, the user can record their
// planned entry, stop-loss, take-profit, and risk amount.
// After the trade closes, the system compares planned vs
// actual execution to measure discipline.
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  doublePrecision,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { journalTrades } from './journal-trades';

export const tradePlans = pgTable(
  'trade_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    journalTradeId: uuid('journal_trade_id')
      .notNull()
      .references(() => journalTrades.id, { onDelete: 'cascade' }),

    // ── Planned values (set before trade) ─────
    plannedEntryPrice: doublePrecision('planned_entry_price'),
    plannedStopLoss: doublePrecision('planned_stop_loss'),
    plannedTakeProfit: doublePrecision('planned_take_profit'),
    plannedQuantity: doublePrecision('planned_quantity'),
    plannedRiskAmount: doublePrecision('planned_risk_amount'), // ₹ risk on the trade
    plannedRR: doublePrecision('planned_rr'), // planned risk-to-reward ratio

    // ── Discipline metrics (computed after trade) ──
    /** Did the trader stick to the plan? 0-1 score */
    planAdherenceScore: doublePrecision('plan_adherence_score'),
    /** Entry slippage: |plannedEntry - actualAvgEntry| */
    entrySlippage: doublePrecision('entry_slippage'),
    /** Exit slippage: |plannedSL - actualExit| for losers, |plannedTP - actualExit| for winners */
    exitSlippage: doublePrecision('exit_slippage'),
    /** Was the stop-loss hit exactly? (indicates if SL was moved) */
    slHitExactly: doublePrecision('sl_hit_exactly'),
    /** Was take-profit hit exactly? */
    tpHitExactly: doublePrecision('tp_hit_exactly'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('tp_user_id_idx').on(table.userId),
    tradeIdx: index('tp_trade_id_idx').on(table.journalTradeId),
    userTradeUnique: uniqueIndex('tp_user_trade_unique').on(table.userId, table.journalTradeId),
  }),
);

export type TradePlanSelect = typeof tradePlans.$inferSelect;
export type TradePlanInsert = typeof tradePlans.$inferInsert;
