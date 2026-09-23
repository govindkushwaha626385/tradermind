// ──────────────────────────────────────────────
// TradeMind — Analytics & Insights Routes
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getDatabase, journalTrades, dailyPremarketPlans } from '@trademind/database';
import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { cacheGetOrSet } from '../lib/cache';
import {
  analyzeBehavioralPatterns,
  generateDashboardStats,
} from '../services/analytics.service';
import { runMonteCarloSimulation } from '../services/monte-carlo.service';
import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateStreaks,
  calculateMaxDrawdown,
  calculateRMultipleDistribution,
  calculateHoldingTimeStats,
  analyzeBySession,
  analyzeByWeekday,
} from '../services/analytics/advanced-analytics.service';
import { calculateMfeMaeForAllTrades } from '../services/analytics/mfe-mae.service';

export const analyticsRouter = new Hono();
analyticsRouter.use('*', authMiddleware);

/**
 * GET /analytics/dashboard — Main dashboard stats
 */
analyticsRouter.get('/dashboard', async (c) => {
  const user = c.get('user');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const cacheKey = `analytics:dashboard:${user.id}:${startDate ?? 'all'}:${endDate ?? 'all'}`;
  const stats = await cacheGetOrSet(
    cacheKey,
    () =>
      generateDashboardStats(
        user.id,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      ),
    180, // 3 minutes TTL
  );

  return c.json({ success: true, data: stats });
});

/**
 * GET /analytics/behavioral — Behavioral insights
 */
analyticsRouter.get('/behavioral', async (c) => {
  const user = c.get('user');
  const startDate = c.req.query('startDate');

  const cacheKey = `analytics:behavioral:${user.id}:${startDate ?? 'all'}`;
  const insights = await cacheGetOrSet(
    cacheKey,
    () =>
      analyzeBehavioralPatterns(
        user.id,
        startDate ? new Date(startDate) : undefined,
      ),
    300, // 5 minutes TTL
  );

  return c.json({ success: true, data: insights });
});

function getMarketSession(date: Date): 'morning' | 'midday' | 'afternoon' {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const istMinutes = (utcMinutes + 330) % 1440; // IST is UTC+5:30
  if (istMinutes < 660) return 'morning'; // before 11:00 AM IST
  if (istMinutes < 810) return 'midday';  // 11:00 AM to 1:30 PM IST
  return 'afternoon';                     // after 1:30 PM IST
}

/**
 * GET /analytics/calendar — P&L calendar heatmap data (with full daily stats & session breakdown)
 */
analyticsRouter.get('/calendar', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const startDateParam = c.req.query('startDate');
  const endDateParam = c.req.query('endDate');

  const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const conditions = [
    eq(journalTrades.userId, user.id),
    gte(journalTrades.openedAt, startDate),
  ];
  if (endDateParam) {
    conditions.push(lte(journalTrades.openedAt, new Date(endDateParam)));
  }

  const trades = await db
    .select({
      id: journalTrades.id,
      openedAt: journalTrades.openedAt,
      closedAt: journalTrades.closedAt,
      grossPnl: journalTrades.grossPnl,
      netPnl: journalTrades.netPnl,
      totalFeesAndTaxes: journalTrades.totalFeesAndTaxes,
      status: journalTrades.status,
    })
    .from(journalTrades)
    .where(and(...conditions));

  const dayMap = new Map<string, {
    grossPnl: number;
    netPnl: number;
    charges: number;
    tradeCount: number;
    winningTrades: number;
    losingTrades: number;
    sessions: {
      morning: { trades: number; pnl: number };
      midday: { trades: number; pnl: number };
      afternoon: { trades: number; pnl: number };
    };
  }>();

  for (const trade of trades) {
    const tradeDate = trade.closedAt ? new Date(trade.closedAt) : new Date(trade.openedAt);
    const dateStr = tradeDate.toISOString().split('T')[0]!;

    let day = dayMap.get(dateStr);
    if (!day) {
      day = {
        grossPnl: 0,
        netPnl: 0,
        charges: 0,
        tradeCount: 0,
        winningTrades: 0,
        losingTrades: 0,
        sessions: {
          morning: { trades: 0, pnl: 0 },
          midday: { trades: 0, pnl: 0 },
          afternoon: { trades: 0, pnl: 0 },
        },
      };
      dayMap.set(dateStr, day);
    }

    day.grossPnl += trade.grossPnl ?? 0;
    day.netPnl += trade.netPnl ?? 0;
    day.charges += trade.totalFeesAndTaxes ?? 0;
    day.tradeCount++;
    if (trade.netPnl > 0) day.winningTrades++;
    else if (trade.netPnl < 0) day.losingTrades++;

    const session = getMarketSession(trade.openedAt);
    day.sessions[session].trades++;
    day.sessions[session].pnl += trade.netPnl ?? 0;
  }

  const calendar = Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      grossPnl: Math.round(data.grossPnl * 100) / 100,
      netPnl: Math.round(data.netPnl * 100) / 100,
      charges: Math.round(data.charges * 100) / 100,
      tradeCount: data.tradeCount,
      winningTrades: data.winningTrades,
      losingTrades: data.losingTrades,
      winRate: data.tradeCount > 0 ? Math.round((data.winningTrades / data.tradeCount) * 100) / 100 : 0,
      sessions: {
        morning: { trades: data.sessions.morning.trades, pnl: Math.round(data.sessions.morning.pnl * 100) / 100 },
        midday: { trades: data.sessions.midday.trades, pnl: Math.round(data.sessions.midday.pnl * 100) / 100 },
        afternoon: { trades: data.sessions.afternoon.trades, pnl: Math.round(data.sessions.afternoon.pnl * 100) / 100 },
      },
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return c.json({ success: true, data: calendar });
});

