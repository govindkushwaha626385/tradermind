// ──────────────────────────────────────────────
// TradeMind — Prop Firm Accounts API
// GET    /api/v1/prop-firm
// POST   /api/v1/prop-firm
// GET    /api/v1/prop-firm/[id]
// PATCH  /api/v1/prop-firm/[id]
// DELETE /api/v1/prop-firm/[id]
// POST   /api/v1/prop-firm/[id]/sync
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase, propFirmAccounts, journalTrades } from '@trademind/database';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, created, notFound, parseBody, apiError } from '@/lib/server/response';

export const runtime = 'nodejs';

const createPropFirmSchema = z.object({
  firmName: z.string().min(1).max(100),
  accountName: z.string().min(1).max(150),
  accountSize: z.number().positive(),
  currency: z.string().max(10).default('USD'),
  phase: z.string().default('Phase 1'),
  startingBalance: z.number().positive(),
  currentBalance: z.number().positive(),
  highWaterMark: z.number().positive(),
  dailyLossLimitPct: z.number().min(0).max(100).default(5),
  maxDrawdownPct: z.number().min(0).max(100).default(10),
  profitTargetPct: z.number().min(0).max(100).default(10),
  minTradingDays: z.number().int().min(0).default(4),
  tradingDaysCompleted: z.number().int().min(0).default(0),
  todayPnl: z.number().default(0),
  weekendHoldingAllowed: z.boolean().default(false),
  newsTradingAllowed: z.boolean().default(true),
  notes: z.string().optional(),
});

