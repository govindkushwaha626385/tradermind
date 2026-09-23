// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Checklist Templates
//
// Users define reusable checklists for each setup type.
// Each template has a list of rules (items) that the
// trader checks off after every trade.
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { setupPlaybooks } from './playbooks';

export const checklistTemplates = pgTable(
  'checklist_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    /**
     * JSON array of rule objects:
     * [{ "id": "rule_1", "label": "Price above 20 EMA", "order": 1 }]
     */
    rules: jsonb('rules').notNull().default([]),
    /** Which setup / playbook this checklist is for (optional) */
    setupPlaybookId: uuid('setup_playbook_id').references(() => setupPlaybooks.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('ck_templates_user_id_idx').on(table.userId),
    playbookIdx: index('ck_templates_playbook_idx').on(table.setupPlaybookId),
  }),
);

export type ChecklistTemplateSelect = typeof checklistTemplates.$inferSelect;
export type ChecklistTemplateInsert = typeof checklistTemplates.$inferInsert;
