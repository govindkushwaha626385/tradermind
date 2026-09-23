// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Setup Playbooks
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const setupPlaybooks = pgTable(
  'setup_playbooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 2000 }),
    entryCriteria: varchar('entry_criteria', { length: 4000 }),
    exitCriteria: varchar('exit_criteria', { length: 4000 }),
    riskRules: jsonb('risk_rules'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('playbooks_user_id_idx').on(table.userId),
  }),
);

export type SetupPlaybookSelect = typeof setupPlaybooks.$inferSelect;
export type SetupPlaybookInsert = typeof setupPlaybooks.$inferInsert;
