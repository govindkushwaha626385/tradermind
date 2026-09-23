// ──────────────────────────────────────────────
// TradeMind — Supabase Job Queue
//
// Persistent job queue using the `background_jobs`
// Supabase table as the queue store. Workers poll with
// FOR UPDATE SKIP LOCKED — the standard PostgreSQL pattern
// for safe concurrent job processing.
// ──────────────────────────────────────────────

import { getDatabase } from '@trademind/database';
import { backgroundJobs } from '@trademind/database';
import { eq, and, lte, sql } from 'drizzle-orm';
import type { BackgroundJobSelect } from '@trademind/database';

// ── Queue Names ─────────────────────────────────────────────────────────
export const QUEUES = {
  SYNC_TRADES: 'sync-trades',
  PROCESS_WEBHOOK: 'process-webhook',
  CLUSTER_TRADES: 'cluster-trades',
  ANALYZE_BEHAVIOR: 'analyze-behavior',
  GENERATE_REPORT: 'generate-report',
  CLEANUP: 'cleanup',
} as const;

// ── Job shape passed to workers ─────────────────────────────────────────
export interface Job<T = Record<string, unknown>> {
  id: string;
  name: string;
  data: T;
  attemptsMade: number;
}

// ── Enqueue ────────────────────────────────────────────────────────────

export interface EnqueueOptions {
  /** Delay in milliseconds before the job becomes eligible to run */
  delay?: number;
  /** Maximum retries before marking FAILED (default: 3) */
  maxAttempts?: number;
  /**
   * Cron-style job ID — if supplied, the enqueue is skipped when a
   * PENDING or RUNNING job with this jobId already exists.
   * Used to prevent duplicate scheduled jobs on server restart.
   */
  jobId?: string;
}

/**
 * Add a job to the queue.
 * Safe to call from any route or worker — uses a simple INSERT.
 */
export async function enqueueJob<T extends Record<string, unknown>>(
  queue: string,
  jobName: string,
  payload: T,
  options: EnqueueOptions = {},
): Promise<string> {
  const db = getDatabase();
  const runAt = options.delay
    ? new Date(Date.now() + options.delay)
    : new Date();

  // If a stable jobId is provided, deduplicate by checking for existing rows
  if (options.jobId) {
    const [existing] = await db
      .select({ id: backgroundJobs.id })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.queue, queue),
          eq(backgroundJobs.jobName, jobName),
          sql`${backgroundJobs.status} IN ('PENDING','RUNNING')`,
        ),
      )
      .limit(1);

    if (existing) {
      return existing.id;
    }
  }

  const [inserted] = await db
    .insert(backgroundJobs)
    .values({
      queue,
      jobName,
      payload: payload as any,
      maxAttempts: options.maxAttempts ?? 3,
      runAt,
    })
    .returning({ id: backgroundJobs.id });

  return inserted!.id;
}

// ── Schedule recurring jobs ──────────────────────────────────────────

interface RecurringSchedule {
  queue: string;
  jobName: string;
  payload: Record<string, unknown>;
  /** Cron expression — resolved to the next run time at schedule time */
  cronPattern: string;
  /** Human-readable ID used for deduplication */
  jobId: string;
  /** Interval in ms (derived from the cron; used for next-run calculation) */
  intervalMs: number;
}

const activeSchedules: NodeJS.Timeout[] = [];

/**
 * Schedule a recurring job by repeatedly enqueueing it.
 */
export function scheduleRecurring(schedule: RecurringSchedule): void {
  const interval = setInterval(async () => {
    try {
      await enqueueJob(schedule.queue, schedule.jobName, schedule.payload, {
        jobId: schedule.jobId,
        maxAttempts: 1,
      });
    } catch (err) {
      console.error(`[Jobs] Failed to schedule recurring job "${schedule.jobName}":`, err);
    }
  }, schedule.intervalMs);

  activeSchedules.push(interval);
}

// ── Worker ─────────────────────────────────────────────────────────────

export interface WorkerOptions {
  /** How often to poll for new jobs in milliseconds (default: 2000) */
  pollIntervalMs?: number;
  /** Max concurrent jobs to process (default: 5) */
  concurrency?: number;
}

/**
 * Create a polling worker for the given queue.
 * Uses `FOR UPDATE SKIP LOCKED` to safely handle multi-process environments.
 * The returned `stop()` function gracefully shuts down the worker.
 */
