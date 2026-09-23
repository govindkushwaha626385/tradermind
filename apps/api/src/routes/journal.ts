// ──────────────────────────────────────────────
// TradeMind — Journal Trade Routes
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabase, journalTrades, tradingStrategies } from '@trademind/database';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { MISTAKE_TAGS, EMOTIONS } from '@trademind/shared';

export const journalRouter = new Hono();
journalRouter.use('*', authMiddleware);

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

/**
 * GET /journal — List journal trades
 */
journalRouter.get('/', validateQuery(listQuerySchema), async (c) => {
  const user = c.get('user');
  const query = c.get('validatedQuery');
  const db = getDatabase();

  const conditions = [eq(journalTrades.userId, user.id)];

  if (query.status) conditions.push(eq(journalTrades.status, query.status));
  if (query.symbol) conditions.push(eq(journalTrades.tradingsymbol, query.symbol.toUpperCase()));
  if (query.direction) conditions.push(eq(journalTrades.direction, query.direction));
  if (query.assetClass) conditions.push(eq(journalTrades.assetClass, query.assetClass));
  if (query.strategyId) conditions.push(eq(journalTrades.strategyId, query.strategyId));
  if (query.startDate) conditions.push(gte(journalTrades.openedAt, new Date(query.startDate)));
  if (query.endDate) conditions.push(lte(journalTrades.openedAt, new Date(query.endDate)));

  let cursorCondition: any = null;
  if (query.cursor) {
    try {
      const decoded = Buffer.from(query.cursor, 'base64').toString('utf-8');
      const [tStr, cId] = decoded.split('::');
      const t = Number(tStr);
      if (!isNaN(t) && cId) {
        const cursorDate = new Date(t);
        if (query.sortOrder === 'desc') {
          cursorCondition = sql`(${journalTrades.openedAt} < ${cursorDate} OR (${journalTrades.openedAt} = ${cursorDate} AND ${journalTrades.id} < ${cId}))`;
        } else {
          cursorCondition = sql`(${journalTrades.openedAt} > ${cursorDate} OR (${journalTrades.openedAt} = ${cursorDate} AND ${journalTrades.id} > ${cId}))`;
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
      .select({
        trade: journalTrades,
        strategyName: tradingStrategies.name,
      })
      .from(journalTrades)
      .leftJoin(tradingStrategies, eq(journalTrades.strategyId, tradingStrategies.id))
      .where(and(...conditions))
      .orderBy(
        query.sortOrder === 'desc'
          ? desc(journalTrades.openedAt)
          : journalTrades.openedAt,
        query.sortOrder === 'desc'
          ? desc(journalTrades.id)
          : journalTrades.id,
      )
      .limit(query.limit + 1)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(journalTrades)
      .where(and(...conditions.filter((cond) => cond !== cursorCondition))),
  ]);

  const hasMore = rawRows.length > query.limit;
  const slicedRows = hasMore ? rawRows.slice(0, query.limit) : rawRows;

  const data = slicedRows.map((r) => ({
    ...r.trade,
    strategyName: r.strategyName ?? undefined,
  }));

  const total = Number(totalResult[0]?.count ?? 0);
  const lastItem = data[data.length - 1];
  const nextCursor = hasMore && lastItem && lastItem.openedAt
    ? Buffer.from(`${new Date(lastItem.openedAt).getTime()}::${lastItem.id}`).toString('base64')
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
 * GET /journal/unlogged — Get trades needing journal entry
 */
journalRouter.get('/unlogged', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const unlogged = await db
    .select()
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, user.id),
        eq(journalTrades.status, 'CLOSED'),
        sql`COALESCE(${journalTrades.traderNotes}, '') = ''`, // No journal entry yet
      ),
    )
    .orderBy(desc(journalTrades.closedAt))
    .limit(10);

  return c.json({ success: true, data: unlogged });
});

/**
 * PATCH /journal/:id — Update journal trade (add qualitative data)
 */
journalRouter.patch('/:id', validateBody(updateJournalSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = c.get('validatedBody');
  const db = getDatabase();

  const [existing] = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.id, id), eq(journalTrades.userId, user.id)))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: { message: 'Journal trade not found' } }, 404);
  }

  const [updated] = await db
    .update(journalTrades)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(journalTrades.id, id))
    .returning();

  return c.json({ success: true, data: updated });
});

/**
 * GET /journal/export/csv — Export full journal trades as CSV
 */
journalRouter.get('/export/csv', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const status = c.req.query('status');

  const conditions = [eq(journalTrades.userId, user.id)];
  if (startDate) conditions.push(gte(journalTrades.openedAt, new Date(startDate)));
  if (endDate) conditions.push(lte(journalTrades.openedAt, new Date(endDate)));
  if (status) conditions.push(eq(journalTrades.status, status));

  const trades = await db
    .select()
    .from(journalTrades)
    .where(and(...conditions))
    .orderBy(desc(journalTrades.openedAt));

  const headers = [
    'Trade ID',
    'Opened At',
    'Closed At',
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
    'Currency',
    'R Multiple',
    'Holding Minutes',
    'MFE',
    'MAE',
    'Emotions',
    'Mistakes',
    'Notes',
  ];

  const rows = trades.map((t) => [
    t.id,
    t.openedAt ? t.openedAt.toISOString() : '',
    t.closedAt ? t.closedAt.toISOString() : '',
    t.tradingsymbol,
    t.exchange,
    t.assetClass,
    t.direction,
    t.status,
    t.totalQuantity,
    t.avgEntryPrice.toFixed(2),
    t.avgExitPrice ? t.avgExitPrice.toFixed(2) : '',
    t.grossPnl.toFixed(2),
    t.totalFeesAndTaxes.toFixed(2),
    t.netPnl.toFixed(2),
    t.currency ?? 'INR',
    t.rMultiple ? t.rMultiple.toFixed(2) : '',
    t.holdingPeriodMinutes ?? '',
    t.maxFavorableExcursion ? t.maxFavorableExcursion.toFixed(2) : '',
    t.maxAdverseExcursion ? t.maxAdverseExcursion.toFixed(2) : '',
    (t.emotions ?? []).join('; '),
    (t.mistakeTags ?? []).join('; '),
    (t.traderNotes ?? '').replace(/[\r\n]+/g, ' '),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header(
    'Content-Disposition',
    `attachment; filename="trademind-journal-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  return c.body(csv);
});

/**
 * GET /journal/:id — Single journal trade detail
 */
journalRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const db = getDatabase();

  const [trade] = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.id, id), eq(journalTrades.userId, user.id)))
    .limit(1);

  if (!trade) {
    return c.json({ success: false, error: { message: 'Journal trade not found' } }, 404);
  }

  return c.json({ success: true, data: trade });
});
