// ──────────────────────────────────────────────
// TradeMind — Behavioral Shield Service
//
// Pure algorithmic detection of dangerous trading patterns.
// NO LLM calls — zero AI cost. Runs entirely on trade data.
//
// Detects:
//   - Revenge trading (oversized trade after a loss < 30 min)
//   - Overtrading (>5 trades in 2 hours)
//   - Win-streak overconfidence (position size escalating after wins)
//   - Daily loss limit breach
// ──────────────────────────────────────────────

import { getDatabase, journalTrades } from '@trademind/database';
import { eq, and, gte, desc } from 'drizzle-orm';
import { getTodayPremarketPlan } from '../premarket.service';

export type ShieldLevel = 'none' | 'caution' | 'warning' | 'danger';

export interface ShieldFlag {
  type: 'revenge_trading' | 'overtrading' | 'overconfidence' | 'loss_limit' | 'emotion_cascade';
  severity: ShieldLevel;
  title: string;
  description: string;
  recommendation: string;
}

export interface BehavioralShieldResult {
  level: ShieldLevel;
  flags: ShieldFlag[];
  tradesAnalyzed: number;
  dailyPnl: number;
  todayTradeCount: number;
  alertMessage: string;
}

const SEVERITY_RANK: Record<ShieldLevel, number> = { none: 0, caution: 1, warning: 2, danger: 3 };

