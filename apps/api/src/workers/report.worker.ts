// ──────────────────────────────────────────────
// TradeMind — Report Worker
//
// Generates and sends scheduled reports:
// - Daily P&L summary (end of day)
// - Weekly behavioral report (end of week)
//
// Triggered via the 'generate-report' queue with a
// repeatable job schedule (see scheduleReports()).
// ──────────────────────────────────────────────

import { getDatabase, users, subscriptions, plans, tradeExecutions, journalTrades, notifications } from '@trademind/database';
import { eq, and, gte, sql } from 'drizzle-orm';
import { createWorker, getQueue } from '../lib/jobs';
import { sendDailySummary, sendWeeklyReport } from '../services/notification/email.service';

/**
 * Compute daily stats for a user.
 */
async function computeDailyStats(userId: string) {
  const db = getDatabase();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const trades = await db
    .select()
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, userId),
        gte(journalTrades.closedAt ?? journalTrades.openedAt, startOfDay),
      ),
    );

  const closed = trades.filter((t) => t.status === 'CLOSED');
  const wins = closed.filter((t) => (t.netPnl ?? 0) > 0);
  const netPnl = closed.reduce((sum, t) => sum + (t.netPnl ?? 0), 0);
  const pnls = closed.map((t) => t.netPnl ?? 0);

  return {
    totalTrades: closed.length,
    winRate: closed.length > 0 ? wins.length / closed.length : 0,
    netPnl,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
  };
}

/**
 * Compute weekly stats for a user.
 */
async function computeWeeklyStats(userId: string) {
  const db = getDatabase();
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const trades = await db
    .select()
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, userId),
        gte(journalTrades.closedAt ?? journalTrades.openedAt, startOfWeek),
      ),
    );

  const closed = trades.filter((t) => t.status === 'CLOSED');
  const wins = closed.filter((t) => (t.netPnl ?? 0) > 0);
  const totalPnl = closed.reduce((sum, t) => sum + (t.netPnl ?? 0), 0);

  // Dominant emotion from journal entries
  const emotionCounts: Record<string, number> = {};
  for (const t of trades) {
    const emotions = (t.emotions as string[]) ?? [];
    for (const e of emotions) emotionCounts[e] = (emotionCounts[e] ?? 0) + 1;
  }
  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'NEUTRAL';

  // Simple grade based on win rate + P&L
  const winRate = closed.length > 0 ? wins.length / closed.length : 0;
  let grade = 'F';
  if (totalPnl > 0 && winRate >= 0.6) grade = 'A';
  else if (totalPnl > 0 && winRate >= 0.4) grade = 'B';
  else if (totalPnl > 0) grade = 'C';
  else if (winRate >= 0.5) grade = 'D';

  return {
    totalTrades: closed.length,
    winRate,
    totalPnl,
    dominantEmotion,
    grade,
  };
}

/**
 * Report worker — processes 'generate-report' jobs.
 * Job data: { type: 'daily' | 'weekly' }
 */
export function reportWorker() {
  createWorker('generate-report', async (job) => {
    const { type } = job.data as { type: 'daily' | 'weekly' };
    const db = getDatabase();

    // Get users who have opted in for this notification type
    const optInType = type === 'daily' ? 'daily_summary' : 'weekly_report';
    const optedInUsers = await db
      .select({ userId: notifications.userId, email: users.email })
      .from(notifications)
      .innerJoin(users, eq(users.id, notifications.userId))
      .where(
        and(
          eq(notifications.type, optInType),
          eq(notifications.isEnabled, true),
          eq(notifications.isDelivered, false),
        ),
      );

    // Fallback: if no preferences exist, send to all users
    const userList = optedInUsers.length > 0
      ? optedInUsers
      : (await db.select().from(users)).map((u) => ({ userId: u.id, email: u.email }));

    console.log(`📬 Generating ${type} reports for ${userList.length} users...`);

    let sent = 0;
    for (const { userId, email } of userList) {
      try {
        if (type === 'daily') {
          const stats = await computeDailyStats(userId);
          if (stats.totalTrades > 0) {
            await sendDailySummary(userId, email, stats);
            sent++;
          }
        } else {
          const stats = await computeWeeklyStats(userId);
          if (stats.totalTrades > 0) {
            await sendWeeklyReport(userId, email, stats);
            sent++;
          }
        }
      } catch (err) {
        console.error(`❌ Failed to send ${type} report to ${email}:`, err);
      }
    }

    console.log(`✅ ${type} reports sent: ${sent}/${userList.length}`);
  });
}

/**
 * Schedule recurring reports.
 * Call once at server startup.
 */
export async function scheduleReports(): Promise<void> {
  const queue = getQueue('generate-report');

  // Daily report at 6:00 PM IST (12:30 UTC)
  await queue.add(
    'daily-report',
    { type: 'daily' },
    {
      repeat: {
        pattern: '30 12 * * *', // 12:30 UTC = 6:00 PM IST
      },
      jobId: 'daily-report-schedule',
    },
  );

  // Weekly report every Sunday 6:00 PM IST
  await queue.add(
    'weekly-report',
    { type: 'weekly' },
    {
      repeat: {
        pattern: '30 12 * * 0', // Sunday 12:30 UTC
      },
      jobId: 'weekly-report-schedule',
    },
  );

  console.log('📅 Scheduled daily & weekly reports');
}
