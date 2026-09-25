// ──────────────────────────────────────────────
// TradeMind — Automated End-of-Day (EOD) Trade Digest Service
//
// Computes real-time post-market reports at market close:
// - Indian Markets (NSE/BSE/MCX): 3:45 PM IST (10:15 UTC)
// - US Equities (NYSE/NASDAQ):     4:15 PM EST (21:15 / 20:15 UTC)
// - Global Crypto & Forex (24/7): 00:00 UTC
//
// Calculates:
// - Realized Gross & Net P&L, fees, win rate, profit factor
// - Algorithmic Discipline Score (0-100) based on rule adherence
// - Behavioral Mistake Detection (FOMO, Revenge Trading, Chased Entries, etc.)
// - AI Coach Post-Market Debrief & Tomorrow's Operating Directive
// - In-App, Email, Push & Webhook Dispatching
// ──────────────────────────────────────────────

import { getDatabase, journalTrades, notifications, backgroundJobs, users } from '@trademind/database';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { sendEodDebriefNotification } from './notification/webhook-dispatcher.service';
import { aiGenerate, isAiConfigured } from './ai/ai.client';
import { recordAdminAudit } from './admin-audit.service';

export type MarketSession = 'IST' | 'EST' | 'UTC' | 'ALL';

export interface DetectedMistake {
  code: string;
  name: string;
  count: number;
  impactPnl: number;
  severity: 'CRITICAL' | 'WARNING' | 'NOTICE';
  behavioralDescription: string;
  preventionAdvice: string;
}

export interface EodDigestData {
  userId: string;
  traderName: string;
  session: MarketSession;
  sessionName: string;
  sessionCloseTime: string;
  dateStr: string;
  currency: string;
  curSymbol: string;

  // Realized Financial Outcomes
  realizedGrossPnl: number;
  realizedNetPnl: number;
  totalFeesAndTaxes: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number; // percentage 0-100
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: { symbol: string; pnl: number; direction: string } | null;
  worstTrade: { symbol: string; pnl: number; direction: string } | null;

  // Discipline & Behavioral Metrics
  disciplineScore: number; // 0-100
  disciplineGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  disciplineVerdict: string;
  mistakesDetected: DetectedMistake[];
  dominantEmotion: string;
  emotionsSummary: Record<string, number>;

  // AI & Coach Takeaways
  headline: string;
  aiExecutiveSummary: string;
  topBehavioralLeak: string;
  tomorrowActionRule: string;
  generatedAt: string;
}

/**
 * Calculates start and end timestamps for a given market session
 */
export function getSessionDateRange(session: MarketSession): {
  start: Date;
  end: Date;
  dateStr: string;
  sessionName: string;
  sessionCloseTime: string;
} {
  const now = new Date();

  if (session === 'IST') {
    // Indian Market: 9:00 AM IST to 3:45 PM IST (UTC+5:30)
    // 3:45 PM IST = 10:15 AM UTC
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istStart = new Date(istNow);
    istStart.setUTCHours(3, 30, 0, 0); // 09:00 IST = 03:30 UTC
    const istEnd = new Date(istNow);
    istEnd.setUTCHours(10, 15, 0, 0); // 15:45 IST = 10:15 UTC

    const dateStr = istNow.toISOString().split('T')[0]!;
    return {
      start: new Date(istStart.getTime() - istOffset),
      end: new Date(istEnd.getTime() - istOffset),
      dateStr,
      sessionName: 'Indian Markets (NSE / BSE / MCX)',
      sessionCloseTime: '3:45 PM IST',
    };
  }

  if (session === 'EST') {
    // US Market: 9:30 AM EST to 4:15 PM EST (UTC-5 or UTC-4 during EDT)
    // Approx 13:30 UTC to 20:15 / 21:15 UTC
    const estOffset = -4 * 60 * 60 * 1000; // Daylight Savings default
    const estNow = new Date(now.getTime() + estOffset);
    const start = new Date(estNow);
    start.setUTCHours(13, 30, 0, 0);
    const end = new Date(estNow);
    end.setUTCHours(20, 15, 0, 0);

    const dateStr = estNow.toISOString().split('T')[0]!;
    return {
      start: new Date(start.getTime() - estOffset),
      end: new Date(end.getTime() - estOffset),
      dateStr,
      sessionName: 'US Equities (NYSE / NASDAQ)',
      sessionCloseTime: '4:15 PM EST',
    };
  }

  if (session === 'UTC') {
    // Crypto 24/7 Global Session: 00:00 UTC to 23:59:59 UTC
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setUTCHours(23, 59, 59, 999);

    const dateStr = now.toISOString().split('T')[0]!;
    return {
      start,
      end,
      dateStr,
      sessionName: 'Global Crypto & Forex (24/7)',
      sessionCloseTime: '00:00 UTC (Daily Rollover)',
    };
  }

  // ALL: Full today calendar range
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const dateStr = now.toISOString().split('T')[0]!;
  return {
    start,
    end,
    dateStr,
    sessionName: 'All Markets Session',
    sessionCloseTime: 'Daily Post-Market Close',
  };
}

