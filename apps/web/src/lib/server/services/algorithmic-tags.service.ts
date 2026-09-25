// ──────────────────────────────────────────────
// TradeMind — Algorithmic Execution Tag Auto-Generator Service
//
// Automatically audits tick-level execution data and journal metrics
// to detect execution flaws & disciplined executions without manual entry:
// 1. Chasing Entry (Entry price >2x ATR from moving average / base)
// 2. Hesitation / Late Exit (Captured <30% of peak MFE excursion)
// 3. Revenge Sizing (Position size >1.5x 30-day baseline after a loss)
// 4. Optimal Trailing Exit (Captured >80% of peak favorable move)
// 5. Premature Cut (Exited for scratch <0.3R when MFE >2R)
// ──────────────────────────────────────────────

import {
  getDatabase,
  journalTrades,
  tradeExecutions,
  tradeExecutionLinks,
  tradePlans,
} from '@trademind/database';
import { eq, and, desc, sql, gte, lte, lt } from 'drizzle-orm';

export type AlgorithmicTagCategory = 'ENTRY_ERROR' | 'EXIT_ERROR' | 'SIZING_ERROR' | 'EXCELLENT_EXECUTION';
export type AlgorithmicTagSeverity = 'CRITICAL' | 'WARNING' | 'POSITIVE';

export interface AlgorithmicExecutionTag {
  id: 'CHASING_ENTRY' | 'HESITATION_LATE_EXIT' | 'REVENGE_SIZING' | 'OPTIMAL_TRAILING_EXIT' | 'PREMATURE_CUT';
  title: string;
  category: AlgorithmicTagCategory;
  severity: AlgorithmicTagSeverity;
  description: string;
  metric: string;
  recommendation: string;
  badgeColor: string;
}

export interface AlgorithmicExecutionAnalysis {
  tags: AlgorithmicExecutionTag[];
  metrics: {
    mfeCapturedPercent: number | null;
    baselineSizeRatio: number | null;
    isPrecededByLoss: boolean;
    entryExtensionRatio: number | null;
    rMultiple: number | null;
    holdingPeriodMinutes: number | null;
  };
}

/**
 * Detect algorithmic execution tags for a given trade.
 */
