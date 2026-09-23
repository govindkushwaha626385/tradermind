// ──────────────────────────────────────────────
// TradeMind — Payment Routes (Razorpay)
// GET  /api/v1/payments/plans
// GET  /api/v1/payments/subscription
// GET  /api/v1/payments/usage
// POST /api/v1/payments/create-order
// POST /api/v1/payments/verify
// POST /api/v1/payments/cancel
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/server/auth';
import { ok, apiError, parseBody } from '@/lib/server/response';
import {
  getActivePlans, getUserSubscription, createCheckoutSession,
  handleSuccessfulPayment, cancelSubscription, verifyPaymentSignature, fetchOrderDetails,
} from '@/lib/server/services/payment/payment.service';
import { getDatabase, plans, subscriptions, tradeExecutions, brokerConnections } from '@trademind/database';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const action = path?.[0];

  if (action === 'plans') {
    const activePlans = await getActivePlans();
    return ok(activePlans);
  }

  // Auth required for the rest
  const { user, error } = await authenticate(req);
  if (error) return error;

  if (action === 'subscription') {
    const sub = await getUserSubscription(user.id);
    return ok(sub ?? null);
  }

  if (action === 'usage') {
    const db = getDatabase();
    const [sub] = await db.select().from(subscriptions).where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active'))).limit(1);

    let features: Record<string, unknown> = {};
    if (sub) {
      const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId)).limit(1);
      features = (plan?.features as Record<string, unknown>) ?? {};
    } else {
      const [freePlan] = await db.select().from(plans).where(eq(plans.slug, 'free')).limit(1);
      features = (freePlan?.features as Record<string, unknown>) ?? {};
    }

    const maxTrades = Number(features.maxTradesPerMonth ?? 50);
    const maxBrokers = Number(features.maxBrokerConnections ?? 1);

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0);

    const [tradeResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(tradeExecutions)
      .where(and(eq(tradeExecutions.userId, user.id), sql`${tradeExecutions.executionTimestamp} >= ${firstOfMonth}`));
    const [brokerResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(brokerConnections).where(eq(brokerConnections.userId, user.id));

    return ok({
      plan: sub ? 'paid' : 'free',
      trades: { used: Number(tradeResult?.count ?? 0), limit: maxTrades, unlimited: maxTrades <= 0 },
      brokers: { used: Number(brokerResult?.count ?? 0), limit: maxBrokers, unlimited: maxBrokers <= 0 },
      periodStart: firstOfMonth.toISOString(),
      periodEnd: new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 1).toISOString(),
    });
  }

  return apiError('Route not found', 404);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const action = path?.[0];

  if (action === 'create-order') {
    const { data: body, error: bodyErr } = await parseBody(req, z.object({ planSlug: z.string().min(1), successUrl: z.string().url(), cancelUrl: z.string().url() }));
    if (bodyErr) return bodyErr;
    try {
      const order = await createCheckoutSession(user.id, body.planSlug, body.successUrl, body.cancelUrl);
      return ok(order);
    } catch (err: any) {
      return apiError(err.message, 400);
    }
  }

  if (action === 'verify') {
    const { data: body, error: bodyErr } = await parseBody(req, z.object({ razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() }));
    if (bodyErr) return bodyErr;

    const isValid = verifyPaymentSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature);
    if (!isValid) return apiError('Invalid payment signature');

    const orderDetails = await fetchOrderDetails(body.razorpay_order_id);
    if (!orderDetails.planId || orderDetails.userId !== user.id) return apiError('Order metadata not found. Please contact support.');

    await handleSuccessfulPayment({ userId: user.id, planId: orderDetails.planId, provider: 'razorpay', providerOrderId: body.razorpay_order_id, providerPaymentId: body.razorpay_payment_id, amountPaid: orderDetails.amountPaid, currency: orderDetails.currency });
    return ok({ message: 'Payment verified' });
  }

  if (action === 'cancel') {
    await cancelSubscription(user.id);
    return ok({ message: 'Subscription canceled' });
  }

  return apiError('Route not found', 404);
}
