// ──────────────────────────────────────────────
// TradeMind — Advanced Analytics Service
//
// Computes metrics beyond the basic dashboard:
// - Sharpe Ratio (risk-adjusted return)
// - Consecutive Win/Loss Streaks
// - Session Time Analysis
// - Exit Analysis (Best/Worst Exit)
// - Strategy Performance Comparison
// ──────────────────────────────────────────────

import { getDatabase, journalTrades } from '@trademind/database';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

/**
 * Calculate the Sharpe Ratio for a set of trades.
 *
 * Sharpe = (Mean Return - Risk-Free Rate) / Std Dev of Returns
 * Uses daily P&L values for the calculation.
 */
export function calculateSharpeRatio(
  dailyReturns: number[],
  riskFreeRate = 0.05, // 5% annual risk-free rate
): number {
  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, ret) => sum + (ret - mean) ** 2, 0) /
    (dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Daily Sharpe ratio, annualized by multiplying by sqrt(252)
  const dailySharpe = (mean - riskFreeRate / 252) / stdDev;
  return Math.round(dailySharpe * Math.sqrt(252) * 100) / 100;
}

/**
 * Calculate the Sortino Ratio (like Sharpe but uses only downside deviation).
 * Sortino = (Mean Return - Risk-Free Rate) / Downside Deviation
 */
export function calculateSortinoRatio(
  dailyReturns: number[],
  riskFreeRate = 0.05, // 5% annual risk-free rate
): number {
  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const dailyTarget = riskFreeRate / 252;

  // Only count negative deviations from the risk-free rate
  const downsideReturns = dailyReturns.filter((r) => r < dailyTarget);
  if (downsideReturns.length === 0) return mean > 0 ? 99.99 : 0; // no downside = near-perfect

  const downsideVariance =
    downsideReturns.reduce((sum, r) => sum + (r - dailyTarget) ** 2, 0) / dailyReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);

  if (downsideDeviation === 0) return 0;

  const sortino = ((mean - dailyTarget) / downsideDeviation) * Math.sqrt(252);
  return Math.round(sortino * 100) / 100;
}

/**
 * Calculate the Maximum Drawdown from an ordered list of cumulative P&L values.
 * Returns the maximum peak-to-trough decline as an absolute value.
 */
