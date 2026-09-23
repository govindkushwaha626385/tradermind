// ──────────────────────────────────────────────
// TradeMind — Monte Carlo Simulation Engine
//
// Performs 1,000 stochastic simulation runs on actual
// trader performance metrics to project equity distributions,
// probability of maximum drawdown, and risk of ruin.
// ──────────────────────────────────────────────

import { getDatabase, journalTrades, accountBalances } from '@trademind/database';
import { eq, and, desc } from 'drizzle-orm';
import type { MonteCarloSimulationResult } from '@trademind/shared';

interface SimulationOptions {
  tradeHorizon?: number; // default 100
  totalRuns?: number; // default 1000
  startingCapital?: number; // default 100000
  riskPerTradePercent?: number; // default 1.0 (1%)
}

export async function runMonteCarloSimulation(
  userId: string,
  options: SimulationOptions = {},
): Promise<MonteCarloSimulationResult> {
  const tradeHorizon = Math.max(10, Math.min(500, options.tradeHorizon ?? 100));
  const totalRuns = Math.max(100, Math.min(2000, options.totalRuns ?? 1000));
  let startingCapital = options.startingCapital ?? 100000;
  const riskPerTradePercent = Math.max(0.25, Math.min(10, options.riskPerTradePercent ?? 1.0));

  const db = getDatabase();

  // Try to use actual broker balance if available and no manual starting capital specified
  if (!options.startingCapital) {
    try {
      const [balanceRow] = await db
        .select({ balance: accountBalances.availableCash })
        .from(accountBalances)
        .where(eq(accountBalances.userId, userId))
        .orderBy(desc(accountBalances.updatedAt))
        .limit(1);

      if (balanceRow && Number(balanceRow.balance) > 0) {
        startingCapital = Math.round(Number(balanceRow.balance));
      }
    } catch {
      // fallback to default startingCapital
    }
  }

  // Fetch closed trades for this user
  const trades = await db
    .select({
      netPnl: journalTrades.netPnl,
      rMultiple: journalTrades.rMultiple,
      openedAt: journalTrades.openedAt,
    })
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, userId),
        eq(journalTrades.status, 'CLOSED'),
      ),
    )
    .orderBy(desc(journalTrades.openedAt))
    .limit(500);

  // Extract trade returns or build baseline if limited trades
  const validTrades = trades.filter((t) => typeof t.netPnl === 'number');
  const hasSufficientHistory = validTrades.length >= 5;

  let tradeReturns: number[] = [];
  let wins = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;

  if (hasSufficientHistory) {
    for (const t of validTrades) {
      const pnl = t.netPnl;
      if (pnl > 0) {
        wins++;
        totalWinAmount += pnl;
      } else if (pnl < 0) {
        totalLossAmount += Math.abs(pnl);
      }
      // Return as percentage of nominal capital (scaled by average trade size or R)
      tradeReturns.push(pnl);
    }
  } else {
    // Standard baseline template: 52% win rate, 1.6 R:R
    wins = 26;
    totalWinAmount = 26 * 1600;
    totalLossAmount = 24 * 1000;
    // Generate 50 representative synthetic trades for initial baseline preview
    tradeReturns = Array.from({ length: 50 }, (_, i) => (i % 2 === 0 ? 1600 : -1000));
  }

  const sampleCount = hasSufficientHistory ? validTrades.length : 50;
  const losses = sampleCount - wins;
  const winRate = wins / sampleCount;
  const avgWin = wins > 0 ? totalWinAmount / wins : 0;
  const avgLoss = losses > 0 ? totalLossAmount / losses : 0;
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 99 : 0;
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

  // ── Run 1,000 Stochastic Iterations ────────────────────────
  // Track equity curve matrix: [runIndex][stepIndex]
  const allEquityPaths: number[][] = Array.from({ length: totalRuns }, () =>
    new Array(tradeHorizon + 1).fill(startingCapital),
  );

  let runsHitRuin = 0; // Drawdown >= 50%
  let runsDrawdownGt10 = 0;
  let runsDrawdownGt20 = 0;
  let runsDrawdownGt30 = 0;
  let runsDrawdownGt40 = 0;

  const maxLosingStreaks: number[] = [];

  for (let r = 0; r < totalRuns; r++) {
    let equity = startingCapital;
    let peakEquity = startingCapital;
    let maxDrawdownInRun = 0;

    let currentLosingStreak = 0;
    let maxLosingStreakInRun = 0;

    for (let t = 1; t <= tradeHorizon; t++) {
      // Randomly sample with replacement from historical trade distribution
      const randomIdx = Math.floor(Math.random() * tradeReturns.length);
      const sampledPnl = tradeReturns[randomIdx] ?? 0;

      // Calculate trade return scaled by configured risk per trade
      // Risk amount per trade = current equity * riskPerTradePercent / 100
      const riskUnit = Math.max(100, (equity * riskPerTradePercent) / 100);
      const scaledPnl = avgLoss > 0 ? (sampledPnl / avgLoss) * riskUnit : sampledPnl;

      equity = Math.max(0, equity + scaledPnl);
      allEquityPaths[r]![t] = Math.round(equity);

      if (equity > peakEquity) {
        peakEquity = equity;
      }

      const currentDrawdown = peakEquity > 0 ? (peakEquity - equity) / peakEquity : 0;
      if (currentDrawdown > maxDrawdownInRun) {
        maxDrawdownInRun = currentDrawdown;
      }

      if (sampledPnl < 0) {
        currentLosingStreak++;
        if (currentLosingStreak > maxLosingStreakInRun) {
          maxLosingStreakInRun = currentLosingStreak;
        }
      } else {
        currentLosingStreak = 0;
      }
    }

    maxLosingStreaks.push(maxLosingStreakInRun);

    if (maxDrawdownInRun >= 0.5) runsHitRuin++;
    if (maxDrawdownInRun >= 0.1) runsDrawdownGt10++;
    if (maxDrawdownInRun >= 0.2) runsDrawdownGt20++;
    if (maxDrawdownInRun >= 0.3) runsDrawdownGt30++;
    if (maxDrawdownInRun >= 0.4) runsDrawdownGt40++;
  }

  // ── Compute Percentile Curves across all runs at each step ──
  const p5: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p95: number[] = [];

  for (let step = 0; step <= tradeHorizon; step++) {
    const valuesAtStep: number[] = [];
    for (let r = 0; r < totalRuns; r++) {
      valuesAtStep.push(allEquityPaths[r]![step]!);
    }
    valuesAtStep.sort((a, b) => a - b);

    p5.push(valuesAtStep[Math.floor(totalRuns * 0.05)] ?? startingCapital);
    p25.push(valuesAtStep[Math.floor(totalRuns * 0.25)] ?? startingCapital);
    p50.push(valuesAtStep[Math.floor(totalRuns * 0.50)] ?? startingCapital);
    p75.push(valuesAtStep[Math.floor(totalRuns * 0.75)] ?? startingCapital);
    p95.push(valuesAtStep[Math.floor(totalRuns * 0.95)] ?? startingCapital);
  }

  // Calculate median and 95th percentile of max consecutive losses
  maxLosingStreaks.sort((a, b) => a - b);
  const medianLossStreak = maxLosingStreaks[Math.floor(totalRuns * 0.5)] ?? 0;
  const worstCaseLossStreak = maxLosingStreaks[Math.floor(totalRuns * 0.95)] ?? 0;

  return {
    tradeHorizon,
    totalRuns,
    historicalTradesSampled: hasSufficientHistory ? validTrades.length : 0,
    startingCapital,
    riskPerTradePercent,
    baseline: {
      winRate: Math.round(winRate * 1000) / 1000,
      avgWin: Math.round(avgWin),
      avgLoss: Math.round(avgLoss),
      profitFactor: Math.round(profitFactor * 100) / 100,
      expectancy: Math.round(expectancy),
    },
    riskOfRuin: Math.round((runsHitRuin / totalRuns) * 1000) / 10,
    drawdownProbabilities: {
      gt10Percent: Math.round((runsDrawdownGt10 / totalRuns) * 1000) / 10,
      gt20Percent: Math.round((runsDrawdownGt20 / totalRuns) * 1000) / 10,
      gt30Percent: Math.round((runsDrawdownGt30 / totalRuns) * 1000) / 10,
      gt40Percent: Math.round((runsDrawdownGt40 / totalRuns) * 1000) / 10,
    },
    maxConsecutiveLosses: {
      median: medianLossStreak,
      worstCase95th: worstCaseLossStreak,
    },
    percentiles: {
      p5,
      p25,
      p50,
      p75,
      p95,
    },
  };
}
