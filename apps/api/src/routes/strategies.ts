// ──────────────────────────────────────────────
// TradeMind — Trading Strategies Routes
//
// Endpoints for managing customized trading strategies,
// tracking execution stats, and computing live strategy performance.
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabase, tradingStrategies, journalTrades } from '@trademind/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import type { StrategyPerformance } from '@trademind/shared';

export const strategiesRouter = new Hono();
strategiesRouter.use('*', authMiddleware);

const strategyQuerySchema = z.object({
  activeOnly: z.enum(['true', 'false']).optional(),
  marketType: z.enum(['EQUITY', 'OPTIONS', 'FUTURES', 'CRYPTO', 'COMMODITY']).optional(),
});

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

const updateStrategySchema = strategyBodySchema.partial();

/**
 * Helper to recalculate live stats for a strategy
 */
async function computeStrategyLiveStats(userId: string, strategyId: string) {
  const db = getDatabase();

  const trades = await db
    .select({
      netPnl: journalTrades.netPnl,
      rMultiple: journalTrades.rMultiple,
      status: journalTrades.status,
    })
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, userId),
        eq(journalTrades.strategyId, strategyId),
        eq(journalTrades.status, 'CLOSED'),
      ),
    );

  const totalTrades = trades.length;
  let winCount = 0;
  let lossCount = 0;
  let totalPnl = 0;
  let rMultipleSum = 0;
  let rMultipleCount = 0;

  for (const t of trades) {
    const pnl = Number(t.netPnl ?? 0);
    totalPnl += pnl;
    if (pnl > 0) winCount++;
    else if (pnl < 0) lossCount++;

    if (t.rMultiple != null && !isNaN(Number(t.rMultiple))) {
      rMultipleSum += Number(t.rMultiple);
      rMultipleCount++;
    }
  }

  const avgRMultiple = rMultipleCount > 0 ? Number((rMultipleSum / rMultipleCount).toFixed(2)) : null;

  return {
    totalTrades,
    winCount,
    lossCount,
    totalPnl: Number(totalPnl.toFixed(2)),
    avgRMultiple,
  };
}

/**
 * GET /strategies — List user's trading strategies
 */
strategiesRouter.get('/', validateQuery(strategyQuerySchema), async (c) => {
  const user = c.get('user');
  const query = c.get('validatedQuery');
  const db = getDatabase();

  const conditions = [eq(tradingStrategies.userId, user.id)];
  if (query.activeOnly === 'true') {
    conditions.push(eq(tradingStrategies.isActive, true));
  }
  if (query.marketType) {
    conditions.push(eq(tradingStrategies.marketType, query.marketType));
  }

  const strategies = await db
    .select()
    .from(tradingStrategies)
    .where(and(...conditions))
    .orderBy(desc(tradingStrategies.createdAt));

  if (strategies.length === 0) {
    return c.json({ success: true, data: [] });
  }

  // Bulk query all closed trades belonging to user with a strategy assigned (O(1) query instead of O(N))
  const tradeAggregates = await db
    .select({
      strategyId: journalTrades.strategyId,
      netPnl: journalTrades.netPnl,
      rMultiple: journalTrades.rMultiple,
    })
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, user.id),
        eq(journalTrades.status, 'CLOSED'),
        sql`${journalTrades.strategyId} IS NOT NULL`,
      ),
    );

  const statsByStrategy = new Map<string, {
    totalTrades: number;
    winCount: number;
    lossCount: number;
    totalPnl: number;
    rMultipleSum: number;
    rMultipleCount: number;
  }>();

  for (const t of tradeAggregates) {
    if (!t.strategyId) continue;
    let s = statsByStrategy.get(t.strategyId);
    if (!s) {
      s = { totalTrades: 0, winCount: 0, lossCount: 0, totalPnl: 0, rMultipleSum: 0, rMultipleCount: 0 };
      statsByStrategy.set(t.strategyId, s);
    }
    s.totalTrades++;
    const pnl = Number(t.netPnl ?? 0);
    s.totalPnl += pnl;
    if (pnl > 0) s.winCount++;
    else if (pnl < 0) s.lossCount++;

    if (t.rMultiple != null && !isNaN(Number(t.rMultiple))) {
      s.rMultipleSum += Number(t.rMultiple);
      s.rMultipleCount++;
    }
  }

  const enriched = strategies.map((strat) => {
    const s = statsByStrategy.get(strat.id);
    if (!s) {
      return {
        ...strat,
        totalTrades: 0,
        winCount: 0,
        lossCount: 0,
        totalPnl: 0,
        avgRMultiple: null,
      };
    }
    return {
      ...strat,
      totalTrades: s.totalTrades,
      winCount: s.winCount,
      lossCount: s.lossCount,
      totalPnl: Number(s.totalPnl.toFixed(2)),
      avgRMultiple: s.rMultipleCount > 0 ? Number((s.rMultipleSum / s.rMultipleCount).toFixed(2)) : null,
    };
  });

  return c.json({ success: true, data: enriched });
});

