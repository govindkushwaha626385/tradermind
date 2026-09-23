// ──────────────────────────────────────────────
// TradeMind — Cleanup Worker
//
// Periodic cleanup of stale data:
// - Deletes old sync logs (older than 90 days)
// - Deletes expired/incomplete broker connections
// - Removes stale raw_payload from old trade executions
// ──────────────────────────────────────────────

import { getDatabase, syncLogs, brokerConnections, tradeExecutions } from '@trademind/database';
import { lt, lte, and, eq, sql } from 'drizzle-orm';
import { createWorker } from '../lib/jobs';

export function cleanupWorker() {
  createWorker('cleanup', async (job) => {
    const db = getDatabase();
    const now = new Date();

    console.log('🧹 Running cleanup...');

    // 1. Delete sync logs older than 90 days
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const deletedLogs = await db
      .delete(syncLogs)
      .where(lt(syncLogs.createdAt, ninetyDaysAgo));

    console.log(`  ✓ Deleted ${deletedLogs.count ?? 0} old sync logs`);

    // 2. Clean up stale raw_payload from executions older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cleanedExecs = await db
      .update(tradeExecutions)
      .set({ rawPayload: null as any })
      .where(and(
        lt(tradeExecutions.createdAt, thirtyDaysAgo),
        sql`${tradeExecutions.rawPayload} IS NOT NULL`,
      ));

    console.log(`  ✓ Cleaned raw_payload from ${cleanedExecs.count ?? 0} old executions`);

    console.log('  ✓ Cleanup complete');
  });
}
