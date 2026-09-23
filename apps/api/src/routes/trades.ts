// ──────────────────────────────────────────────
// TradeMind — Trade Execution Routes
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import {
  getDatabase,
  tradeExecutions,
  tradeExecutionLinks,
  journalTrades,
  tradePlans,
  tradeRatings,
  dailyPremarketPlans,
} from '@trademind/database';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { checkTradeLimit } from '../middleware/usage-limit';
import type { TradeExecution, BrokerId, TradeReplayData, TradeReplayMarker } from '@trademind/shared';

export const tradesRouter = new Hono();
tradesRouter.use('*', authMiddleware);

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  symbol: z.string().optional(),
  exchange: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().default('executionTimestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /trades — List trade executions
 */
tradesRouter.get('/', validateQuery(listQuerySchema), async (c) => {
  const user = c.get('user');
  const query = c.get('validatedQuery');
  const db = getDatabase();

  const conditions = [eq(tradeExecutions.userId, user.id)];

  if (query.symbol) conditions.push(eq(tradeExecutions.tradingsymbol, query.symbol.toUpperCase()));
  if (query.exchange) conditions.push(eq(tradeExecutions.exchange, query.exchange));
  if (query.startDate) conditions.push(gte(tradeExecutions.executionTimestamp, new Date(query.startDate)));
  if (query.endDate) conditions.push(lte(tradeExecutions.executionTimestamp, new Date(query.endDate)));

  let cursorCondition: any = null;
  if (query.cursor) {
    try {
      const decoded = Buffer.from(query.cursor, 'base64').toString('utf-8');
      const [tStr, cId] = decoded.split('::');
      const t = Number(tStr);
      if (!isNaN(t) && cId) {
        const cursorDate = new Date(t);
        if (query.sortOrder === 'desc') {
          cursorCondition = sql`(${tradeExecutions.executionTimestamp} < ${cursorDate} OR (${tradeExecutions.executionTimestamp} = ${cursorDate} AND ${tradeExecutions.id} < ${cId}))`;
        } else {
          cursorCondition = sql`(${tradeExecutions.executionTimestamp} > ${cursorDate} OR (${tradeExecutions.executionTimestamp} = ${cursorDate} AND ${tradeExecutions.id} > ${cId}))`;
        }
      }
    } catch {
      // Ignore malformed cursor
    }
  }

  if (cursorCondition) {
    conditions.push(cursorCondition);
  }

  const offset = cursorCondition ? 0 : (query.page - 1) * query.limit;

  const [rawRows, totalResult] = await Promise.all([
    db
      .select()
      .from(tradeExecutions)
      .where(and(...conditions))
      .orderBy(
        query.sortOrder === 'desc'
          ? desc(tradeExecutions.executionTimestamp)
          : tradeExecutions.executionTimestamp,
        query.sortOrder === 'desc'
          ? desc(tradeExecutions.id)
          : tradeExecutions.id,
      )
      .limit(query.limit + 1)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tradeExecutions)
      .where(and(...conditions.filter((cond) => cond !== cursorCondition))),
  ]);

  const hasMore = rawRows.length > query.limit;
  const data = hasMore ? rawRows.slice(0, query.limit) : rawRows;
  const total = Number(totalResult[0]?.count ?? 0);
  const lastItem = data[data.length - 1];
  const nextCursor = hasMore && lastItem && lastItem.executionTimestamp
    ? Buffer.from(`${new Date(lastItem.executionTimestamp).getTime()}::${lastItem.id}`).toString('base64')
    : null;

  return c.json({
    success: true,
    data,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
    nextCursor,
    hasMore,
  });
});

/**
 * GET /trades/:id — Single trade execution detail
 */
tradesRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = getDatabase();

  const [execution] = await db
    .select()
    .from(tradeExecutions)
    .where(and(eq(tradeExecutions.id, id), eq(tradeExecutions.userId, user.id)))
    .limit(1);

  if (!execution) {
    return c.json({ success: false, error: { message: 'Execution not found' } }, 404);
  }

  // Find linked journal trades
  const links = await db
    .select()
    .from(tradeExecutionLinks)
    .where(eq(tradeExecutionLinks.executionId, id));

  return c.json({
    success: true,
    data: {
      ...execution,
      journalLinks: links,
    },
  });
});

