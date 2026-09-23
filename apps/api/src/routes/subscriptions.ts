// ──────────────────────────────────────────────
// TradeMind — Subscriptions & Automated Webhook Routes
//
// Endpoints:
//   POST /subscriptions/webhook/razorpay  → Razorpay Webhook Handler
//   POST /subscriptions/webhook/stripe    → Stripe Webhook Handler
//   GET  /subscriptions/plans             → Public Plan List
//   GET  /subscriptions/me                → Current User Subscription
//   POST /subscriptions/cancel            → User Subscription Cancellation
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'crypto';
import { authMiddleware } from '../middleware/auth';
import {
  getActivePlans,
  getUserSubscription,
  handleSuccessfulPayment,
  handleSubscriptionCharged,
  handleSubscriptionPastDue,
  handleSubscriptionCancelledByProvider,
  cancelSubscription,
} from '../services/payment/payment.service';
import { getDatabase, subscriptions, plans, adminAuditLogs } from '@trademind/database';
import { eq } from 'drizzle-orm';

export const subscriptionsRouter = new Hono();

/**
 * Helper to record audit log for billing events
 */
async function logBillingEvent(action: string, metadata: Record<string, unknown>) {
  try {
    const db = getDatabase();
    await db.insert(adminAuditLogs).values({
      actorEmail: 'system:webhook',
      action,
      entityType: 'subscription',
      metadata,
    });
  } catch (err) {
    console.error('Failed to record billing audit log:', err);
  }
}

/**
 * POST /subscriptions/webhook/razorpay
 * Listens for automated payment, renewal, and cancellation events from Razorpay.
 */
subscriptionsRouter.post('/webhook/razorpay', async (c) => {
  const rawBody = await c.req.text();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = c.req.header('x-razorpay-signature');

  if (webhookSecret && signature) {
    try {
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const expected = Buffer.from(expectedSignature, 'utf8');
      const received = Buffer.from(signature, 'utf8');

      if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
        console.warn('⚠️ Invalid Razorpay webhook signature');
        return c.json({ success: false, error: { message: 'Invalid signature' } }, 403);
      }
    } catch (err) {
      console.error('Error verifying Razorpay webhook signature:', err);
      return c.json({ success: false, error: { message: 'Signature verification failed' } }, 403);
    }
  } else if (process.env.NODE_ENV === 'production') {
    return c.json({ success: false, error: { message: 'Webhook signature is required' } }, 403);
  }

  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ success: false, error: { message: 'Invalid JSON payload' } }, 400);
  }

  const eventType = event.event ?? '';
  console.log(`📡 [Razorpay Webhook] Received event: ${eventType}`);

  try {
    switch (eventType) {
      case 'payment.captured':
      case 'order.paid': {
        const payment = event.payload?.payment?.entity ?? {};
        const notes = payment.notes ?? {};
        if (notes.userId && notes.planId) {
          await handleSuccessfulPayment({
            userId: notes.userId,
            planId: notes.planId,
            provider: 'razorpay',
            providerOrderId: payment.order_id,
            providerPaymentId: payment.id,
            amountPaid: payment.amount ?? 0,
            currency: payment.currency ?? 'INR',
          });
          await logBillingEvent('razorpay.payment.captured', {
            userId: notes.userId,
            orderId: payment.order_id,
            amount: payment.amount,
          });
        }
        break;
      }

      case 'subscription.charged': {
        const sub = event.payload?.subscription?.entity ?? {};
        const payment = event.payload?.payment?.entity ?? {};
        if (sub.id) {
          const periodEnd = sub.current_end ? new Date(sub.current_end * 1000) : undefined;
          await handleSubscriptionCharged({
            provider: 'razorpay',
            providerSubscriptionId: sub.id,
            amountPaid: payment.amount ?? sub.charge_at ?? 0,
            currency: payment.currency ?? 'INR',
            providerInvoiceId: payment.id,
            periodEnd,
          });
          await logBillingEvent('razorpay.subscription.charged', {
            subId: sub.id,
            amount: payment.amount,
          });
        }
        break;
      }

      case 'subscription.halted':
      case 'subscription.pending': {
        const sub = event.payload?.subscription?.entity ?? {};
        if (sub.id) {
          await handleSubscriptionPastDue({
            provider: 'razorpay',
            providerSubscriptionId: sub.id,
          });
          await logBillingEvent('razorpay.subscription.halted', { subId: sub.id });
        }
        break;
      }

      case 'subscription.cancelled': {
        const sub = event.payload?.subscription?.entity ?? {};
        if (sub.id) {
          await handleSubscriptionCancelledByProvider({
            provider: 'razorpay',
            providerSubscriptionId: sub.id,
          });
          await logBillingEvent('razorpay.subscription.cancelled', { subId: sub.id });
        }
        break;
      }

      default:
        console.log(`[Razorpay Webhook] Ignored unhandled event: ${eventType}`);
    }

    return c.json({ success: true, data: { received: true, event: eventType } });
  } catch (err: any) {
    console.error(`[Razorpay Webhook Error] Processing ${eventType} failed:`, err);
    return c.json({ success: false, error: { message: err?.message ?? 'Webhook processing failed' } }, 500);
  }
});