const updatePropFirmSchema = createPropFirmSchema.partial().extend({
  status: z.enum(['ACTIVE', 'PASSED', 'FAILED', 'ARCHIVED']).optional(),
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
    const id = path?.[0];

    const db = getDatabase();

    if (id) {
      const [account] = await db
        .select()
        .from(propFirmAccounts)
        .where(and(eq(propFirmAccounts.id, id), eq(propFirmAccounts.userId, user.id)))
        .limit(1);

      if (!account) return notFound('Prop firm account not found');
      return ok(account);
    }

    // List all
    const accounts = await db
      .select()
      .from(propFirmAccounts)
      .where(eq(propFirmAccounts.userId, user.id))
      .orderBy(desc(propFirmAccounts.createdAt));

    return ok(accounts);
  } catch (err: unknown) {
    console.error('[PropFirm GET Error]', err);
    return apiError(err instanceof Error ? err.message : 'Internal server error', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;
    const rl = await checkRateLimit(req, user.id);
    if (rl) return rl;

    const { path } = await params;
    const [id, action] = path ?? [];

    const db = getDatabase();

    // POST /prop-firm/[id]/sync
    if (id && action === 'sync') {
      const [account] = await db
        .select()
        .from(propFirmAccounts)
        .where(and(eq(propFirmAccounts.id, id), eq(propFirmAccounts.userId, user.id)))
        .limit(1);

      if (!account) return notFound('Prop firm account not found');

      // Calculate today's PnL from closed journal trades since start of day
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayTrades = await db
        .select({ netPnl: journalTrades.netPnl })
        .from(journalTrades)
        .where(
          and(
            eq(journalTrades.userId, user.id),
            eq(journalTrades.status, 'CLOSED'),
            gte(journalTrades.closedAt, todayStart),
          ),
        );

      const calculatedTodayPnl = todayTrades.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
      const newCurrentBalance = Number(account.startingBalance) + calculatedTodayPnl;
      const newHwm = Math.max(Number(account.highWaterMark), newCurrentBalance);

      // Check drawdown violations
      const maxDrawdownAllowed = (Number(account.startingBalance) * Number(account.maxDrawdownPct)) / 100;
      const currentDrawdown = newHwm - newCurrentBalance;
      const dailyLossAllowed = (Number(account.startingBalance) * Number(account.dailyLossLimitPct)) / 100;

      let newStatus = account.status;
      if (currentDrawdown >= maxDrawdownAllowed || calculatedTodayPnl <= -dailyLossAllowed) {
        newStatus = 'FAILED';
      }

      const [updated] = await db
        .update(propFirmAccounts)
        .set({
          todayPnl: calculatedTodayPnl.toString(),
          currentBalance: newCurrentBalance.toString(),
          highWaterMark: newHwm.toString(),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(propFirmAccounts.id, id))
        .returning();

      return ok(updated);
    }

    // POST /prop-firm (create new)
    const { data: body, error: bodyErr } = await parseBody(req, createPropFirmSchema);
    if (bodyErr) return bodyErr;

    const [createdAccount] = await db
      .insert(propFirmAccounts)
      .values({
        userId: user.id,
        firmName: body.firmName,
        accountName: body.accountName,
        accountSize: body.accountSize.toString(),
        currency: body.currency,
        phase: body.phase,
        startingBalance: body.startingBalance.toString(),
        currentBalance: body.currentBalance.toString(),
        highWaterMark: body.highWaterMark.toString(),
        dailyLossLimitPct: body.dailyLossLimitPct.toString(),
        maxDrawdownPct: body.maxDrawdownPct.toString(),
        profitTargetPct: body.profitTargetPct.toString(),
        minTradingDays: body.minTradingDays,
        tradingDaysCompleted: body.tradingDaysCompleted,
        todayPnl: body.todayPnl.toString(),
        weekendHoldingAllowed: body.weekendHoldingAllowed,
        newsTradingAllowed: body.newsTradingAllowed,
        notes: body.notes,
      })
      .returning();

    return created(createdAccount);
  } catch (err: unknown) {
    console.error('[PropFirm POST Error]', err);
    return apiError(err instanceof Error ? err.message : 'Internal server error', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;
    const rl = await checkRateLimit(req, user.id);
    if (rl) return rl;

    const { path } = await params;
    const id = path?.[0];
    if (!id) return notFound('Account ID required');

    const { data: body, error: bodyErr } = await parseBody(req, updatePropFirmSchema);
    if (bodyErr) return bodyErr;

    const db = getDatabase();

    const updatePayload: Record<string, any> = { updatedAt: new Date() };
    if (body.firmName !== undefined) updatePayload.firmName = body.firmName;
    if (body.accountName !== undefined) updatePayload.accountName = body.accountName;
    if (body.accountSize !== undefined) updatePayload.accountSize = body.accountSize.toString();
    if (body.currency !== undefined) updatePayload.currency = body.currency;
    if (body.phase !== undefined) updatePayload.phase = body.phase;
    if (body.startingBalance !== undefined) updatePayload.startingBalance = body.startingBalance.toString();
    if (body.currentBalance !== undefined) updatePayload.currentBalance = body.currentBalance.toString();
    if (body.highWaterMark !== undefined) updatePayload.highWaterMark = body.highWaterMark.toString();
    if (body.dailyLossLimitPct !== undefined) updatePayload.dailyLossLimitPct = body.dailyLossLimitPct.toString();
    if (body.maxDrawdownPct !== undefined) updatePayload.maxDrawdownPct = body.maxDrawdownPct.toString();
    if (body.profitTargetPct !== undefined) updatePayload.profitTargetPct = body.profitTargetPct.toString();
    if (body.minTradingDays !== undefined) updatePayload.minTradingDays = body.minTradingDays;
    if (body.tradingDaysCompleted !== undefined) updatePayload.tradingDaysCompleted = body.tradingDaysCompleted;
    if (body.todayPnl !== undefined) updatePayload.todayPnl = body.todayPnl.toString();
    if (body.weekendHoldingAllowed !== undefined) updatePayload.weekendHoldingAllowed = body.weekendHoldingAllowed;
    if (body.newsTradingAllowed !== undefined) updatePayload.newsTradingAllowed = body.newsTradingAllowed;
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.notes !== undefined) updatePayload.notes = body.notes;

    const [updated] = await db
      .update(propFirmAccounts)
      .set(updatePayload)
      .where(and(eq(propFirmAccounts.id, id), eq(propFirmAccounts.userId, user.id)))
      .returning();

    if (!updated) return notFound('Prop firm account not found');
    return ok(updated);
  } catch (err: unknown) {
    console.error('[PropFirm PATCH Error]', err);
    return apiError(err instanceof Error ? err.message : 'Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;
    const rl = await checkRateLimit(req, user.id);
    if (rl) return rl;

    const { path } = await params;
    const id = path?.[0];
    if (!id) return notFound('Account ID required');

    const db = getDatabase();
    const [deleted] = await db
      .delete(propFirmAccounts)
      .where(and(eq(propFirmAccounts.id, id), eq(propFirmAccounts.userId, user.id)))
      .returning();

    if (!deleted) return notFound('Prop firm account not found');
    return ok({ success: true, deletedId: id });
  } catch (err: unknown) {
    console.error('[PropFirm DELETE Error]', err);
    return apiError(err instanceof Error ? err.message : 'Internal server error', 500);
  }
}