export function calculateMaxDrawdown(netPnlArray: number[]): {
  maxDrawdown: number;
  maxDrawdownPct: number;
  peakPnl: number;
} {
  if (netPnlArray.length === 0) return { maxDrawdown: 0, maxDrawdownPct: 0, peakPnl: 0 };

  let cumPnl = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let peakPnl = 0;

  for (const pnl of netPnlArray) {
    cumPnl += pnl;
    if (cumPnl > peak) {
      peak = cumPnl;
      peakPnl = peak;
    }
    const drawdown = peak - cumPnl;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const maxDrawdownPct = peakPnl > 0 ? Math.round((maxDrawdown / peakPnl) * 10000) / 100 : 0;
  return {
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownPct,
    peakPnl: Math.round(peakPnl * 100) / 100,
  };
}

/**
 * Compute per-bucket R-Multiple distribution for a histogram.
 * Buckets: ≤-2R, -2 to -1R, -1 to 0R, 0 to 1R, 1 to 2R, ≥2R
 */
export function calculateRMultipleDistribution(rMultiples: number[]): Array<{
  bucket: string;
  count: number;
  pct: number;
}> {
  const buckets = [
    { label: '≤ -2R', min: -Infinity, max: -2 },
    { label: '-2R to -1R', min: -2, max: -1 },
    { label: '-1R to 0R', min: -1, max: 0 },
    { label: '0R to 1R', min: 0, max: 1 },
    { label: '1R to 2R', min: 1, max: 2 },
    { label: '≥ 2R', min: 2, max: Infinity },
  ];

  const total = rMultiples.length || 1;

  return buckets.map(({ label, min, max }) => {
    const count = rMultiples.filter((r) => r > min && r <= max).length;
    return { bucket: label, count, pct: Math.round((count / total) * 10000) / 100 };
  });
}

/**
 * Calculate average holding time separately for winning and losing trades (in minutes).
 */
export function calculateHoldingTimeStats(
  trades: { holdingPeriodMinutes: number | null | undefined; netPnl: number }[],
): {
  avgWinHoldMin: number;
  avgLossHoldMin: number;
  avgHoldMin: number;
} {
  const withHold = trades.filter((t) => t.holdingPeriodMinutes != null);
  const wins = withHold.filter((t) => t.netPnl > 0);
  const losses = withHold.filter((t) => t.netPnl <= 0);

  const avg = (arr: typeof withHold) =>
    arr.length > 0
      ? Math.round(arr.reduce((s, t) => s + (t.holdingPeriodMinutes ?? 0), 0) / arr.length)
      : 0;

  return {
    avgWinHoldMin: avg(wins),
    avgLossHoldMin: avg(losses),
    avgHoldMin: avg(withHold),
  };
}

/**
 * Find the current and longest consecutive win/loss streaks.
 */
export function calculateStreaks(trades: { netPnl: number }[]): {
  currentWinStreak: number;
  currentLossStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
} {
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;

  for (const trade of trades) {
    if (trade.netPnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    }
  }

  return { currentWinStreak, currentLossStreak, longestWinStreak, longestLossStreak };
}

/**
 * Analyze performance by session time of day.
 * Divides the trading day into segments and computes stats for each.
 */
export async function analyzeBySession(
  userId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const db = getDatabase();
  const conditions = [eq(journalTrades.userId, userId)];

  if (startDate) conditions.push(gte(journalTrades.openedAt, startDate));
  if (endDate) conditions.push(lte(journalTrades.openedAt, endDate));

  const trades = await db
    .select()
    .from(journalTrades)
    .where(and(...conditions));

  // Define Indian market sessions
  const sessions: Record<
    string,
    { label: string; trades: typeof trades }
  > = {
    pre_open: { label: 'Pre-Open (9:00-9:15)', trades: [] },
    morning: { label: 'Morning (9:15-12:00)', trades: [] },
    afternoon: { label: 'Afternoon (12:00-15:00)', trades: [] },
    closing: { label: 'Closing (15:00-15:30)', trades: [] },
    post_market: { label: 'Post-Market (15:30+)', trades: [] },
  };

  for (const trade of trades) {
    const hour = new Date(trade.openedAt).getHours();
    const minute = new Date(trade.openedAt).getMinutes();
    const timeInMinutes = hour * 60 + minute;

    if (timeInMinutes < 9 * 60 + 15) {
      sessions['pre_open']!.trades.push(trade);
    } else if (timeInMinutes < 12 * 60) {
      sessions['morning']!.trades.push(trade);
    } else if (timeInMinutes < 15 * 60) {
      sessions['afternoon']!.trades.push(trade);
    } else if (timeInMinutes < 15 * 60 + 30) {
      sessions['closing']!.trades.push(trade);
    } else {
      sessions['post_market']!.trades.push(trade);
    }
  }

  return Object.entries(sessions).map(([key, session]) => {
    const closedTrades = session.trades.filter((t) => t.status === 'CLOSED');
    const wins = closedTrades.filter((t) => t.netPnl > 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + t.netPnl, 0);

    return {
      session: key,
      label: session.label,
      totalTrades: session.trades.length,
      closedTrades: closedTrades.length,
      wins: wins.length,
      losses: closedTrades.length - wins.length,
      winRate: closedTrades.length > 0 ? wins.length / closedTrades.length : 0,
      totalPnl: Math.round(totalPnl * 100) / 100,
      avgPnl: closedTrades.length > 0
        ? Math.round((totalPnl / closedTrades.length) * 100) / 100
        : 0,
    };
  });
}

/**
 * Analyze performance by weekday.
 */
export async function analyzeByWeekday(userId: string) {
  const db = getDatabase();
  const trades = await db
    .select()
    .from(journalTrades)
    .where(eq(journalTrades.userId, userId));

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const byDay: Record<string, typeof trades> = {};

  for (const trade of trades) {
    const day = dayNames[new Date(trade.openedAt).getDay()]!;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(trade);
  }

  return dayNames
    .filter((d) => byDay[d] && byDay[d]!.length > 0)
    .map((day) => {
      const dayTrades = byDay[day]!;
      const closed = dayTrades.filter((t) => t.status === 'CLOSED');
      const wins = closed.filter((t) => t.netPnl > 0);
      const totalPnl = closed.reduce((sum, t) => sum + t.netPnl, 0);

      return {
        day,
        totalTrades: dayTrades.length,
        closedTrades: closed.length,
        wins: wins.length,
        losses: closed.length - wins.length,
        winRate: closed.length > 0 ? wins.length / closed.length : 0,
        totalPnl: Math.round(totalPnl * 100) / 100,
      };
    });
}

/**
 * Compare performance across different setup playbooks.
 */
export async function analyzeByPlaybook(userId: string) {
  const db = getDatabase();
  const trades = await db
    .select()
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, userId),
        // Only trades linked to a playbook
      ),
    );

  const byPlaybook = new Map<string, typeof trades>();

  for (const trade of trades) {
    if (!trade.setupPlaybookId) continue;
    const existing = byPlaybook.get(trade.setupPlaybookId) ?? [];
    existing.push(trade);
    byPlaybook.set(trade.setupPlaybookId, existing);
  }

  const results = [];
  for (const [playbookId, playbookTrades] of byPlaybook.entries()) {
    const closed = playbookTrades.filter((t) => t.status === 'CLOSED');
    const wins = closed.filter((t) => t.netPnl > 0);
    const totalPnl = closed.reduce((sum, t) => sum + t.netPnl, 0);

    results.push({
      playbookId,
      totalTrades: playbookTrades.length,
      closedTrades: closed.length,
      wins: wins.length,
      losses: closed.length - wins.length,
      winRate: closed.length > 0 ? wins.length / closed.length : 0,
      totalPnl: Math.round(totalPnl * 100) / 100,
      avgPnl: closed.length > 0
        ? Math.round((totalPnl / closed.length) * 100) / 100
        : 0,
    });
  }

  return results.sort((a, b) => b.totalPnl - a.totalPnl);
}