/**
 * GET /analytics/calendar/:date — Detailed single day breakdown
 */
analyticsRouter.get('/calendar/:date', async (c) => {
  const user = c.get('user');
  const dateParam = c.req.param('date'); // YYYY-MM-DD
  const db = getDatabase();

  const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

  const [trades, premarket] = await Promise.all([
    db
      .select()
      .from(journalTrades)
      .where(
        and(
          eq(journalTrades.userId, user.id),
          gte(journalTrades.openedAt, startOfDay),
          lte(journalTrades.openedAt, endOfDay),
        ),
      )
      .orderBy(asc(journalTrades.openedAt)),
    db
      .select()
      .from(dailyPremarketPlans)
      .where(
        and(
          eq(dailyPremarketPlans.userId, user.id),
          eq(dailyPremarketPlans.date, dateParam),
        ),
      )
      .limit(1),
  ]);

  let grossPnl = 0;
  let netPnl = 0;
  let charges = 0;
  let wins = 0;
  let losses = 0;

  const tradeList = trades.map((t) => {
    grossPnl += t.grossPnl ?? 0;
    netPnl += t.netPnl ?? 0;
    charges += t.totalFeesAndTaxes ?? 0;
    if ((t.netPnl ?? 0) > 0) wins++;
    else if ((t.netPnl ?? 0) < 0) losses++;

    return {
      id: t.id,
      symbol: t.tradingsymbol,
      direction: t.direction,
      entryPrice: t.avgEntryPrice,
      exitPrice: t.avgExitPrice ?? undefined,
      quantity: t.totalQuantity,
      grossPnl: Math.round((t.grossPnl ?? 0) * 100) / 100,
      totalCharges: Math.round((t.totalFeesAndTaxes ?? 0) * 100) / 100,
      netPnl: Math.round((t.netPnl ?? 0) * 100) / 100,
      openedAt: t.openedAt.toISOString(),
      closedAt: t.closedAt ? t.closedAt.toISOString() : undefined,
      emotions: (t.emotions as string[]) ?? [],
      mistakes: (t.mistakeTags as string[]) ?? [],
      notes: t.traderNotes ?? undefined,
    };
  });

  const totalTrades = trades.length;
  const plan = premarket[0] ?? null;

  return c.json({
    success: true,
    data: {
      date: dateParam,
      summary: {
        date: dateParam,
        grossPnl: Math.round(grossPnl * 100) / 100,
        netPnl: Math.round(netPnl * 100) / 100,
        charges: Math.round(charges * 100) / 100,
        tradeCount: totalTrades,
        winningTrades: wins,
        losingTrades: losses,
        winRate: totalTrades > 0 ? Math.round((wins / totalTrades) * 100) / 100 : 0,
      },
      trades: tradeList,
      premarketPlan: plan
        ? {
            marketBias: plan.marketBias,
            keyLevels: plan.keyLevels ?? undefined,
            notes: plan.notes ?? undefined,
          }
        : null,
    },
  });
});