/**
 * Generate comprehensive EOD Trade Digest for a trader
 */
export async function generateEodDigest(
  userId: string,
  session: MarketSession = 'ALL'
): Promise<EodDigestData> {
  const db = getDatabase();
  const sessionInfo = getSessionDateRange(session);

  // 1. Fetch user profile
  const [userRecord] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      currency: users.preferredCurrency,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const traderName = userRecord?.name || 'Trader';
  const currency = userRecord?.currency || (session === 'IST' ? 'INR' : 'USD');
  const curSymbol =
    currency === 'INR' ? '₹' :
    currency === 'EUR' ? '€' :
    currency === 'GBP' ? '£' :
    currency === 'USDT' ? '₮' : '$';

  // 2. Fetch trades closed or opened today in the session window
  // Also fallback to today's full range if session bounds are narrow
  const trades = await db
    .select()
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, userId),
        gte(journalTrades.openedAt, sessionInfo.start),
        lte(journalTrades.openedAt, sessionInfo.end),
      )
    )
    .orderBy(desc(journalTrades.closedAt));

  // If no trades found in narrow session hours, fall back to today's trades
  let activeTrades = trades;
  if (activeTrades.length === 0 && session !== 'ALL') {
    const todayFallback = getSessionDateRange('ALL');
    const fallbackTrades = await db
      .select()
      .from(journalTrades)
      .where(
        and(
          eq(journalTrades.userId, userId),
          gte(journalTrades.openedAt, todayFallback.start),
          lte(journalTrades.openedAt, todayFallback.end),
        )
      )
      .orderBy(desc(journalTrades.closedAt));
    if (fallbackTrades.length > 0) {
      activeTrades = fallbackTrades;
    }
  }

  // 3. Compute Realized P&L and Financial Metrics
  let grossPnl = 0;
  let netPnl = 0;
  let totalFees = 0;
  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  let grossWinsSum = 0;
  let grossLossesSum = 0;

  let bestTrade: EodDigestData['bestTrade'] = null;
  let worstTrade: EodDigestData['worstTrade'] = null;

  const emotionsMap: Record<string, number> = {};
  const mistakesMap: Record<string, { count: number; impactPnl: number }> = {};

  for (const t of activeTrades) {
    const net = Number(t.netPnl || 0);
    const gross = Number(t.grossPnl || 0);
    const fees = Number(t.totalFeesAndTaxes || 0);

    grossPnl += gross;
    netPnl += net;
    totalFees += fees;

    if (net > 0) {
      wins++;
      grossWinsSum += net;
      if (!bestTrade || net > bestTrade.pnl) {
        bestTrade = { symbol: t.tradingsymbol, pnl: net, direction: t.direction };
      }
    } else if (net < 0) {
      losses++;
      grossLossesSum += Math.abs(net);
      if (!worstTrade || net < worstTrade.pnl) {
        worstTrade = { symbol: t.tradingsymbol, pnl: net, direction: t.direction };
      }
    } else {
      breakevens++;
    }

    // Emotions tally
    for (const e of (t.emotions as string[] | null) ?? []) {
      emotionsMap[e] = (emotionsMap[e] || 0) + 1;
    }

    // Mistake tags tally
    for (const m of (t.mistakeTags as string[] | null) ?? []) {
      if (!mistakesMap[m]) {
        mistakesMap[m] = { count: 0, impactPnl: 0 };
      }
      mistakesMap[m]!.count += 1;
      if (net < 0) {
        mistakesMap[m]!.impactPnl += Math.abs(net);
      }
    }
  }

  const totalTrades = activeTrades.length;
  const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(1)) : 0;
  const profitFactor = grossLossesSum > 0 ? Number((grossWinsSum / grossLossesSum).toFixed(2)) : wins > 0 ? 5.0 : 0.0;
  const avgWin = wins > 0 ? Number((grossWinsSum / wins).toFixed(2)) : 0;
  const avgLoss = losses > 0 ? Number((grossLossesSum / losses).toFixed(2)) : 0;

  // 4. Calculate Algorithmic Discipline Score (0-100)
  // Baseline: 100
  // Deductions:
  // - Mistake tags: -8 pts per recorded mistake
  // - High frequency overtrading (> 8 trades): -10 pts
  // - Negative P&L with more than 3 consecutive losses: -15 pts
  // - Unfavorable Risk-Reward (Avg Loss > 1.5 * Avg Win): -15 pts
  let disciplineDeductions = 0;
  const totalMistakesCount = Object.values(mistakesMap).reduce((acc, cur) => acc + cur.count, 0);
  disciplineDeductions += Math.min(totalMistakesCount * 8, 40);

  if (totalTrades > 10) {
    disciplineDeductions += 15;
  } else if (totalTrades > 6) {
    disciplineDeductions += 5;
  }

  if (avgLoss > 0 && avgWin > 0 && avgLoss > avgWin * 1.5) {
    disciplineDeductions += 15;
  }

  if (netPnl < 0 && losses >= 3) {
    disciplineDeductions += 10;
  }

  const disciplineScore = Math.max(15, Math.min(100, 100 - disciplineDeductions));

  let disciplineGrade: EodDigestData['disciplineGrade'] = 'A+';
  let disciplineVerdict = 'Flawless institutional execution with zero tilt indicators.';

  if (disciplineScore >= 90) {
    disciplineGrade = 'A+';
    disciplineVerdict = 'Elite discipline. System rules and risk boundaries respected with high precision.';
  } else if (disciplineScore >= 80) {
    disciplineGrade = 'A';
    disciplineVerdict = 'Solid discipline. Execution adhered to trade playbook with minor slips.';
  } else if (disciplineScore >= 70) {
    disciplineGrade = 'B';
    disciplineVerdict = 'Moderate discipline. Avoid emotional escalations and tighten stop-loss protocol.';
  } else if (disciplineScore >= 55) {
    disciplineGrade = 'C';
    disciplineVerdict = 'Elevated behavioral risk. Chased entries or early exits eroded session edge.';
  } else if (disciplineScore >= 40) {
    disciplineGrade = 'D';
    disciplineVerdict = 'Severe rule violation. Revenge trading impulses detected during session.';
  } else {
    disciplineGrade = 'F';
    disciplineVerdict = 'Critical risk breach. Stop trading immediately and enforce cooldown ritual.';
  }

  // 5. Structure Detected Mistakes with Actionable Behavioral Antidotes
  const mistakesDetected: DetectedMistake[] = Object.entries(mistakesMap).map(([rawCode, val]) => {
    const code = rawCode.toUpperCase().replace(/\s+/g, '_');
    let name = rawCode;
    let severity: DetectedMistake['severity'] = 'WARNING';
    let behavioralDescription = 'Deviation from verified trading rules during trade execution.';
    let preventionAdvice = 'Review trade entry criteria on playbook checklist before clicking confirm.';

    if (code.includes('FOMO') || code.includes('CHASE')) {
      name = 'FOMO / Chased Entry';
      severity = 'CRITICAL';
      behavioralDescription = 'Entered after candle had already extended beyond valid R:R entry zone.';
      preventionAdvice = 'Set alert at key level. If price moves without you, let it go. There is always another setup.';
    } else if (code.includes('REVENGE')) {
      name = 'Revenge Trading Impulse';
      severity = 'CRITICAL';
      behavioralDescription = 'Scaled into immediate counter-positions following a stop-out without cooling off.';
      preventionAdvice = 'Enforce mandatory 15-minute lock screen following any stop-out.';
    } else if (code.includes('STOP') || code.includes('SL')) {
      name = 'Moved / Widened Stop-Loss';
      severity = 'CRITICAL';
      behavioralDescription = 'Manually pushed protective stop away to avoid admitting loss.';
      preventionAdvice = 'Inviolable law: Hard stops placed at entry can NEVER be moved wider. Only trail in profit.';
    } else if (code.includes('EARLY') || code.includes('PREMATURE')) {
      name = 'Premature Profit Exit';
      severity = 'WARNING';
      behavioralDescription = 'Closed winning position out of fear before reaching pre-planned target.';
      preventionAdvice = 'Trail stop using technical structure (e.g. 5m swing lows) rather than P&L dollar watching.';
    } else if (code.includes('OVERLEVERAGED') || code.includes('SIZING')) {
      name = 'Position Sizing Overexposure';
      severity = 'CRITICAL';
      behavioralDescription = 'Allocated larger position size than 1-2% account risk limit.';
      preventionAdvice = 'Always use Position Size Calculator before entering order ticket.';
    }

    return {
      code,
      name,
      count: val.count,
      impactPnl: Number(val.impactPnl.toFixed(2)),
      severity,
      behavioralDescription,
      preventionAdvice,
    };
  });

  // Sort mistakes by impact P&L descending
  mistakesDetected.sort((a, b) => b.impactPnl - a.impactPnl);

  // Dominant emotion
  const dominantEmotion = Object.entries(emotionsMap).sort(([, a], [, b]) => b - a)[0]?.[0] || 'NEUTRAL';

  // 6. AI Coach Debrief Generation (or Rule-Based Synthesis)
  let headline = netPnl >= 0
    ? `Strong Session: +${curSymbol}${netPnl.toFixed(2)} with ${disciplineGrade} Discipline`
    : `Defensive Session: ${curSymbol}${netPnl.toFixed(2)} Realized P&L (${disciplineScore}/100 Discipline)`;

  let aiExecutiveSummary = totalTrades === 0
    ? 'No trades executed in this market session. Capital 100% defended.'
    : `Completed ${totalTrades} executions (${wins}W / ${losses}L) across ${sessionInfo.sessionName}. Realized net outcome was ${curSymbol}${netPnl.toFixed(2)} with ${winRate}% win rate.`;

  let topBehavioralLeak = mistakesDetected.length > 0
    ? `${mistakesDetected[0]!.name} caused an estimated ${curSymbol}${mistakesDetected[0]!.impactPnl.toFixed(2)} drawdown across ${mistakesDetected[0]!.count} execution(s).`
    : 'No severe behavioral leaks detected. Execution stayed aligned with risk protocol.';

  let tomorrowActionRule = netPnl >= 0
    ? 'Lock profits: Continue executing high-probability setups and maintain current position sizing.'
    : 'Capital preservation first: Cut risk per trade in half for the first 2 setups of tomorrow’s opening bell.';

  if (isAiConfigured() && totalTrades > 0) {
    try {
      const prompt = `You are the Lead Risk & Behavioral Coach at TradeMind Institutional Journal.
Review this trader's completed session data:
Trader: ${traderName}
Session: ${sessionInfo.sessionName} (${sessionInfo.sessionCloseTime})
Total Trades: ${totalTrades} (Wins: ${wins}, Losses: ${losses}, Win Rate: ${winRate}%)
Realized Net P&L: ${curSymbol}${netPnl.toFixed(2)}
Discipline Score: ${disciplineScore}/100 (${disciplineGrade})
Detected Mistakes: ${mistakesDetected.map((m) => `${m.name} (${m.count}x)`).join(', ') || 'None'}
Dominant Emotion: ${dominantEmotion}

Generate an institutional post-market executive digest. Respond ONLY with valid JSON (no markdown):
{
  "headline": "<max 90 chars punchy executive headline>",
  "executiveSummary": "<max 180 chars synthesis of performance and capital defense>",
  "topBehavioralLeak": "<max 140 chars actionable leak diagnosis>",
  "tomorrowActionRule": "<max 130 chars exact single rule for tomorrow's opening bell>"
}`;

      const aiRes = await aiGenerate({ prompt, maxOutputTokens: 250, temperature: 0.4 });
      if (aiRes) {
        const cleaned = aiRes.text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.headline) headline = String(parsed.headline).slice(0, 100);
        if (parsed.executiveSummary) aiExecutiveSummary = String(parsed.executiveSummary).slice(0, 220);
        if (parsed.topBehavioralLeak) topBehavioralLeak = String(parsed.topBehavioralLeak).slice(0, 180);
        if (parsed.tomorrowActionRule) tomorrowActionRule = String(parsed.tomorrowActionRule).slice(0, 160);
      }
    } catch {
      // Use fallback
    }
  }

  return {
    userId,
    traderName,
    session,
    sessionName: sessionInfo.sessionName,
    sessionCloseTime: sessionInfo.sessionCloseTime,
    dateStr: sessionInfo.dateStr,
    currency,
    curSymbol,
    realizedGrossPnl: Number(grossPnl.toFixed(2)),
    realizedNetPnl: Number(netPnl.toFixed(2)),
    totalFeesAndTaxes: Number(totalFees.toFixed(2)),
    totalTrades,
    wins,
    losses,
    breakevens,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    bestTrade,
    worstTrade,
    disciplineScore,
    disciplineGrade,
    disciplineVerdict,
    mistakesDetected,
    dominantEmotion,
    emotionsSummary: emotionsMap,
    headline,
    aiExecutiveSummary,
    topBehavioralLeak,
    tomorrowActionRule,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Delivers EOD digest to user across In-App, Push/Webhook, and Email
 */
export async function deliverEodDigestToUser(
  userId: string,
  digest: EodDigestData,
  channels: ('in_app' | 'webhook' | 'email' | 'push')[] = ['in_app', 'webhook', 'email']
): Promise<{
  inApp: boolean;
  webhook: { discord?: boolean; telegram?: boolean };
  emailJobQueued: boolean;
}> {
  const db = getDatabase();
  const results = {
    inApp: false,
    webhook: { discord: false, telegram: false },
    emailJobQueued: false,
  };

  // 1. In-App Notification Record
  if (channels.includes('in_app')) {
    try {
      const subject = `📊 ${digest.headline}`;
      const body = `${digest.sessionCloseTime} Debrief: Realized Net P&L ${digest.curSymbol}${digest.realizedNetPnl.toLocaleString()} | Discipline Score: ${digest.disciplineScore}/100 (${digest.disciplineGrade}). Rule for tomorrow: ${digest.tomorrowActionRule}`;

      await db.insert(notifications).values({
        userId,
        type: 'eod_digest',
        channel: 'in_app',
        subject,
        body,
        isEnabled: true,
        isDelivered: true,
        deliveredAt: new Date(),
        metadata: digest as unknown as Record<string, unknown>,
      });
      results.inApp = true;
    } catch (err) {
      console.error(`[EOD Delivery] In-app notification error for ${userId}:`, err);
    }
  }

  // 2. Webhook / Push (Discord & Telegram)
  if (channels.includes('webhook') || channels.includes('push')) {
    try {
      const [webhookRow] = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.type, 'webhook_config')))
        .limit(1);

      const prefs = (webhookRow?.metadata as Record<string, any>) ?? {};
      if (prefs.discordWebhookUrl || (prefs.telegramBotToken && prefs.telegramChatId)) {
        const webhookRes = await sendEodDebriefNotification({
          discordWebhookUrl: prefs.discordWebhookUrl,
          telegramBotToken: prefs.telegramBotToken,
          telegramChatId: prefs.telegramChatId,
          data: {
            traderName: digest.traderName,
            dateStr: `${digest.dateStr} (${digest.sessionCloseTime})`,
            totalTrades: digest.totalTrades,
            winCount: digest.wins,
            lossCount: digest.losses,
            winRate: digest.winRate,
            netPnl: digest.realizedNetPnl,
            currency: digest.curSymbol,
            profitFactor: digest.profitFactor,
            topWinner: digest.bestTrade ? { symbol: digest.bestTrade.symbol, pnl: digest.bestTrade.pnl } : undefined,
            worstLoser: digest.worstTrade ? { symbol: digest.worstTrade.symbol, pnl: digest.worstTrade.pnl } : undefined,
            behavioralLeak: `${digest.disciplineGrade} Grade (${digest.disciplineScore}/100) — ${digest.topBehavioralLeak}`,
            aiAdvice: digest.tomorrowActionRule,
          },
        });

        results.webhook.discord = webhookRes.discord?.success ?? false;
        results.webhook.telegram = webhookRes.telegram?.success ?? false;
      }
    } catch (err) {
      console.error(`[EOD Delivery] Webhook error for ${userId}:`, err);
    }
  }

  // 3. Queue Email Job
  if (channels.includes('email')) {
    try {
      await db.insert(backgroundJobs).values({
        queue: 'notifications',
        jobName: 'send-eod-email-digest',
        payload: {
          userId,
          digest,
          recipientEmail: digest.userId,
          enqueuedAt: new Date().toISOString(),
        },
        maxAttempts: 3,
        status: 'PENDING',
        runAt: new Date(),
      });
      results.emailJobQueued = true;
    } catch (err) {
      console.error(`[EOD Delivery] Failed to enqueue email job for ${userId}:`, err);
    }
  }

  return results;
}

