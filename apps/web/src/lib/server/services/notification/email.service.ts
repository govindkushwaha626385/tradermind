// ──────────────────────────────────────────────
// TradeMind — Email Notification Service
//
// Sends transactional emails using Resend / SendGrid / SMTP.
// All templates are rendered server-side.
// ──────────────────────────────────────────────

import { getDatabase, notifications, userOnboarding } from '@trademind/database';
import { eq, and } from 'drizzle-orm';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3000';

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? 'TradeMind <onboarding@resend.dev>',
          to: params.to,
          subject: params.subject,
          html: params.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Resend API error:', errorText);
        return false;
      }

      console.log(`📧 Email sent to ${params.to}: ${params.subject}`);
      return true;
    } catch (err) {
      console.error('❌ Failed to send email via Resend:', err);
      return false;
    }
  }

  // ── Development fallback ──
  console.log(`📧 [DEV EMAIL] To: ${params.to}`);
  console.log(`   Subject: ${params.subject}`);
  return true;
}

/**
 * Send a daily P&L summary to the user.
 */
export async function sendDailySummary(
  userId: string,
  email: string,
  stats: {
    totalTrades: number;
    winRate: number;
    netPnl: number;
    bestTrade: number;
    worstTrade: number;
  },
) {
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">TradeMind Daily Summary</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td>Trades Today</td><td style="text-align:right;font-weight:bold;">${stats.totalTrades}</td></tr>
        <tr><td>Win Rate</td><td style="text-align:right;font-weight:bold;">${(stats.winRate * 100).toFixed(1)}%</td></tr>
        <tr><td>Net P&L</td><td style="text-align:right;font-weight:bold;color:${stats.netPnl >= 0 ? '#22c55e' : '#ef4444'};">₹${(stats.netPnl).toLocaleString('en-IN')}</td></tr>
        <tr><td>Best Trade</td><td style="text-align:right;font-weight:bold;color:#22c55e;">+₹${stats.bestTrade.toLocaleString('en-IN')}</td></tr>
        <tr><td>Worst Trade</td><td style="text-align:right;font-weight:bold;color:#ef4444;">-₹${Math.abs(stats.worstTrade).toLocaleString('en-IN')}</td></tr>
      </table>
      <p style="color: #6b7280; font-size: 12px;">Log in to TradeMind for full analytics.</p>
    </div>
  `;

  await sendEmail({ to: email, subject: '📊 Your Daily Trading Summary', html });

  // Log notification
  const db = getDatabase();
  await db.insert(notifications).values({
    userId,
    type: 'daily_summary',
    channel: 'email',
    subject: '📊 Your Daily Trading Summary',
    body: html,
    isDelivered: true,
    deliveredAt: new Date(),
  });
}

/**
 * Send a weekly behavioral insights report.
 */
export async function sendWeeklyReport(
  userId: string,
  email: string,
  data: {
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    dominantEmotion: string;
    grade: string;
  },
) {
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">TradeMind Weekly Report</h2>
      <h3 style="color: #7c3aed;">Grade: ${data.grade}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td>Trades</td><td style="text-align:right;font-weight:bold;">${data.totalTrades}</td></tr>
        <tr><td>Win Rate</td><td style="text-align:right;font-weight:bold;">${(data.winRate * 100).toFixed(1)}%</td></tr>
        <tr><td>P&L</td><td style="text-align:right;font-weight:bold;color:${data.totalPnl >= 0 ? '#22c55e' : '#ef4444'};">₹${(data.totalPnl).toLocaleString('en-IN')}</td></tr>
        <tr><td>Dominant Emotion</td><td style="text-align:right;font-weight:bold;">${data.dominantEmotion}</td></tr>
      </table>
      <p style="color: #6b7280; font-size: 12px;">Full insights available in your dashboard.</p>
    </div>
  `;

  await sendEmail({ to: email, subject: '🧠 Your Weekly Behavioral Report', html });

  const db = getDatabase();
  await db.insert(notifications).values({
    userId,
    type: 'weekly_report',
    channel: 'email',
    subject: '🧠 Your Weekly Behavioral Report',
    body: html,
    isDelivered: true,
    deliveredAt: new Date(),
  });
}

