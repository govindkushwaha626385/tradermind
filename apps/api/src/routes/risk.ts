// ──────────────────────────────────────────────
// TradeMind — Risk Management & Kill Switch API
//
//   GET  /risk/status            → Today's risk status (P&L vs limit, trade count, kill switch state)
//   GET  /risk/profile           → User's risk profile config
//   PUT  /risk/profile           → Update risk profile config
//   POST /risk/kill-switch       → Manually activate kill switch
//   POST /risk/kill-switch/reset → Reset kill switch (if reset_mode allows)
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { getDatabase, riskProfiles, journalTrades } from '@trademind/database';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { authMiddleware, AuthUser } from '../middleware/auth';

export const riskRouter = new Hono();
riskRouter.use('*', authMiddleware);

// ── Helpers ──────────────────────────────────────────────────────

/** IST start of today as UTC */
function getISTDayBounds(): { start: Date; end: Date } {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);

  const startIST = new Date(nowIST);
  startIST.setUTCHours(0, 0, 0, 0);
  const endIST = new Date(nowIST);
  endIST.setUTCHours(23, 59, 59, 999);

  return {
    start: new Date(startIST.getTime() - IST_OFFSET_MS),
    end: new Date(endIST.getTime() - IST_OFFSET_MS),
  };
}

/** Evaluate whether the kill switch should auto-fire given today's trading data */
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

  if (dailyLimitAbs > 0 && todayPnl <= -dailyLimitAbs) {
    return {
      shouldActivate: true,
      reason: `Daily loss limit ₹${dailyLimitAbs.toLocaleString('en-IN')} reached (Current P&L: ₹${todayPnl.toLocaleString('en-IN')})`,
    };
  }
  if (maxTrades > 0 && todayTradeCount >= maxTrades) {
    return {
      shouldActivate: true,
      reason: `Maximum trade limit of ${maxTrades} trades/day reached`,
    };
  }
  if (maxConsec > 0 && consecutiveLosses >= maxConsec) {
    return {
      shouldActivate: true,
      reason: `${consecutiveLosses} consecutive losses — mandatory break activated`,
    };
  }
  return { shouldActivate: false, reason: '' };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /risk/status — Today's risk status
 */
