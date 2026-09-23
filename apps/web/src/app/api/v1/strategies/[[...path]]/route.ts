// ──────────────────────────────────────────────
// TradeMind — Trading Strategies Routes
// GET    /api/v1/strategies
// POST   /api/v1/strategies
// GET    /api/v1/strategies/[id]
// PUT    /api/v1/strategies/[id]
// DELETE /api/v1/strategies/[id]
// GET    /api/v1/strategies/[id]/performance
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDatabase, tradingStrategies, journalTrades } from '@trademind/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, created, notFound, apiError, parseBody } from '@/lib/server/response';
import type { StrategyPerformance } from '@trademind/shared';

export const runtime = 'nodejs';

const strategyBodySchema = z.object({
  name: z.string().min(1, 'Strategy name is required').max(100),
  description: z.string().max(2000).optional().nullable(),
  marketType: z.enum(['EQUITY', 'OPTIONS', 'FUTURES', 'CRYPTO', 'COMMODITY']).default('EQUITY'),
  timeframe: z.enum(['SCALPING', 'INTRADAY', 'SWING', 'POSITIONAL', 'LONG_TERM']).optional().nullable(),
  entryCriteria: z.string().max(4000).optional().nullable(),
  exitCriteria: z.string().max(4000).optional().nullable(),
  riskRules: z.record(z.unknown()).optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional().nullable(),
  isActive: z.boolean().default(true),
});

async function computeStrategyLiveStats(userId: string, strategyId: string) {
  const db = getDatabase();
  const trades = await db.select({ netPnl: journalTrades.netPnl, rMultiple: journalTrades.rMultiple }).from(journalTrades).where(and(eq(journalTrades.userId, userId), eq(journalTrades.strategyId, strategyId), eq(journalTrades.status, 'CLOSED')));
  let winCount = 0, lossCount = 0, totalPnl = 0, rMultipleSum = 0, rMultipleCount = 0;
  for (const t of trades) {
    const pnl = Number(t.netPnl ?? 0); totalPnl += pnl;
    if (pnl > 0) winCount++; else if (pnl < 0) lossCount++;
    if (t.rMultiple != null && !isNaN(Number(t.rMultiple))) { rMultipleSum += Number(t.rMultiple); rMultipleCount++; }
  }
  return { totalTrades: trades.length, winCount, lossCount, totalPnl: Number(totalPnl.toFixed(2)), avgRMultiple: rMultipleCount > 0 ? Number((rMultipleSum / rMultipleCount).toFixed(2)) : null };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const rl = await checkRateLimit(req, user.id);
  if (rl) return rl;

  const { path } = await params;
  const [id, action] = path ?? [];
  const db = getDatabase();

  // GET /strategies/:id/performance
  if (id && action === 'performance') {
    const [strategy] = await db.select().from(tradingStrategies).where(and(eq(tradingStrategies.id, id), eq(tradingStrategies.userId, user.id))).limit(1);
    if (!strategy) return notFound('Strategy not found');
    const trades = await db.select({ id: journalTrades.id, tradingsymbol: journalTrades.tradingsymbol, direction: journalTrades.direction, status: journalTrades.status, grossPnl: journalTrades.grossPnl, totalFeesAndTaxes: journalTrades.totalFeesAndTaxes, netPnl: journalTrades.netPnl, rMultiple: journalTrades.rMultiple, holdingPeriodMinutes: journalTrades.holdingPeriodMinutes, openedAt: journalTrades.openedAt, closedAt: journalTrades.closedAt }).from(journalTrades).where(and(eq(journalTrades.userId, user.id), eq(journalTrades.strategyId, id))).orderBy(desc(journalTrades.openedAt));
    let winCount = 0, lossCount = 0, grossPnl = 0, totalFees = 0, totalPnl = 0, grossWins = 0, grossLosses = 0, bestTradePnl = 0, worstTradePnl = 0, holdingMinutesSum = 0, holdingMinutesCount = 0, rMultipleSum = 0, rMultipleCount = 0;
    for (const t of trades) {
      const net = Number(t.netPnl ?? 0), gross = Number(t.grossPnl ?? 0), fees = Number(t.totalFeesAndTaxes ?? 0);
      totalPnl += net; grossPnl += gross; totalFees += fees;
      if (net > 0) { winCount++; grossWins += net; } else if (net < 0) { lossCount++; grossLosses += Math.abs(net); }
      if (net > bestTradePnl) bestTradePnl = net;
      if (net < worstTradePnl) worstTradePnl = net;
      if (t.holdingPeriodMinutes != null) { holdingMinutesSum += Number(t.holdingPeriodMinutes); holdingMinutesCount++; }
      if (t.rMultiple != null && !isNaN(Number(t.rMultiple))) { rMultipleSum += Number(t.rMultiple); rMultipleCount++; }
    }
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(1)) : 0;
    const performance: StrategyPerformance = { strategyId: strategy.id, strategyName: strategy.name, totalTrades, winCount, lossCount, winRate, totalPnl: Number(totalPnl.toFixed(2)), grossPnl: Number(grossPnl.toFixed(2)), totalFees: Number(totalFees.toFixed(2)), avgPnlPerTrade: totalTrades > 0 ? Number((totalPnl / totalTrades).toFixed(2)) : 0, profitFactor: grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : grossWins > 0 ? 999 : 0, avgRMultiple: rMultipleCount > 0 ? Number((rMultipleSum / rMultipleCount).toFixed(2)) : 0, bestTradePnl: Number(bestTradePnl.toFixed(2)), worstTradePnl: Number(worstTradePnl.toFixed(2)), avgHoldingPeriodMinutes: holdingMinutesCount > 0 ? Math.round(holdingMinutesSum / holdingMinutesCount) : 0, recentTrades: trades.slice(0, 10).map((t) => ({ id: t.id, tradingsymbol: t.tradingsymbol, direction: t.direction, netPnl: Number(t.netPnl ?? 0), openedAt: t.openedAt, closedAt: t.closedAt ?? undefined, status: t.status })) };
    return ok(performance);
  }

  // GET /strategies/:id
  if (id) {
    const [strategy] = await db.select().from(tradingStrategies).where(and(eq(tradingStrategies.id, id), eq(tradingStrategies.userId, user.id))).limit(1);
    if (!strategy) return notFound('Strategy not found');
    const stats = await computeStrategyLiveStats(user.id, strategy.id);
    return ok({ ...strategy, ...stats });
  }

  // GET /strategies (list with bulk perf stats)
  const url = new URL(req.url);
  const conditions: any[] = [eq(tradingStrategies.userId, user.id)];
  if (url.searchParams.get('activeOnly') === 'true') conditions.push(eq(tradingStrategies.isActive, true));
  const mt = url.searchParams.get('marketType');
  if (mt) conditions.push(eq(tradingStrategies.marketType, mt as any));

  const strategies = await db.select().from(tradingStrategies).where(and(...conditions)).orderBy(desc(tradingStrategies.createdAt));
  if (strategies.length === 0) return ok([]);

  const tradeAggregates = await db.select({ strategyId: journalTrades.strategyId, netPnl: journalTrades.netPnl, rMultiple: journalTrades.rMultiple }).from(journalTrades).where(and(eq(journalTrades.userId, user.id), eq(journalTrades.status, 'CLOSED'), sql`${journalTrades.strategyId} IS NOT NULL`));
  const statsByStrategy = new Map<string, { totalTrades: number; winCount: number; lossCount: number; totalPnl: number; rMultipleSum: number; rMultipleCount: number }>();
  for (const t of tradeAggregates) {
    if (!t.strategyId) continue;
    let s = statsByStrategy.get(t.strategyId);
    if (!s) { s = { totalTrades: 0, winCount: 0, lossCount: 0, totalPnl: 0, rMultipleSum: 0, rMultipleCount: 0 }; statsByStrategy.set(t.strategyId, s); }
    s.totalTrades++; const pnl = Number(t.netPnl ?? 0); s.totalPnl += pnl;
    if (pnl > 0) s.winCount++; else if (pnl < 0) s.lossCount++;
    if (t.rMultiple != null && !isNaN(Number(t.rMultiple))) { s.rMultipleSum += Number(t.rMultiple); s.rMultipleCount++; }
  }

  const enriched = strategies.map((strat) => {
    const s = statsByStrategy.get(strat.id);
    if (!s) return { ...strat, totalTrades: 0, winCount: 0, lossCount: 0, totalPnl: 0, avgRMultiple: null };
    return { ...strat, totalTrades: s.totalTrades, winCount: s.winCount, lossCount: s.lossCount, totalPnl: Number(s.totalPnl.toFixed(2)), avgRMultiple: s.rMultipleCount > 0 ? Number((s.rMultipleSum / s.rMultipleCount).toFixed(2)) : null };
  });
  return ok(enriched);
}