/**
 * POST /subscriptions/webhook/stripe
 * Listens for automated checkout, invoice, and subscription lifecycle events from Stripe.
 */
subscriptionsRouter.post('/webhook/stripe', async (c) => {
  const rawBody = await c.req.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = c.req.header('stripe-signature');

  if (webhookSecret && signature) {
    try {
      // Basic signature parsing: t=timestamp,v1=signature
      const parts = signature.split(',').reduce((acc: Record<string, string>, item) => {
        const [k, v] = item.split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});

      if (parts.t && parts.v1) {
        const signedPayload = `${parts.t}.${rawBody}`;
        const expectedSignature = createHmac('sha256', webhookSecret)
          .update(signedPayload)
          .digest('hex');

        const expected = Buffer.from(expectedSignature, 'utf8');
        const received = Buffer.from(parts.v1, 'utf8');

        if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
          console.warn('⚠️ Invalid Stripe webhook signature');
          return c.json({ success: false, error: { message: 'Invalid signature' } }, 403);
        }
      }
    } catch (err) {
      console.error('Error verifying Stripe webhook signature:', err);
      return c.json({ success: false, error: { message: 'Signature verification failed' } }, 403);
    }
  } else if (process.env.NODE_ENV === 'production') {
    return c.json({ success: false, error: { message: 'Stripe webhook signature required' } }, 403);
  }

  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ success: false, error: { message: 'Invalid JSON payload' } }, 400);
  }

  const eventType = event.type ?? '';
  console.log(`📡 [Stripe Webhook] Received event: ${eventType}`);

  try {
    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data?.object ?? {};
        const metadata = session.metadata ?? {};
        if (metadata.userId && metadata.planId) {
          await handleSuccessfulPayment({
            userId: metadata.userId,
            planId: metadata.planId,
            provider: 'stripe',
            providerSubscriptionId: session.subscription,
            providerCustomerId: session.customer,
            providerPaymentId: session.payment_intent ?? session.id,
            amountPaid: session.amount_total ?? 0,
            currency: (session.currency ?? 'inr').toUpperCase(),
          });
          await logBillingEvent('stripe.checkout.session.completed', {
            userId: metadata.userId,
            planId: metadata.planId,
            sessionId: session.id,
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data?.object ?? {};
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const lines = invoice.lines?.data?.[0];
          const periodEnd = lines?.period?.end ? new Date(lines.period.end * 1000) : undefined;
          await handleSubscriptionCharged({
            provider: 'stripe',
            providerSubscriptionId: subscriptionId,
            amountPaid: invoice.amount_paid ?? 0,
            currency: (invoice.currency ?? 'inr').toUpperCase(),
            providerInvoiceId: invoice.id,
            periodEnd,
          });
          await logBillingEvent('stripe.invoice.payment_succeeded', {
            subscriptionId,
            invoiceId: invoice.id,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data?.object ?? {};
        if (invoice.subscription) {
          await handleSubscriptionPastDue({
            provider: 'stripe',
            providerSubscriptionId: invoice.subscription,
          });
          await logBillingEvent('stripe.invoice.payment_failed', {
            subscriptionId: invoice.subscription,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data?.object ?? {};
        if (sub.id) {
          await handleSubscriptionCancelledByProvider({
            provider: 'stripe',
            providerSubscriptionId: sub.id,
          });
          await logBillingEvent('stripe.subscription.deleted', { subscriptionId: sub.id });
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Ignored unhandled event: ${eventType}`);
    }

    return c.json({ success: true, data: { received: true, event: eventType } });
  } catch (err: any) {
    console.error(`[Stripe Webhook Error] Processing ${eventType} failed:`, err);
    return c.json({ success: false, error: { message: err?.message ?? 'Webhook processing failed' } }, 500);
  }
});

/**
 * GET /subscriptions/plans — Public plans list
 */
subscriptionsRouter.get('/plans', async (c) => {
  const activePlans = await getActivePlans();
  return c.json({ success: true, data: activePlans });
});

/**
 * GET /subscriptions/me — Current user subscription details
 */
subscriptionsRouter.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const sub = await getUserSubscription(user.id);
  if (!sub) {
    return c.json({ success: true, data: null });
  }

  const db = getDatabase();
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, sub.planId))
    .limit(1);

  return c.json({
    success: true,
    data: {
      ...sub,
      plan: plan ?? null,
    },
  });
});

/**
 * POST /subscriptions/cancel — User-initiated cancellation
 */
subscriptionsRouter.post('/cancel', authMiddleware, async (c) => {
  const user = c.get('user');
  await cancelSubscription(user.id);
  await logBillingEvent('user.subscription.cancelled', { userId: user.id });
  return c.json({ success: true, data: { message: 'Subscription canceled successfully' } });
});