/**
 * Notify user that their broker token is about to expire.
 */
export async function sendTokenExpiryWarning(
  userId: string,
  email: string,
  brokerName: string,
) {
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">⚠️ Token Expiring Soon</h2>
      <p>Your connection to <strong>${brokerName}</strong> will expire soon.</p>
      <p>To continue syncing trades automatically, please reconnect your broker.</p>
      <a href="${APP_URL}/dashboard/brokers" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;margin-top:16px;">
        Reconnect Now
      </a>
    </div>
  `;

  await sendEmail({ to: email, subject: `⚠️ ${brokerName} Token Expiring Soon`, html });

  const db = getDatabase();
  await db.insert(notifications).values({
    userId,
    type: 'token_expiry',
    channel: 'email',
    subject: `⚠️ ${brokerName} Token Expiring Soon`,
    body: html,
    isDelivered: true,
    deliveredAt: new Date(),
  });
}

/**
 * Notify user that a broker sync completed or failed.
 */
export async function sendSyncNotification(
  userId: string,
  email: string,
  brokerName: string,
  status: 'SUCCESS' | 'FAILED',
  details?: string,
) {
  const isSuccess = status === 'SUCCESS';
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: ${isSuccess ? '#22c55e' : '#ef4444'};">
        ${isSuccess ? '✅' : '❌'} Sync ${isSuccess ? 'Complete' : 'Failed'}
      </h2>
      <p>Broker: <strong>${brokerName}</strong></p>
      ${details ? `<p>${details}</p>` : ''}
      <a href="${APP_URL}/dashboard" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;margin-top:16px;">
        View Dashboard
      </a>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `${isSuccess ? '✅' : '❌'} Trade Sync ${isSuccess ? 'Complete' : 'Failed'} — ${brokerName}`,
    html,
  });

  const db = getDatabase();
  await db.insert(notifications).values({
    userId,
    type: isSuccess ? 'sync_complete' : 'sync_failed',
    channel: 'email',
    subject: `Sync ${isSuccess ? 'Complete' : 'Failed'} — ${brokerName}`,
    body: html,
    isDelivered: true,
    deliveredAt: new Date(),
  });
}

/**
 * Get the user's onboarding progress.
 */
export async function getOnboardingStatus(userId: string) {
  const db = getDatabase();
  const [status] = await db
    .select()
    .from(userOnboarding)
    .where(eq(userOnboarding.userId, userId))
    .limit(1);

  return status ?? null;
}

/**
 * Mapping of onboarding step keys to database column names.
 */
const STEP_FIELDS = {
  welcome: 'hasCompletedWelcome',
  connectBroker: 'hasConnectedBroker',
  importTrades: 'hasImportedTrades',
  journalFirstTrade: 'hasJournaledFirstTrade',
  viewInsights: 'hasViewedInsights',
} as const;

type OnboardingStep = keyof typeof STEP_FIELDS;

/**
 * Update a specific onboarding step.
 */
export async function updateOnboardingStep(
  userId: string,
  step: OnboardingStep,
  value: boolean,
) {
  const field = STEP_FIELDS[step];
  if (!field) throw new Error(`Unknown onboarding step: ${String(step)}`);

  const db = getDatabase();
  const existing = await getOnboardingStatus(userId);

  const updateData: Record<string, unknown> = {
    [field]: value,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(userOnboarding)
      .set(updateData as any)
      .where(eq(userOnboarding.userId, userId));
  } else {
    await db.insert(userOnboarding).values({
      userId,
      [field]: value,
    } as any);
  }

  // Check if all steps are now complete
  const updated = await getOnboardingStatus(userId);
  if (updated) {
    const allComplete =
      updated.hasCompletedWelcome &&
      updated.hasConnectedBroker &&
      updated.hasImportedTrades &&
      updated.hasJournaledFirstTrade &&
      updated.hasViewedInsights;

    if (allComplete) {
      await db
        .update(userOnboarding)
        .set({ isComplete: true, completedAt: new Date() })
        .where(eq(userOnboarding.userId, userId));
    }
  }
}
