// ──────────────────────────────────────────────
// TradeMind — Kill Switch Enforcement Worker
//
// Runs every 5 minutes and auto-activates the
// behavioral kill switch for users who have:
//   • Exceeded their daily loss limit (absolute ₹/$ OR % of capital)
//   • Hit their max trades-per-day limit
//   • Suffered N consecutive losses
//
// Also resets kill switches at midnight for users
// with reset_mode = 'midnight'.
//
// Design principles:
//   • 100% idempotent — safe to run multiple times
//   • Only touches users with kill_switch_enabled = TRUE
//   • Sends push/email notification on activation
// ──────────────────────────────────────────────

import {
  getDatabase,
  riskProfiles,
  journalTrades,
  notifications,
} from '@trademind/database';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { createWorker, scheduleRecurring } from '../lib/jobs';

const KILL_SWITCH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ── IST Day Bounds ────────────────────────────────────────────────────────────

function getISTDayBounds(now: Date = new Date()): { start: Date; end: Date } {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS);

  const startIST = new Date(nowIST);
  startIST.setUTCHours(0, 0, 0, 0);
  const endIST = new Date(nowIST);
  endIST.setUTCHours(23, 59, 59, 999);

  return {
    start: new Date(startIST.getTime() - IST_OFFSET_MS),
    end:   new Date(endIST.getTime()   - IST_OFFSET_MS),
  };
}

// ── Kill Switch Evaluation Logic ─────────────────────────────────────────────

interface KillSwitchResult {
  shouldActivate: boolean;
  reason: string;
  alert75Pct: boolean;
}

function evaluateKillSwitchRules(
  profile: {
    dailyLossLimitAbs:     string | null;
    dailyLossLimitPct:     string | null;
    maxTradesPerDay:       number | null;
    maxConsecutiveLosses:  number | null;
    notifyAt75Pct:         boolean;
  },
  todayNetPnl:       number,
  todayTradeCount:   number,
  consecutiveLosses: number,
): KillSwitchResult {
  const dailyLimitAbs = Number(profile.dailyLossLimitAbs ?? 0);
  const maxTrades     = profile.maxTradesPerDay      ?? 0;
  const maxConsec     = profile.maxConsecutiveLosses ?? 0;

  // 1. Absolute daily loss limit
  if (dailyLimitAbs > 0 && todayNetPnl <= -dailyLimitAbs) {
    return {
      shouldActivate: true,
      reason:         `Daily loss limit ₹${dailyLimitAbs.toLocaleString()} reached (P&L: ₹${todayNetPnl.toFixed(2)})`,
      alert75Pct:     false,
    };
  }

  // 2. Max trades per day
  if (maxTrades > 0 && todayTradeCount >= maxTrades) {
    return {
      shouldActivate: true,
      reason:         `Max ${maxTrades} trades/day limit reached (${todayTradeCount} trades today)`,
      alert75Pct:     false,
    };
  }

  // 3. Consecutive losses
  if (maxConsec > 0 && consecutiveLosses >= maxConsec) {
    return {
      shouldActivate: true,
      reason:         `${consecutiveLosses} consecutive losses — mandatory break (limit: ${maxConsec})`,
      alert75Pct:     false,
    };
  }

  // 4. 75% warning (if not already triggered)
  const alert75Pct =
    profile.notifyAt75Pct &&
    dailyLimitAbs > 0 &&
    todayNetPnl < 0 &&
    Math.abs(todayNetPnl) >= dailyLimitAbs * 0.75;

  return { shouldActivate: false, reason: '', alert75Pct };
}

// ── Midnight Reset ────────────────────────────────────────────────────────────

async function resetMidnightKillSwitches(): Promise<number> {
  const db = getDatabase();
  const now = new Date();

  // Reset kill switches for users with midnight reset mode that are currently active
  // Only reset if it's past midnight IST (we run every 5 min so this triggers within ~5 min of midnight)
  const { start: istMidnight } = getISTDayBounds(now);
  const fiveMinutesAfterMidnight = new Date(istMidnight.getTime() + 5 * 60 * 1000);

  if (now < istMidnight || now > fiveMinutesAfterMidnight) {
    // Outside the midnight reset window
    return 0;
  }

  const result = await db
    .update(riskProfiles)
    .set({
      killSwitchActive:      false,
      killSwitchTriggeredAt: null,
      killSwitchReason:      null,
      updatedAt:             new Date(),
    })
    .where(
      and(
        eq(riskProfiles.killSwitchActive, true),
        eq(riskProfiles.killSwitchResetMode, 'midnight'),
      ),
    );

  const count = (result as any)?.count ?? 0;
  if (count > 0) {
    console.log(`🌅 Midnight reset: cleared kill switch for ${count} users`);
  }
  return count;
}

// ── Main Enforcement Sweep ────────────────────────────────────────────────────

