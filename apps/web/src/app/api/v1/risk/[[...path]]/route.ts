// ──────────────────────────────────────────────
// TradeMind — Risk Management & Kill Switch
// GET  /api/v1/risk/status
// GET  /api/v1/risk/profile
// PUT  /api/v1/risk/profile
// POST /api/v1/risk/kill-switch
// POST /api/v1/risk/kill-switch/reset
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, riskProfiles, journalTrades } from '@trademind/database';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, notFound, apiError } from '@/lib/server/response';

export const runtime = 'nodejs';

function getISTDayBounds(): { start: Date; end: Date } {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const startIST = new Date(nowIST); startIST.setUTCHours(0, 0, 0, 0);
  const endIST = new Date(nowIST); endIST.setUTCHours(23, 59, 59, 999);
  return {
    start: new Date(startIST.getTime() - IST_OFFSET_MS),
    end: new Date(endIST.getTime() - IST_OFFSET_MS),
  };
}

function evaluateKillSwitch(
  profile: Record<string, unknown> | null,
  todayPnl: number,
  todayTradeCount: number,
  consecutiveLosses: number,
) {
  if (!profile) return { shouldActivate: false, reason: '' };
  const dailyLimitAbs = Number(profile.dailyLossLimitAbs ?? 0);
  const maxTrades = Number(profile.maxTradesPerDay ?? 0);
  const maxConsec = Number(profile.maxConsecutiveLosses ?? 0);
  if (dailyLimitAbs > 0 && todayPnl <= -dailyLimitAbs)
    return { shouldActivate: true, reason: `Daily loss limit ₹${dailyLimitAbs.toLocaleString('en-IN')} reached (Current P&L: ₹${todayPnl.toLocaleString('en-IN')})` };
  if (maxTrades > 0 && todayTradeCount >= maxTrades)
    return { shouldActivate: true, reason: `Maximum trade limit of ${maxTrades} trades/day reached` };
  if (maxConsec > 0 && consecutiveLosses >= maxConsec)
    return { shouldActivate: true, reason: `${consecutiveLosses} consecutive losses — mandatory break activated` };
  return { shouldActivate: false, reason: '' };
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
    const action = path?.[0];
    const db = getDatabase();

    if (action === 'status') {
      const { start, end } = getISTDayBounds();
      const [profile] = await db.select().from(riskProfiles).where(eq(riskProfiles.userId, user.id)).limit(1);
      const todayTrades = await db
        .select({ pnl: journalTrades.netPnl })
        .from(journalTrades)
        .where(and(
          eq(journalTrades.userId, user.id),
          eq(journalTrades.status, 'CLOSED'),
          gte(journalTrades.closedAt, start),
          lte(journalTrades.closedAt, end),
        ));
      const todayPnl = todayTrades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
      const todayTradeCount = todayTrades.length;
      const recentTrades = await db
        .select({ pnl: journalTrades.netPnl })
        .from(journalTrades)
        .where(and(eq(journalTrades.userId, user.id), eq(journalTrades.status, 'CLOSED')))
        .orderBy(sql`${journalTrades.closedAt} DESC`)
        .limit(20);
      let consecutiveLosses = 0;
      for (const t of recentTrades) {
        if (Number(t.pnl ?? 0) < 0) consecutiveLosses++;
        else break;
      }

      const killSwitchEnabled = profile?.killSwitchEnabled ?? false;
      let killSwitchActive = profile?.killSwitchActive ?? false;
      let killSwitchReason = profile?.killSwitchReason ?? '';

      if (killSwitchEnabled && !killSwitchActive) {
        const { shouldActivate, reason } = evaluateKillSwitch(
          profile as Record<string, unknown> | null,
          todayPnl,
          todayTradeCount,
          consecutiveLosses,
        );
        if (shouldActivate && profile) {
          await db.update(riskProfiles)
            .set({ killSwitchActive: true, killSwitchTriggeredAt: new Date(), killSwitchReason: reason })
            .where(eq(riskProfiles.userId, user.id));
          killSwitchActive = true;
          killSwitchReason = reason;
        }
      }

      const dailyLimitAbs = Number(profile?.dailyLossLimitAbs ?? 0);
      const pctOfDailyLimitUsed = dailyLimitAbs > 0 && todayPnl < 0
        ? Math.min(100, Math.round((Math.abs(todayPnl) / dailyLimitAbs) * 100))
        : 0;
      const warnings: string[] = [];
      if (killSwitchActive) warnings.push(`⛔ Kill switch active: ${killSwitchReason}`);
      else if (pctOfDailyLimitUsed >= 75) warnings.push(`⚠️ You've used ${pctOfDailyLimitUsed}% of your daily loss limit`);
      const maxConsec = Number(profile?.maxConsecutiveLosses ?? 0);
      if (maxConsec > 0 && consecutiveLosses > 0)
        warnings.push(`⚠️ ${consecutiveLosses} consecutive loss${consecutiveLosses > 1 ? 'es' : ''} — ${maxConsec - consecutiveLosses} remaining before mandatory break`);

      return ok({
        profile: profile ?? null,
        todayPnl,
        todayTradeCount,
        consecutiveLosses,
        killSwitchActive,
        warnings,
        pctOfDailyLimitUsed,
        canTrade: !killSwitchActive,
        reason: killSwitchActive ? killSwitchReason : undefined,
      });
    }

    if (action === 'profile') {
      const [profile] = await db.select().from(riskProfiles).where(eq(riskProfiles.userId, user.id)).limit(1);
      return ok(profile ?? null);
    }

    return apiError('Route not found', 404);
  } catch (err: unknown) {
    console.error('[Risk GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  _ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    const db = getDatabase();
    const body = await req.json().catch(() => ({}));

    const updateData: Record<string, any> = {};
    const numFields = ['maxTradesPerDay', 'maxConsecutiveLosses', 'maxOpenPositions', 'cooldownMinutesAfterLoss'];
    const strFields = ['dailyLossLimitAbs', 'dailyLossLimitPct', 'maxPositionSizePct'];
    const boolFields = ['killSwitchEnabled', 'notifyAt75Pct', 'notifyOnKillSwitch'];
    for (const f of numFields) if (body[f] !== undefined) updateData[f] = Number(body[f]);
    for (const f of strFields) if (body[f] !== undefined) updateData[f] = String(body[f]);
    for (const f of boolFields) if (body[f] !== undefined) updateData[f] = Boolean(body[f]);
    if (body.killSwitchResetMode !== undefined) updateData.killSwitchResetMode = body.killSwitchResetMode;

    const existing = await db.select({ id: riskProfiles.id }).from(riskProfiles).where(eq(riskProfiles.userId, user.id)).limit(1);
    let profile;
    if (existing.length === 0) {
      [profile] = await db.insert(riskProfiles).values({ userId: user.id, ...updateData }).returning();
    } else {
      [profile] = await db.update(riskProfiles).set(updateData).where(eq(riskProfiles.userId, user.id)).returning();
    }
    return ok(profile);
  } catch (err: unknown) {
    console.error('[Risk PUT] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
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
    const [action, sub] = path ?? [];

    if (action === 'kill-switch') {
      const db = getDatabase();

      if (sub === 'reset') {
        const [profile] = await db.select().from(riskProfiles).where(eq(riskProfiles.userId, user.id)).limit(1);
        if (!profile) return notFound('No risk profile found');
        if (profile.killSwitchResetMode === 'admin')
          return apiError('Kill switch can only be reset by an administrator for this account', 403);
        await db.update(riskProfiles)
          .set({ killSwitchActive: false, killSwitchTriggeredAt: null, killSwitchReason: null })
          .where(eq(riskProfiles.userId, user.id));
        return ok({ reset: true });
      }

      // Activate
      const body = await req.json().catch(() => ({}));
      const reason = (body.reason as string | undefined) ?? 'Kill switch manually activated by trader';
      const existing = await db.select({ id: riskProfiles.id }).from(riskProfiles).where(eq(riskProfiles.userId, user.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(riskProfiles).values({
          userId: user.id,
          killSwitchEnabled: true,
          killSwitchActive: true,
          killSwitchTriggeredAt: new Date(),
          killSwitchReason: reason,
        });
      } else {
        await db.update(riskProfiles)
          .set({ killSwitchActive: true, killSwitchTriggeredAt: new Date(), killSwitchReason: reason })
          .where(eq(riskProfiles.userId, user.id));
      }
      return ok({ activated: true, reason });
    }

    return apiError('Route not found', 404);
  } catch (err: unknown) {
    console.error('[Risk POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