function maxLevel(a: ShieldLevel, b: ShieldLevel): ShieldLevel {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/**
 * Analyze the last 48 hours of trades for behavioral red flags.
 * Returns a shield result with all active flags.
 */
export async function runBehavioralShield(userId: string): Promise<BehavioralShieldResult> {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const todayCutoff = new Date();
  todayCutoff.setHours(0, 0, 0, 0);

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
  const dailyPnl = todayTrades.reduce((sum, t) => sum + Number(t.netPnl), 0);
  const todayTradeCount = todayTrades.length;

  // ── Pre-Market Plan Integration ──────────────
  const premarketPlan = await getTodayPremarketPlan(userId).catch(() => null);
  const maxLossLimit = premarketPlan?.maxDailyLoss ?? 5000;
  const maxTradesCap = premarketPlan?.maxDailyTrades ?? 6;

  // ── Detection 1: Daily Loss Limit ──────────────
  if (dailyPnl <= -maxLossLimit) {
    const severity: ShieldLevel = 'danger';
    flags.push({
      type: 'loss_limit',
      severity,
      title: premarketPlan?.maxDailyLoss ? 'Pre-Market Daily Loss Limit Breached' : 'Daily Loss Limit Breached',
      description: `You are down ₹${Math.abs(dailyPnl).toFixed(0)} today (Limit: ₹${maxLossLimit}). Continuing to trade violates your discipline rules.`,
      recommendation: 'Halt trading immediately for today. Capital preservation is priority #1.',
    });
    overallLevel = maxLevel(overallLevel, severity);
  } else if (dailyPnl <= -maxLossLimit * 0.75) {
    const severity: ShieldLevel = 'warning';
    flags.push({
      type: 'loss_limit',
      severity,
      title: 'Approaching Daily Loss Budget',
      description: `You have consumed 75% of your daily loss limit (down ₹${Math.abs(dailyPnl).toFixed(0)} / ₹${maxLossLimit}).`,
      recommendation: 'Tighten position sizing. One more loss will hit your daily stop.',
    });
    overallLevel = maxLevel(overallLevel, severity);
  }

  // ── Detection 2: Overtrading ────────────────────
  if (todayTradeCount >= maxTradesCap) {
    const severity: ShieldLevel = todayTradeCount >= maxTradesCap + 2 ? 'danger' : 'warning';
    flags.push({
      type: 'overtrading',
      severity,
      title: premarketPlan?.maxDailyTrades ? 'Pre-Market Trade Cap Reached' : 'Overtrading Detected',
      description: `You have executed ${todayTradeCount} trades today (Daily limit: ${maxTradesCap}).`,
      recommendation: 'Close terminal for today. Overtrading severely erodes execution quality.',
    });
    overallLevel = maxLevel(overallLevel, severity);
  } else {
    // Count trades in any rolling 2-hour window today
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
          title: 'High Frequency Cluster Detected',
          description: `${inWindow.length} trades placed within a 2-hour window. Rapid cluster execution often correlates with emotional decision-making.`,
          recommendation: 'Step away from the screens. Take a 15-minute break.',
        });
        overallLevel = maxLevel(overallLevel, severity);
        break; // One flag per session is enough
      }
    }
  }

  // ── Detection 3: Revenge Trading ───────────────────
  // Pattern: CLOSED losing trade → new trade opened within 30 min with larger size
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  for (let i = 0; i < closedTrades.length - 1; i++) {
    const loser = closedTrades[i];
    if (!loser) continue;
    if (Number(loser.netPnl) >= 0) continue; // Not a loss

    const loserClose = loser.closedAt ? new Date(loser.closedAt) : null;
    if (!loserClose) continue;

    const thirtyMinLater = new Date(loserClose.getTime() + 30 * 60 * 1000);

    // Find next trade opened within 30 min after this loss
    const nextTrade = trades.find(
      (t) => t.id !== loser.id && new Date(t.openedAt) > loserClose && new Date(t.openedAt) <= thirtyMinLater
    );

    if (nextTrade) {
      const loserSize = Number(loser.totalQuantity) * Number(loser.avgEntryPrice);
      const nextSize = Number(nextTrade.totalQuantity) * Number(nextTrade.avgEntryPrice);
      const sizeRatio = loserSize > 0 ? nextSize / loserSize : 1;

      if (sizeRatio >= 1.5) {
        // Size increased by 50%+ after a loss — revenge pattern
        const severity: ShieldLevel = sizeRatio >= 2.5 ? 'danger' : 'warning';
        flags.push({
          type: 'revenge_trading',
          severity,
          title: 'Revenge Trading Pattern',
          description: `After losing ₹${Math.abs(Number(loser.netPnl)).toFixed(0)} on ${loser.tradingsymbol}, you entered ${nextTrade.tradingsymbol} within ${Math.round((new Date(nextTrade.openedAt).getTime() - loserClose.getTime()) / 60000)} minutes with ${(sizeRatio * 100 - 100).toFixed(0)}% larger position size.`,
          recommendation: 'Implement a mandatory 30-minute cool-down after any loss before placing the next trade.',
        });
        overallLevel = maxLevel(overallLevel, severity);
        break;
      }
    }
  }

  // ── Detection 4: Win-streak Overconfidence ─────────
  // 3+ consecutive wins followed by a sudden size increase
  if (closedTrades.length >= 4) {
    const recent = closedTrades.slice(-4); // Last 4 closed
    const firstThree = recent.slice(0, 3);
    const last = recent[3];
    if (last) {
      const allWins = firstThree.every((t) => Number(t.netPnl) > 0);

      if (allWins) {
        const avgPrevSize = firstThree.reduce((sum, t) => sum + Number(t.totalQuantity) * Number(t.avgEntryPrice), 0) / 3;
        const lastSize = Number(last.totalQuantity) * Number(last.avgEntryPrice);
        const ratio = avgPrevSize > 0 ? lastSize / avgPrevSize : 1;

        if (ratio >= 2) {
          flags.push({
            type: 'overconfidence',
            severity: 'caution',
            title: 'Win-Streak Overconfidence',
            description: `After 3 consecutive wins, your position size increased ${(ratio * 100 - 100).toFixed(0)}% above average. Confidence bias can lead to outsized losses.`,
            recommendation: 'Cap position size at your standard risk amount regardless of recent streak. Markets are random event-by-event.',
          });
          overallLevel = maxLevel(overallLevel, 'caution');
        }
      }
    }
  }

  // ── Detection 5: Emotion Cascade ─────────────────
  // Multiple negative emotions in today's trades
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
      title: 'Emotional Cascade Detected',
      description: `${emotionCount} negative emotion tags recorded today. Emotional trading typically degrades performance by 20–40%.`,
      recommendation: 'Take a break, step away from screens for 15 minutes, and practice a breathing exercise before the next trade.',
    });
    overallLevel = maxLevel(overallLevel, severity);
  }

  // ── Generate alert message ──────────────────────
  const alertMessages: Record<ShieldLevel, string> = {
    none: 'All behavioral patterns look healthy. Keep up the disciplined approach!',
    caution: 'Minor behavioral caution detected. Stay mindful and stick to your rules.',
    warning: 'Warning: One or more risky patterns detected. Consider reducing position sizes.',
    danger: 'DANGER: High-risk behavioral patterns active. Strongly consider stopping trading today.',
  };

  return {
    level: overallLevel,
    flags,
    tradesAnalyzed: trades.length,
    dailyPnl,
    todayTradeCount,
    alertMessage: alertMessages[overallLevel],
  };
}
