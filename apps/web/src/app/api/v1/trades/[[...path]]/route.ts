// ──────────────────────────────────────────────
// TradeMind — Trade Execution Routes
// GET  /api/v1/trades           — list
// GET  /api/v1/trades/export/csv
// GET  /api/v1/trades/[id]      — detail
// GET  /api/v1/trades/[id]/replay
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
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
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, apiError, notFound, parseQuery } from '@/lib/server/response';
import type { TradeReplayData, TradeReplayMarker } from '@trademind/shared';

export const runtime = 'nodejs';

// ── Schemas ─────────────────────────────────────────────────

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

// ── Route Handlers ───────────────────────────────────────────

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
  const [id, sub] = path ?? [];

  // GET /trades  (no id)
  if (!id) return handleList(req, user.id);
  // GET /trades/export/csv
  if (id === 'export' && sub === 'csv') return handleExportCsv(req, user.id);
  // GET /trades/:id/replay
  if (sub === 'replay') return handleReplay(req, user.id, id);
  // GET /trades/:id
  return handleDetail(user.id, id);
  } catch (err: unknown) {
    console.error('[Trades GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new NextResponse(JSON.stringify({ success: false, error: { message } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ── List ─────────────────────────────────────────────────────

async function handleList(req: NextRequest, userId: string) {
  const { data: query, error: qErr } = parseQuery(req, listQuerySchema);
  if (qErr) return qErr;
  const q = query!;
  const page = Number(q.page ?? 1);
  const limit = Number(q.limit ?? 20);

  const db = getDatabase();
  const conditions = [eq(tradeExecutions.userId, userId)];

  if (q.symbol) conditions.push(eq(tradeExecutions.tradingsymbol, q.symbol.toUpperCase()));
  if (q.exchange) conditions.push(eq(tradeExecutions.exchange, q.exchange));
  if (q.startDate) conditions.push(gte(tradeExecutions.executionTimestamp, new Date(q.startDate)));
  if (q.endDate) conditions.push(lte(tradeExecutions.executionTimestamp, new Date(q.endDate)));

  let cursorCondition: any = null;
  if (q.cursor) {
    try {
      const decoded = Buffer.from(q.cursor, 'base64').toString('utf-8');
      const [tStr, cId] = decoded.split('::');
      const t = Number(tStr);
      if (!isNaN(t) && cId) {
        const cursorDate = new Date(t);
        cursorCondition = q.sortOrder === 'desc'
          ? sql`(${tradeExecutions.executionTimestamp} < ${cursorDate} OR (${tradeExecutions.executionTimestamp} = ${cursorDate} AND ${tradeExecutions.id} < ${cId}))`
          : sql`(${tradeExecutions.executionTimestamp} > ${cursorDate} OR (${tradeExecutions.executionTimestamp} = ${cursorDate} AND ${tradeExecutions.id} > ${cId}))`;
      }
    } catch { /* ignore malformed cursor */ }
  }

  if (cursorCondition) conditions.push(cursorCondition);
  const offset = cursorCondition ? 0 : (page - 1) * limit;

  let [rawRows, totalResult] = await Promise.all([
    db.select().from(tradeExecutions)
      .where(and(...conditions))
      .orderBy(
        q.sortOrder === 'desc' ? desc(tradeExecutions.executionTimestamp) : tradeExecutions.executionTimestamp,
        q.sortOrder === 'desc' ? desc(tradeExecutions.id) : tradeExecutions.id,
      )
      .limit(limit + 1)
      .offset(offset),
    db.select({ count: sql<number>`COUNT(*)` })
      .from(tradeExecutions)
      .where(and(...conditions.filter((c) => c !== cursorCondition))),
  ]);

  let total = Number(totalResult[0]?.count ?? 0);

  // If no trade_executions found, query journal_trades so CSV-imported trades appear seamlessly
  if (total === 0) {
    const jConditions = [eq(journalTrades.userId, userId)];
    if (q.symbol) jConditions.push(eq(journalTrades.tradingsymbol, q.symbol.toUpperCase()));
    if (q.exchange) jConditions.push(eq(journalTrades.exchange, q.exchange));
    if (q.startDate) jConditions.push(gte(journalTrades.openedAt, new Date(q.startDate)));
    if (q.endDate) jConditions.push(lte(journalTrades.openedAt, new Date(q.endDate)));

    const [jRows, jTotal] = await Promise.all([
      db.select().from(journalTrades)
        .where(and(...jConditions))
        .orderBy(q.sortOrder === 'desc' ? desc(journalTrades.openedAt) : journalTrades.openedAt)
        .limit(limit + 1)
        .offset(offset),
      db.select({ count: sql<number>`COUNT(*)` })
        .from(journalTrades)
        .where(and(...jConditions)),
    ]);

    total = Number(jTotal[0]?.count ?? 0);
    rawRows = jRows.map((t) => ({
      id: t.id,
      userId: t.userId,
      brokerConnectionId: t.brokerConnectionId,
      tradingsymbol: t.tradingsymbol,
      exchange: t.exchange,
      segment: t.assetClass,
      transactionType: t.direction === 'LONG' ? 'BUY' : 'SELL',
      orderType: 'MARKET',
      quantity: t.totalQuantity,
      executionPrice: t.avgEntryPrice,
      executionTimestamp: t.openedAt,
      brokerExecutionId: t.id,
      totalCharges: t.totalFeesAndTaxes,
      grossPnl: t.grossPnl,
      netPnl: t.netPnl,
      currency: t.currency ?? 'INR',
      status: t.status,
      createdAt: t.createdAt,
    })) as any;
  }

  const hasMore = rawRows.length > limit;
  const data = hasMore ? rawRows.slice(0, limit) : rawRows;
  const lastItem = data[data.length - 1];
  const nextCursor = hasMore && lastItem?.executionTimestamp
    ? Buffer.from(`${new Date(lastItem.executionTimestamp).getTime()}::${lastItem.id}`).toString('base64')
    : null;

  return ok(data, { total, page: page, limit: limit, totalPages: Math.ceil(total / limit), nextCursor, hasMore });
}

// ── Detail ────────────────────────────────────────────────────

async function handleDetail(userId: string, id: string) {
  const db = getDatabase();
  const [execution] = await db
    .select().from(tradeExecutions)
    .where(and(eq(tradeExecutions.id, id), eq(tradeExecutions.userId, userId)))
    .limit(1);

  if (execution) {
    const links = await db.select().from(tradeExecutionLinks).where(eq(tradeExecutionLinks.executionId, id));
    return ok({ ...execution, journalLinks: links });
  }

  const [trade] = await db.select().from(journalTrades)
    .where(and(eq(journalTrades.id, id), eq(journalTrades.userId, userId)))
    .limit(1);

  const constituentExecutions = await db
    .select({
      execution: tradeExecutions,
      allocatedQuantity: tradeExecutionLinks.allocatedQuantity,
      allocatedFees: tradeExecutionLinks.allocatedFees,
    })
    .from(tradeExecutionLinks)
    .innerJoin(tradeExecutions, eq(tradeExecutions.id, tradeExecutionLinks.executionId))
    .where(eq(tradeExecutionLinks.journalTradeId, trade.id))
    .orderBy(tradeExecutions.executionTimestamp);

  return ok({
    id: trade.id,
    userId: trade.userId,
    brokerConnectionId: trade.brokerConnectionId,
    tradingsymbol: trade.tradingsymbol,
    exchange: trade.exchange,
    segment: trade.assetClass,
    transactionType: trade.direction === 'LONG' ? 'BUY' : 'SELL',
    quantity: trade.totalQuantity,
    executionPrice: trade.avgEntryPrice,
    executionTimestamp: trade.openedAt,
    totalCharges: trade.totalFeesAndTaxes,
    grossPnl: trade.grossPnl,
    netPnl: trade.netPnl,
    currency: trade.currency ?? 'INR',
    status: trade.status,
    avgExitPrice: trade.avgExitPrice,
    closedAt: trade.closedAt,
    rMultiple: trade.rMultiple,
    holdingPeriodMinutes: trade.holdingPeriodMinutes,
    notes: trade.traderNotes,
    emotions: trade.emotions,
    mistakes: trade.mistakeTags,
    journalLinks: [],
    executions: constituentExecutions.map((e) => ({
      ...e.execution,
      allocatedQuantity: e.allocatedQuantity,
      allocatedFees: e.allocatedFees,
    })),
  });
}

// ── Export CSV ────────────────────────────────────────────────

async function handleExportCsv(req: NextRequest, userId: string) {
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const db = getDatabase();
  const conditions = [eq(journalTrades.userId, userId)];
  if (startDate) conditions.push(gte(journalTrades.openedAt, new Date(startDate)));
  if (endDate) conditions.push(lte(journalTrades.openedAt, new Date(endDate)));

  const trades = await db.select().from(journalTrades)
    .where(and(...conditions))
    .orderBy(desc(journalTrades.openedAt));

  const headers = [
    'Trade ID',
    'Open Date',
    'Close Date',
    'Symbol',
    'Exchange',
    'Asset Class',
    'Direction',
    'Status',
    'Quantity',
    'Entry Price',
    'Exit Price',
    'Gross PnL',
    'Fees & Taxes',
    'Net PnL',
    'R-Multiple',
    'MFE',
    'MAE',
    'Holding Period (Mins)',
    'Emotions',
    'Mistakes',
    'Notes',
  ];
  const rows = trades.map((t) => [
    t.id,
    t.openedAt?.toISOString() ?? '',
    t.closedAt?.toISOString() ?? '',
    t.tradingsymbol,
    t.exchange,
    t.assetClass,
    t.direction,
    t.status,
    t.totalQuantity,
    Number(t.avgEntryPrice ?? 0).toFixed(2),
    t.avgExitPrice ? Number(t.avgExitPrice).toFixed(2) : '',
    Number(t.grossPnl ?? 0).toFixed(2),
    Number(t.totalFeesAndTaxes ?? 0).toFixed(2),
    Number(t.netPnl ?? 0).toFixed(2),
    t.rMultiple != null ? Number(t.rMultiple).toFixed(2) : '',
    t.maxFavorableExcursion != null ? Number(t.maxFavorableExcursion).toFixed(2) : '',
    t.maxAdverseExcursion != null ? Number(t.maxAdverseExcursion).toFixed(2) : '',
    t.holdingPeriodMinutes ?? '',
    (t.emotions ?? []).join('; '),
    (t.mistakeTags ?? []).join('; '),
    t.traderNotes ?? '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="trademind-trades-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

// ── Replay ────────────────────────────────────────────────────

async function handleReplay(req: NextRequest, userId: string, tradeId: string) {
  void req;
  const db = getDatabase();

  let trade = (await db.select().from(journalTrades)
    .where(and(eq(journalTrades.id, tradeId), eq(journalTrades.userId, userId)))
    .limit(1))[0];

  // If not found in journalTrades, check tradeExecutions
  if (!trade) {
    const [execution] = await db.select().from(tradeExecutions)
      .where(and(eq(tradeExecutions.id, tradeId), eq(tradeExecutions.userId, userId)))
      .limit(1);

    if (execution) {
      // Check if this execution is linked to a journal trade
      const links = await db.select().from(tradeExecutionLinks)
        .where(eq(tradeExecutionLinks.executionId, tradeId))
        .limit(1);

      if (links[0]) {
        trade = (await db.select().from(journalTrades)
          .where(and(eq(journalTrades.id, links[0].journalTradeId), eq(journalTrades.userId, userId)))
          .limit(1))[0];
      }

      // If no linked journal trade, build replay data directly from execution
      if (!trade) {
        const isBuy = execution.transactionType === 'BUY';
        const markers: TradeReplayMarker[] = [
          {
            label: `${execution.transactionType} @ ₹${execution.executionPrice.toFixed(2)}`,
            price: execution.executionPrice,
            timestamp: execution.executionTimestamp.toISOString(),
            type: isBuy ? 'ENTRY' : 'EXIT',
            color: isBuy ? '#22c55e' : '#ef4444',
          },
        ];

        const replayData: TradeReplayData = {
          tradeId: execution.id,
          symbol: execution.tradingsymbol,
          exchange: execution.exchange,
          direction: isBuy ? 'LONG' : 'SHORT',
          segment: execution.segment,
          entryPrice: execution.executionPrice,
          exitPrice: undefined,
          quantity: execution.quantity,
          entryTime: execution.executionTimestamp.toISOString(),
          exitTime: undefined,
          markers,
        };

        return ok(replayData);
      }
    }
  }

  if (!trade) return notFound('Trade not found or not owned by you.');

  const [planRows, ratingRows, premarketRows] = await Promise.all([
    db.select().from(tradePlans).where(and(eq(tradePlans.journalTradeId, tradeId), eq(tradePlans.userId, userId))).limit(1),
    db.select().from(tradeRatings).where(and(eq(tradeRatings.journalTradeId, tradeId), eq(tradeRatings.userId, userId))).limit(1),
    trade.openedAt
      ? db.select().from(dailyPremarketPlans).where(and(eq(dailyPremarketPlans.userId, userId), eq(dailyPremarketPlans.date, trade.openedAt.toISOString().slice(0, 10)))).limit(1)
      : Promise.resolve([]),
  ]);

  const plan = planRows[0];
  const rating = ratingRows[0];
  const premarket = (premarketRows as any[])[0];

  const markers: TradeReplayMarker[] = [];

  markers.push({ label: `Entry @ ₹${trade.avgEntryPrice.toFixed(2)}`, price: trade.avgEntryPrice, timestamp: trade.openedAt.toISOString(), type: 'ENTRY', color: trade.direction === 'LONG' ? '#22c55e' : '#ef4444' });

  if (trade.avgExitPrice && trade.closedAt) {
    const isProfit = (trade.netPnl ?? 0) >= 0;
    markers.push({ label: `Exit @ ₹${trade.avgExitPrice.toFixed(2)} (${isProfit ? '+' : ''}₹${(trade.netPnl ?? 0).toFixed(0)})`, price: trade.avgExitPrice, timestamp: trade.closedAt.toISOString(), type: 'EXIT', color: isProfit ? '#22c55e' : '#ef4444' });
  }
  if (trade.maxFavorableExcursion) {
    const mfePx = trade.direction === 'LONG' ? trade.avgEntryPrice + trade.maxFavorableExcursion : trade.avgEntryPrice - trade.maxFavorableExcursion;
    markers.push({ label: `MFE ₹${mfePx.toFixed(2)} (+${trade.maxFavorableExcursion.toFixed(2)})`, price: mfePx, timestamp: trade.openedAt.toISOString(), type: 'MFE', color: '#3b82f6' });
  }
  if (trade.maxAdverseExcursion) {
    const maePx = trade.direction === 'LONG' ? trade.avgEntryPrice - trade.maxAdverseExcursion : trade.avgEntryPrice + trade.maxAdverseExcursion;
    markers.push({ label: `MAE ₹${maePx.toFixed(2)} (-${trade.maxAdverseExcursion.toFixed(2)})`, price: maePx, timestamp: trade.openedAt.toISOString(), type: 'MAE', color: '#f97316' });
  }
  if (plan?.plannedTakeProfit) markers.push({ label: `Target ₹${plan.plannedTakeProfit.toFixed(2)}`, price: plan.plannedTakeProfit, timestamp: trade.openedAt.toISOString(), type: 'TARGET', color: '#10b981' });
  if (plan?.plannedStopLoss) markers.push({ label: `Stop ₹${plan.plannedStopLoss.toFixed(2)}`, price: plan.plannedStopLoss, timestamp: trade.openedAt.toISOString(), type: 'STOP', color: '#dc2626' });

  if (premarket?.watchlist) {
    const watchlist = premarket.watchlist as Array<{ symbol?: string; triggerPrice?: number; direction?: string; notes?: string }>;
    watchlist.filter((w) => !w.symbol || w.symbol.toUpperCase() === trade.tradingsymbol.toUpperCase())
      .forEach((w) => {
        if (w.triggerPrice) {
          const isSupport = w.direction === 'LONG' || (w.notes ?? '').toLowerCase().includes('support');
          markers.push({ label: `${isSupport ? 'Support' : 'Resistance'} ₹${w.triggerPrice.toFixed(2)}`, price: w.triggerPrice, timestamp: trade.openedAt.toISOString(), type: isSupport ? 'PREMARKET_SUPPORT' : 'PREMARKET_RESISTANCE', color: isSupport ? '#6366f1' : '#a855f7' });
        }
      });
  }

  const replayData: TradeReplayData = {
    tradeId: trade.id, symbol: trade.tradingsymbol, exchange: trade.exchange,
    direction: trade.direction as 'LONG' | 'SHORT', segment: trade.assetClass,
    entryPrice: trade.avgEntryPrice, exitPrice: trade.avgExitPrice ?? undefined,
    quantity: trade.totalQuantity, entryTime: trade.openedAt.toISOString(),
    exitTime: trade.closedAt?.toISOString(),
    mfe: trade.maxFavorableExcursion ?? undefined, mae: trade.maxAdverseExcursion ?? undefined,
    realizedPnl: trade.netPnl ?? undefined, markers,
    journalReflection: trade.traderNotes ?? undefined,
    journalEmotions: (trade.emotions as string[] | null) ?? undefined,
    journalMistakes: (trade.mistakeTags as string[] | null) ?? undefined,
    journalRatings: rating ? { execution: rating.executionRating ?? 0, plan: rating.planRating ?? 0, psychology: rating.psychologyRating ?? 0 } : undefined,
    premarketBias: premarket?.marketBias, premarketKeyLevels: premarket?.keyLevels,
    planTarget: plan?.plannedTakeProfit ?? undefined, planStop: plan?.plannedStopLoss ?? undefined,
  };

  return ok(replayData);
}