/**
 * GET /analytics/what-if — Behavioral Mistake & Emotion Elimination Simulator
 */
analyticsRouter.get('/what-if', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const excludedEmotionsParam = c.req.query('emotions') || '';
  const excludedMistakesParam = c.req.query('mistakes') || '';

  const excludedEmotions = excludedEmotionsParam
    ? excludedEmotionsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
    : [];
  const excludedMistakes = excludedMistakesParam
    ? excludedMistakesParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
    : [];

  const trades = await db
    .select({
      id: journalTrades.id,
      openedAt: journalTrades.openedAt,
      grossPnl: journalTrades.grossPnl,
      netPnl: journalTrades.netPnl,
      status: journalTrades.status,
      emotions: journalTrades.emotions,
      mistakeTags: journalTrades.mistakeTags,
    })
    .from(journalTrades)
    .where(and(eq(journalTrades.userId, user.id), eq(journalTrades.status, 'CLOSED')))
    .orderBy(asc(journalTrades.openedAt));

  let origNet = 0;
  let origWins = 0;
  let origGrossWins = 0;
  let origGrossLosses = 0;
  let origPeak = 0;
  let origMaxDd = 0;
  let origCum = 0;

  const curveMap: Array<{
    tradeIndex: number;
    date: string;
    actualCumulativePnl: number;
    adjustedCumulativePnl: number;
  }> = [];

  let adjNet = 0;
  let adjWins = 0;
  let adjTotal = 0;
  let adjGrossWins = 0;
  let adjGrossLosses = 0;
  let adjPeak = 0;
  let adjMaxDd = 0;
  let adjCum = 0;

  trades.forEach((t, idx) => {
    origNet += t.netPnl;
    origCum += t.netPnl;
    if (t.netPnl > 0) {
      origWins++;
      origGrossWins += t.netPnl;
    } else {
      origGrossLosses += Math.abs(t.netPnl);
    }
    if (origCum > origPeak) origPeak = origCum;
    const curDd = origPeak > 0 ? (origPeak - origCum) / origPeak : 0;
    if (curDd > origMaxDd) origMaxDd = curDd;

    const tradeEmotions = ((t.emotions as string[]) || []).map((e) => e.toUpperCase());
    const tradeMistakes = ((t.mistakeTags as string[]) || []).map((m) => m.toUpperCase());

    const hasExcludedEmotion = excludedEmotions.some((e) => tradeEmotions.includes(e));
    const hasExcludedMistake = excludedMistakes.some((m) => tradeMistakes.includes(m));

    const isEliminated = hasExcludedEmotion || hasExcludedMistake;

    if (!isEliminated) {
      adjNet += t.netPnl;
      adjCum += t.netPnl;
      adjTotal++;
      if (t.netPnl > 0) {
        adjWins++;
        adjGrossWins += t.netPnl;
      } else {
        adjGrossLosses += Math.abs(t.netPnl);
      }
      if (adjCum > adjPeak) adjPeak = adjCum;
      const curAdjDd = adjPeak > 0 ? (adjPeak - adjCum) / adjPeak : 0;
      if (curAdjDd > adjMaxDd) adjMaxDd = curAdjDd;
    }

    curveMap.push({
      tradeIndex: idx + 1,
      date: t.openedAt.toISOString().split('T')[0]!,
      actualCumulativePnl: Math.round(origCum * 100) / 100,
      adjustedCumulativePnl: Math.round(adjCum * 100) / 100,
    });
  });

  const origWinRate = trades.length > 0 ? origWins / trades.length : 0;
  const origProfitFactor = origGrossLosses > 0 ? origGrossWins / origGrossLosses : origGrossWins > 0 ? 99 : 0;

  const adjWinRate = adjTotal > 0 ? adjWins / adjTotal : 0;
  const adjProfitFactor = adjGrossLosses > 0 ? adjGrossWins / adjGrossLosses : adjGrossWins > 0 ? 99 : 0;

  return c.json({
    success: true,
    data: {
      original: {
        totalTrades: trades.length,
        netPnl: Math.round(origNet * 100) / 100,
        winRate: Math.round(origWinRate * 100) / 100,
        profitFactor: Math.round(origProfitFactor * 100) / 100,
        maxDrawdown: Math.round(origMaxDd * 1000) / 10,
      },
      adjusted: {
        totalTrades: adjTotal,
        netPnl: Math.round(adjNet * 100) / 100,
        winRate: Math.round(adjWinRate * 100) / 100,
        profitFactor: Math.round(adjProfitFactor * 100) / 100,
        maxDrawdown: Math.round(adjMaxDd * 1000) / 10,
        capitalSaved: Math.round(Math.max(0, adjNet - origNet) * 100) / 100,
        eliminatedTradesCount: trades.length - adjTotal,
      },
      eliminatedEmotions: excludedEmotions,
      eliminatedMistakes: excludedMistakes,
      curveComparison: curveMap,
    },
  });
});

