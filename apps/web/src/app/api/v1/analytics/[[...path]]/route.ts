// ──────────────────────────────────────────────
// TradeMind — Analytics & Insights Routes
// GET /api/v1/analytics/dashboard
// GET /api/v1/analytics/behavioral
// GET /api/v1/analytics/calendar
// GET /api/v1/analytics/calendar/[date]
// GET /api/v1/analytics/what-if
// GET /api/v1/analytics/tax-report
// GET /api/v1/analytics/summary/weekly
// GET /api/v1/analytics/monte-carlo
// GET /api/v1/analytics/advanced
// POST /api/v1/analytics/mfe-mae/calculate
// GET /api/v1/analytics/equity-curve
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, apiError } from '@/lib/server/response';
import { getDatabase, journalTrades, dailyPremarketPlans } from '@trademind/database';
import { eq, and, gte, lte, asc, desc, sql } from 'drizzle-orm';
import { cacheGetOrSet } from '@/lib/server/cache';
import { analyzeBehavioralPatterns, generateDashboardStats } from '@/lib/server/services/analytics.service';
import { runMonteCarloSimulation } from '@/lib/server/services/monte-carlo.service';
import {
  calculateSharpeRatio, calculateSortinoRatio, calculateStreaks,
  calculateMaxDrawdown, calculateRMultipleDistribution, calculateHoldingTimeStats,
  analyzeBySession, analyzeByWeekday,
  calculateProfitFactor, calculateSqn, calculateKellyCriterion, calculateKRatio,
} from '@/lib/server/services/analytics/advanced-analytics.service';
import { calculateMfeMaeForAllTrades } from '@/lib/server/services/analytics/mfe-mae.service';

export const runtime = 'nodejs';

function getMarketSession(date: Date): 'morning' | 'midday' | 'afternoon' {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const istMinutes = (utcMinutes + 330) % 1440;
  if (istMinutes < 660) return 'morning';
  if (istMinutes < 810) return 'midday';
  return 'afternoon';
}

