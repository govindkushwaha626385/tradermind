// ──────────────────────────────────────────────
// TradeMind — Journal Trade Routes
// GET   /api/v1/journal            — list
// GET   /api/v1/journal/unlogged   — unlogged trades
// GET   /api/v1/journal/export/csv
// GET   /api/v1/journal/[id]       — detail
// PATCH /api/v1/journal/[id]       — update
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase, journalTrades, tradingStrategies, tradeExecutions, tradeExecutionLinks } from '@trademind/database';
import { eq, and, desc, gte, lte, sql, inArray } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, notFound, parseBody, parseQuery } from '@/lib/server/response';
import { MISTAKE_TAGS, EMOTIONS } from '@trademind/shared';

export const runtime = 'nodejs';

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['OPEN', 'CLOSED', 'PARTIALLY_CLOSED']).optional(),
  symbol: z.string().optional(),
  direction: z.enum(['LONG', 'SHORT']).optional(),
  assetClass: z.string().optional(),
  strategyId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().default('openedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const updateJournalSchema = z.object({
  tradeType: z.enum(['MANUAL', 'ALGO']).optional(),
  emotions: z.array(z.enum(EMOTIONS as unknown as [string, ...string[]])).optional(),
  setupPlaybookId: z.string().uuid().optional().nullable(),
  strategyId: z.string().uuid().optional().nullable(),
  ruleComplianceScore: z.number().min(0).max(100).optional().nullable(),
  mistakeTags: z.array(z.enum(MISTAKE_TAGS as unknown as [string, ...string[]])).optional(),
  traderNotes: z.string().max(5000).optional().nullable(),
  audioNoteUrl: z.string().url().optional().nullable(),
  screenshotUrls: z.array(z.string().url()).optional(),
});

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

  if (!id) return handleList(req, user.id);
  if (id === 'unlogged') return handleUnlogged(user.id);
  if (id === 'export' && sub === 'csv') return handleExportCsv(req, user.id);
  return handleDetail(user.id, id);
  } catch (err: unknown) {
    console.error('[Journal GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new NextResponse(JSON.stringify({ success: false, error: { message } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const id = path?.[0];
  if (!id) return notFound('Trade ID required');

  const { data: body, error: bodyErr } = await parseBody(req, updateJournalSchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const [existing] = await db.select().from(journalTrades)
    .where(and(eq(journalTrades.id, id), eq(journalTrades.userId, user.id))).limit(1);
  if (!existing) return notFound('Journal trade not found');

  const [updated] = await db.update(journalTrades)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(journalTrades.id, id))
    .returning();

  return ok(updated);
  } catch (err: unknown) {
    console.error('[Journal PATCH] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new NextResponse(JSON.stringify({ success: false, error: { message } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleList(req: NextRequest, userId: string) {
  const { data: query, error: qErr } = parseQuery(req, listQuerySchema);
  if (qErr) return qErr;
  const q = query!;
  const page = Number(q.page ?? 1);
  const limit = Number(q.limit ?? 20);

  const db = getDatabase();
  const conditions: any[] = [eq(journalTrades.userId, userId)];

  if (q.status) conditions.push(eq(journalTrades.status, q.status));
  if (q.symbol) conditions.push(eq(journalTrades.tradingsymbol, q.symbol.toUpperCase()));
  if (q.direction) conditions.push(eq(journalTrades.direction, q.direction));
  if (q.assetClass) conditions.push(eq(journalTrades.assetClass, q.assetClass));
  if (q.strategyId) conditions.push(eq(journalTrades.strategyId, q.strategyId));
  if (q.startDate) conditions.push(gte(journalTrades.openedAt, new Date(q.startDate)));
  if (q.endDate) conditions.push(lte(journalTrades.openedAt, new Date(q.endDate)));

  let cursorCondition: any = null;
  if (q.cursor) {
    try {
      const decoded = Buffer.from(q.cursor, 'base64').toString('utf-8');
      const [tStr, cId] = decoded.split('::');
      const t = Number(tStr);
      if (!isNaN(t) && cId) {
        const cursorDate = new Date(t);
        cursorCondition = q.sortOrder === 'desc'
          ? sql`(${journalTrades.openedAt} < ${cursorDate} OR (${journalTrades.openedAt} = ${cursorDate} AND ${journalTrades.id} < ${cId}))`
          : sql`(${journalTrades.openedAt} > ${cursorDate} OR (${journalTrades.openedAt} = ${cursorDate} AND ${journalTrades.id} > ${cId}))`;
      }
    } catch { /* ignore */ }
  }
  if (cursorCondition) conditions.push(cursorCondition);
  const offset = cursorCondition ? 0 : (page - 1) * limit;

  const [rawRows, totalResult] = await Promise.all([
    db.select({ trade: journalTrades, strategyName: tradingStrategies.name })
      .from(journalTrades)
      .leftJoin(tradingStrategies, eq(journalTrades.strategyId, tradingStrategies.id))
      .where(and(...conditions))
      .orderBy(
        q.sortOrder === 'desc' ? desc(journalTrades.openedAt) : journalTrades.openedAt,
        q.sortOrder === 'desc' ? desc(journalTrades.id) : journalTrades.id,
      )
      .limit(limit + 1).offset(offset),
    db.select({ count: sql<number>`COUNT(*)` }).from(journalTrades)
      .where(and(...conditions.filter((c) => c !== cursorCondition))),
  ]);

  const hasMore = rawRows.length > limit;
  const slicedRows = hasMore ? rawRows.slice(0, limit) : rawRows;
  const data = slicedRows.map((r) => ({ ...r.trade, strategyName: r.strategyName ?? undefined }));
  const total = Number(totalResult[0]?.count ?? 0);

  // Attach linked executions to each trade for transparent Buy -> Sell fill drilldown
  const tradeIds = data.map((t) => t.id);
  if (tradeIds.length > 0) {
    try {
      const links = await db
        .select({
          journalTradeId: tradeExecutionLinks.journalTradeId,
          execution: tradeExecutions,
          allocatedQuantity: tradeExecutionLinks.allocatedQuantity,
          allocatedFees: tradeExecutionLinks.allocatedFees,
        })
        .from(tradeExecutionLinks)
        .innerJoin(tradeExecutions, eq(tradeExecutions.id, tradeExecutionLinks.executionId))
        .where(inArray(tradeExecutionLinks.journalTradeId, tradeIds))
        .orderBy(tradeExecutions.executionTimestamp);

      const execsByTradeId = new Map<string, any[]>();
      for (const l of links) {
        const list = execsByTradeId.get(l.journalTradeId) ?? [];
        list.push({
          ...l.execution,
          allocatedQuantity: l.allocatedQuantity,
          allocatedFees: l.allocatedFees,
        });
        execsByTradeId.set(l.journalTradeId, list);
      }

      for (const t of data) {
        (t as any).executions = execsByTradeId.get(t.id) ?? [];
      }
    } catch {
      // execution links optional fallback
    }
  }

  const lastItem = data[data.length - 1];
  const nextCursor = hasMore && lastItem?.openedAt
    ? Buffer.from(`${new Date(lastItem.openedAt).getTime()}::${lastItem.id}`).toString('base64')
    : null;

  return ok(data, { total, page: page, limit: limit, totalPages: Math.ceil(total / limit), nextCursor, hasMore });
}

async function handleUnlogged(userId: string) {
  const db = getDatabase();
  const unlogged = await db.select().from(journalTrades)
    .where(and(eq(journalTrades.userId, userId), eq(journalTrades.status, 'CLOSED'), sql`COALESCE(${journalTrades.traderNotes}, '') = ''`))
    .orderBy(desc(journalTrades.closedAt)).limit(10);
  return ok(unlogged);
}

async function handleExportCsv(req: NextRequest, userId: string) {
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const status = url.searchParams.get('status');

  const db = getDatabase();
  const conditions: any[] = [eq(journalTrades.userId, userId)];
  if (startDate) conditions.push(gte(journalTrades.openedAt, new Date(startDate)));
  if (endDate) conditions.push(lte(journalTrades.openedAt, new Date(endDate)));
  if (status) conditions.push(eq(journalTrades.status, status));

  const trades = await db.select().from(journalTrades).where(and(...conditions)).orderBy(desc(journalTrades.openedAt));

  const headers = ['Trade ID','Opened At','Closed At','Symbol','Exchange','Asset Class','Direction','Status','Quantity','Entry Price','Exit Price','Gross PnL','Fees & Taxes','Net PnL','Currency','R Multiple','Holding Minutes','MFE','MAE','Emotions','Mistakes','Notes'];
  const rows = trades.map((t) => [
    t.id, t.openedAt?.toISOString() ?? '', t.closedAt?.toISOString() ?? '',
    t.tradingsymbol, t.exchange, t.assetClass, t.direction, t.status, t.totalQuantity,
    Number(t.avgEntryPrice ?? 0).toFixed(2), t.avgExitPrice ? Number(t.avgExitPrice).toFixed(2) : '',
    Number(t.grossPnl ?? 0).toFixed(2), Number(t.totalFeesAndTaxes ?? 0).toFixed(2), Number(t.netPnl ?? 0).toFixed(2),
    t.currency ?? 'INR', t.rMultiple ? Number(t.rMultiple).toFixed(2) : '',
    t.holdingPeriodMinutes ?? '',
    t.maxFavorableExcursion ? Number(t.maxFavorableExcursion).toFixed(2) : '',
    t.maxAdverseExcursion ? Number(t.maxAdverseExcursion).toFixed(2) : '',
    (t.emotions as string[] ?? []).join('; '),
    (t.mistakeTags as string[] ?? []).join('; '),
    (t.traderNotes ?? '').replace(/[\r\n]+/g, ' '),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="trademind-journal-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

async function handleDetail(userId: string, id: string) {
  const db = getDatabase();
  const [trade] = await db.select().from(journalTrades)
    .where(and(eq(journalTrades.id, id), eq(journalTrades.userId, userId))).limit(1);
  if (!trade) return notFound('Journal trade not found');

  let executions: any[] = [];
  try {
    const links = await db
      .select({
        execution: tradeExecutions,
        allocatedQuantity: tradeExecutionLinks.allocatedQuantity,
        allocatedFees: tradeExecutionLinks.allocatedFees,
      })
      .from(tradeExecutionLinks)
      .innerJoin(tradeExecutions, eq(tradeExecutions.id, tradeExecutionLinks.executionId))
      .where(eq(tradeExecutionLinks.journalTradeId, trade.id))
      .orderBy(tradeExecutions.executionTimestamp);

    executions = links.map((l) => ({
      ...l.execution,
      allocatedQuantity: l.allocatedQuantity,
      allocatedFees: l.allocatedFees,
    }));
  } catch {
    executions = [];
  }

  return ok({ ...trade, executions });
}
