// ──────────────────────────────────────────────
// TradeMind — Internal Worker Routes
//
// These endpoints are called ONLY by Supabase Edge
// Functions using the INTERNAL_WORKER_SECRET header.
// They must NEVER be exposed publicly.
//
// Routes:
//   POST /api/v1/internal/workers/sync
//   POST /api/v1/internal/workers/kill-switch
//   POST /api/v1/internal/workers/token-refresh
//   POST /api/v1/internal/workers/report-generator
//   POST /api/v1/internal/workers/cleanup
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, syncLogs, brokerConnections, tradeExecutions, riskProfiles, journalTrades, notifications, users, subscriptions, plans, tradeExecutionLinks, accountBalances } from '@trademind/database';
import { eq, and, gte, lte, lt, sql, desc } from 'drizzle-orm';
import { decrypt, encrypt, createFillHash } from '@trademind/database';
import { getBrokerConnector } from '@/lib/server/connectors/base';
import { clusterExecutions } from '@/lib/server/services/clustering.service';
import { calculateFees } from '@/lib/server/services/tax.service';
import { refreshExpiringTokens } from '@/lib/server/services/token-refresh.service';
import { sendDailySummary, sendWeeklyReport } from '@/lib/server/services/notification/email.service';
import {
  sendEodDebriefNotification,
  sendRiskBreachNotification,
} from '@/lib/server/services/notification/webhook-dispatcher.service';
import { purgeExpiredCache } from '@/lib/server/cache';
import type { BrokerId, TradeExecution } from '@trademind/shared';
import type { BrokerConnectorConfig } from '@/lib/server/connectors/base';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min max for sync jobs

// ── Internal Auth Guard ───────────────────────

function verifyInternalSecret(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_WORKER_SECRET;
  if (!secret) return false;
  const header = req.headers.get('x-internal-secret');
  return header === secret;
}

// ── Quota Helper ──────────────────────────────

async function getRemainingTradeQuota(userId: string): Promise<number> {
  const db = getDatabase();
  const [sub] = await db.select().from(subscriptions).where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active'))).limit(1);
  let maxTrades = 50;
  if (sub) {
    const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId)).limit(1);
    const features = (plan?.features as Record<string, unknown>) ?? {};
    maxTrades = Number(features.maxTradesPerMonth ?? 50);
  }
  if (maxTrades <= 0) return Infinity;
  const firstOfMonth = new Date(); firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0);
  const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(tradeExecutions).where(and(eq(tradeExecutions.userId, userId), sql`${tradeExecutions.executionTimestamp} >= ${firstOfMonth}`));
  return Math.max(0, maxTrades - Number(result?.count ?? 0));
}

// ── Kill Switch Helpers ───────────────────────

function getISTDayBounds(now: Date = new Date()): { start: Date; end: Date } {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
  const startIST = new Date(nowIST); startIST.setUTCHours(0, 0, 0, 0);
  const endIST = new Date(nowIST); endIST.setUTCHours(23, 59, 59, 999);
  return { start: new Date(startIST.getTime() - IST_OFFSET_MS), end: new Date(endIST.getTime() - IST_OFFSET_MS) };
}