/**
 * GET /trades/export — Export trades as CSV
 *
 * Returns a downloadable CSV file with all user's trade executions.
 * Filterable by date range via query params.
 */
tradesRouter.get('/export/csv', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const conditions = [eq(tradeExecutions.userId, user.id)];
  if (startDate) conditions.push(gte(tradeExecutions.executionTimestamp, new Date(startDate)));
  if (endDate) conditions.push(lte(tradeExecutions.executionTimestamp, new Date(endDate)));

  const executions = await db
    .select()
    .from(tradeExecutions)
    .where(and(...conditions))
    .orderBy(desc(tradeExecutions.executionTimestamp));

  // Build CSV
  const headers = ['Date', 'Symbol', 'Exchange', 'Segment', 'Type', 'Order Type', 'Quantity', 'Price', 'Fees', 'Net Value'];
  const rows = executions.map((e) => [
    e.executionTimestamp.toISOString(),
    e.tradingsymbol,
    e.exchange,
    e.segment,
    e.transactionType,
    e.orderType,
    e.quantity,
    e.executionPrice,
    (e.totalCharges ?? 0).toFixed(2),
    ((e.executionPrice * e.quantity) - (e.totalCharges ?? 0)).toFixed(2),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="trademind-export-${new Date().toISOString().slice(0, 10)}.csv"`);
  return c.body(csv);
});

/**
 * GET /trades/:id/replay — Assemble full Trade Replay data
 *
 * Returns all visual context needed to render the replay panel:
 * - Entry/Exit price levels + MFE/MAE bands
 * - Trade plan target/stop levels
 * - Pre-market support/resistance levels (if set that day)
 * - Journal reflection, emotions, autopsy grade
 */
tradesRouter.get('/:id/replay', async (c) => {
  const user = c.get('user');
  const tradeId = c.req.param('id');
  const db = getDatabase();

  // Fetch the journal trade
  const [trade] = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.id, tradeId), eq(journalTrades.userId, user.id)))
    .limit(1);

  if (!trade) {
    return c.json({ success: false, error: { message: 'Trade not found or not owned by you.' } }, 404);
  }

  // Fetch associated plan, ratings, premarket in parallel
  const [planRows, ratingRows, premarketRows] = await Promise.all([
    db.select().from(tradePlans)
      .where(and(eq(tradePlans.journalTradeId, tradeId), eq(tradePlans.userId, user.id)))
      .limit(1),
    db.select().from(tradeRatings)
      .where(and(eq(tradeRatings.journalTradeId, tradeId), eq(tradeRatings.userId, user.id)))
      .limit(1),
    // Premarket plan for the day the trade was opened
    trade.openedAt
      ? db.select().from(dailyPremarketPlans)
          .where(and(
            eq(dailyPremarketPlans.userId, user.id),
            eq(dailyPremarketPlans.date, trade.openedAt.toISOString().slice(0, 10)),
          ))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const plan = planRows[0];
  const rating = ratingRows[0];
  const premarket = (premarketRows as any[])[0];

  // Build markers array for the replay chart overlay
  const markers: TradeReplayMarker[] = [];

  // Entry marker
  markers.push({
    label: `Entry @ ₹${trade.avgEntryPrice.toFixed(2)}`,
    price: trade.avgEntryPrice,
    timestamp: trade.openedAt.toISOString(),
    type: 'ENTRY',
    color: trade.direction === 'LONG' ? '#22c55e' : '#ef4444',
  });

  // Exit marker
  if (trade.avgExitPrice && trade.closedAt) {
    const isProfit = (trade.netPnl ?? 0) >= 0;
    markers.push({
      label: `Exit @ ₹${trade.avgExitPrice.toFixed(2)} (${isProfit ? '+' : ''}₹${(trade.netPnl ?? 0).toFixed(0)})`,
      price: trade.avgExitPrice,
      timestamp: trade.closedAt.toISOString(),
      type: 'EXIT',
      color: isProfit ? '#22c55e' : '#ef4444',
    });
  }

  // MFE marker (best price seen during trade)
  if (trade.maxFavorableExcursion) {
    const mfePx = trade.direction === 'LONG'
      ? trade.avgEntryPrice + trade.maxFavorableExcursion
      : trade.avgEntryPrice - trade.maxFavorableExcursion;
    markers.push({
      label: `MFE ₹${mfePx.toFixed(2)} (+${trade.maxFavorableExcursion.toFixed(2)})`,
      price: mfePx,
      timestamp: trade.openedAt.toISOString(),
      type: 'MFE',
      color: '#3b82f6',
    });
  }

  // MAE marker (worst price seen during trade)
  if (trade.maxAdverseExcursion) {
    const maePx = trade.direction === 'LONG'
      ? trade.avgEntryPrice - trade.maxAdverseExcursion
      : trade.avgEntryPrice + trade.maxAdverseExcursion;
    markers.push({
      label: `MAE ₹${maePx.toFixed(2)} (-${trade.maxAdverseExcursion.toFixed(2)})`,
      price: maePx,
      timestamp: trade.openedAt.toISOString(),
      type: 'MAE',
      color: '#f97316',
    });
  }

  // Plan target / stop markers
  if (plan?.plannedTakeProfit) {
    markers.push({
      label: `Target ₹${plan.plannedTakeProfit.toFixed(2)}`,
      price: plan.plannedTakeProfit,
      timestamp: trade.openedAt.toISOString(),
      type: 'TARGET',
      color: '#10b981',
    });
  }
  if (plan?.plannedStopLoss) {
    markers.push({
      label: `Stop ₹${plan.plannedStopLoss.toFixed(2)}`,
      price: plan.plannedStopLoss,
      timestamp: trade.openedAt.toISOString(),
      type: 'STOP',
      color: '#dc2626',
    });
  }

  // Pre-market level markers (support/resistance from watchlist)
  if (premarket?.watchlist) {
    const watchlist = premarket.watchlist as Array<{ symbol?: string; triggerPrice?: number; direction?: string; notes?: string }>;
    const tradeWatchItems = watchlist.filter((w) => !w.symbol || w.symbol.toUpperCase() === trade.tradingsymbol.toUpperCase());
    tradeWatchItems.forEach((w) => {
      if (w.triggerPrice) {
        const isSupport = w.direction === 'LONG' || (w.notes ?? '').toLowerCase().includes('support');
        markers.push({
          label: `${isSupport ? 'Support' : 'Resistance'} ₹${w.triggerPrice.toFixed(2)}`,
          price: w.triggerPrice,
          timestamp: trade.openedAt.toISOString(),
          type: isSupport ? 'PREMARKET_SUPPORT' : 'PREMARKET_RESISTANCE',
          color: isSupport ? '#6366f1' : '#a855f7',
        });
      }
    });
  }

  const replayData: TradeReplayData = {
    tradeId: trade.id,
    symbol: trade.tradingsymbol,
    exchange: trade.exchange,
    direction: trade.direction as 'LONG' | 'SHORT',
    segment: trade.assetClass,
    entryPrice: trade.avgEntryPrice,
    exitPrice: trade.avgExitPrice ?? undefined,
    quantity: trade.totalQuantity,
    entryTime: trade.openedAt.toISOString(),
    exitTime: trade.closedAt?.toISOString(),
    mfe: trade.maxFavorableExcursion ?? undefined,
    mae: trade.maxAdverseExcursion ?? undefined,
    realizedPnl: trade.netPnl ?? undefined,
    markers,
    // Journal context
    journalReflection: trade.traderNotes ?? undefined,
    journalEmotions: (trade.emotions as string[] | null) ?? undefined,
    journalMistakes: (trade.mistakeTags as string[] | null) ?? undefined,
    journalRatings: rating
      ? {
          execution: rating.executionRating ?? 0,
          plan: rating.planRating ?? 0,
          psychology: rating.psychologyRating ?? 0,
        }
      : undefined,
    // Pre-market context
    premarketBias: premarket?.marketBias,
    premarketKeyLevels: premarket?.keyLevels,
    // Trade plan
    planTarget: plan?.plannedTakeProfit ?? undefined,
    planStop: plan?.plannedStopLoss ?? undefined,
  };

  return c.json({ success: true, data: replayData });
});

