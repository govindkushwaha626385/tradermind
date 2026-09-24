// ──────────────────────────────────────────────
// TradeMind — Behavioral Shield Service (v2.0)
//
// Pure algorithmic detection of dangerous trading patterns.
// NO LLM calls — zero AI cost. Runs in milliseconds on trade & account data.
//
// Key Guardrails:
//   1. Daily Loss Limit (80% warning & 100% emergency lockout)
//   2. Rapid Revenge Trading (< 5 min re-entry & size escalation)
//   3. Prop Firm Trailing Drawdown Guard (FTMO, FundedNext, Apex buffer monitoring)
//   4. Overtrading & Frequency Clustering (>5 trades in 2 hrs or daily cap)
//   5. Win-Streak Overconfidence (position size inflation after 3 wins)
//   6. Emotional Cascade (3+ tilt tags in session)
// ──────────────────────────────────────────────

import { getDatabase, journalTrades, propFirmAccounts, users } from '@trademind/database';
import { eq, and, gte, desc } from 'drizzle-orm';
import { getTodayPremarketPlan } from '../premarket.service';

export type ShieldLevel = 'none' | 'caution' | 'warning' | 'danger';

export interface ShieldFlag {
  type:
    | 'revenge_trading'
    | 'overtrading'
    | 'overconfidence'
    | 'loss_limit'
    | 'prop_firm_drawdown'
    | 'emotion_cascade';
  severity: ShieldLevel;
  title: string;
  description: string;
  recommendation: string;
  metric?: {
    current: number;
    threshold: number;
    unit: string;
  };
}

export interface BehavioralShieldResult {
  level: ShieldLevel;
  flags: ShieldFlag[];
  tradesAnalyzed: number;
  dailyPnl: number;
  todayTradeCount: number;
  alertMessage: string;
  cooldownActive: boolean;
  cooldownMinutesRemaining: number;
  currency: string;
  currencySymbol: string;
}

const SEVERITY_RANK: Record<ShieldLevel, number> = { none: 0, caution: 1, warning: 2, danger: 3 };