async function enforceKillSwitches(): Promise<{ activated: number; alerted75: number; checked: number }> {
  const db = getDatabase();
  const now = new Date();

  // Midnight reset
  const { start: istMidnight } = getISTDayBounds(now);
  const fiveMinAfterMidnight = new Date(istMidnight.getTime() + 5 * 60 * 1000);
  if (now >= istMidnight && now <= fiveMinAfterMidnight) {
    await db.update(riskProfiles).set({ killSwitchActive: false, killSwitchTriggeredAt: null, killSwitchReason: null, updatedAt: new Date() }).where(and(eq(riskProfiles.killSwitchActive, true), eq(riskProfiles.killSwitchResetMode, 'midnight')));
  }

  const { start: dayStart, end: dayEnd } = getISTDayBounds();
  const profiles = await db.select().from(riskProfiles).where(and(eq(riskProfiles.killSwitchEnabled, true), eq(riskProfiles.killSwitchActive, false))).limit(500);
  let activated = 0; let alerted75 = 0;

  for (const profile of profiles) {
    try {
      const userId = profile.userId;
      const todayTrades = await db.select({ netPnl: journalTrades.netPnl, status: journalTrades.status }).from(journalTrades).where(and(eq(journalTrades.userId, userId), gte(journalTrades.openedAt, dayStart), lte(journalTrades.openedAt, dayEnd))).orderBy(desc(journalTrades.openedAt));
      const closedToday = todayTrades.filter((t) => t.status === 'CLOSED');
      const todayNetPnl = closedToday.reduce((s, t) => s + (t.netPnl ?? 0), 0);
      const todayTradeCount = todayTrades.length;
      let consecutiveLosses = 0;
      for (const t of closedToday) { if ((t.netPnl ?? 0) < 0) consecutiveLosses++; else break; }

      const dailyLimitAbs = Number(profile.dailyLossLimitAbs ?? 0);
      const maxTrades = profile.maxTradesPerDay ?? 0;
      const maxConsec = profile.maxConsecutiveLosses ?? 0;

      let shouldActivate = false; let reason = '';
      if (dailyLimitAbs > 0 && todayNetPnl <= -dailyLimitAbs) { shouldActivate = true; reason = `Daily loss limit ₹${dailyLimitAbs.toLocaleString()} reached (P&L: ₹${todayNetPnl.toFixed(2)})`; }
      else if (maxTrades > 0 && todayTradeCount >= maxTrades) { shouldActivate = true; reason = `Max ${maxTrades} trades/day limit reached (${todayTradeCount} trades today)`; }
      else if (maxConsec > 0 && consecutiveLosses >= maxConsec) { shouldActivate = true; reason = `${consecutiveLosses} consecutive losses — mandatory break (limit: ${maxConsec})`; }

      if (shouldActivate) {
        await db.update(riskProfiles).set({ killSwitchActive: true, killSwitchTriggeredAt: new Date(), killSwitchReason: reason, updatedAt: new Date() }).where(eq(riskProfiles.userId, userId));
        await db.insert(notifications).values({ userId, type: 'KILL_SWITCH_ACTIVATED', channel: 'in_app', subject: '🛑 Trading Blocked — Kill Switch Activated', body: reason, isEnabled: profile.notifyOnKillSwitch, isDelivered: false }).onConflictDoNothing();
        activated++;

        // Dispatch instant alert to Discord & Telegram if configured
        try {
          const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
          const [webhookRow] = await db
            .select()
            .from(notifications)
            .where(and(eq(notifications.userId, userId), eq(notifications.type, 'webhook_config')))
            .limit(1);
          const prefs = (webhookRow?.metadata as Record<string, any>) ?? {};
          if (prefs.discordWebhookUrl || (prefs.telegramBotToken && prefs.telegramChatId)) {
            await sendRiskBreachNotification({
              discordWebhookUrl: prefs.discordWebhookUrl,
              telegramBotToken: prefs.telegramBotToken,
              telegramChatId: prefs.telegramChatId,
              data: {
                traderName: u?.name ?? 'Trader',
                timestampStr: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                breachType: dailyLimitAbs > 0 && todayNetPnl <= -dailyLimitAbs ? 'DAILY_LOSS_LIMIT' : 'OVERSIZING',
                severity: 'CRITICAL',
                currentNetPnl: todayNetPnl,
                limitThreshold: dailyLimitAbs,
                currency: '₹',
                actionTaken: 'Trading Locked & Emergency Circuit Breaker Engaged',
              },
            });
          }
        } catch (webhookErr) {
          console.error(`[KillSwitch Webhook Error] user=${userId}:`, webhookErr);
        }
      } else if (profile.notifyAt75Pct && dailyLimitAbs > 0 && todayNetPnl < 0 && Math.abs(todayNetPnl) >= dailyLimitAbs * 0.75) {
        const existing = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.type, 'KILL_SWITCH_WARNING_75PCT'), gte(notifications.createdAt, dayStart))).limit(1);
        if (existing.length === 0) {
          await db.insert(notifications).values({ userId, type: 'KILL_SWITCH_WARNING_75PCT', channel: 'in_app', subject: '⚠️ 75% Daily Loss Limit Reached', body: `You have used 75% of your daily loss limit. Current P&L: ₹${todayNetPnl.toFixed(2)}. Limit: ₹${profile.dailyLossLimitAbs}.`, isEnabled: true, isDelivered: false });
          alerted75++;
        }
      }
    } catch (err: any) { console.error(`[KillSwitch] Error: user=${profile.userId} — ${err?.message}`); }
  }
  return { activated, alerted75, checked: profiles.length };
}