riskRouter.get('/status', async (c) => {
  const user = c.get('user') as AuthUser;
  if (!user) return c.json({ success: false, error: { message: 'Unauthorized' } }, 401);

  const db = getDatabase();
  const { start, end } = getISTDayBounds();

  // 1. Load profile
  const [profile] = await db
    .select()
    .from(riskProfiles)
    .where(eq(riskProfiles.userId, user.id))
    .limit(1);

  // 2. Today's trades
  const todayTrades = await db
    .select({
      pnl: journalTrades.netPnl,
      closedAt: journalTrades.closedAt,
      status: journalTrades.status,
    })
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, user.id),
        eq(journalTrades.status, 'CLOSED'),
        gte(journalTrades.closedAt, start),
        lte(journalTrades.closedAt, end),
      ),
    );

  const todayPnl = todayTrades.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);
  const todayTradeCount = todayTrades.length;

  // 3. Consecutive losses (most recent streak)
  const recentTrades = await db
    .select({ pnl: journalTrades.netPnl })
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, user.id),
        eq(journalTrades.status, 'CLOSED'),
      ),
    )
    .orderBy(sql`${journalTrades.closedAt} DESC`)
    .limit(20);

  let consecutiveLosses = 0;
  for (const t of recentTrades) {
    if (Number(t.pnl ?? 0) < 0) {
      consecutiveLosses++;
    } else {
      break;
    }
  }

  // 4. Evaluate auto-kill switch
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
      // Auto-activate kill switch
      await db
        .update(riskProfiles)
        .set({
          killSwitchActive: true,
          killSwitchTriggeredAt: new Date(),
          killSwitchReason: reason,
        })
        .where(eq(riskProfiles.userId, user.id));

      killSwitchActive = true;
      killSwitchReason = reason;
      console.info(`[RISK] Kill switch auto-activated for user ${user.id}: ${reason}`);
    }
  }

  // 5. Compute % of daily limit used
  const dailyLimitAbs = Number(profile?.dailyLossLimitAbs ?? 0);
  const pctOfDailyLimitUsed =
    dailyLimitAbs > 0 && todayPnl < 0
      ? Math.min(100, Math.round((Math.abs(todayPnl) / dailyLimitAbs) * 100))
      : 0;

  // 6. Compile warnings
  const warnings: string[] = [];
  if (killSwitchActive) {
    warnings.push(`⛔ Kill switch active: ${killSwitchReason}`);
  } else if (pctOfDailyLimitUsed >= 75) {
    warnings.push(`⚠️ You've used ${pctOfDailyLimitUsed}% of your daily loss limit`);
  }
  const maxConsec = Number(profile?.maxConsecutiveLosses ?? 0);
  if (maxConsec > 0 && consecutiveLosses > 0) {
    warnings.push(`⚠️ ${consecutiveLosses} consecutive loss${consecutiveLosses > 1 ? 'es' : ''} — ${maxConsec - consecutiveLosses} remaining before mandatory break`);
  }

  const canTrade = !killSwitchActive;

  return c.json({
    success: true,
    data: {
      profile: profile ?? null,
      todayPnl,
      todayTradeCount,
      consecutiveLosses,
      killSwitchActive,
      warnings,
      pctOfDailyLimitUsed,
      canTrade,
      reason: killSwitchActive ? killSwitchReason : undefined,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /risk/profile — Get the user's risk profile config
 */
riskRouter.get('/profile', async (c) => {
  const user = c.get('user') as AuthUser;
  if (!user) return c.json({ success: false, error: { message: 'Unauthorized' } }, 401);

  const db = getDatabase();
  const [profile] = await db
    .select()
    .from(riskProfiles)
    .where(eq(riskProfiles.userId, user.id))
    .limit(1);

  return c.json({
    success: true,
    data: profile ?? null,
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /risk/profile — Upsert the user's risk profile
 */
riskRouter.put('/profile', async (c) => {
  const user = c.get('user') as AuthUser;
  if (!user) return c.json({ success: false, error: { message: 'Unauthorized' } }, 401);

  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const updateData = {
    dailyLossLimitAbs: body.dailyLossLimitAbs !== undefined ? String(body.dailyLossLimitAbs) : undefined,
    dailyLossLimitPct: body.dailyLossLimitPct !== undefined ? String(body.dailyLossLimitPct) : undefined,
    maxTradesPerDay: body.maxTradesPerDay !== undefined ? Number(body.maxTradesPerDay) : undefined,
    maxConsecutiveLosses: body.maxConsecutiveLosses !== undefined ? Number(body.maxConsecutiveLosses) : undefined,
    maxPositionSizePct: body.maxPositionSizePct !== undefined ? String(body.maxPositionSizePct) : undefined,
    maxOpenPositions: body.maxOpenPositions !== undefined ? Number(body.maxOpenPositions) : undefined,
    killSwitchEnabled: body.killSwitchEnabled !== undefined ? Boolean(body.killSwitchEnabled) : undefined,
    killSwitchResetMode: body.killSwitchResetMode ?? undefined,
    cooldownMinutesAfterLoss: body.cooldownMinutesAfterLoss !== undefined ? Number(body.cooldownMinutesAfterLoss) : undefined,
    notifyAt75Pct: body.notifyAt75Pct !== undefined ? Boolean(body.notifyAt75Pct) : undefined,
    notifyOnKillSwitch: body.notifyOnKillSwitch !== undefined ? Boolean(body.notifyOnKillSwitch) : undefined,
  };

  // Remove undefined keys
  const cleanData = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined),
  );

  // Upsert: insert if not exists, otherwise update
  const existing = await db
    .select({ id: riskProfiles.id })
    .from(riskProfiles)
    .where(eq(riskProfiles.userId, user.id))
    .limit(1);

  let profile;
  if (existing.length === 0) {
    [profile] = await db
      .insert(riskProfiles)
      .values({ userId: user.id, ...cleanData })
      .returning();
  } else {
    [profile] = await db
      .update(riskProfiles)
      .set(cleanData)
      .where(eq(riskProfiles.userId, user.id))
      .returning();
  }

  return c.json({ success: true, data: profile });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /risk/kill-switch — Manually activate the kill switch
 */
riskRouter.post('/kill-switch', async (c) => {
  const user = c.get('user') as AuthUser;
  if (!user) return c.json({ success: false, error: { message: 'Unauthorized' } }, 401);

  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));
  const reason = (body.reason as string | undefined) ?? 'Kill switch manually activated by trader';

  // Ensure profile exists
  const existing = await db
    .select({ id: riskProfiles.id })
    .from(riskProfiles)
    .where(eq(riskProfiles.userId, user.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(riskProfiles).values({
      userId: user.id,
      killSwitchEnabled: true,
      killSwitchActive: true,
      killSwitchTriggeredAt: new Date(),
      killSwitchReason: reason,
    });
  } else {
    await db
      .update(riskProfiles)
      .set({
        killSwitchActive: true,
        killSwitchTriggeredAt: new Date(),
        killSwitchReason: reason,
      })
      .where(eq(riskProfiles.userId, user.id));
  }

  console.info(`[RISK] Kill switch manually activated for user ${user.id}: ${reason}`);
  return c.json({ success: true, data: { activated: true, reason } });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /risk/kill-switch/reset — Reset kill switch (respects reset_mode)
 */
riskRouter.post('/kill-switch/reset', async (c) => {
  const user = c.get('user') as AuthUser;
  if (!user) return c.json({ success: false, error: { message: 'Unauthorized' } }, 401);

  const db = getDatabase();
  const [profile] = await db
    .select()
    .from(riskProfiles)
    .where(eq(riskProfiles.userId, user.id))
    .limit(1);

  if (!profile) {
    return c.json({ success: false, error: { message: 'No risk profile found' } }, 404);
  }

  if (profile.killSwitchResetMode === 'admin') {
    return c.json(
      { success: false, error: { message: 'Kill switch can only be reset by an administrator for this account' } },
      403,
    );
  }

  await db
    .update(riskProfiles)
    .set({
      killSwitchActive: false,
      killSwitchTriggeredAt: null,
      killSwitchReason: null,
    })
    .where(eq(riskProfiles.userId, user.id));

  console.info(`[RISK] Kill switch reset for user ${user.id}`);
  return c.json({ success: true, data: { reset: true } });
});
