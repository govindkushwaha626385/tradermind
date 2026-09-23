// ──────────────────────────────────────────────
// TradeMind — Payment Routes (Razorpay)
//
// Endpoints for:
// - Listing available plans
// - Creating a Razorpay order
// - Verifying payment signatures
// - Handling Razorpay webhooks
// - Managing user subscriptions
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  getActivePlans,
  getUserSubscription,
  createCheckoutSession,
  handleSuccessfulPayment,
  cancelSubscription,
  verifyPaymentSignature,
  fetchOrderDetails,
} from '../services/payment/payment.service';
import { getDatabase, plans, subscriptions, tradeExecutions, brokerConnections } from '@trademind/database';
import { eq, and, sql } from 'drizzle-orm';

export const paymentRouter = new Hono();

/**
 * GET /payments/plans
 * Returns all active subscription plans.
 * No auth required — used on the landing page.
 */
paymentRouter.get('/plans', async (c) => {
  const activePlans = await getActivePlans();
  return c.json({ success: true, data: activePlans });
});

/**
 * GET /payments/subscription
 * Returns the current user's active subscription (if any).
 */
paymentRouter.get('/subscription', authMiddleware, async (c) => {
  const user = c.get('user');
  const sub = await getUserSubscription(user.id);
  return c.json({ success: true, data: sub ?? null });
});

/**
 * GET /payments/usage
 * Returns the current user's plan usage (trades this month, broker count)
 * against their plan limits. Used for the usage meter in the dashboard.
 */
paymentRouter.get('/usage', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  // Get user's plan features (fallback to free plan)
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')))
    .limit(1);

  let features: Record<string, unknown> = {};
  if (sub) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1);
    features = (plan?.features as Record<string, unknown>) ?? {};
  } else {
    const [freePlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.slug, 'free'))
      .limit(1);
    features = (freePlan?.features as Record<string, unknown>) ?? {};
  }

  const maxTrades = Number(features.maxTradesPerMonth ?? 50);
  const maxBrokers = Number(features.maxBrokerConnections ?? 1);

  // Count trades this calendar month
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const [tradeResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tradeExecutions)
    .where(and(eq(tradeExecutions.userId, user.id), sql`${tradeExecutions.executionTimestamp} >= ${firstOfMonth}`));

  const [brokerResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, user.id));

  return c.json({
    success: true,
    data: {
      plan: sub ? 'paid' : 'free',
      trades: {
        used: Number(tradeResult?.count ?? 0),
        limit: maxTrades,
        unlimited: maxTrades <= 0,
      },
      brokers: {
        used: Number(brokerResult?.count ?? 0),
        limit: maxBrokers,
        unlimited: maxBrokers <= 0,
      },
      periodStart: firstOfMonth.toISOString(),
      periodEnd: new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 1).toISOString(),
    },
  });
});

/**
 * POST /payments/create-order
 * Creates a Razorpay Order for the selected plan.
 */
paymentRouter.post(
  '/create-order',
  authMiddleware,
  validateBody(
    z.object({
      planSlug: z.string().min(1),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { planSlug, successUrl, cancelUrl } = c.get('validatedBody') as {
      planSlug: string;
      successUrl: string;
      cancelUrl: string;
    };

    try {
      const order = await createCheckoutSession(
        user.id,
        planSlug,
        successUrl,
        cancelUrl,
      );
      return c.json({ success: true, data: order });
    } catch (err: any) {
      return c.json(
        { success: false, error: { message: err.message } },
        400,
      );
    }
  },
);

/**
 * POST /payments/verify
 * Verifies Razorpay payment signature (called from frontend after checkout).
 */
paymentRouter.post(
  '/verify',
  authMiddleware,
  validateBody(
    z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      c.get('validatedBody') as {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      };

    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    if (!isValid) {
      return c.json({ success: false, error: { message: 'Invalid payment signature' } }, 400);
    }

    // Payment verified — fetch real order details from Razorpay
    const orderDetails = await fetchOrderDetails(razorpay_order_id);
    if (!orderDetails.planId || orderDetails.userId !== user.id) {
      return c.json({ success: false, error: { message: 'Order metadata not found. Please contact support.' } }, 400);
    }

    await handleSuccessfulPayment({
      userId: user.id,
      planId: orderDetails.planId,
      provider: 'razorpay',
      providerOrderId: razorpay_order_id,
      providerPaymentId: razorpay_payment_id,
      amountPaid: orderDetails.amountPaid,
      currency: orderDetails.currency,
    });

    return c.json({ success: true, data: { message: 'Payment verified' } });
  },
);

/**
 * NOTE: Razorpay & Stripe webhook events are handled exclusively by:
 *   POST /subscriptions/webhook/razorpay
 *   POST /subscriptions/webhook/stripe
 *
 * Those endpoints include full event handling, idempotency, and audit logging.
 * Do not add a duplicate webhook handler here.
 */


/**
 * POST /payments/cancel
 * Cancels the current user's subscription.
 */
paymentRouter.post('/cancel', authMiddleware, async (c) => {
  const user = c.get('user');
  await cancelSubscription(user.id);
  return c.json({ success: true, data: { message: 'Subscription canceled' } });
});