// ── Report Helpers ────────────────────────────

async function computeDailyStats(userId: string) {
  const db = getDatabase();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const trades = await db.select().from(journalTrades).where(and(eq(journalTrades.userId, userId), gte(journalTrades.openedAt, startOfDay)));
  const closed = trades.filter((t) => t.status === 'CLOSED');
  const wins = closed.filter((t) => (t.netPnl ?? 0) > 0);
  const netPnl = closed.reduce((s, t) => s + (t.netPnl ?? 0), 0);
  const pnls = closed.map((t) => t.netPnl ?? 0);
  return { totalTrades: closed.length, winRate: closed.length > 0 ? wins.length / closed.length : 0, netPnl, bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0, worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0 };
}

async function computeWeeklyStats(userId: string) {
  const db = getDatabase();
  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - 7);
  const trades = await db.select().from(journalTrades).where(and(eq(journalTrades.userId, userId), gte(journalTrades.openedAt, startOfWeek)));
  const closed = trades.filter((t) => t.status === 'CLOSED');
  const wins = closed.filter((t) => (t.netPnl ?? 0) > 0);
  const totalPnl = closed.reduce((s, t) => s + (t.netPnl ?? 0), 0);
  const emotionCounts: Record<string, number> = {};
  for (const t of trades) { for (const e of ((t.emotions as string[]) ?? [])) emotionCounts[e] = (emotionCounts[e] ?? 0) + 1; }
  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'NEUTRAL';
  const winRate = closed.length > 0 ? wins.length / closed.length : 0;
  let grade = 'F';
  if (totalPnl > 0 && winRate >= 0.6) grade = 'A'; else if (totalPnl > 0 && winRate >= 0.4) grade = 'B'; else if (totalPnl > 0) grade = 'C'; else if (winRate >= 0.5) grade = 'D';
  return { totalTrades: closed.length, winRate, totalPnl, dominantEmotion, grade };
}