export async function detectAlgorithmicExecutionTags(
  tradeId: string,
  userId: string,
): Promise<AlgorithmicExecutionAnalysis> {
  const db = getDatabase();

  // 1. Fetch trade
  const [trade] = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.id, tradeId), eq(journalTrades.userId, userId)));

  if (!trade) {
    return {
      tags: [],
      metrics: {
        mfeCapturedPercent: null,
        baselineSizeRatio: null,
        isPrecededByLoss: false,
        entryExtensionRatio: null,
        rMultiple: null,
        holdingPeriodMinutes: null,
      },
    };
  }

  const tags: AlgorithmicExecutionTag[] = [];

  const entryPrice = Number(trade.avgEntryPrice || 0);
  const exitPrice = trade.avgExitPrice ? Number(trade.avgExitPrice) : null;
  const isLong = trade.direction === 'LONG' || trade.direction === 'BUY';
  const netPnl = Number(trade.netPnl || 0);
  const totalQty = Number(trade.totalQuantity || 1);
  const rMultiple = trade.rMultiple != null ? Number(trade.rMultiple) : null;
  const openedAt = new Date(trade.openedAt);

  // 2. Fetch linked trade plan if available
  const [plan] = await db
    .select()
    .from(tradePlans)
    .where(eq(tradePlans.journalTradeId, tradeId));

  // 3. Fetch linked executions
  const executionRows = await db
    .select({
      price: tradeExecutions.executionPrice,
      quantity: tradeExecutions.quantity,
      timestamp: tradeExecutions.executionTimestamp,
      side: tradeExecutions.transactionType,
    })
    .from(tradeExecutionLinks)
    .innerJoin(tradeExecutions, eq(tradeExecutionLinks.executionId, tradeExecutions.id))
    .where(eq(tradeExecutionLinks.journalTradeId, tradeId))
    .orderBy(tradeExecutions.executionTimestamp);

  // ── RULE 1: Revenge Sizing (>1.5x 30-day baseline after a loss) ────
  let baselineSizeRatio: number | null = null;
  let isPrecededByLoss = false;

  try {
    // Check previous trade before this trade's openedAt
    const [previousTrade] = await db
      .select({
        id: journalTrades.id,
        netPnl: journalTrades.netPnl,
        closedAt: journalTrades.closedAt,
      })
      .from(journalTrades)
      .where(
        and(
          eq(journalTrades.userId, userId),
          lt(journalTrades.openedAt, openedAt),
        ),
      )
      .orderBy(desc(journalTrades.openedAt))
      .limit(1);

    if (previousTrade && Number(previousTrade.netPnl || 0) < 0) {
      isPrecededByLoss = true;
    }

    // Calculate 30-day baseline prior to this trade
    const thirtyDaysPrior = new Date(openedAt.getTime() - 30 * 24 * 60 * 60 * 1000);
    const baselineTrades = await db
      .select({
        qty: journalTrades.totalQuantity,
        entryPrice: journalTrades.avgEntryPrice,
      })
      .from(journalTrades)
      .where(
        and(
          eq(journalTrades.userId, userId),
          gte(journalTrades.openedAt, thirtyDaysPrior),
          lt(journalTrades.openedAt, openedAt),
        ),
      );

    if (baselineTrades.length >= 3) {
      const avgQty =
        baselineTrades.reduce((sum, t) => sum + Number(t.qty || 0), 0) / baselineTrades.length;

      if (avgQty > 0) {
        baselineSizeRatio = totalQty / avgQty;

        if (isPrecededByLoss && baselineSizeRatio >= 1.5) {
          tags.push({
            id: 'REVENGE_SIZING',
            title: 'Revenge Sizing Detected',
            category: 'SIZING_ERROR',
            severity: 'CRITICAL',
            description: `Position size of ${totalQty} units is ${baselineSizeRatio.toFixed(1)}x your 30-day baseline (${Math.round(avgQty)} units) immediately following a losing trade.`,
            metric: `${baselineSizeRatio.toFixed(1)}x Baseline Size`,
            recommendation: 'Cap max risk to 1% per trade and reduce sizing by 50% after a red day to prevent tilt spirals.',
            badgeColor: '#ef4444',
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Algorithmic Tags] Sizing audit error:', err);
  }

  // ── RULE 2 & 4: MFE Excursion Capture (Hesitation / Late Exit vs Optimal Trailing) ────
  let mfeCapturedPercent: number | null = null;
  const mfe = trade.maxFavorableExcursion != null ? Number(trade.maxFavorableExcursion) : null;

  if (mfe !== null && entryPrice > 0 && exitPrice !== null) {
    let peakFavorableMove: number;
    let actualCapturedMove: number;

    if (isLong) {
      peakFavorableMove = mfe - entryPrice;
      actualCapturedMove = exitPrice - entryPrice;
    } else {
      peakFavorableMove = entryPrice - mfe;
      actualCapturedMove = entryPrice - exitPrice;
    }

    if (peakFavorableMove > 0) {
      const ratio = actualCapturedMove / peakFavorableMove;
      mfeCapturedPercent = Math.round(ratio * 100);

      // Condition: Hesitation / Late Exit (Captured <30% of MFE excursion when peak MFE was substantial)
      const peakExcursionPct = (peakFavorableMove / entryPrice) * 100;
      if (peakExcursionPct >= 1.0 && ratio < 0.30) {
        tags.push({
          id: 'HESITATION_LATE_EXIT',
          title: 'Hesitation / Late Exit',
          category: 'EXIT_ERROR',
          severity: 'CRITICAL',
          description: `Captured only ${Math.max(0, mfeCapturedPercent)}% of peak excursion (MFE was ${(mfe).toFixed(2)}). Gave back over 70% of peak open profit before closing.`,
          metric: `Captured ${Math.max(0, mfeCapturedPercent)}% of MFE`,
          recommendation: 'Trail stops behind structural swing highs/lows once price reaches +1.5R to lock in gains.',
          badgeColor: '#f97316',
        });
      }
      // Condition: Optimal Trailing Exit (Captured >=80% of peak MFE excursion)
      else if (ratio >= 0.80 && netPnl > 0) {
        tags.push({
          id: 'OPTIMAL_TRAILING_EXIT',
          title: 'Optimal Trailing Exit',
          category: 'EXCELLENT_EXECUTION',
          severity: 'POSITIVE',
          description: `Top-tier exit discipline: Captured ${mfeCapturedPercent}% of the trade's maximum favorable excursion (${(mfe).toFixed(2)}).`,
          metric: `Captured ${mfeCapturedPercent}% of MFE`,
          recommendation: 'Consistent execution. Keep executing this trailing stop framework on trend days.',
          badgeColor: '#10b981',
        });
      }
    }
  }

  // ── RULE 3: Chasing Entry (Entry price >2x ATR from base / planned price) ────
  let entryExtensionRatio: number | null = null;
  if (plan && plan.plannedEntryPrice) {
    const planned = Number(plan.plannedEntryPrice);
    if (planned > 0) {
      const extension = isLong
        ? (entryPrice - planned) / planned
        : (planned - entryPrice) / planned;

      entryExtensionRatio = extension;

      // If entered >1.8% past planned entry level (roughly >2x 5m ATR for large caps)
      if (extension >= 0.018) {
        tags.push({
          id: 'CHASING_ENTRY',
          title: 'Chasing Entry (>2x ATR)',
          category: 'ENTRY_ERROR',
          severity: 'WARNING',
          description: `Entry price (${entryPrice.toFixed(2)}) was chased ${(extension * 100).toFixed(1)}% past your planned setup price (${planned.toFixed(2)}). Degraded your initial risk-to-reward.`,
          metric: `+${(extension * 100).toFixed(1)}% Past Planned Entry`,
          recommendation: 'Use limit orders at predefined key breakout/pullback levels instead of aggressive market orders.',
          badgeColor: '#eab308',
        });
      }
    }
  } else if (executionRows.length >= 2) {
    // Inspect slippage across multi-fill entry executions
    const firstExec = executionRows[0];
    const lastEntryExec = executionRows[executionRows.length - 1];
    if (firstExec && lastEntryExec) {
      const p1 = Number(firstExec.price);
      const p2 = Number(lastEntryExec.price);
      if (p1 > 0) {
        const spread = isLong ? (p2 - p1) / p1 : (p1 - p2) / p1;
        if (spread >= 0.015) {
          entryExtensionRatio = spread;
          tags.push({
            id: 'CHASING_ENTRY',
            title: 'Chasing Entry (High Execution Slippage)',
            category: 'ENTRY_ERROR',
            severity: 'WARNING',
            description: `Averaged into entry as price expanded ${(spread * 100).toFixed(1)}% away from initial fill, violating low-risk entry criteria.`,
            metric: `+${(spread * 100).toFixed(1)}% Fill Slippage`,
            recommendation: 'Do not chase runaway candles. Wait for the retest of VWAP or dynamic moving average.',
            badgeColor: '#eab308',
          });
        }
      }
    }
  }

  // ── RULE 5: Premature Cut (Exited for scratch <0.3R when MFE was >2R) ────
  if (rMultiple !== null && rMultiple >= 0 && rMultiple <= 0.35 && mfe !== null && entryPrice > 0) {
    let peakR: number;
    const estRisk = Math.abs(entryPrice * 0.01); // 1% default proxy if no explicit stop
    if (isLong) {
      peakR = (mfe - entryPrice) / estRisk;
    } else {
      peakR = (entryPrice - mfe) / estRisk;
    }

    if (peakR >= 2.0) {
      tags.push({
        id: 'PREMATURE_CUT',
        title: 'Premature Exit (Left Money on Table)',
        category: 'EXIT_ERROR',
        severity: 'WARNING',
        description: `Cut winning trade early for ${rMultiple.toFixed(2)}R, but price subsequently expanded to over ${peakR.toFixed(1)}R favorable excursion.`,
        metric: `Exited at ${rMultiple.toFixed(2)}R vs ${peakR.toFixed(1)}R MFE`,
        recommendation: 'Take partial profits at 1.5R and let a runner ride with stop at breakeven instead of closing 100% early.',
        badgeColor: '#38bdf8',
      });
    }
  }

  return {
    tags,
    metrics: {
      mfeCapturedPercent,
      baselineSizeRatio,
      isPrecededByLoss,
      entryExtensionRatio,
      rMultiple,
      holdingPeriodMinutes: trade.holdingPeriodMinutes ?? null,
    },
  };
}
