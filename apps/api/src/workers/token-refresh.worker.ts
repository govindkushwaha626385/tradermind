// ──────────────────────────────────────────────
// TradeMind — Token Refresh Worker
//
// Polls every 15 minutes and refreshes broker OAuth
// tokens that are about to expire. Uses the
// background_jobs table for scheduling so it
// survives API restarts cleanly.
// ──────────────────────────────────────────────

import { createWorker, scheduleRecurring, QUEUES } from '../lib/jobs';
import { refreshExpiringTokens } from '../services/token-refresh.service';

const TOKEN_REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function tokenRefreshWorker() {
  // Worker that processes token-refresh jobs from the queue
  createWorker<Record<string, unknown>>(
    'token-refresh',
    async (_job) => {
      await refreshExpiringTokens();
    },
    { pollIntervalMs: 5000, concurrency: 1 },
  );

  // Schedule a recurring job every 15 minutes
  scheduleRecurring({
    queue: 'token-refresh',
    jobName: 'refresh-expiring-tokens',
    payload: {},
    cronPattern: '*/15 * * * *',
    jobId: 'token-refresh:refresh-expiring-tokens:recurring',
    intervalMs: TOKEN_REFRESH_INTERVAL_MS,
  });

  console.log('🔑 Token refresh worker started (every 15 min)');
}
