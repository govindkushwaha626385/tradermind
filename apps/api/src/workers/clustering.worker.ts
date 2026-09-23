// ──────────────────────────────────────────────
// TradeMind — Clustering Worker
// Re-clusters raw executions into journal trades
// Triggered after webhook processing or manual sync
// Preserves qualitative data (emotions, notes, ratings, etc.) across re-clusters
// ──────────────────────────────────────────────

import { createWorker } from '../lib/jobs';
import {
  getDatabase,
  tradeExecutions,
  journalTrades,
  tradeExecutionLinks,
  tradeChecklists,
  tradePlans,
  tradeRatings,
} from '@trademind/database';
import { eq, and, inArray } from 'drizzle-orm';
import { clusterExecutions } from '../services/clustering.service';
import type { TradeExecution } from '@trademind/shared';

export function clusteringWorker() {
  createWorker<{ connectionId: string; userId: string; symbol?: string }>('cluster-trades', async (job) => {
    const { connectionId, userId, symbol } = job.data;
    const db = getDatabase();

    console.log(`🔄 Clustering trades for: ${symbol ?? 'all symbols'}`);

    const execConditions = [eq(tradeExecutions.brokerConnectionId, connectionId)];
    if (symbol) {
      execConditions.push(eq(tradeExecutions.tradingsymbol, symbol));
    }

    const executions = await db
      .select()
      .from(tradeExecutions)
      .where(and(...execConditions))
      .orderBy(tradeExecutions.executionTimestamp);

    if (executions.length === 0) {
      console.log('  ↳ No executions to cluster');
      return;
    }

    // Map Drizzle rows to the domain TradeExecution type
    const domainExecutions = executions.map((exec) => ({
      ...exec,
      exchangeOrderId: exec.exchangeOrderId ?? undefined,
      rawPayload: exec.rawPayload as Record<string, unknown> | undefined,
    })) as unknown as TradeExecution[];

    const result = clusterExecutions(domainExecutions);

    // ── Preserve qualitative data before re-clustering ──
    // Fetch existing journal trades + their execution links so we can
    // re-apply emotions, notes, ratings, checklists, plans after rebuild
    const tradeConditions = [eq(journalTrades.brokerConnectionId, connectionId)];
    if (symbol) {
      tradeConditions.push(eq(journalTrades.tradingsymbol, symbol));
    }

    const existingTrades = await db
      .select({
        id: journalTrades.id,
        emotions: journalTrades.emotions,
        mistakeTags: journalTrades.mistakeTags,
        traderNotes: journalTrades.traderNotes,
        screenshotUrls: journalTrades.screenshotUrls,
        setupPlaybookId: journalTrades.setupPlaybookId,
        ruleComplianceScore: journalTrades.ruleComplianceScore,
      })
      .from(journalTrades)
      .where(and(...tradeConditions));

    // Build map: executionId → set of qualitative data from linked journal trades
    const execToQualitative = new Map<string, Partial<typeof journalTrades.$inferInsert>>();
    if (existingTrades.length > 0) {
      const existingTradeIds = existingTrades.map((t) => t.id);
      const oldLinks = await db
        .select({
          executionId: tradeExecutionLinks.executionId,
          journalTradeId: tradeExecutionLinks.journalTradeId,
        })
        .from(tradeExecutionLinks)
        .where(inArray(tradeExecutionLinks.journalTradeId, existingTradeIds));

      const qualByTradeId = new Map(existingTrades.map((t) => [t.id, t]));
      for (const link of oldLinks) {
        const qual = qualByTradeId.get(link.journalTradeId);
        if (qual) {
          execToQualitative.set(link.executionId, qual);
        }
      }
    }

    // Delete old execution links + journal trades
    if (existingTrades.length > 0) {
      const existingTradeIds = existingTrades.map((t) => t.id);
      await db.delete(tradeExecutionLinks).where(inArray(tradeExecutionLinks.journalTradeId, existingTradeIds));
      await db.delete(journalTrades).where(inArray(journalTrades.id, existingTradeIds));
    }

    // Insert new journal trades (with qualitative data restored where possible)
    for (const trade of result.trades) {
      // Check if any linked execution has preserved qualitative data
      const matchingLinks = result.links.filter((l) => l.journalTradeId === trade.id);
      let restoredQual: Partial<typeof journalTrades.$inferInsert> | undefined;
      for (const link of matchingLinks) {
        const qual = execToQualitative.get(link.executionId);
        if (qual) {
          restoredQual = qual;
          break;
        }
      }

      await db.insert(journalTrades).values({
        ...trade,
        ...(restoredQual ?? {}),
      });
    }

    // Insert execution links
    for (const link of result.links) {
      await db.insert(tradeExecutionLinks).values(link);
    }

    console.log(`  ✓ Clustered ${result.trades.length} trades from ${executions.length} executions`);
  });
}