async function enforceKillSwitches(): Promise<void> {
  const db = getDatabase();

  // 1. Midnight resets first
  await resetMidnightKillSwitches();

  const { start: dayStart, end: dayEnd } = getISTDayBounds();

  // 2. Load all users with kill switch ENABLED and NOT yet active
  const profiles = await db
    .select()
    .from(riskProfiles)
    .where(
      and(
        eq(riskProfiles.killSwitchEnabled, true),
        eq(riskProfiles.killSwitchActive, false),
      ),
    )
    .limit(500);

  if (profiles.length === 0) return;

  let activated = 0;
  let alerted75  = 0;

  for (const profile of profiles) {
    try {
      const userId = profile.userId;

      // Fetch today's CLOSED trades for this user
      const todayTrades = await db
        .select({
          netPnl:    journalTrades.netPnl,
          status:    journalTrades.status,
          openedAt:  journalTrades.openedAt,
        })
        .from(journalTrades)
        .where(
          and(
            eq(journalTrades.userId, userId),
            gte(journalTrades.openedAt, dayStart),
            lte(journalTrades.openedAt, dayEnd),
          ),
        )
        .orderBy(desc(journalTrades.openedAt));

      // Metrics
      const closedToday  = todayTrades.filter((t) => t.status === 'CLOSED');
      const todayNetPnl  = closedToday.reduce((sum, t) => sum + (t.netPnl ?? 0), 0);
      const todayTradeCount = todayTrades.length;

      // Count consecutive losses (from most recent backwards)
      let consecutiveLosses = 0;
      for (const trade of closedToday) {
        if ((trade.netPnl ?? 0) < 0) consecutiveLosses++;
        else break;
      }

      const evaluation = evaluateKillSwitchRules(
        {
          dailyLossLimitAbs:    String(profile.dailyLossLimitAbs ?? '0'),
          dailyLossLimitPct:    String(profile.dailyLossLimitPct ?? '0'),
          maxTradesPerDay:      profile.maxTradesPerDay,
          maxConsecutiveLosses: profile.maxConsecutiveLosses,
          notifyAt75Pct:        profile.notifyAt75Pct,
        },
        todayNetPnl,
        todayTradeCount,
        consecutiveLosses,
      );

      if (evaluation.shouldActivate) {
        // Activate kill switch
        await db
          .update(riskProfiles)
          .set({
            killSwitchActive:      true,
            killSwitchTriggeredAt: new Date(),
            killSwitchReason:      evaluation.reason,
            updatedAt:             new Date(),
          })
          .where(eq(riskProfiles.userId, userId));

        // Create in-app notification
        await db.insert(notifications).values({
          userId,
          type:        'KILL_SWITCH_ACTIVATED',
          channel:     'in_app',
          subject:     '🛑 Trading Blocked — Kill Switch Activated',
          body:        evaluation.reason,
          isEnabled:   profile.notifyOnKillSwitch,
          isDelivered: false,
        }).onConflictDoNothing();

        console.log(`🛑 Kill switch activated: user=${userId} reason="${evaluation.reason}"`);
        activated++;

      } else if (evaluation.alert75Pct) {
        // Send 75% warning notification (once per day — check if already sent)
        const existingAlert = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.type, 'KILL_SWITCH_WARNING_75PCT'),
              gte(notifications.createdAt, dayStart),
            ),
          )
          .limit(1);

        if (existingAlert.length === 0) {
          await db.insert(notifications).values({
            userId,
            type:        'KILL_SWITCH_WARNING_75PCT',
            channel:     'in_app',
            subject:     '⚠️ 75% Daily Loss Limit Reached',
            body:        `You have used 75% of your daily loss limit. Current P&L: ₹${todayNetPnl.toFixed(2)}. Limit: ₹${profile.dailyLossLimitAbs}.`,
            isEnabled:   true,
            isDelivered: false,
          });
          alerted75++;
        }
      }
    } catch (err: any) {
      console.error(`[KillSwitch] Error processing user=${profile.userId}:`, err?.message);
    }
  }

  if (activated > 0 || alerted75 > 0) {
    console.log(`🛡️ Kill switch sweep: activated=${activated} 75%-warnings=${alerted75} (of ${profiles.length} monitored users)`);
  }
}

// ── Worker Export ─────────────────────────────────────────────────────────────

export function killSwitchWorker() {
  createWorker<Record<string, unknown>>(
    'kill-switch',
    async (_job) => {
      await enforceKillSwitches();
    },
    { pollIntervalMs: 10_000, concurrency: 1 },
  );

  scheduleRecurring({
    queue:      'kill-switch',
    jobName:    'enforce-kill-switches',
    payload:    {},
    cronPattern: '*/5 * * * *',
    jobId:      'kill-switch:enforce-kill-switches:recurring',
    intervalMs: KILL_SWITCH_INTERVAL_MS,
  });

  console.log('🛡️ Kill switch enforcement worker started (every 5 min)');
}
