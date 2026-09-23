// ──────────────────────────────────────────────
// TradeMind — Drizzle ORM Schema: Background Jobs
// PostgreSQL-backed persistent job queue table.
// Workers use FOR UPDATE SKIP LOCKED to atomically
// claim jobs — safe for concurrent multi-process execution.
// ──────────────────────────────────────────────

import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const backgroundJobs = pgTable(
  'background_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Target queue name (e.g. 'sync-trades', 'cleanup')
    queue: text('queue').notNull(),
    // Human-readable job name (e.g. 'initial-sync', 'daily-report')
    jobName: text('job_name').notNull(),
    // Arbitrary job data payload
    payload: jsonb('payload').notNull().default({}),

    // Lifecycle status
    status: text('status').notNull().default('PENDING'),
    // PENDING   — waiting to be picked up
    // RUNNING   — claimed by a worker process
    // DONE      — completed successfully
    // FAILED    — exhausted all retry attempts
    // RETRYING  — waiting for next retry attempt

    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),

    // When the job should run (supports scheduled/delayed jobs)
    runAt: timestamp('run_at', { withTimezone: true }).defaultNow().notNull(),

    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    // Last error message on failure
    error: text('error'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Primary index for workers polling pending jobs
    queueStatusRunAtIdx: index('bg_jobs_queue_status_run_at_idx').on(
      table.queue,
      table.status,
      table.runAt,
    ),
    // Partial index for fastest PENDING lookups
    pendingIdx: index('bg_jobs_pending_idx').on(table.status, table.runAt),
  }),
);

export type BackgroundJobSelect = typeof backgroundJobs.$inferSelect;
export type BackgroundJobInsert = typeof backgroundJobs.$inferInsert;