export async function POST(
  req: NextRequest,
  _ctx: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { data: body, error: bodyErr } = await parseBody(req, strategyBodySchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const [strategy] = await db.insert(tradingStrategies).values({ userId: user.id, name: body.name.trim(), description: body.description ?? null, marketType: body.marketType, timeframe: body.timeframe ?? null, entryCriteria: body.entryCriteria ?? null, exitCriteria: body.exitCriteria ?? null, riskRules: body.riskRules ?? {}, tags: body.tags ?? [], isActive: body.isActive ?? true }).returning();
  return created(strategy);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const id = path?.[0];
  if (!id) return notFound('Strategy ID required');

  const { data: body, error: bodyErr } = await parseBody(req, strategyBodySchema.partial());
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const [existing] = await db.select().from(tradingStrategies).where(and(eq(tradingStrategies.id, id), eq(tradingStrategies.userId, user.id))).limit(1);
  if (!existing) return notFound('Strategy not found');

  const [updated] = await db.update(tradingStrategies).set({ ...body, name: body.name ? body.name.trim() : existing.name, updatedAt: new Date() }).where(eq(tradingStrategies.id, id)).returning();
  if (!updated) return apiError('Failed to update strategy', 500);
  const stats = await computeStrategyLiveStats(user.id, updated.id);
  return ok({ ...updated, ...stats });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const id = path?.[0];
  if (!id) return notFound('Strategy ID required');

  const db = getDatabase();
  const [existing] = await db.select().from(tradingStrategies).where(and(eq(tradingStrategies.id, id), eq(tradingStrategies.userId, user.id))).limit(1);
  if (!existing) return notFound('Strategy not found');

  const [linkedCount] = await db.select({ count: sql<number>`count(*)` }).from(journalTrades).where(and(eq(journalTrades.userId, user.id), eq(journalTrades.strategyId, id)));
  if (Number(linkedCount?.count ?? 0) > 0) {
    await db.update(tradingStrategies).set({ isActive: false, updatedAt: new Date() }).where(eq(tradingStrategies.id, id));
    return ok({ message: 'Strategy deactivated to preserve historical trade link', softDeleted: true });
  }
  await db.delete(tradingStrategies).where(eq(tradingStrategies.id, id));
  return ok({ message: 'Strategy deleted successfully', softDeleted: false });
}