function maxLevel(a: ShieldLevel, b: ShieldLevel): ShieldLevel {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/**
 * Analyze recent trades and active prop firm challenges for behavioral red flags.
 * Returns a complete shield result with all active flags and emergency cooldown status.
 */
export async function runBehavioralShield(userId: string): Promise<BehavioralShieldResult> {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const todayCutoff = new Date();
  todayCutoff.setHours(0, 0, 0, 0);

  // Fetch user currency
  const [userRecord] = await db
    .select({ currency: users.preferredCurrency })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const currency = userRecord?.currency || 'INR';
  const curSymbol =
    currency === 'USD' ? '$' :
    currency === 'EUR' ? '€' :
    currency === 'GBP' ? '£' : '₹';

  // Fetch recent trades ordered oldest → newest
  const trades = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.userId, userId), gte(journalTrades.openedAt, cutoff)))
    .orderBy(journalTrades.openedAt);

  const flags: ShieldFlag[] = [];
  let overallLevel: ShieldLevel = 'none';

  // ── Today's stats ──────────────────────────
  const todayTrades = trades.filter((t) => new Date(t.openedAt) >= todayCutoff);
  const dailyPnl = todayTrades.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
  const todayTradeCount = todayTrades.length;

  // ── Pre-Market Plan Integration ──────────────
  const premarketPlan = await getTodayPremarketPlan(userId).catch(() => null);
  const maxLossLimit = premarketPlan?.maxDailyLoss ?? (currency === 'USD' ? 250 : 5000);
  const maxTradesCap = premarketPlan?.maxDailyTrades ?? 6;

  // ── 1. Daily Loss Limit Check (80% Warning & 100% Danger) ─────────
  if (dailyPnl <= -maxLossLimit) {
    const severity: ShieldLevel = 'danger';
    flags.push({
      type: 'loss_limit',
      severity,
      title: premarketPlan?.maxDailyLoss ? 'Pre-Market Daily Loss Limit Breached' : 'Daily Loss Limit Breached',
      description: `You are down ${curSymbol}${Math.abs(dailyPnl).toFixed(0)} today (Limit: ${curSymbol}${maxLossLimit}). Continuing to trade violates capital preservation rules.`,
      recommendation: 'Emergency Stop: Close trading screens immediately for the rest of today. Capital defense is priority #1.',
      metric: { current: Math.abs(dailyPnl), threshold: maxLossLimit, unit: curSymbol },
    });
    overallLevel = maxLevel(overallLevel, severity);
  } else if (dailyPnl <= -maxLossLimit * 0.8) {
    const severity: ShieldLevel = 'warning';
    flags.push({
      type: 'loss_limit',
      severity,
      title: 'Approaching Daily Loss Budget (80%+)',
      description: `You have consumed over 80% of your daily loss limit (down ${curSymbol}${Math.abs(dailyPnl).toFixed(0)} of ${curSymbol}${maxLossLimit}).`,
      recommendation: 'Reduce position sizing by 50% or take a pause. One more loss will trigger a hard daily stopout.',
      metric: { current: Math.abs(dailyPnl), threshold: maxLossLimit, unit: curSymbol },
    });
    overallLevel = maxLevel(overallLevel, severity);
  }

  // ── 2. Rapid Revenge Trading (< 5 Min Re-entry & Size Escalation) ──
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  for (let i = 0; i < closedTrades.length - 1; i++) {
    const loser = closedTrades[i];
    if (!loser) continue;
    if (Number(loser.netPnl || 0) >= 0) continue; // Not a loss

    const loserClose = loser.closedAt ? new Date(loser.closedAt) : null;
    if (!loserClose) continue;

    const twentyMinLater = new Date(loserClose.getTime() + 20 * 60 * 1000);

    // Find next trade opened within 20 min after this loss
    const nextTrade = trades.find(
      (t) => t.id !== loser.id && new Date(t.openedAt) > loserClose && new Date(t.openedAt) <= twentyMinLater
    );

    if (nextTrade) {
      const minutesElapsed = Math.max(1, Math.round((new Date(nextTrade.openedAt).getTime() - loserClose.getTime()) / 60000));
      const loserSize = Math.max(1, Number(loser.totalQuantity || 1) * Number(loser.avgEntryPrice || 1));
      const nextSize = Math.max(1, Number(nextTrade.totalQuantity || 1) * Number(nextTrade.avgEntryPrice || 1));
      const sizeRatio = nextSize / loserSize;

      // Sub-case A: Rapid impulse re-entry under 5 minutes
      if (minutesElapsed <= 5) {
        const severity: ShieldLevel = 'danger';
        flags.push({
          type: 'revenge_trading',
          severity,
          title: 'Immediate Revenge Impulse Entry (< 5 min)',
          description: `After losing ${curSymbol}${Math.abs(Number(loser.netPnl || 0)).toFixed(0)} on ${loser.tradingsymbol}, you entered ${nextTrade.tradingsymbol} within just ${minutesElapsed} minutes. Emotional urgency overrides trading edge.`,
          recommendation: 'Step away from your terminal immediately. Enforce a mandatory 15-minute cool-down after any stopout.',
        });
        overallLevel = maxLevel(overallLevel, severity);
        break;
      }

      // Sub-case B: Size escalation after a loss
      if (sizeRatio >= 1.4) {
        const severity: ShieldLevel = sizeRatio >= 2.0 ? 'danger' : 'warning';
        flags.push({
          type: 'revenge_trading',
          severity,
          title: 'Revenge Position Size Escalation',
          description: `Entered ${nextTrade.tradingsymbol} ${minutesElapsed}m after a loss with a ${(sizeRatio * 100 - 100).toFixed(0)}% larger position size. Trying to "win back" losses leads to outsized drawdowns.`,
          recommendation: 'Lock position sizes to your predefined risk per trade. Never oversize to recover a loss.',
        });
        overallLevel = maxLevel(overallLevel, severity);
        break;
      }
    }
  }

  // ── 3. Prop Firm Trailing Drawdown Guard ───────────────────────
  try {
    const activePropAccounts = await db
      .select()
      .from(propFirmAccounts)
      .where(and(eq(propFirmAccounts.userId, userId), eq(propFirmAccounts.status, 'ACTIVE')));

    for (const acc of activePropAccounts) {
      const pSymbol = acc.currency === 'USD' ? '$' : acc.currency === 'EUR' ? '€' : acc.currency === 'GBP' ? '£' : '₹';
      const hwm = Number(acc.highWaterMark);
      const balance = Number(acc.currentBalance);
      const accSize = Number(acc.accountSize);
      const maxDrawdownPct = Number(acc.maxDrawdownPct);
      const maxDrawdownLimit = (accSize * maxDrawdownPct) / 100;
      const currentDrawdown = Math.max(0, hwm - balance);

      const dailyLossLimit = (accSize * Number(acc.dailyLossLimitPct)) / 100;
      const todayLoss = Math.max(0, -Number(acc.todayPnl));

      if (currentDrawdown >= maxDrawdownLimit || todayLoss >= dailyLossLimit) {
        const severity: ShieldLevel = 'danger';
        flags.push({
          type: 'prop_firm_drawdown',
          severity,
          title: `${acc.firmName} Evaluation Drawdown Breached`,
          description: `Account "${acc.accountName}" has reached maximum allowed drawdown (${pSymbol}${currentDrawdown.toFixed(0)} / ${pSymbol}${maxDrawdownLimit.toFixed(0)}). Risk of challenge failure!`,
          recommendation: 'Halt all trading on this account immediately and audit your open orders.',
          metric: { current: currentDrawdown, threshold: maxDrawdownLimit, unit: pSymbol },
        });
        overallLevel = maxLevel(overallLevel, severity);
      } else if (currentDrawdown >= maxDrawdownLimit * 0.8 || todayLoss >= dailyLossLimit * 0.8) {
        const severity: ShieldLevel = 'warning';
        flags.push({
          type: 'prop_firm_drawdown',
          severity,
          title: `${acc.firmName} Trailing Drawdown Critical (80%+)`,
          description: `You have consumed over 80% of your allowed trailing drawdown on "${acc.accountName}" (${pSymbol}${currentDrawdown.toFixed(0)} used of ${pSymbol}${maxDrawdownLimit.toFixed(0)} allowed).`,
          recommendation: 'Reduce your risk per trade to 0.25R. A single standard loss will fail the evaluation.',
          metric: { current: currentDrawdown, threshold: maxDrawdownLimit, unit: pSymbol },
        });
        overallLevel = maxLevel(overallLevel, severity);
      }
    }
  } catch (err) {
    // Non-fatal if prop firm table is still initializing
  }

  // ── 4. Overtrading & Frequency Clustering ───────────────────────
  if (todayTradeCount >= maxTradesCap) {
    const severity: ShieldLevel = todayTradeCount >= maxTradesCap + 2 ? 'danger' : 'warning';
    flags.push({
      type: 'overtrading',
      severity,
      title: premarketPlan?.maxDailyTrades ? 'Pre-Market Trade Cap Reached' : 'Daily Trade Limit Reached',
      description: `You have executed ${todayTradeCount} trades today (Daily cap: ${maxTradesCap}).`,
      recommendation: 'Close terminal for today. Overtrading severely erodes execution quality and raises commission bleed.',
      metric: { current: todayTradeCount, threshold: maxTradesCap, unit: 'trades' },
    });
    overallLevel = maxLevel(overallLevel, severity);
  } else {
    // Count trades in rolling 2-hour window today
    for (let i = 0; i < todayTrades.length; i++) {
      const currentTrade = todayTrades[i];
      if (!currentTrade) continue;
      const windowStart = new Date(currentTrade.openedAt);
      const windowEnd = new Date(windowStart.getTime() + 2 * 60 * 60 * 1000);
      const inWindow = todayTrades.filter(
        (t) => new Date(t.openedAt) >= windowStart && new Date(t.openedAt) <= windowEnd
      );

      if (inWindow.length >= 5) {
        const severity: ShieldLevel = inWindow.length >= 8 ? 'danger' : 'warning';
        flags.push({
          type: 'overtrading',
          severity,
          title: 'High-Frequency Cluster Execution',
          description: `${inWindow.length} trades placed within a 2-hour window. Rapid cluster entries strongly correlate with emotional impulsivity.`,
          recommendation: 'Step away from screens. Take a mandatory 15-minute mental reset.',
        });
        overallLevel = maxLevel(overallLevel, severity);
        break;
      }
    }
  }

  // ── 5. Win-Streak Overconfidence ────────────────────────────────
  if (closedTrades.length >= 4) {
    const recent = closedTrades.slice(-4);
    const firstThree = recent.slice(0, 3);
    const last = recent[3];
    if (last) {
      const allWins = firstThree.every((t) => Number(t.netPnl || 0) > 0);

      if (allWins) {
        const avgPrevSize = firstThree.reduce((sum, t) => sum + Number(t.totalQuantity || 1) * Number(t.avgEntryPrice || 1), 0) / 3;
        const lastSize = Number(last.totalQuantity || 1) * Number(last.avgEntryPrice || 1);
        const ratio = avgPrevSize > 0 ? lastSize / avgPrevSize : 1;

        if (ratio >= 2) {
          flags.push({
            type: 'overconfidence',
            severity: 'caution',
            title: 'Win-Streak Overconfidence Bias',
            description: `After 3 consecutive wins, your position size spiked ${(ratio * 100 - 100).toFixed(0)}% above average. Overconfidence after winning streaks often leads to giving back profits.`,
            recommendation: 'Cap position size at your standard 1R risk amount regardless of streaks.',
          });
          overallLevel = maxLevel(overallLevel, 'caution');
        }
      }
    }
  }

  // ── 6. Emotion Cascade ─────────────────────────────────────────
  const negativeEmotions = ['FOMO', 'REVENGE', 'ANXIOUS', 'FEAR', 'GREEDY'];
  const emotionCount = todayTrades.reduce((count, t) => {
    const tradeEmotions = (t.emotions as string[] | null) ?? [];
    return count + tradeEmotions.filter((e) => negativeEmotions.includes(e)).length;
  }, 0);

  if (emotionCount >= 3) {
    const severity: ShieldLevel = emotionCount >= 5 ? 'warning' : 'caution';
    flags.push({
      type: 'emotion_cascade',
      severity,
      title: 'Emotional Tilt Cascade',
      description: `${emotionCount} negative emotion tags recorded in today's trades. Emotional trading degrades execution edge significantly.`,
      recommendation: 'Halt new positions. Practice a 2-minute physiological sigh reset before looking at charts again.',
    });
    overallLevel = maxLevel(overallLevel, severity);
  }

  // Determine cooldown status
  const cooldownActive = overallLevel === 'danger' || overallLevel === 'warning';
  const cooldownMinutesRemaining = overallLevel === 'danger' ? 30 : overallLevel === 'warning' ? 15 : 0;

  // ── Generate alert message ──────────────────────
  const alertMessages: Record<ShieldLevel, string> = {
    none: 'Behavioral shield status: Optimal. Execution patterns are disciplined and within risk bounds.',
    caution: 'Minor behavioral caution flagged. Stay mindful of sizing and maintain discipline.',
    warning: 'WARNING: Elevated behavioral risk detected. Tighten stop limits and avoid impulsive re-entries.',
    danger: 'CRITICAL SHIELD LOCKOUT: Severe risk or revenge pattern active. Step away from the screens immediately.',
  };

  return {
    level: overallLevel,
    flags,
    tradesAnalyzed: trades.length,
    dailyPnl,
    todayTradeCount,
    alertMessage: alertMessages[overallLevel],
    cooldownActive,
    cooldownMinutesRemaining,
    currency,
    currencySymbol: curSymbol,
  };
}
