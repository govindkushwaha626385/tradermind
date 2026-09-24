// ──────────────────────────────────────────────
// TradeMind — Subscriptions & Webhook Routes
// POST /api/v1/subscriptions/webhook/razorpay
// POST /api/v1/subscriptions/webhook/stripe
// GET  /api/v1/subscriptions/plans
// GET  /api/v1/subscriptions/me
// POST /api/v1/subscriptions/cancel
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { authenticate } from '@/lib/server/auth';
import { ok, apiError } from '@/lib/server/response';
import {
  getActivePlans, getUserSubscription, handleSuccessfulPayment,
  handleSubscriptionCharged, handleSubscriptionPastDue,
  handleSubscriptionCancelledByProvider, cancelSubscription,
} from '@/lib/server/services/payment/payment.service';
import { getDatabase, subscriptions, plans, adminAuditLogs } from '@trademind/database';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

async function logBillingEvent(action: string, metadata: Record<string, unknown>) {
  try {
    const db = getDatabase();
    await db.insert(adminAuditLogs).values({ actorEmail: 'system:webhook', action, entityType: 'subscription', metadata });
  } catch (err) { console.error('Failed to record billing audit log:', err); }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const action = path?.[0];

    if (action === 'plans') {
      try {
        const activePlans = await getActivePlans();
        return ok(activePlans);
      } catch (err: any) {
        console.error('[subscriptions/plans] DB error:', err.message);
        return NextResponse.json({ success: false, error: { message: 'Service temporarily unavailable' } }, { status: 503 });
      }
    }

    const { user, error } = await authenticate(req);
    if (error) return error;

    if (action === 'me') {
      const sub = await getUserSubscription(user.id);
      if (!sub) return ok(null);
      const db = getDatabase();
      const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId)).limit(1);
      return ok({ ...sub, plan: plan ?? null });
    }

    return apiError('Route not found', 404);
  } catch (err: unknown) {
    console.error('[Subscriptions GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
  const [action, sub1, sub2] = path ?? [];

  if (action === 'webhook') {
    // Read raw body first before authentication (webhooks have no user context)
    const rawBody = await req.text();

    if (sub1 === 'razorpay') {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers.get('x-razorpay-signature');

      if (webhookSecret && signature) {
        try {
          const expectedSignature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
          const expected = Buffer.from(expectedSignature, 'utf8');
          const received = Buffer.from(signature, 'utf8');
          if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
            console.warn('⚠️ Invalid Razorpay webhook signature');
            return apiError('Invalid signature', 403);
          }
        } catch (err) {
          console.error('Error verifying Razorpay webhook signature:', err);
          return apiError('Signature verification failed', 403);
        }
      } else if (process.env.NODE_ENV === 'production') {
        return apiError('Webhook signature is required', 403);
      }

      let event: Record<string, any>;
      try { event = JSON.parse(rawBody); } catch { return apiError('Invalid JSON payload'); }

      const eventType = event.event ?? '';
      console.log(`📡 [Razorpay Webhook] Received event: ${eventType}`);

      try {
        switch (eventType) {
          case 'payment.captured':
          case 'order.paid': {
            const payment = event.payload?.payment?.entity ?? {};
            const notes = payment.notes ?? {};
            if (notes.userId && notes.planId) {
              await handleSuccessfulPayment({ userId: notes.userId, planId: notes.planId, provider: 'razorpay', providerOrderId: payment.order_id, providerPaymentId: payment.id, amountPaid: payment.amount ?? 0, currency: payment.currency ?? 'INR' });
              await logBillingEvent('razorpay.payment.captured', { userId: notes.userId, orderId: payment.order_id, amount: payment.amount });
            }
            break;
          }
          case 'subscription.charged': {
            const s = event.payload?.subscription?.entity ?? {};
            const p = event.payload?.payment?.entity ?? {};
            if (s.id) {
              await handleSubscriptionCharged({ provider: 'razorpay', providerSubscriptionId: s.id, amountPaid: p.amount ?? s.charge_at ?? 0, currency: p.currency ?? 'INR', providerInvoiceId: p.id, periodEnd: s.current_end ? new Date(s.current_end * 1000) : undefined });
              await logBillingEvent('razorpay.subscription.charged', { subId: s.id, amount: p.amount });
            }
            break;
          }
          case 'subscription.halted':
          case 'subscription.pending': {
            const s = event.payload?.subscription?.entity ?? {};
            if (s.id) { await handleSubscriptionPastDue({ provider: 'razorpay', providerSubscriptionId: s.id }); await logBillingEvent('razorpay.subscription.halted', { subId: s.id }); }
            break;
          }
          case 'subscription.cancelled': {
            const s = event.payload?.subscription?.entity ?? {};
            if (s.id) { await handleSubscriptionCancelledByProvider({ provider: 'razorpay', providerSubscriptionId: s.id }); await logBillingEvent('razorpay.subscription.cancelled', { subId: s.id }); }
            break;
          }
          default: console.log(`[Razorpay Webhook] Ignored: ${eventType}`);
        }
        return ok({ received: true, event: eventType });
      } catch (err: any) {
        console.error(`[Razorpay Webhook Error] Processing ${eventType} failed:`, err);
        return apiError(err?.message ?? 'Webhook processing failed', 500);
      }
    }

    if (sub1 === 'stripe') {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const signature = req.headers.get('stripe-signature');

      if (webhookSecret && signature) {
        try {
          const parts = signature.split(',').reduce((acc: Record<string, string>, item) => { const [k, v] = item.split('='); if (k && v) acc[k] = v; return acc; }, {});
          if (parts.t && parts.v1) {
            const expectedSignature = createHmac('sha256', webhookSecret).update(`${parts.t}.${rawBody}`).digest('hex');
            const expected = Buffer.from(expectedSignature, 'utf8');
            const received = Buffer.from(parts.v1, 'utf8');
            if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
              console.warn('⚠️ Invalid Stripe webhook signature');
              return apiError('Invalid signature', 403);
            }
          }
        } catch (err) { return apiError('Signature verification failed', 403); }
      } else if (process.env.NODE_ENV === 'production') {
        return apiError('Stripe webhook signature required', 403);
      }

      let event: Record<string, any>;
      try { event = JSON.parse(rawBody); } catch { return apiError('Invalid JSON payload'); }

      const eventType = event.type ?? '';
      console.log(`📡 [Stripe Webhook] Received event: ${eventType}`);

      try {
        switch (eventType) {
          case 'checkout.session.completed': {
            const session = event.data?.object ?? {};
            const metadata = session.metadata ?? {};
            if (metadata.userId && metadata.planId) {
              await handleSuccessfulPayment({ userId: metadata.userId, planId: metadata.planId, provider: 'stripe', providerSubscriptionId: session.subscription, providerCustomerId: session.customer, providerPaymentId: session.payment_intent ?? session.id, amountPaid: session.amount_total ?? 0, currency: (session.currency ?? 'inr').toUpperCase() });
              await logBillingEvent('stripe.checkout.session.completed', { userId: metadata.userId, planId: metadata.planId, sessionId: session.id });
            }
            break;
          }
          case 'invoice.payment_succeeded': {
            const invoice = event.data?.object ?? {};
            if (invoice.subscription) {
              const lines = invoice.lines?.data?.[0];
              await handleSubscriptionCharged({ provider: 'stripe', providerSubscriptionId: invoice.subscription, amountPaid: invoice.amount_paid ?? 0, currency: (invoice.currency ?? 'inr').toUpperCase(), providerInvoiceId: invoice.id, periodEnd: lines?.period?.end ? new Date(lines.period.end * 1000) : undefined });
              await logBillingEvent('stripe.invoice.payment_succeeded', { subscriptionId: invoice.subscription, invoiceId: invoice.id });
            }
            break;
          }
          case 'invoice.payment_failed': {
            const invoice = event.data?.object ?? {};
            if (invoice.subscription) { await handleSubscriptionPastDue({ provider: 'stripe', providerSubscriptionId: invoice.subscription }); await logBillingEvent('stripe.invoice.payment_failed', { subscriptionId: invoice.subscription }); }
            break;
          }
          case 'customer.subscription.deleted': {
            const s = event.data?.object ?? {};
            if (s.id) { await handleSubscriptionCancelledByProvider({ provider: 'stripe', providerSubscriptionId: s.id }); await logBillingEvent('stripe.subscription.deleted', { subscriptionId: s.id }); }
            break;
          }
          default: console.log(`[Stripe Webhook] Ignored: ${eventType}`);
        }
        return ok({ received: true, event: eventType });
      } catch (err: any) {
        console.error(`[Stripe Webhook Error] Processing ${eventType} failed:`, err);
        return apiError(err?.message ?? 'Webhook processing failed', 500);
      }
    }

    return apiError('Unknown webhook provider', 404);
  }

  if (action === 'cancel') {
    const { user, error } = await authenticate(req);
    if (error) return error;
    await cancelSubscription(user.id);
    await logBillingEvent('user.subscription.cancelled', { userId: user.id });
    return ok({ message: 'Subscription canceled successfully' });
  }

  return apiError('Route not found', 404);
  } catch (err: unknown) {
    console.error('[Subscriptions POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}