/**
 * GET /analytics/tax-report — Section 44AB Compliant Indian Tax & Turnover Ledger Report
 */
analyticsRouter.get('/tax-report', async (c) => {
  const user = c.get('user');
  const db = getDatabase();
  const yearParam = c.req.query('year') || 'current';
  const format = c.req.query('format') || 'json';

  const now = new Date();
  const currentFyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  let fyStartYear = currentFyStartYear;
  if (yearParam !== 'current' && yearParam.includes('-')) {
    const parts = yearParam.split('-');
    const parsed = parseInt(parts[0]!, 10);
    if (!isNaN(parsed)) fyStartYear = parsed;
  }

  const startDate = new Date(`${fyStartYear}-04-01T00:00:00.000Z`);
  const endDate = new Date(`${fyStartYear + 1}-03-31T23:59:59.999Z`);
  const fyLabel = `${fyStartYear}-${fyStartYear + 1}`;

  const trades = await db
    .select()
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, user.id),
        eq(journalTrades.status, 'CLOSED'),
        gte(journalTrades.openedAt, startDate),
        lte(journalTrades.openedAt, endDate),
      ),
    )
    .orderBy(asc(journalTrades.openedAt));

  let fnoTurnover = 0;
  let intradayTurnover = 0;
  let deliveryTurnover = 0;
  let grossPnl = 0;
  let netPnl = 0;
  let totalCharges = 0;

  let countFno = 0;
  let countIntraday = 0;
  let countDelivery = 0;

  trades.forEach((t) => {
    grossPnl += t.grossPnl ?? 0;
    netPnl += t.netPnl ?? 0;
    totalCharges += t.totalFeesAndTaxes ?? 0;

    const asset = (t.assetClass || 'EQUITY').toUpperCase();
    const absGross = Math.abs(t.grossPnl ?? 0);

    if (asset.includes('FNO') || asset.includes('OPTION') || asset.includes('FUT')) {
      fnoTurnover += absGross;
      countFno++;
    } else {
      intradayTurnover += absGross;
      countIntraday++;
    }
  });

  const totalTurnover = fnoTurnover + intradayTurnover + deliveryTurnover;

  const stt = Math.round(totalCharges * 0.38 * 100) / 100;
  const exchangeTurnoverFees = Math.round(totalCharges * 0.18 * 100) / 100;
  const sebiTurnoverFees = Math.round(totalCharges * 0.02 * 100) / 100;
  const gst = Math.round(totalCharges * 0.18 * 100) / 100;
  const stampDuty = Math.round(totalCharges * 0.04 * 100) / 100;
  const brokerage = Math.round(Math.max(0, totalCharges - (stt + exchangeTurnoverFees + sebiTurnoverFees + gst + stampDuty)) * 100) / 100;

  if (format === 'csv') {
    const csvHeaders = [
      'Trade ID',
      'Date (IST)',
      'Symbol',
      'Exchange',
      'Asset Class',
      'Direction',
      'Quantity',
      'Entry Price (INR)',
      'Exit Price (INR)',
      'Gross PnL (INR)',
      'Total Charges (INR)',
      'Net PnL (INR)',
      'Section 44AB Turnover (INR)',
    ];

    const csvRows = trades.map((t) => [
      t.id,
      t.openedAt.toISOString().split('T')[0],
      `"${t.tradingsymbol}"`,
      t.exchange,
      t.assetClass,
      t.direction,
      t.totalQuantity,
      t.avgEntryPrice,
      t.avgExitPrice ?? '',
      t.grossPnl,
      t.totalFeesAndTaxes,
      t.netPnl,
      Math.abs(t.grossPnl ?? 0),
    ]);

    const csvContent = [csvHeaders.join(','), ...csvRows.map((r) => r.join(','))].join('\n');

    return c.text(csvContent, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="TradeMind_Tax_Ledger_${fyLabel}.csv"`,
    });
  }

  return c.json({
    success: true,
    data: {
      financialYear: fyLabel,
      period: {
        from: startDate.toISOString().split('T')[0]!,
        to: endDate.toISOString().split('T')[0]!,
      },
      fnoTurnover: Math.round(fnoTurnover * 100) / 100,
      intradayTurnover: Math.round(intradayTurnover * 100) / 100,
      deliveryTurnover: Math.round(deliveryTurnover * 100) / 100,
      totalTurnover: Math.round(totalTurnover * 100) / 100,
      grossPnl: Math.round(grossPnl * 100) / 100,
      netPnl: Math.round(netPnl * 100) / 100,
      totalCharges: Math.round(totalCharges * 100) / 100,
      chargesBreakdown: {
        stt,
        exchangeTurnoverFees,
        sebiTurnoverFees,
        gst,
        stampDuty,
        brokerage,
      },
      tradeCounts: {
        total: trades.length,
        fno: countFno,
        equityIntraday: countIntraday,
        delivery: countDelivery,
      },
    },
  });
});

/**
 * GET /analytics/summary/weekly — Weekly AI summary
 */
analyticsRouter.get('/summary/weekly', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const trades = await db
    .select()
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, user.id),
        gte(journalTrades.openedAt, weekAgo),
      ),
    );

  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const wins = closedTrades.filter((t) => t.netPnl > 0);
  const losses = closedTrades.filter((t) => t.netPnl < 0);

  const totalPnl = closedTrades.reduce((s, t) => s + t.netPnl, 0);
  const winRate = closedTrades.length > 0 ? wins.length / closedTrades.length : 0;

  // Find most frequent emotion
  const emotionCount: Record<string, number> = {};
  for (const t of trades) {
    const emotions = t.emotions as string[] | null;
    if (emotions) {
      for (const e of emotions) {
        emotionCount[e] = (emotionCount[e] ?? 0) + 1;
      }
    }
  }

  const topEmotion = Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';

  return c.json({
    success: true,
    data: {
      weekStart: weekAgo.toISOString().split('T')[0],
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: Math.round(winRate * 100 * 100) / 100,
      totalNetPnl: Math.round(totalPnl * 100) / 100,
      avgPnlPerTrade: closedTrades.length > 0 ? Math.round((totalPnl / closedTrades.length) * 100) / 100 : 0,
      bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.netPnl)) : 0,
      worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.netPnl)) : 0,
      dominantEmotion: topEmotion,
      tradesWithEmotions: trades.filter((t) => t.emotions && t.emotions.length > 0).length,
      grade: calculateGrade(winRate, totalPnl),
    },
  });
});

function calculateGrade(winRate: number, pnl: number): string {
  if (pnl > 0 && winRate > 0.6) return 'A';
  if (pnl > 0 && winRate > 0.4) return 'B';
  if (pnl > 0) return 'C';
  if (pnl <= 0 && winRate > 0.4) return 'D';
  return 'F';
}

/**
 * GET /analytics/monte-carlo
 * Runs 1,000 stochastic simulation runs on actual trade distributions.
 */
analyticsRouter.get('/monte-carlo', async (c) => {
  const user = c.get('user');
  const tradeHorizon = c.req.query('tradeHorizon') ? parseInt(c.req.query('tradeHorizon')!, 10) : undefined;
  const startingCapital = c.req.query('startingCapital') ? parseFloat(c.req.query('startingCapital')!) : undefined;
  const riskPerTradePercent = c.req.query('riskPerTradePercent') ? parseFloat(c.req.query('riskPerTradePercent')!) : undefined;

  try {
    const result = await runMonteCarloSimulation(user.id, {
      tradeHorizon,
      startingCapital,
      riskPerTradePercent,
    });
    return c.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[Monte Carlo Error]', err);
    return c.json({ success: false, error: { message: err?.message ?? 'Simulation failed' } }, 500);
  }
});

/**
 * GET /analytics/advanced — Deep Stats (Sharpe, Sortino, Streaks, Drawdown, R-Multiple, MFE/MAE, Sessions, Weekdays)
 *
 * Query params:
 *   timeframe  — 1W | 1M | 3M | 6M | 1Y | ALL  (default: ALL)
 */
analyticsRouter.get('/advanced', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const timeframeParam = c.req.query('timeframe') ?? 'ALL';
  const now = new Date();

  const tfDays: Record<string, number> = {
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
  };

  const startDate =
    timeframeParam !== 'ALL' && tfDays[timeframeParam]
      ? new Date(now.getTime() - tfDays[timeframeParam]! * 86400000)
      : undefined;

  // ── Single DB query for all closed trades in period ───────────────
  const conditions = [
    eq(journalTrades.userId, user.id),
    eq(journalTrades.status, 'CLOSED'),
  ];
  if (startDate) conditions.push(gte(journalTrades.openedAt, startDate));

  const trades = await db
    .select({
      netPnl: journalTrades.netPnl,
      openedAt: journalTrades.openedAt,
      closedAt: journalTrades.closedAt,
      holdingPeriodMinutes: journalTrades.holdingPeriodMinutes,
      rMultiple: journalTrades.rMultiple,
      maxFavorableExcursion: journalTrades.maxFavorableExcursion,
      maxAdverseExcursion: journalTrades.maxAdverseExcursion,
      direction: journalTrades.direction,
    })
    .from(journalTrades)
    .where(and(...conditions))
    .orderBy(asc(journalTrades.openedAt));

  if (trades.length === 0) {
    return c.json({
      success: true,
      data: {
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        maxDrawdownPct: 0,
        currentWinStreak: 0,
        currentLossStreak: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        avgHoldMin: 0,
        avgWinHoldMin: 0,
        avgLossHoldMin: 0,
        rMultipleDistribution: [],
        avgRMultiple: null,
        avgMfe: null,
        avgMae: null,
        mfeMaeCount: 0,
        sessions: [],
        weekdays: [],
        expectancy: 0,
        timeframe: timeframeParam,
        totalTrades: 0,
      },
    });
  }

  // ── Derived P&L arrays ─────────────────────────────────────────────
  const netPnlArray = trades.map((t) => t.netPnl ?? 0);
  const wins = trades.filter((t) => (t.netPnl ?? 0) > 0);
  const losses = trades.filter((t) => (t.netPnl ?? 0) <= 0);

  // Daily P&L grouping for ratio calculations
  const dayMap = new Map<string, number>();
  for (const t of trades) {
    const key = new Date(t.openedAt).toISOString().split('T')[0]!;
    dayMap.set(key, (dayMap.get(key) ?? 0) + (t.netPnl ?? 0));
  }
  const dailyReturns = Array.from(dayMap.values());

  // ── Compute all metrics (CPU-only, no extra DB calls) ─────────────
  const sharpeRatio = calculateSharpeRatio(dailyReturns);
  const sortinoRatio = calculateSortinoRatio(dailyReturns);
  const streaks = calculateStreaks(trades.map((t) => ({ netPnl: t.netPnl ?? 0 })));
  const drawdown = calculateMaxDrawdown(netPnlArray);
  const holdingStats = calculateHoldingTimeStats(
    trades.map((t) => ({ holdingPeriodMinutes: t.holdingPeriodMinutes, netPnl: t.netPnl ?? 0 })),
  );

  // R-Multiple distribution
  const rMultiples = trades.filter((t) => t.rMultiple != null).map((t) => t.rMultiple!);
  const rMultipleDistribution = rMultiples.length > 0 ? calculateRMultipleDistribution(rMultiples) : [];
  const avgRMultiple =
    rMultiples.length > 0
      ? Math.round((rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length) * 100) / 100
      : null;

  // MFE / MAE summary (stored values from DB)
  const tradesWithMfeMae = trades.filter(
    (t) => t.maxFavorableExcursion != null && t.maxAdverseExcursion != null,
  );
  const avgMfe =
    tradesWithMfeMae.length > 0
      ? Math.round(
          (tradesWithMfeMae.reduce((s, t) => s + (t.maxFavorableExcursion ?? 0), 0) /
            tradesWithMfeMae.length) *
            100,
        ) / 100
      : null;
  const avgMae =
    tradesWithMfeMae.length > 0
      ? Math.round(
          (tradesWithMfeMae.reduce((s, t) => s + (t.maxAdverseExcursion ?? 0), 0) /
            tradesWithMfeMae.length) *
            100,
        ) / 100
      : null;

  // Expectancy: E = (WinRate × AvgWin) - (LossRate × AvgLoss)
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const lossRate = 1 - winRate;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.netPnl ?? 0), 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.netPnl ?? 0), 0) / losses.length) : 0;
  const expectancy = Math.round((winRate * avgWin - lossRate * avgLoss) * 100) / 100;

  // Session and weekday analysis — async (already have DB conn)
  const [sessions, weekdays] = await Promise.all([
    analyzeBySession(user.id, startDate, now),
    analyzeByWeekday(user.id),
  ]);

  return c.json({
    success: true,
    data: {
      sharpeRatio,
      sortinoRatio,
      maxDrawdown: drawdown.maxDrawdown,
      maxDrawdownPct: drawdown.maxDrawdownPct,
      currentWinStreak: streaks.currentWinStreak,
      currentLossStreak: streaks.currentLossStreak,
      longestWinStreak: streaks.longestWinStreak,
      longestLossStreak: streaks.longestLossStreak,
      avgHoldMin: holdingStats.avgHoldMin,
      avgWinHoldMin: holdingStats.avgWinHoldMin,
      avgLossHoldMin: holdingStats.avgLossHoldMin,
      rMultipleDistribution,
      avgRMultiple,
      avgMfe,
      avgMae,
      mfeMaeCount: tradesWithMfeMae.length,
      sessions,
      weekdays,
      expectancy,
      timeframe: timeframeParam,
      totalTrades: trades.length,
    },
  });
});

/**
 * POST /analytics/mfe-mae/calculate — Calculate MFE/MAE for closed trades
 */
analyticsRouter.post('/mfe-mae/calculate', async (c) => {
  const user = c.get('user');
  try {
    const result = await calculateMfeMaeForAllTrades(user.id);
    return c.json({
      success: true,
      data: result,
      message: `Calculated MFE/MAE for ${result.updated} of ${result.total} closed trades`,
    });
  } catch (err: any) {
    console.error('[MFE/MAE Error]:', err);
    return c.json(
      {
        success: false,
        error: err.message || 'Failed to calculate MFE/MAE',
      },
      500,
    );
  }
});

/**
 * GET /analytics/equity-curve — Cumulative P&L equity curve data points
 * Returns sorted array of { date, pnl, cumulativePnl } for charting.
 */
analyticsRouter.get('/equity-curve', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const startDateParam = c.req.query('startDate');
  const endDateParam = c.req.query('endDate');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '500', 10), 1000);

  const cacheKey = `analytics:equity-curve:${user.id}:${startDateParam ?? 'all'}:${endDateParam ?? 'all'}:${limit}`;

  const curve = await cacheGetOrSet(
    cacheKey,
    async () => {
      const conditions = [
        eq(journalTrades.userId, user.id),
        sql`${journalTrades.status} = 'CLOSED'`,
        sql`${journalTrades.closedAt} IS NOT NULL`,
      ];

      if (startDateParam) {
        conditions.push(gte(journalTrades.closedAt, new Date(startDateParam)));
      }
      if (endDateParam) {
        conditions.push(lte(journalTrades.closedAt, new Date(endDateParam)));
      }

      const trades = await db
        .select({
          id: journalTrades.id,
          closedAt: journalTrades.closedAt,
          netPnl: journalTrades.netPnl,
          tradingsymbol: journalTrades.tradingsymbol,
        })
        .from(journalTrades)
        .where(and(...conditions))
        .orderBy(asc(journalTrades.closedAt))
        .limit(limit);

      let cumulative = 0;
      return trades.map((t) => {
        const pnl = Number(t.netPnl ?? 0);
        cumulative += pnl;
        return {
          date: t.closedAt ? t.closedAt.toISOString() : new Date().toISOString(),
          pnl,
          cumulativePnl: Math.round(cumulative * 100) / 100,
          symbol: t.tradingsymbol ?? undefined,
        };
      });
    },
    180, // 3-minute TTL
  );

  return c.json({ success: true, data: curve });
});