/**
 * Dispatch automated market close EOD digests to all active traders
 * Triggered at:
 * - 3:45 PM IST for Indian Markets
 * - 4:15 PM EST for US Markets
 * - 00:00 UTC for Global Crypto / Forex
 */
export async function dispatchMarketCloseDigests(
  session: MarketSession,
  adminUserId?: string
): Promise<{
  session: MarketSession;
  sessionName: string;
  totalEligibleUsers: number;
  processedCount: number;
  sentCount: number;
  skippedCount: number;
  errors: Array<{ userId: string; error: string }>;
  durationMs: number;
}> {
  const startTime = Date.now();
  const db = getDatabase();
  const sessionInfo = getSessionDateRange(session);

  // 1. Find all users who executed trades today or have active accounts
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users);

  const errors: Array<{ userId: string; error: string }> = [];
  let sentCount = 0;
  let skippedCount = 0;

  for (const u of allUsers) {
    try {
      const digest = await generateEodDigest(u.id, session);

      // Only send if the user either took trades or session was triggered explicitly
      if (digest.totalTrades > 0 || session === 'ALL') {
        await deliverEodDigestToUser(u.id, digest, ['in_app', 'webhook', 'email']);
        sentCount++;
      } else {
        skippedCount++;
      }
    } catch (err: any) {
      errors.push({
        userId: u.id,
        error: err?.message || 'Failed to dispatch EOD digest',
      });
    }
  }

  const durationMs = Date.now() - startTime;

  // Log to Admin Audit Log if admin triggered or system job
  try {
    if (adminUserId) {
      await recordAdminAudit({
        actor: { id: adminUserId, email: 'admin@trademind.internal' },
        action: 'EOD_DIGEST_BATCH_DISPATCH',
        entityType: 'eod_digest',
        metadata: {
          session,
          sessionName: sessionInfo.sessionName,
          totalEligibleUsers: allUsers.length,
          sentCount,
          skippedCount,
          errorCount: errors.length,
          durationMs,
        },
      });
    }
  } catch (logErr) {
    console.warn('[EOD Dispatch] Audit log insert failed:', logErr);
  }

  return {
    session,
    sessionName: sessionInfo.sessionName,
    totalEligibleUsers: allUsers.length,
    processedCount: sentCount + skippedCount,
    sentCount,
    skippedCount,
    errors,
    durationMs,
  };
}
