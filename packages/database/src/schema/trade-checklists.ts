// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Trade Checklists
//
// Stores which checklist rules were followed (✓) or
// violated (✗) for each journal trade.
// A trader completes this after closing a trade.
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { journalTrades } from './journal-trades';
import { checklistTemplates } from './checklist-templates';

export const tradeChecklists = pgTable(
  'trade_checklists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    journalTradeId: uuid('journal_trade_id')
      .notNull()
      .references(() => journalTrades.id, { onDelete: 'cascade' }),
    checklistTemplateId: uuid('checklist_template_id')
      .notNull()
      .references(() => checklistTemplates.id, { onDelete: 'cascade' }),
    /**
     * JSON array of rule results:
     * [{ "ruleId": "rule_1", "label": "Price above 20 EMA", "passed": true }]
     */
    results: jsonb('results').notNull().default([]),
    /** Score: 0-1 (passed / total rules) */
    complianceScore: doublePrecision('compliance_score'),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('tc_user_id_idx').on(table.userId),
    tradeIdx: index('tc_trade_id_idx').on(table.journalTradeId),
    userTradeUnique: uniqueIndex('tc_user_trade_unique').on(table.userId, table.journalTradeId),
  }),
);

export type TradeChecklistSelect = typeof tradeChecklists.$inferSelect;
export type TradeChecklistInsert = typeof tradeChecklists.$inferInsert;