/**
 * POST /strategies — Create a new trading strategy
 */
strategiesRouter.post('/', validateBody(strategyBodySchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  const [strategy] = await db
    .insert(tradingStrategies)
    .values({
      userId: user.id,
      name: body.name.trim(),
      description: body.description ?? null,
      marketType: body.marketType,
      timeframe: body.timeframe ?? null,
      entryCriteria: body.entryCriteria ?? null,
      exitCriteria: body.exitCriteria ?? null,
      riskRules: body.riskRules ?? {},
      tags: body.tags ?? [],
      isActive: body.isActive ?? true,
    })
    .returning();

  return c.json({ success: true, data: strategy }, 201);
});

/**
 * GET /strategies/:id — Get a single strategy
 */
strategiesRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const db = getDatabase();

  const [strategy] = await db
    .select()
    .from(tradingStrategies)
    .where(and(eq(tradingStrategies.id, id), eq(tradingStrategies.userId, user.id)))
    .limit(1);

  if (!strategy) {
    return c.json({ success: false, error: { message: 'Strategy not found' } }, 404);
  }

  const stats = await computeStrategyLiveStats(user.id, strategy.id);

  return c.json({ success: true, data: { ...strategy, ...stats } });
});

/**
 * PUT /strategies/:id — Update a strategy
 */
strategiesRouter.put('/:id', validateBody(updateStrategySchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = c.get('validatedBody');
  const db = getDatabase();

  const [existing] = await db
    .select()
    .from(tradingStrategies)
    .where(and(eq(tradingStrategies.id, id), eq(tradingStrategies.userId, user.id)))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: { message: 'Strategy not found' } }, 404);
  }

  const [updated] = await db
    .update(tradingStrategies)
    .set({
      ...body,
      name: body.name ? body.name.trim() : existing.name,
      updatedAt: new Date(),
    })
    .where(eq(tradingStrategies.id, id))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { message: 'Failed to update strategy' } }, 500);
  }

  const stats = await computeStrategyLiveStats(user.id, updated.id);

  return c.json({ success: true, data: { ...updated, ...stats } });
});

/**
 * DELETE /strategies/:id — Delete or deactivate a strategy
 */
strategiesRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const db = getDatabase();

  const [existing] = await db
    .select()
    .from(tradingStrategies)
    .where(and(eq(tradingStrategies.id, id), eq(tradingStrategies.userId, user.id)))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: { message: 'Strategy not found' } }, 404);
  }

  // Check if any trades are linked to this strategy
  const linkedTrades = await db
    .select({ count: sql<number>`count(*)` })
    .from(journalTrades)
    .where(and(eq(journalTrades.userId, user.id), eq(journalTrades.strategyId, id)));

  const count = Number(linkedTrades[0]?.count ?? 0);

  if (count > 0) {
    // Soft delete: preserve trade historical references
    await db
      .update(tradingStrategies)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tradingStrategies.id, id));

    return c.json({
      success: true,
      data: { message: 'Strategy deactivated to preserve historical trade link', softDeleted: true },
    });
  }

  // Hard delete if never used in trades
  await db.delete(tradingStrategies).where(eq(tradingStrategies.id, id));

  return c.json({
    success: true,
    data: { message: 'Strategy deleted successfully', softDeleted: false },
  });
});

