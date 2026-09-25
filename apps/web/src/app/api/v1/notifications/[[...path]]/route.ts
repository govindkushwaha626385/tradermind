// ──────────────────────────────────────────────
// TradeMind — Notification, Webhook & Onboarding Routes
// GET   /api/v1/notifications/onboarding
// PATCH /api/v1/notifications/onboarding
// GET   /api/v1/notifications/preferences
// PATCH /api/v1/notifications/preferences
// GET   /api/v1/notifications/webhooks
// POST  /api/v1/notifications/webhooks/test
// POST  /api/v1/notifications/webhooks/save
// POST  /api/v1/notifications/webhooks/dispatch-debrief
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/server/auth';
import { ok, apiError, parseBody } from '@/lib/server/response';
import { getOnboardingStatus, updateOnboardingStep } from '@/lib/server/services/notification/email.service';
import { getDatabase, notifications } from '@trademind/database';
import { eq, and } from 'drizzle-orm';
import {
  dispatchDiscordWebhook,
  dispatchTelegramNotification,
  sendEodDebriefNotification,
} from '@/lib/server/services/notification/webhook-dispatcher.service';
import { generateDashboardStats } from '@/lib/server/services/analytics.service';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    const { path } = await params;
    const action = path?.[0];

    if (action === 'onboarding') {
      const status = await getOnboardingStatus(user.id);
      return ok(status ?? null);
    }

    if (action === 'preferences') {
      const db = getDatabase();
      const prefs = await db
        .select({ type: notifications.type, channel: notifications.channel, isEnabled: notifications.isEnabled })
        .from(notifications)
        .where(eq(notifications.userId, user.id));

      if (prefs.length === 0) {
        return ok([
          { type: 'daily_summary', channel: 'email', isEnabled: true },
          { type: 'weekly_report', channel: 'email', isEnabled: true },
          { type: 'token_expiry', channel: 'email', isEnabled: true },
          { type: 'sync_complete', channel: 'in_app', isEnabled: true },
          { type: 'unlogged_trade', channel: 'in_app', isEnabled: true },
          { type: 'behavioral_insight', channel: 'in_app', isEnabled: true },
        ]);
      }
      return ok(prefs);
    }

    if (action === 'webhooks') {
      const db = getDatabase();
      const [existing] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.id),
            eq(notifications.type, 'webhook_config'),
          ),
        )
        .limit(1);

      const metadata = (existing?.metadata as Record<string, any>) ?? {};
      return ok({
        discordWebhookUrl: metadata.discordWebhookUrl ?? '',
        telegramBotToken: metadata.telegramBotToken ?? '',
        telegramChatId: metadata.telegramChatId ?? '',
        eodDebriefEnabled: metadata.eodDebriefEnabled ?? true,
        riskAlertsEnabled: metadata.riskAlertsEnabled ?? true,
      });
    }

    return ok(null);
  } catch (err: unknown) {
    console.error('[Notifications GET] Unhandled error:', err);
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
    const action = path?.[0];
    const subAction = path?.[1];

    if (action === 'webhooks') {
      const db = getDatabase();

      if (subAction === 'test') {
        const { data: body, error: bodyErr } = await parseBody(
          req,
          z.object({
            platform: z.enum(['discord', 'telegram']),
            discordWebhookUrl: z.string().optional(),
            telegramBotToken: z.string().optional(),
            telegramChatId: z.string().optional(),
          }),
        );
        if (bodyErr) return bodyErr;

        if (body.platform === 'discord') {
          if (!body.discordWebhookUrl) return apiError('Discord webhook URL is required for testing', 400);
          const result = await dispatchDiscordWebhook(body.discordWebhookUrl, [
            {
              title: '🔔 TradeMind Discord Webhook Connected!',
              description: 'Your Discord channel is successfully linked to TradeMind. Automated EOD summaries and risk breach circuit breakers will be dispatched here.',
              color: 0x6366f1,
              fields: [
                { name: 'Status', value: 'Active & Verified', inline: true },
                { name: 'Trader ID', value: user.id.slice(0, 8), inline: true },
              ],
              footer: { text: 'TradeMind Institutional Webhooks' },
              timestamp: new Date().toISOString(),
            },
          ]);
          if (!result.success) return apiError(result.error ?? 'Failed to send test ping to Discord', 400);
          return ok({ message: 'Discord test ping sent successfully!' });
        }

        if (body.platform === 'telegram') {
          if (!body.telegramBotToken || !body.telegramChatId) {
            return apiError('Telegram bot token and chat ID are required', 400);
          }
          const result = await dispatchTelegramNotification(
            body.telegramBotToken,
            body.telegramChatId,
            `<b>🔔 TradeMind Telegram Bot Connected!</b>\n\nYour Telegram chat is verified. You will receive automated EOD recaps and behavioral shield alerts directly here.`,
          );
          if (!result.success) return apiError(result.error ?? 'Failed to send test message to Telegram', 400);
          return ok({ message: 'Telegram test message sent successfully!' });
        }
      }

      if (subAction === 'save') {
        const { data: body, error: bodyErr } = await parseBody(
          req,
          z.object({
            discordWebhookUrl: z.string().optional().default(''),
            telegramBotToken: z.string().optional().default(''),
            telegramChatId: z.string().optional().default(''),
            eodDebriefEnabled: z.boolean().optional().default(true),
            riskAlertsEnabled: z.boolean().optional().default(true),
          }),
        );
        if (bodyErr) return bodyErr;

        const [existing] = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, user.id),
              eq(notifications.type, 'webhook_config'),
            ),
          )
          .limit(1);

        const configMetadata = {
          discordWebhookUrl: body.discordWebhookUrl.trim(),
          telegramBotToken: body.telegramBotToken.trim(),
          telegramChatId: body.telegramChatId.trim(),
          eodDebriefEnabled: body.eodDebriefEnabled,
          riskAlertsEnabled: body.riskAlertsEnabled,
          updatedAt: new Date().toISOString(),
        };

        if (existing) {
          await db
            .update(notifications)
            .set({
              metadata: configMetadata,
              isEnabled: true,
            })
            .where(eq(notifications.id, existing.id));
        } else {
          await db.insert(notifications).values({
            userId: user.id,
            type: 'webhook_config',
            channel: 'webhook',
            isEnabled: true,
            isDelivered: false,
            subject: 'Webhook Configuration',
            body: '',
            metadata: configMetadata,
          });
        }

        return ok({ message: 'Webhook settings saved successfully!', config: configMetadata });
      }

      if (subAction === 'dispatch-debrief') {
        const [existing] = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, user.id),
              eq(notifications.type, 'webhook_config'),
            ),
          )
          .limit(1);

        const metadata = (existing?.metadata as Record<string, any>) ?? {};
        const discordWebhookUrl = metadata.discordWebhookUrl;
        const telegramBotToken = metadata.telegramBotToken;
        const telegramChatId = metadata.telegramChatId;

        if (!discordWebhookUrl && (!telegramBotToken || !telegramChatId)) {
          return apiError('No active webhook or Telegram destination configured. Please configure in Settings.', 400);
        }

        // Fetch live stats
        const stats = await generateDashboardStats(user.id);
        const todayStr = new Date().toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        const debriefResult = await sendEodDebriefNotification({
          discordWebhookUrl,
          telegramBotToken,
          telegramChatId,
          data: {
            dateStr: todayStr,
            totalTrades: stats.totalTrades ?? 0,
            winCount: stats.wins ?? 0,
            lossCount: stats.losses ?? 0,
            winRate: stats.winRate ?? 0,
            netPnl: stats.totalNetPnl ?? 0,
            currency: '₹',
            profitFactor: stats.profitFactor ?? 0,
            behavioralLeak: stats.losses > stats.wins ? 'Multiple stop-outs detected. Potential early profit-taking or revenge scaling.' : 'Discipline maintained with solid risk-reward compliance.',
            aiAdvice: stats.totalNetPnl < 0 ? 'Review loss clusters and enforce 15-minute cool-off after 2 consecutive stop-outs.' : 'Protect profits: lock daily profit milestones with trailing circuit breakers.',
          },
        });

        return ok({ message: 'EOD Debrief dispatched successfully!', results: debriefResult });
      }
    }

    return apiError('Endpoint not found', 404);
  } catch (err: unknown) {
    console.error('[Notifications POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    const { path } = await params;
    const action = path?.[0];

    if (action === 'onboarding') {
      const { data: body, error: bodyErr } = await parseBody(
        req,
        z.object({
          step: z.enum(['welcome', 'connectBroker', 'importTrades', 'journalFirstTrade', 'viewInsights']),
          completed: z.boolean(),
        }),
      );
      if (bodyErr) return bodyErr;

      await updateOnboardingStep(user.id, body.step, body.completed);
      return ok({ step: body.step, completed: body.completed, message: 'Onboarding updated' });
    }

    if (action === 'preferences') {
      const { data: body, error: bodyErr } = await parseBody(
        req,
        z.object({
          type: z.string(),
          channel: z.enum(['email', 'in_app', 'push']).default('email'),
          isEnabled: z.boolean(),
        }),
      );
      if (bodyErr) return bodyErr;

      const db = getDatabase();
      const [existing] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.id),
            eq(notifications.type, body.type),
            eq(notifications.channel, body.channel as string),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(notifications)
          .set({ isEnabled: body.isEnabled })
          .where(eq(notifications.id, existing.id));
      } else {
        await db.insert(notifications).values({
          userId: user.id,
          type: body.type,
          channel: body.channel,
          isEnabled: body.isEnabled,
          isDelivered: false,
          subject: body.type,
          body: '',
        });
      }

      return ok({ type: body.type, channel: body.channel, isEnabled: body.isEnabled });
    }

    return ok(null);
  } catch (err: unknown) {
    console.error('[Notifications PATCH] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