function calculateGrade(winRate: number, pnl: number): string {
  if (pnl > 0 && winRate > 0.6) return 'A';
  if (pnl > 0 && winRate > 0.4) return 'B';
  if (pnl > 0) return 'C';
  if (pnl <= 0 && winRate > 0.4) return 'D';
  return 'F';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const rl = await checkRateLimit(req, user.id);
  if (rl) return rl;

  const { path } = await params;
  const url = new URL(req.url);
  const [section, sub, detail] = path ?? [];

  // ── dashboard / default ─────────────────────────────────────
  if (!section || section === 'dashboard') {
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const connectionId = url.searchParams.get('connectionId');
    const cacheKey = `analytics:dashboard:${user.id}:${connectionId ?? 'all'}:${startDate ?? 'all'}:${endDate ?? 'all'}`;
    const stats = await cacheGetOrSet(
      cacheKey,
      () =>
        generateDashboardStats(
          user.id,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
          connectionId ?? undefined,
        ),
      120,
    );
    return ok(stats);
  }

  // ── behavioral ─────────────────────────────────────────────
  if (section === 'behavioral') {
    const startDate = url.searchParams.get('startDate');
    const cacheKey = `analytics:behavioral:${user.id}:${startDate ?? 'all'}`;
    const insights = await cacheGetOrSet(cacheKey, () => analyzeBehavioralPatterns(user.id, startDate ? new Date(startDate) : undefined), 300);
    return ok(insights);
  }

  // ── calendar/:date ─────────────────────────────────────────
  if (section === 'calendar' && sub && sub.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const dateParam = sub;
    const db = getDatabase();
    const baseMs = new Date(`${dateParam}T00:00:00.000Z`).getTime();
    const queryStart = new Date(baseMs - 14 * 3600 * 1000);
    const queryEnd = new Date(baseMs + 38 * 3600 * 1000);
    const [rawTrades, premarket] = await Promise.all([
      db.select().from(journalTrades).where(
        and(
          eq(journalTrades.userId, user.id),
          gte(sql`COALESCE(${journalTrades.closedAt}, ${journalTrades.openedAt})`, queryStart),
          lte(sql`COALESCE(${journalTrades.closedAt}, ${journalTrades.openedAt})`, queryEnd),
        )
      ).orderBy(asc(sql`COALESCE(${journalTrades.closedAt}, ${journalTrades.openedAt})`)),
      db.select().from(dailyPremarketPlans).where(and(eq(dailyPremarketPlans.userId, user.id), eq(dailyPremarketPlans.date, dateParam))).limit(1),
    ]);

    const trades = rawTrades.filter((t) => {
      const d = new Date(t.closedAt ?? t.openedAt);
      const utcDate = d.toISOString().split('T')[0];
      const istDate = new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().split('T')[0];
      return utcDate === dateParam || istDate === dateParam;
    });
    let grossPnl = 0, netPnl = 0, charges = 0, wins = 0, losses = 0;
    const tradeList = trades.map((t) => {
      grossPnl += t.grossPnl ?? 0; netPnl += t.netPnl ?? 0; charges += t.totalFeesAndTaxes ?? 0;
      if ((t.netPnl ?? 0) > 0) wins++; else if ((t.netPnl ?? 0) < 0) losses++;
      return { id: t.id, symbol: t.tradingsymbol, direction: t.direction, entryPrice: t.avgEntryPrice, exitPrice: t.avgExitPrice ?? undefined, quantity: t.totalQuantity, grossPnl: Math.round((t.grossPnl ?? 0) * 100) / 100, totalCharges: Math.round((t.totalFeesAndTaxes ?? 0) * 100) / 100, netPnl: Math.round((t.netPnl ?? 0) * 100) / 100, openedAt: t.openedAt.toISOString(), closedAt: t.closedAt ? t.closedAt.toISOString() : undefined, emotions: (t.emotions as string[]) ?? [], mistakes: (t.mistakeTags as string[]) ?? [], notes: t.traderNotes ?? undefined };
    });
    const plan = premarket[0] ?? null;
    return ok({ date: dateParam, summary: { date: dateParam, grossPnl: Math.round(grossPnl * 100) / 100, netPnl: Math.round(netPnl * 100) / 100, charges: Math.round(charges * 100) / 100, tradeCount: trades.length, winningTrades: wins, losingTrades: losses, winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) / 100 : 0 }, trades: tradeList, premarketPlan: plan ? { marketBias: plan.marketBias, keyLevels: plan.keyLevels ?? undefined, notes: plan.notes ?? undefined } : null });
  }

  // ── calendar (heatmap) ─────────────────────────────────────
  if (section === 'calendar') {
    const db = getDatabase();
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const conditions: any[] = [eq(journalTrades.userId, user.id), gte(journalTrades.openedAt, startDate)];
    if (endDateParam) conditions.push(lte(journalTrades.openedAt, new Date(endDateParam)));
    const trades = await db.select({ id: journalTrades.id, openedAt: journalTrades.openedAt, closedAt: journalTrades.closedAt, grossPnl: journalTrades.grossPnl, netPnl: journalTrades.netPnl, totalFeesAndTaxes: journalTrades.totalFeesAndTaxes, status: journalTrades.status }).from(journalTrades).where(and(...conditions));
    const dayMap = new Map<string, { grossPnl: number; netPnl: number; charges: number; tradeCount: number; winningTrades: number; losingTrades: number; sessions: { morning: { trades: number; pnl: number }; midday: { trades: number; pnl: number }; afternoon: { trades: number; pnl: number } } }>();
    for (const trade of trades) {
      const tradeDate = trade.closedAt ? new Date(trade.closedAt) : new Date(trade.openedAt);
      const dateStr = tradeDate.toISOString().split('T')[0]!;
      let day = dayMap.get(dateStr);
      if (!day) { day = { grossPnl: 0, netPnl: 0, charges: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0, sessions: { morning: { trades: 0, pnl: 0 }, midday: { trades: 0, pnl: 0 }, afternoon: { trades: 0, pnl: 0 } } }; dayMap.set(dateStr, day); }
      day.grossPnl += trade.grossPnl ?? 0; day.netPnl += trade.netPnl ?? 0; day.charges += trade.totalFeesAndTaxes ?? 0; day.tradeCount++;
      if (trade.netPnl > 0) day.winningTrades++; else if (trade.netPnl < 0) day.losingTrades++;
      const session = getMarketSession(trade.openedAt); day.sessions[session].trades++; day.sessions[session].pnl += trade.netPnl ?? 0;
    }
    const calendar = Array.from(dayMap.entries()).map(([date, data]) => ({ date, grossPnl: Math.round(data.grossPnl * 100) / 100, netPnl: Math.round(data.netPnl * 100) / 100, charges: Math.round(data.charges * 100) / 100, tradeCount: data.tradeCount, winningTrades: data.winningTrades, losingTrades: data.losingTrades, winRate: data.tradeCount > 0 ? Math.round((data.winningTrades / data.tradeCount) * 100) / 100 : 0, sessions: { morning: { trades: data.sessions.morning.trades, pnl: Math.round(data.sessions.morning.pnl * 100) / 100 }, midday: { trades: data.sessions.midday.trades, pnl: Math.round(data.sessions.midday.pnl * 100) / 100 }, afternoon: { trades: data.sessions.afternoon.trades, pnl: Math.round(data.sessions.afternoon.pnl * 100) / 100 } } })).sort((a, b) => a.date.localeCompare(b.date));
    return ok(calendar);
  }

  // ── what-if ────────────────────────────────────────────────
  if (section === 'what-if') {
    const db = getDatabase();
    const excludedEmotions = (url.searchParams.get('emotions') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    const excludedMistakes = (url.searchParams.get('mistakes') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    const trades = await db.select({ id: journalTrades.id, openedAt: journalTrades.openedAt, grossPnl: journalTrades.grossPnl, netPnl: journalTrades.netPnl, status: journalTrades.status, emotions: journalTrades.emotions, mistakeTags: journalTrades.mistakeTags }).from(journalTrades).where(and(eq(journalTrades.userId, user.id), eq(journalTrades.status, 'CLOSED'))).orderBy(asc(journalTrades.openedAt));
    let origNet = 0, origWins = 0, origGrossWins = 0, origGrossLosses = 0, origPeak = 0, origMaxDd = 0, origCum = 0;
    let adjNet = 0, adjWins = 0, adjTotal = 0, adjGrossWins = 0, adjGrossLosses = 0, adjPeak = 0, adjMaxDd = 0, adjCum = 0;
    const curveMap: Array<{ tradeIndex: number; date: string; actualCumulativePnl: number; adjustedCumulativePnl: number }> = [];
    trades.forEach((t, idx) => {
      origNet += t.netPnl; origCum += t.netPnl;
      if (t.netPnl > 0) { origWins++; origGrossWins += t.netPnl; } else { origGrossLosses += Math.abs(t.netPnl); }
      if (origCum > origPeak) origPeak = origCum;
      const curDd = origPeak > 0 ? (origPeak - origCum) / origPeak : 0; if (curDd > origMaxDd) origMaxDd = curDd;
      const tradeEmotions = ((t.emotions as string[]) || []).map((e) => e.toUpperCase());
      const tradeMistakes = ((t.mistakeTags as string[]) || []).map((m) => m.toUpperCase());
      const isEliminated = excludedEmotions.some((e) => tradeEmotions.includes(e)) || excludedMistakes.some((m) => tradeMistakes.includes(m));
      if (!isEliminated) {
        adjNet += t.netPnl; adjCum += t.netPnl; adjTotal++;
        if (t.netPnl > 0) { adjWins++; adjGrossWins += t.netPnl; } else { adjGrossLosses += Math.abs(t.netPnl); }
        if (adjCum > adjPeak) adjPeak = adjCum;
        const curAdjDd = adjPeak > 0 ? (adjPeak - adjCum) / adjPeak : 0; if (curAdjDd > adjMaxDd) adjMaxDd = curAdjDd;
      }
      curveMap.push({ tradeIndex: idx + 1, date: t.openedAt.toISOString().split('T')[0]!, actualCumulativePnl: Math.round(origCum * 100) / 100, adjustedCumulativePnl: Math.round(adjCum * 100) / 100 });
    });
    const origWinRate = trades.length > 0 ? origWins / trades.length : 0;
    const origProfitFactor = origGrossLosses > 0 ? origGrossWins / origGrossLosses : origGrossWins > 0 ? 99 : 0;
    const adjWinRate = adjTotal > 0 ? adjWins / adjTotal : 0;
    const adjProfitFactor = adjGrossLosses > 0 ? adjGrossWins / adjGrossLosses : adjGrossWins > 0 ? 99 : 0;
    return ok({ original: { totalTrades: trades.length, netPnl: Math.round(origNet * 100) / 100, winRate: Math.round(origWinRate * 100) / 100, profitFactor: Math.round(origProfitFactor * 100) / 100, maxDrawdown: Math.round(origMaxDd * 1000) / 10 }, adjusted: { totalTrades: adjTotal, netPnl: Math.round(adjNet * 100) / 100, winRate: Math.round(adjWinRate * 100) / 100, profitFactor: Math.round(adjProfitFactor * 100) / 100, maxDrawdown: Math.round(adjMaxDd * 1000) / 10, capitalSaved: Math.round(Math.max(0, adjNet - origNet) * 100) / 100, eliminatedTradesCount: trades.length - adjTotal }, eliminatedEmotions: excludedEmotions, eliminatedMistakes: excludedMistakes, curveComparison: curveMap });
  }

  // ── tax-report ─────────────────────────────────────────────
  if (section === 'tax-report') {
    const db = getDatabase();
    const yearParam = url.searchParams.get('year') || 'current';
    const format = url.searchParams.get('format') || 'json';
    const now = new Date();
    const currentFyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    let fyStartYear = currentFyStartYear;
    if (yearParam !== 'current' && yearParam.includes('-')) { const parts = yearParam.split('-'); const parsed = parseInt(parts[0]!, 10); if (!isNaN(parsed)) fyStartYear = parsed; }
    const startDate = new Date(`${fyStartYear}-04-01T00:00:00.000Z`);
    const endDate = new Date(`${fyStartYear + 1}-03-31T23:59:59.999Z`);
    const fyLabel = `${fyStartYear}-${fyStartYear + 1}`;
    const trades = await db.select().from(journalTrades).where(and(eq(journalTrades.userId, user.id), eq(journalTrades.status, 'CLOSED'), gte(journalTrades.openedAt, startDate), lte(journalTrades.openedAt, endDate))).orderBy(asc(journalTrades.openedAt));
    let fnoTurnover = 0, intradayTurnover = 0, deliveryTurnover = 0, grossPnl = 0, netPnl = 0, totalCharges = 0, countFno = 0, countIntraday = 0, countDelivery = 0;
    trades.forEach((t) => {
      grossPnl += t.grossPnl ?? 0; netPnl += t.netPnl ?? 0; totalCharges += t.totalFeesAndTaxes ?? 0;
      const asset = (t.assetClass || 'EQUITY').toUpperCase(); const absGross = Math.abs(t.grossPnl ?? 0);
      if (asset.includes('FNO') || asset.includes('OPTION') || asset.includes('FUT')) { fnoTurnover += absGross; countFno++; } else { intradayTurnover += absGross; countIntraday++; }
    });
    const totalTurnover = fnoTurnover + intradayTurnover + deliveryTurnover;
    const stt = Math.round(totalCharges * 0.38 * 100) / 100;
    const exchangeTurnoverFees = Math.round(totalCharges * 0.18 * 100) / 100;
    const sebiTurnoverFees = Math.round(totalCharges * 0.02 * 100) / 100;
    const gst = Math.round(totalCharges * 0.18 * 100) / 100;
    const stampDuty = Math.round(totalCharges * 0.04 * 100) / 100;
    const brokerage = Math.round(Math.max(0, totalCharges - (stt + exchangeTurnoverFees + sebiTurnoverFees + gst + stampDuty)) * 100) / 100;
    if (format === 'csv') {
      const csvHeaders = ['Trade ID', 'Date (IST)', 'Symbol', 'Exchange', 'Asset Class', 'Direction', 'Quantity', 'Entry Price (INR)', 'Exit Price (INR)', 'Gross PnL (INR)', 'Total Charges (INR)', 'Net PnL (INR)', 'Section 44AB Turnover (INR)'];
      const csvRows = trades.map((t) => [t.id, t.openedAt.toISOString().split('T')[0], `"${t.tradingsymbol}"`, t.exchange, t.assetClass, t.direction, t.totalQuantity, t.avgEntryPrice, t.avgExitPrice ?? '', t.grossPnl, t.totalFeesAndTaxes, t.netPnl, Math.abs(t.grossPnl ?? 0)]);
      const csvContent = [csvHeaders.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
      return new NextResponse(csvContent, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="TradeMind_Tax_Ledger_${fyLabel}.csv"` } });
    }
    return ok({ financialYear: fyLabel, period: { from: startDate.toISOString().split('T')[0]!, to: endDate.toISOString().split('T')[0]! }, fnoTurnover: Math.round(fnoTurnover * 100) / 100, intradayTurnover: Math.round(intradayTurnover * 100) / 100, deliveryTurnover, totalTurnover: Math.round(totalTurnover * 100) / 100, grossPnl: Math.round(grossPnl * 100) / 100, netPnl: Math.round(netPnl * 100) / 100, totalCharges: Math.round(totalCharges * 100) / 100, chargesBreakdown: { stt, exchangeTurnoverFees, sebiTurnoverFees, gst, stampDuty, brokerage }, tradeCounts: { total: trades.length, fno: countFno, equityIntraday: countIntraday, delivery: countDelivery } });
  }

  // ── summary/weekly ─────────────────────────────────────────
  if (section === 'summary' && sub === 'weekly') {
    const db = getDatabase();
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const trades = await db.select().from(journalTrades).where(and(eq(journalTrades.userId, user.id), gte(journalTrades.openedAt, weekAgo)));
    const closedTrades = trades.filter((t) => t.status === 'CLOSED');
    const wins = closedTrades.filter((t) => t.netPnl > 0);
    const losses = closedTrades.filter((t) => t.netPnl < 0);
    const totalPnl = closedTrades.reduce((s, t) => s + t.netPnl, 0);
    const winRate = closedTrades.length > 0 ? wins.length / closedTrades.length : 0;
    const emotionCount: Record<string, number> = {};
    for (const t of trades) { const emotions = t.emotions as string[] | null; if (emotions) { for (const e of emotions) { emotionCount[e] = (emotionCount[e] ?? 0) + 1; } } }
    const topEmotion = Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';
    return ok({ weekStart: weekAgo.toISOString().split('T')[0], totalTrades: trades.length, closedTrades: closedTrades.length, wins: wins.length, losses: losses.length, winRate: Math.round(winRate * 100 * 100) / 100, totalNetPnl: Math.round(totalPnl * 100) / 100, avgPnlPerTrade: closedTrades.length > 0 ? Math.round((totalPnl / closedTrades.length) * 100) / 100 : 0, bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.netPnl)) : 0, worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.netPnl)) : 0, dominantEmotion: topEmotion, tradesWithEmotions: trades.filter((t) => t.emotions && (t.emotions as string[]).length > 0).length, grade: calculateGrade(winRate, totalPnl) });
  }

  // ── monte-carlo ────────────────────────────────────────────
  if (section === 'monte-carlo') {
    try {
      const tradeHorizon = url.searchParams.get('tradeHorizon') ? parseInt(url.searchParams.get('tradeHorizon')!, 10) : undefined;
      const startingCapital = url.searchParams.get('startingCapital') ? parseFloat(url.searchParams.get('startingCapital')!) : undefined;
      const riskPerTradePercent = url.searchParams.get('riskPerTradePercent') ? parseFloat(url.searchParams.get('riskPerTradePercent')!) : undefined;
      const result = await runMonteCarloSimulation(user.id, { tradeHorizon, startingCapital, riskPerTradePercent });
      return ok(result);
    } catch (err: any) {
      return apiError(err?.message ?? 'Simulation failed', 500);
    }
  }

  // ── advanced ───────────────────────────────────────────────
  if (section === 'advanced') {
    const db = getDatabase();
    const timeframeParam = url.searchParams.get('timeframe') ?? 'ALL';
    const now = new Date();
    const tfDays: Record<string, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
    const startDate = timeframeParam !== 'ALL' && tfDays[timeframeParam] ? new Date(now.getTime() - tfDays[timeframeParam]! * 86400000) : undefined;
    const conditions: any[] = [eq(journalTrades.userId, user.id), eq(journalTrades.status, 'CLOSED')];
    if (startDate) conditions.push(gte(journalTrades.openedAt, startDate));
    const trades = await db.select({ netPnl: journalTrades.netPnl, openedAt: journalTrades.openedAt, closedAt: journalTrades.closedAt, holdingPeriodMinutes: journalTrades.holdingPeriodMinutes, rMultiple: journalTrades.rMultiple, maxFavorableExcursion: journalTrades.maxFavorableExcursion, maxAdverseExcursion: journalTrades.maxAdverseExcursion, direction: journalTrades.direction }).from(journalTrades).where(and(...conditions)).orderBy(asc(journalTrades.openedAt));
    if (trades.length === 0) return ok({ sharpeRatio: 0, sortinoRatio: 0, maxDrawdown: 0, maxDrawdownPct: 0, currentWinStreak: 0, currentLossStreak: 0, longestWinStreak: 0, longestLossStreak: 0, avgHoldMin: 0, avgWinHoldMin: 0, avgLossHoldMin: 0, rMultipleDistribution: [], avgRMultiple: null, avgMfe: null, avgMae: null, mfeMaeCount: 0, sessions: [], weekdays: [], expectancy: 0, profitFactor: 0, sqn: 0, sqnRating: 'Need ≥ 5 trades', kellyCriterionPct: 0, kRatio: 0, timeframe: timeframeParam, totalTrades: 0 });
    const netPnlArray = trades.map((t) => t.netPnl ?? 0);
    const wins = trades.filter((t) => (t.netPnl ?? 0) > 0);
    const losses = trades.filter((t) => (t.netPnl ?? 0) <= 0);
    const dayMap = new Map<string, number>();
    for (const t of trades) { const key = new Date(t.openedAt).toISOString().split('T')[0]!; dayMap.set(key, (dayMap.get(key) ?? 0) + (t.netPnl ?? 0)); }
    const dailyReturns = Array.from(dayMap.values());
    const sharpeRatio = calculateSharpeRatio(dailyReturns);
    const sortinoRatio = calculateSortinoRatio(dailyReturns);
    const streaks = calculateStreaks(trades.map((t) => ({ netPnl: t.netPnl ?? 0 })));
    const drawdown = calculateMaxDrawdown(netPnlArray);
    const holdingStats = calculateHoldingTimeStats(trades.map((t) => ({ holdingPeriodMinutes: t.holdingPeriodMinutes, netPnl: t.netPnl ?? 0 })));
    const rMultiples = trades.filter((t) => t.rMultiple != null).map((t) => t.rMultiple!);
    const rMultipleDistribution = rMultiples.length > 0 ? calculateRMultipleDistribution(rMultiples) : [];
    const avgRMultiple = rMultiples.length > 0 ? Math.round((rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length) * 100) / 100 : null;
    const tradesWithMfeMae = trades.filter((t) => t.maxFavorableExcursion != null && t.maxAdverseExcursion != null);
    const avgMfe = tradesWithMfeMae.length > 0 ? Math.round((tradesWithMfeMae.reduce((s, t) => s + (t.maxFavorableExcursion ?? 0), 0) / tradesWithMfeMae.length) * 100) / 100 : null;
    const avgMae = tradesWithMfeMae.length > 0 ? Math.round((tradesWithMfeMae.reduce((s, t) => s + (t.maxAdverseExcursion ?? 0), 0) / tradesWithMfeMae.length) * 100) / 100 : null;
    const winRate = trades.length > 0 ? wins.length / trades.length : 0;
    const lossRate = 1 - winRate;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.netPnl ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.netPnl ?? 0), 0) / losses.length) : 0;
    const expectancy = Math.round((winRate * avgWin - lossRate * avgLoss) * 100) / 100;

    // Institutional statistical additions
    const profitFactor = calculateProfitFactor(netPnlArray);
    const { sqn, rating: sqnRating } = calculateSqn(rMultiples);
    const kellyCriterionPct = calculateKellyCriterion(winRate, avgWin, avgLoss);

    // Cumulative equity series for K-Ratio
    let runningPnl = 0;
    const cumulativeSeries = netPnlArray.map((p) => { runningPnl += p; return runningPnl; });
    const kRatio = calculateKRatio(cumulativeSeries);

    const [sessions, weekdays] = await Promise.all([analyzeBySession(user.id, startDate, now), analyzeByWeekday(user.id)]);
    return ok({
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
      profitFactor,
      sqn,
      sqnRating,
      kellyCriterionPct,
      kRatio,
      timeframe: timeframeParam,
      totalTrades: trades.length,
    });
  }

  // ── equity-curve ───────────────────────────────────────────
  if (section === 'equity-curve') {
    const db = getDatabase();
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '500', 10), 1000);
    const cacheKey = `analytics:equity-curve:${user.id}:${startDateParam ?? 'all'}:${endDateParam ?? 'all'}:${limit}`;
    const curve = await cacheGetOrSet(cacheKey, async () => {
      const conditions: any[] = [eq(journalTrades.userId, user.id), sql`${journalTrades.status} = 'CLOSED'`, sql`${journalTrades.closedAt} IS NOT NULL`];
      if (startDateParam) conditions.push(gte(journalTrades.closedAt, new Date(startDateParam)));
      if (endDateParam) conditions.push(lte(journalTrades.closedAt, new Date(endDateParam)));
      const trades = await db.select({ id: journalTrades.id, closedAt: journalTrades.closedAt, openedAt: journalTrades.openedAt, netPnl: journalTrades.netPnl, tradingsymbol: journalTrades.tradingsymbol }).from(journalTrades).where(and(...conditions)).orderBy(asc(journalTrades.closedAt)).limit(limit);
      let cumulative = 0;
      const points: any[] = [];
      if (trades.length > 0) {
        const firstD = new Date(trades[0]?.closedAt ?? trades[0]?.openedAt ?? Date.now());
        const startLabel = firstD.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        points.push({ date: `${startLabel} (Open)`, pnl: 0, cumulativePnl: 0, trades: 0 });
      }
      trades.forEach((t, idx) => {
        const pnl = Number(t.netPnl ?? 0);
        cumulative += pnl;
        const d = new Date(t.closedAt ?? t.openedAt ?? Date.now());
        const dateLabel = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        const timeLabel = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        points.push({
          date: `${dateLabel} ${timeLabel}`,
          pnl: Math.round(pnl * 100) / 100,
          cumulativePnl: Math.round(cumulative * 100) / 100,
          trades: idx + 1,
          symbol: t.tradingsymbol ?? undefined,
        });
      });
      return points;
    }, 60);
    return ok(curve);
  }

  return apiError('Analytics route not found', 404);
  } catch (err: unknown) {
    console.error('[Analytics GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const [section, sub] = path ?? [];

  if (section === 'mfe-mae' && sub === 'calculate') {
    try {
      const result = await calculateMfeMaeForAllTrades(user.id);
      return ok(result, { message: `Calculated MFE/MAE for ${result.updated} of ${result.total} closed trades` });
    } catch (err: any) {
      return apiError(err.message || 'Failed to calculate MFE/MAE', 500);
    }
  }

  return apiError('Route not found', 404);
  } catch (err: unknown) {
    console.error('[Analytics POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}
