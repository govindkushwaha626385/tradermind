// ──────────────────────────────────────────────
// TradeMind — Behavioral Analytics Engine
// Cross-references emotion tags with trading performance
// to produce dollar-impact insights
// ──────────────────────────────────────────────

import { getDatabase, journalTrades } from '@trademind/database';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { Emotion, BehavioralInsight } from '@trademind/shared';

const EMOTIONS: Emotion[] = [
  'FOMO', 'REVENGE', 'ANXIOUS', 'CONFIDENT',
  'DISCIPLINED', 'GREEDY', 'HESITANT', 'FEAR',
];

/**
 * Analyze behavioral patterns by emotion
 * Returns dollar-impact insights for each emotion tag
 */
export async function analyzeBehavioralPatterns(
  userId: string,
  startDate?: Date,
): Promise<BehavioralInsight[]> {
  const db = getDatabase();
  const insights: BehavioralInsight[] = [];

  const conditions = [eq(journalTrades.userId, userId)];

  if (startDate) {
    conditions.push(gte(journalTrades.openedAt, startDate));
  }

  // Only analyze trades that have emotion tags
  conditions.push(sql`${journalTrades.emotions} IS NOT NULL`);

  // Fetch trades with emotion tags — limited to recent 1000 for performance
  const trades = await db
    .select()
    .from(journalTrades)
    .where(and(...conditions))
    .orderBy(journalTrades.closedAt)
    .limit(1000);

  // Group trades by emotion
  const emotionGroups = new Map<Emotion, typeof trades>();

  for (const trade of trades) {
    const tradeEmotions = trade.emotions as Emotion[] | null;
    if (!tradeEmotions || tradeEmotions.length === 0) continue;

    for (const emotion of tradeEmotions) {
      const group = emotionGroups.get(emotion) ?? [];
      group.push(trade);
      emotionGroups.set(emotion, group);
    }
  }

  // Calculate baseline metrics (trades without emotions)
  const baselineTrades = trades.filter((t) => !t.emotions || t.emotions.length === 0);
  const baselineWinRate = calculateWinRate(baselineTrades);
  const baselineAvgSize = calculateAvgSize(baselineTrades);
  const baselineAvgRR = calculateAvgRR(baselineTrades);

  // Analyze each emotion group
  for (const emotion of EMOTIONS) {
    const group = emotionGroups.get(emotion);
    if (!group || group.length < 3) continue; // Minimum sample size

    const winRate = calculateWinRate(group);
    const avgSize = calculateAvgSize(group);
    const avgRR = calculateAvgRR(group);
    const totalPnl = group.reduce((sum, t) => sum + t.netPnl, 0);

    const severity = determineSeverity(winRate, baselineWinRate, avgSize, baselineAvgSize);
    const recommendation = generateRecommendation(emotion, winRate, baselineWinRate, avgSize, baselineAvgSize, totalPnl);

    insights.push({
      id: `insight-${emotion.toLowerCase()}`,
      emotion,
      sampleSize: group.length,
      avgPositionSizeMultiplier: baselineAvgSize > 0 ? avgSize / baselineAvgSize : 1,
      avgWinRate: winRate,
      avgRRatio: avgRR,
      totalPnlImpact: totalPnl,
      recommendation,
      severity,
    });
  }

  // Sort by severity (critical first)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}

/**
 * Generate dashboard statistics
 */
export async function generateDashboardStats(
  userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<any> {
  const db = getDatabase();

  const conditions = [eq(journalTrades.userId, userId)];
  if (startDate) conditions.push(gte(journalTrades.openedAt, startDate));
  if (endDate) conditions.push(lte(journalTrades.openedAt, endDate));

  // Aggregate stats via SQL — fast, no client-side processing
  const [aggregate] = await db
    .select({
      totalTrades: sql<number>`COUNT(*)`,
      closedTrades: sql<number>`COUNT(*) FILTER (WHERE status = 'CLOSED')`,
      openTrades: sql<number>`COUNT(*) FILTER (WHERE status = 'OPEN')`,
      wins: sql<number>`COUNT(*) FILTER (WHERE status = 'CLOSED' AND net_pnl > 0)`,
      losses: sql<number>`COUNT(*) FILTER (WHERE status = 'CLOSED' AND net_pnl < 0)`,
      totalNetPnl: sql<number>`COALESCE(SUM(net_pnl) FILTER (WHERE status = 'CLOSED'), 0)`,
      totalGrossPnl: sql<number>`COALESCE(SUM(gross_pnl) FILTER (WHERE status = 'CLOSED'), 0)`,
      totalFees: sql<number>`COALESCE(SUM(total_fees_and_taxes) FILTER (WHERE status = 'CLOSED'), 0)`,
      grossWins: sql<number>`COALESCE(SUM(net_pnl) FILTER (WHERE status = 'CLOSED' AND net_pnl > 0), 0)`,
      grossLosses: sql<number>`ABS(COALESCE(SUM(net_pnl) FILTER (WHERE status = 'CLOSED' AND net_pnl < 0), 0))`,
      bestTrade: sql<number>`COALESCE(MAX(net_pnl) FILTER (WHERE status = 'CLOSED'), 0)`,
      worstTrade: sql<number>`COALESCE(MIN(net_pnl) FILTER (WHERE status = 'CLOSED'), 0)`,
      avgRR: sql<number>`COALESCE(AVG(r_multiple) FILTER (WHERE status = 'CLOSED' AND r_multiple IS NOT NULL), 0)`,
    })
    .from(journalTrades)
    .where(and(...conditions));

  // PnL by day — SQL GROUP BY
  const pnlByDay = await db
    .select({
      date: sql<string>`DATE(closed_at)`,
      pnl: sql<number>`COALESCE(SUM(net_pnl), 0)`,
    })
    .from(journalTrades)
    .where(and(...conditions, eq(journalTrades.status, 'CLOSED'), sql`${journalTrades.closedAt} IS NOT NULL`))
    .groupBy(sql`DATE(closed_at)`)
    .orderBy(sql`DATE(closed_at)`);

  // Emotion breakdown — SQL json_agg and count
  const emotionRows = await db
    .select({
      emotion: sql<string>`UNNEST(emotions)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(journalTrades)
    .where(and(...conditions, sql`${journalTrades.emotions} IS NOT NULL`))
    .groupBy(sql`UNNEST(emotions)`);

  const emotionsBreakdown: Record<string, number> = {};
  for (const row of emotionRows) {
    emotionsBreakdown[row.emotion] = row.count;
  }

  const closedCount = Number(aggregate?.closedTrades ?? 0);
  const wins = Number(aggregate?.wins ?? 0);
  const grossWins = Number(aggregate?.grossWins ?? 0);
  const grossLosses = Number(aggregate?.grossLosses ?? 0);

  let cumPnl = 0;
  const equityCurve = pnlByDay.map((d) => {
    const pnl = Number(d.pnl);
    cumPnl += pnl;
    return {
      date: d.date,
      pnl,
      cumulativePnl: Math.round(cumPnl * 100) / 100,
    };
  });

  return {
    totalTrades: Number(aggregate?.totalTrades ?? 0),
    closedTrades: closedCount,
    openTrades: Number(aggregate?.openTrades ?? 0),
    winRate: closedCount > 0 ? wins / closedCount : 0,
    profitFactor: grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0,
    totalNetPnl: Number(aggregate?.totalNetPnl ?? 0),
    totalGrossPnl: Number(aggregate?.totalGrossPnl ?? 0),
    totalFees: Number(aggregate?.totalFees ?? 0),
    totalWins: wins,
    totalLosses: Number(aggregate?.losses ?? 0),
    avgWin: wins > 0 ? grossWins / wins : 0,
    avgLoss: Number(aggregate?.losses ?? 0) > 0 ? grossLosses / Number(aggregate?.losses ?? 0) : 0,
    bestTrade: Number(aggregate?.bestTrade ?? 0),
    worstTrade: Number(aggregate?.worstTrade ?? 0),
    avgRRatio: Number(aggregate?.avgRR ?? 0),
    emotionsBreakdown,
    pnlByDay: pnlByDay.map((d) => ({ date: d.date, pnl: Number(d.pnl) })),
    equityCurve,
  };
}

// ── Private Helpers ──────────────────────

function calculateWinRate(trades: any[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.netPnl > 0).length;
  return wins / trades.length;
}

function calculateAvgSize(trades: any[]): number {
  if (trades.length === 0) return 0;
  return trades.reduce((sum, t) => sum + Math.abs(t.totalQuantity * t.avgEntryPrice), 0) / trades.length;
}

function calculateAvgRR(trades: any[]): number {
  const withRR = trades.filter((t) => t.rMultiple != null);
  if (withRR.length === 0) return 0;
  return withRR.reduce((sum, t) => sum + (t.rMultiple ?? 0), 0) / withRR.length;
}

function determineSeverity(
  winRate: number,
  baselineWinRate: number,
  avgSize: number,
  baselineAvgSize: number,
): 'low' | 'medium' | 'high' | 'critical' {
  const winRateDrop = baselineWinRate - winRate;
  const sizeMultiplier = avgSize / (baselineAvgSize || 1);

  if (winRateDrop > 0.3 && sizeMultiplier > 2) return 'critical';
  if (winRateDrop > 0.15 && sizeMultiplier > 1.5) return 'high';
  if (winRateDrop > 0.05 || sizeMultiplier > 1.2) return 'medium';
  return 'low';
}

function generateRecommendation(
  emotion: Emotion,
  winRate: number,
  baselineWinRate: number,
  avgSize: number,
  baselineAvgSize: number,
  totalPnl: number,
): string {
  const sizeMultiplier = baselineAvgSize > 0 ? avgSize / baselineAvgSize : 1;
  const winRateDiff = ((winRate - baselineWinRate) * 100).toFixed(1);

  const recs: Record<string, string> = {
    FOMO: `When you tag trades with FOMO, your win rate drops ${Math.abs(parseFloat(winRateDiff))}% and position size increases ${(sizeMultiplier * 100 - 100).toFixed(0)}%. Consider a mandatory 15-minute cool-down before entering any trade.`,
    REVENGE: `Revenge trades show a ${(sizeMultiplier * 100 - 100).toFixed(0)}% larger position size with a ${Math.abs(parseFloat(winRateDiff))}% lower win rate. Implement a loss limit — after 2 consecutive stop-outs, stop trading for the day.`,
    GREEDY: `Greed-tagged trades have ${(sizeMultiplier * 100 - 100).toFixed(0)}% larger sizing. Consider trailing stop-losses to lock in profits without emotional interference.`,
    FEAR: `Fear-based early exits are costing you. Set predefined profit targets before entry and use limit orders to automate exits.`,
    ANXIOUS: `Anxiety correlates with premature exits. Reduce position size by 50% until you can hold to your profit targets consistently.`,
    CONFIDENT: `Your confidence trades outperform by ${winRateDiff}%. Review what's different about these setups and codify them into a playbook.`,
    DISCIPLINED: `Disciplined trades show a ${winRateDiff}% higher win rate. This is your ideal trading state — identify what puts you in this mindset.`,
    HESITANT: `Hesitation leads to missed entries and poor fills. Use limit orders at predefined levels to remove decision fatigue.`,
  };

  return recs[emotion] ?? `Your ${emotion.toLowerCase()} trades show a ${winRateDiff}% win rate difference with ${(sizeMultiplier * 100 - 100).toFixed(0)}% size variance from baseline.`;
}