// ── POST Handler ──────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ worker?: string }> },
) {
  try {
    if (!verifyInternalSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { worker } = await params;
    const db = getDatabase();

  // ── sync ──────────────────────────────────────────────────────
  if (worker === 'sync') {
    const { connectionId, userId, brokerId } = await req.json().catch(() => ({}));
    if (!connectionId || !userId || !brokerId) {
      return NextResponse.json({ error: 'connectionId, userId, brokerId required' }, { status: 400 });
    }

    const syncLogId = crypto.randomUUID();
    await db.insert(syncLogs).values({ id: syncLogId, userId, brokerConnectionId: connectionId, syncType: 'incremental', status: 'RUNNING' });

    try {
      const [connection] = await db.select().from(brokerConnections).where(eq(brokerConnections.id, connectionId)).limit(1);
      if (!connection) throw new Error('Broker connection not found');

      if (connection.status === 'EXPIRED') {
        await db.update(syncLogs).set({ status: 'FAILED', completedAt: new Date(), errorMessage: 'Connection is expired. Reconnect your broker.' }).where(eq(syncLogs.id, syncLogId));
        return NextResponse.json({ status: 'skipped', reason: 'expired' });
      }

      if (connection.authType === 'csv_import') {
        await db.update(syncLogs).set({ status: 'SUCCESS', completedAt: new Date(), executionsImported: 0, tradesCreated: 0 }).where(eq(syncLogs.id, syncLogId));
        return NextResponse.json({ status: 'skipped', reason: 'csv_import' });
      }

      const decryptedAccessToken = decrypt(connection.accessToken);
      const decryptedRefreshToken = connection.refreshToken ? decrypt(connection.refreshToken) : undefined;
      const decryptedApiKey = connection.apiKey ? decrypt(connection.apiKey) : undefined;
      const decryptedApiSecret = connection.apiSecret ? decrypt(connection.apiSecret) : undefined;

      const config: BrokerConnectorConfig = {
        apiKey: decryptedApiKey, apiSecret: decryptedApiSecret,
        accessToken: decryptedAccessToken, refreshToken: decryptedRefreshToken,
        clientId: connection.brokerClientId,
      };

      const connector = await getBrokerConnector(brokerId as BrokerId, config);

      // Token refresh if needed
      if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) < new Date()) {
        if (decryptedRefreshToken) {
          const newTokens = await connector.refreshTokens(decryptedRefreshToken);
          await db.update(brokerConnections).set({ accessToken: encrypt(newTokens.accessToken), refreshToken: newTokens.refreshToken ? encrypt(newTokens.refreshToken) : connection.refreshToken, tokenExpiresAt: newTokens.expiresAt, status: 'ACTIVE' }).where(eq(brokerConnections.id, connectionId));
          config.accessToken = newTokens.accessToken;
        } else {
          await db.update(brokerConnections).set({ status: 'EXPIRED' }).where(eq(brokerConnections.id, connectionId));
          throw new Error('Broker token expired');
        }
      }

      // Balance
      try {
        const balance = await connector.fetchAccountBalance();
        await db.insert(accountBalances).values({ userId, brokerConnectionId: connectionId, availableCash: balance.availableCash ?? 0, usedMargin: balance.usedMargin ?? 0, totalCollateral: balance.totalCollateral ?? 0, payinAmount: balance.payinAmount ?? 0, payoutAmount: balance.payoutAmount ?? 0, currency: balance.currency ?? 'INR' }).onConflictDoUpdate({ target: accountBalances.brokerConnectionId, set: { availableCash: balance.availableCash ?? 0, usedMargin: balance.usedMargin ?? 0, totalCollateral: balance.totalCollateral ?? 0, payinAmount: balance.payinAmount ?? 0, payoutAmount: balance.payoutAmount ?? 0, currency: balance.currency ?? 'INR', updatedAt: new Date() } });
      } catch (e) { console.warn(`⚠️ Balance refresh failed for ${connectionId}:`, e); }

      const rawExecutions = await connector.fetchTradeBook();
      const processedExecutions: TradeExecution[] = [];
      for (const raw of rawExecutions) {
        const fees = await calculateFees({ segment: raw.segment, transactionType: raw.transactionType, tradeValue: raw.quantity * raw.executionPrice });
        processedExecutions.push({ ...raw, ...fees, userId, brokerConnectionId: connectionId, fillHash: createFillHash(brokerId, raw.brokerExecutionId, userId) });
      }

      let importedCount = 0;
      const remainingQuota = await getRemainingTradeQuota(userId);
      for (const exec of processedExecutions) {
        if (importedCount >= remainingQuota) break;
        const [result] = await db.insert(tradeExecutions).values(exec).onConflictDoNothing().returning({ id: tradeExecutions.id });
        if (result) importedCount++;
      }

      const newExecutions = await db.select().from(tradeExecutions).where(eq(tradeExecutions.brokerConnectionId, connectionId)).orderBy(tradeExecutions.executionTimestamp);
      const domainExecutions = newExecutions.map((e) => ({ ...e, exchangeOrderId: e.exchangeOrderId ?? undefined, rawPayload: e.rawPayload as Record<string, unknown> | undefined })) as unknown as TradeExecution[];
      const clusteringResult = clusterExecutions(domainExecutions);

      const existingTrades = await db.select().from(journalTrades).where(eq(journalTrades.brokerConnectionId, connectionId));
      const existingByKey = new Map(existingTrades.map((t) => [`${t.tradingsymbol}:${t.direction}:${new Date(t.openedAt).toISOString()}`, t]));
      const reconciledIds = new Set<string>();
      let tradesCreated = 0;

      for (const trade of clusteringResult.trades) {
        const key = `${trade.tradingsymbol}:${trade.direction}:${new Date(trade.openedAt ?? new Date()).toISOString()}`;
        const existing = existingByKey.get(key);
        const values = { userId: trade.userId!, brokerConnectionId: connectionId, tradingsymbol: trade.tradingsymbol!, exchange: trade.exchange!, assetClass: trade.assetClass!, direction: trade.direction!, status: trade.status ?? 'OPEN', totalQuantity: trade.totalQuantity ?? 0, openQuantity: trade.openQuantity ?? trade.totalQuantity ?? 0, avgEntryPrice: trade.avgEntryPrice ?? 0, avgExitPrice: trade.avgExitPrice, openedAt: trade.openedAt ?? new Date(), closedAt: trade.closedAt, grossPnl: trade.grossPnl ?? 0, totalFeesAndTaxes: trade.totalFeesAndTaxes ?? 0, netPnl: trade.netPnl ?? 0, maxFavorableExcursion: trade.maxFavorableExcursion, maxAdverseExcursion: trade.maxAdverseExcursion, rMultiple: trade.rMultiple, holdingPeriodMinutes: trade.holdingPeriodMinutes };
        let journalTradeId: string;
        if (existing) {
          journalTradeId = existing.id; reconciledIds.add(existing.id);
          await db.update(journalTrades).set({ ...values, updatedAt: new Date() }).where(eq(journalTrades.id, existing.id));
          await db.delete(tradeExecutionLinks).where(eq(tradeExecutionLinks.journalTradeId, existing.id));
        } else {
          const [inserted] = await db.insert(journalTrades).values(values).returning({ id: journalTrades.id });
          if (!inserted) continue;
          journalTradeId = inserted.id; reconciledIds.add(inserted.id); tradesCreated++;
        }
        const tradeLinks = clusteringResult.links.filter((l) => l.journalTradeId === trade.id);
        for (const link of tradeLinks) {
          await db.insert(tradeExecutionLinks).values({ journalTradeId, executionId: link.executionId, allocatedQuantity: link.allocatedQuantity, allocatedFees: link.allocatedFees }).onConflictDoNothing();
        }
      }

      for (const existing of existingTrades) { if (!reconciledIds.has(existing.id)) await db.delete(journalTrades).where(eq(journalTrades.id, existing.id)); }

      await db.update(syncLogs).set({ status: 'SUCCESS', completedAt: new Date(), executionsImported: importedCount, tradesCreated }).where(eq(syncLogs.id, syncLogId));
      await db.update(brokerConnections).set({ lastSyncedAt: new Date() }).where(eq(brokerConnections.id, connectionId));

      return NextResponse.json({ status: 'success', importedCount, tradesCreated });
    } catch (error: any) {
      await db.update(syncLogs).set({ status: 'FAILED', completedAt: new Date(), errorMessage: error.message }).where(eq(syncLogs.id, syncLogId));
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
  }

  // ── kill-switch ────────────────────────────────────────────────
  if (worker === 'kill-switch') {
    try {
      const result = await enforceKillSwitches();
      return NextResponse.json({ status: 'success', ...result });
    } catch (err: any) {
      return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
    }
  }

  // ── token-refresh ──────────────────────────────────────────────
  if (worker === 'token-refresh') {
    try {
      const result = await refreshExpiringTokens();
      return NextResponse.json({ status: 'success', ...result });
    } catch (err: any) {
      return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
    }
  }

  // ── report-generator ──────────────────────────────────────────
  if (worker === 'report-generator') {
    const { type } = await req.json().catch(() => ({ type: 'daily' })) as { type: 'daily' | 'weekly' };
    try {
      const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
      let sent = 0;
      for (const u of allUsers) {
        try {
          if (type === 'daily') {
            const stats = await computeDailyStats(u.id);
            if (stats.totalTrades > 0) {
              await sendDailySummary(u.id, u.email, stats);
              sent++;

              // Also dispatch EOD debrief to Discord & Telegram if configured
              try {
                const [userRow] = await db.select({ name: users.name }).from(users).where(eq(users.id, u.id)).limit(1);
                const [webhookRow] = await db
                  .select()
                  .from(notifications)
                  .where(and(eq(notifications.userId, u.id), eq(notifications.type, 'webhook_config')))
                  .limit(1);
                const prefs = (webhookRow?.metadata as Record<string, any>) ?? {};
                if (prefs.discordWebhookUrl || (prefs.telegramBotToken && prefs.telegramChatId)) {
                  await sendEodDebriefNotification({
                    discordWebhookUrl: prefs.discordWebhookUrl,
                    telegramBotToken: prefs.telegramBotToken,
                    telegramChatId: prefs.telegramChatId,
                    data: {
                      traderName: userRow?.name ?? 'Trader',
                      dateStr: new Date().toISOString().split('T')[0],
                      totalTrades: stats.totalTrades,
                      winCount: Math.round(stats.totalTrades * stats.winRate),
                      lossCount: stats.totalTrades - Math.round(stats.totalTrades * stats.winRate),
                      winRate: Math.round(stats.winRate * 100),
                      netPnl: stats.netPnl,
                      currency: '₹',
                      profitFactor: stats.bestTrade > 0 && Math.abs(stats.worstTrade) > 0 ? Number((stats.bestTrade / Math.abs(stats.worstTrade)).toFixed(2)) : 1.5,
                      topWinner: stats.bestTrade > 0 ? { symbol: 'Best Trade', pnl: stats.bestTrade } : undefined,
                      worstLoser: stats.worstTrade < 0 ? { symbol: 'Worst Trade', pnl: stats.worstTrade } : undefined,
                      behavioralLeak: stats.netPnl < 0 ? 'Exceeded loss boundary or held through drawdown' : undefined,
                      aiAdvice: stats.netPnl >= 0 ? 'High discipline day. Lock in profits and maintain current position sizing.' : 'Protect capital tomorrow. Cut size in half for the first 3 trades.',
                    },
                  });
                }
              } catch (dispatchErr) {
                console.error(`[EOD Webhook Error] user=${u.id}:`, dispatchErr);
              }
            }
          } else {
            const stats = await computeWeeklyStats(u.id);
            if (stats.totalTrades > 0) { await sendWeeklyReport(u.id, u.email, stats); sent++; }
          }
        } catch (e) { console.error(`❌ Failed to send ${type} report to ${u.email}:`, e); }
      }
      return NextResponse.json({ status: 'success', type, sent, total: allUsers.length });
    } catch (err: any) {
      return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
    }
  }

  // ── cleanup ───────────────────────────────────────────────────
  if (worker === 'cleanup') {
    try {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const deletedLogs = await db.delete(syncLogs).where(lt(syncLogs.createdAt, ninetyDaysAgo));
      const cleanedExecs = await db.update(tradeExecutions).set({ rawPayload: null as any }).where(and(lt(tradeExecutions.createdAt, thirtyDaysAgo), sql`${tradeExecutions.rawPayload} IS NOT NULL`));
      const purgedCache = await purgeExpiredCache();

      return NextResponse.json({ status: 'success', deletedSyncLogs: (deletedLogs as any).count ?? 0, cleanedExecPayloads: (cleanedExecs as any).count ?? 0, purgedCacheEntries: purgedCache });
    } catch (err: any) {
      return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown worker' }, { status: 404 });
  } catch (err: unknown) {
    console.error('[Internal Workers POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