/**
 * GET /strategies/:id/performance — Detailed analytics & trade breakdown for a strategy
 */
strategiesRouter.get('/:id/performance', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const db = getDatabase();

  const [strategy] = await db
    .select()
    .from(tradingStrategies)
    .where(and(eq(tradingStrategies.id, id), eq(tradingStrategies.userId, user.id)))
    .limit(1);

  if (!strategy) {
    return c.json({ success: false, error: { message: 'Strategy not found' } }, 404);
  }

  const trades = await db
    .select({
      id: journalTrades.id,
      tradingsymbol: journalTrades.tradingsymbol,
      direction: journalTrades.direction,
      status: journalTrades.status,
      grossPnl: journalTrades.grossPnl,
      totalFeesAndTaxes: journalTrades.totalFeesAndTaxes,
      netPnl: journalTrades.netPnl,
      rMultiple: journalTrades.rMultiple,
      holdingPeriodMinutes: journalTrades.holdingPeriodMinutes,
      openedAt: journalTrades.openedAt,
      closedAt: journalTrades.closedAt,
    })
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, user.id),
        eq(journalTrades.strategyId, id),
      ),
    )
    .orderBy(desc(journalTrades.openedAt));

  const totalTrades = trades.length;
  let winCount = 0;
  let lossCount = 0;
  let grossPnl = 0;
  let totalFees = 0;
  let totalPnl = 0;
  let grossWins = 0;
  let grossLosses = 0;
  let bestTradePnl = 0;
  let worstTradePnl = 0;
  let holdingMinutesSum = 0;
  let holdingMinutesCount = 0;
  let rMultipleSum = 0;
  let rMultipleCount = 0;

  for (const t of trades) {
    const net = Number(t.netPnl ?? 0);
    const gross = Number(t.grossPnl ?? 0);
    const fees = Number(t.totalFeesAndTaxes ?? 0);

    totalPnl += net;
    grossPnl += gross;
    totalFees += fees;

    if (net > 0) {
      winCount++;
      grossWins += net;
    } else if (net < 0) {
      lossCount++;
      grossLosses += Math.abs(net);
    }

    if (net > bestTradePnl) bestTradePnl = net;
    if (net < worstTradePnl) worstTradePnl = net;

    if (t.holdingPeriodMinutes != null) {
      holdingMinutesSum += Number(t.holdingPeriodMinutes);
      holdingMinutesCount++;
    }

    if (t.rMultiple != null && !isNaN(Number(t.rMultiple))) {
      rMultipleSum += Number(t.rMultiple);
      rMultipleCount++;
    }
  }

  const winRate = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(1)) : 0;
  const avgPnlPerTrade = totalTrades > 0 ? Number((totalPnl / totalTrades).toFixed(2)) : 0;
  const profitFactor = grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : grossWins > 0 ? 999 : 0;
  const avgRMultiple = rMultipleCount > 0 ? Number((rMultipleSum / rMultipleCount).toFixed(2)) : 0;
  const avgHoldingPeriodMinutes = holdingMinutesCount > 0 ? Math.round(holdingMinutesSum / holdingMinutesCount) : 0;

  const performance: StrategyPerformance = {
    strategyId: strategy.id,
    strategyName: strategy.name,
    totalTrades,
    winCount,
    lossCount,
    winRate,
    totalPnl: Number(totalPnl.toFixed(2)),
    grossPnl: Number(grossPnl.toFixed(2)),
    totalFees: Number(totalFees.toFixed(2)),
    avgPnlPerTrade,
    profitFactor,
    avgRMultiple,
    bestTradePnl: Number(bestTradePnl.toFixed(2)),
    worstTradePnl: Number(worstTradePnl.toFixed(2)),
    avgHoldingPeriodMinutes,
    recentTrades: trades.slice(0, 10).map((t) => ({
      id: t.id,
      tradingsymbol: t.tradingsymbol,
      direction: t.direction,
      netPnl: Number(t.netPnl ?? 0),
      openedAt: t.openedAt,
      closedAt: t.closedAt ?? undefined,
      status: t.status,
    })),
  };

  return c.json({ success: true, data: performance });
});
