// ──────────────────────────────────────────────
// TradeMind — Notification & Onboarding Routes
//
// Endpoints for:
// - Getting/updating onboarding progress
// - Managing notification preferences
// - Triggering test emails (admin/dev)
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  getOnboardingStatus,
  updateOnboardingStep,
} from '../services/notification/email.service';
import { getDatabase, notifications } from '@trademind/database';
import { eq, and } from 'drizzle-orm';

export const notificationsRouter = new Hono();
notificationsRouter.use('*', authMiddleware);

/**
 * GET /notifications/onboarding
 * Returns the current user's onboarding progress.
 */
notificationsRouter.get('/onboarding', async (c) => {
  const user = c.get('user');
  const status = await getOnboardingStatus(user.id);
  return c.json({ success: true, data: status ?? null });
});

/**
 * PATCH /notifications/onboarding
 * Updates a specific onboarding step.
 */
notificationsRouter.patch(
  '/onboarding',
  validateBody(
    z.object({
      step: z.enum(['welcome', 'connectBroker', 'importTrades', 'journalFirstTrade', 'viewInsights']),
      completed: z.boolean(),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { step, completed } = c.get('validatedBody') as {
      step: 'welcome' | 'connectBroker' | 'importTrades' | 'journalFirstTrade' | 'viewInsights';
      completed: boolean;
    };

    await updateOnboardingStep(user.id, step, completed);
    return c.json({ success: true, data: { step, completed, message: 'Onboarding updated' } });
  },
);

/**
 * GET /notifications/preferences
 * Returns the current user's notification preferences.
 *
 * Preferences are stored in the notifications table with isDelivered=false
 * and represent user opt-in/opt-out for each notification type/channel.
 */
notificationsRouter.get('/preferences', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  // Fetch distinct notification type+channel preferences for this user
  const prefs = await db
    .select({
      type: notifications.type,
      channel: notifications.channel,
      isEnabled: notifications.isEnabled,
    })
    .from(notifications)
    .where(eq(notifications.userId, user.id));

  // If no preferences exist, return defaults
  if (prefs.length === 0) {
    const defaultPrefs = [
      { type: 'daily_summary', channel: 'email', isEnabled: true },
      { type: 'weekly_report', channel: 'email', isEnabled: true },
      { type: 'token_expiry', channel: 'email', isEnabled: true },
      { type: 'sync_complete', channel: 'in_app', isEnabled: true },
      { type: 'unlogged_trade', channel: 'in_app', isEnabled: true },
      { type: 'behavioral_insight', channel: 'in_app', isEnabled: true },
    ];
    return c.json({ success: true, data: defaultPrefs });
  }

  return c.json({ success: true, data: prefs });
});

/**
 * PATCH /notifications/preferences
 * Toggle a notification type on/off.
 */
notificationsRouter.patch(
  '/preferences',
  validateBody(
    z.object({
      type: z.string(),
      channel: z.enum(['email', 'in_app', 'push']).default('email'),
      isEnabled: z.boolean(),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { type, channel, isEnabled } = c.get('validatedBody') as {
      type: string;
      channel: 'email' | 'in_app' | 'push';
      isEnabled: boolean;
    };
    const db = getDatabase();

    // Upsert notification preference
    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          eq(notifications.type, type),
          eq(notifications.channel, channel),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(notifications)
        .set({ isEnabled })
        .where(eq(notifications.id, existing.id));
    } else {
      await db.insert(notifications).values({
        userId: user.id,
        type,
        channel,
        isEnabled,
        isDelivered: false,
      });
    }

    return c.json({ success: true, data: { type, channel, isEnabled } });
  },
);