export function createWorker<T extends Record<string, unknown>>(
  queue: string,
  processor: (job: Job<T>) => Promise<void>,
  options: WorkerOptions = {},
): { stop: () => void } {
  const basePollIntervalMs = options.pollIntervalMs ?? 2000;
  const maxPollIntervalMs = 30_000;
  const concurrency = options.concurrency ?? 5;
  let running = 0;
  let stopped = false;
  let currentDelay = basePollIntervalMs;
  let timer: NodeJS.Timeout | null = null;

  async function processNext(): Promise<boolean> {
    if (stopped || running >= concurrency) return false;

    let db;
    try {
      db = getDatabase();
    } catch {
      return false;
    }

    // Atomically claim one PENDING job using FOR UPDATE SKIP LOCKED
    // (Drizzle doesn't have first-class SKIP LOCKED support, so we use raw SQL)
    const claimedRows = await db.execute(sql`
      UPDATE public.background_jobs
      SET status      = 'RUNNING',
          started_at  = NOW(),
          attempts    = attempts + 1,
          updated_at  = NOW()
      WHERE id = (
        SELECT id
        FROM public.background_jobs
        WHERE queue  = ${queue}
          AND status = 'PENDING'
          AND run_at <= NOW()
        ORDER BY run_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);

    const rows = (claimedRows as any).rows as BackgroundJobSelect[] | undefined;
    const row = rows?.[0];
    if (!row) return false;

    running++;

    const job: Job<T> = {
      id: row.id,
      name: row.jobName,
      data: (row.payload ?? {}) as T,
      attemptsMade: row.attempts,
    };

    try {
      await processor(job);

      await db
        .update(backgroundJobs)
        .set({ status: 'DONE', completedAt: new Date() })
        .where(eq(backgroundJobs.id, row.id));
    } catch (err: any) {
      const shouldRetry = row.attempts < row.maxAttempts;
      const nextStatus = shouldRetry ? 'PENDING' : 'FAILED';
      // Exponential back-off before next retry: 5s, 25s, 125s …
      const backoffMs = shouldRetry ? Math.min(5000 * Math.pow(5, row.attempts - 1), 120_000) : 0;

      await db
        .update(backgroundJobs)
        .set({
          status: nextStatus,
          completedAt: shouldRetry ? undefined : new Date(),
          error: err?.message ?? String(err),
          runAt: shouldRetry ? new Date(Date.now() + backoffMs) : row.runAt,
        })
        .where(eq(backgroundJobs.id, row.id));

      console.error(`[Jobs] ${queue}/"${row.jobName}" ${shouldRetry ? 'will retry' : 'FAILED'}:`, err?.message);
    } finally {
      running--;
    }

    return true;
  }

  function scheduleNextPoll(delayMs: number) {
    if (stopped) return;
    timer = setTimeout(async () => {
      let anyJobFound = false;
      try {
        const promises = [];
        for (let i = 0; i < concurrency; i++) {
          promises.push(processNext());
        }
        const results = await Promise.all(promises);
        anyJobFound = results.some(Boolean);
      } catch (err) {
        console.error(`[Jobs] Poll error on queue "${queue}":`, err);
      }

      if (stopped) return;

      if (anyJobFound) {
        currentDelay = basePollIntervalMs;
        scheduleNextPoll(100);
      } else {
        currentDelay = Math.min(Math.round(currentDelay * 1.5), maxPollIntervalMs);
        scheduleNextPoll(currentDelay);
      }
    }, delayMs);
  }

  scheduleNextPoll(basePollIntervalMs);

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

// ── Queue helper: getQueue ────────────────────────────────────────────

/**
 * Exposes an `add()` method to enqueue jobs onto a named queue.
 */
export function getQueue(name: string) {
  return {
    /**
     * Add a job to the named queue.
     * `repeat.pattern` is used only to log the cron schedule — the
     * actual recurring scheduling is done via scheduleReports() /
     * scheduleRecurring().
     */
    add: async (
      jobName: string,
      data: Record<string, unknown>,
      opts?: {
        repeat?: { pattern?: string };
        jobId?: string;
        removeOnComplete?: boolean;
        removeOnFail?: boolean;
        delay?: number;
      },
    ) => {
      return enqueueJob(name, jobName, data, {
        jobId: opts?.jobId ?? (opts?.repeat?.pattern ? `${name}:${jobName}:recurring` : undefined),
        maxAttempts: 1,
        delay: opts?.delay,
      });
    },
  };
}

// ── Note: Worker Architecture in Single Deployment ────────────────────
// In the single deployment (Vercel + Supabase) architecture, background
// processing is handled by Supabase Edge Functions + pg_cron, which invoke
// the secured internal worker routes at `/api/v1/internal/workers/[worker]`.
// `enqueueJob()` remains available for queuing jobs into `background_jobs`.
