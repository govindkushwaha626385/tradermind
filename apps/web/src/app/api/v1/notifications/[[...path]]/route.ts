// ──────────────────────────────────────────────
// TradeMind — Notification & Onboarding Routes
// GET   /api/v1/notifications/onboarding
// PATCH /api/v1/notifications/onboarding
// GET   /api/v1/notifications/preferences
// PATCH /api/v1/notifications/preferences
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/server/auth';
import { ok, parseBody } from '@/lib/server/response';
import { getOnboardingStatus, updateOnboardingStep } from '@/lib/server/services/notification/email.service';
import { getDatabase, notifications } from '@trademind/database';
import { eq, and } from 'drizzle-orm';

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

    return ok(null);
  } catch (err: unknown) {
    console.error('[Notifications GET] Unhandled error:', err);
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
