// ──────────────────────────────────────────────
// TradeMind — Payment Service (Razorpay)
//
// Handles subscription lifecycle:
// - Creating/updating subscriptions
// - Webhook handling from Razorpay
// - Plan management
//
// All plan details are stored in the database (plans table)
// and managed by admins — nothing is hardcoded.
// ──────────────────────────────────────────────

import { getDatabase, plans, subscriptions, invoices } from '@trademind/database';
import { eq, and } from 'drizzle-orm';
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';

// ── Razorpay Client ──────────────────────────
let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error(
        'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables must be set.',
      );
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

/**
 * Fetch all active plans for display (e.g. on the pricing page).
 */
export async function getActivePlans() {
  const db = getDatabase();
  return db
    .select()
    .from(plans)
    .where(eq(plans.isActive, true))
    .orderBy(plans.sortOrder);
}

/**
 * Get a specific plan by its slug identifier.
 */
export async function getPlanBySlug(slug: string) {
  const db = getDatabase();
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, slug))
    .limit(1);
  return plan ?? null;
}

/**
 * Get the current active subscription for a user.
 */
export async function getUserSubscription(userId: string) {
  const db = getDatabase();
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
      ),
    )
    .limit(1);
  return sub ?? null;
}

/**
 * Check if a user has access to a specific feature.
 * Features are defined as JSONB in the plans table.
 */
export async function userHasFeature(
  userId: string,
  featureKey: string,
): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  if (!sub) return false;

  const db = getDatabase();
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, sub.planId))
    .limit(1);

  if (!plan) return false;

  const features = plan.features as Record<string, unknown>;
  return features[featureKey] === true;
}

/**
 * Create a Razorpay Order for a given plan.
 * The frontend uses this order ID to open the Razorpay Checkout.
 */
export async function createCheckoutSession(
  userId: string,
  planSlug: string,
  successUrl: string,
  cancelUrl: string,
) {
  const plan = await getPlanBySlug(planSlug);
  if (!plan) {
    throw new Error(`Plan "${planSlug}" not found`);
  }

  // For free plans, skip payment and directly activate
  if (plan.interval === 'free') {
    await handleSuccessfulPayment({
      userId,
      planId: plan.id,
      provider: 'razorpay',
      amountPaid: 0,
      currency: 'INR',
    });
    return { url: successUrl, sessionId: 'free_plan', plan };
  }

  // Create a Razorpay order
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: plan.amount, // amount in paise (already stored as paise)
    currency: plan.currency,
    receipt: `plan_${plan.slug}_${userId.slice(0, 8)}`,
    notes: {
      userId,
      planId: plan.id,
      planSlug: plan.slug,
    },
  });

  return {
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    planName: plan.name,
    planSlug: plan.slug,
    prefillEmail: undefined, // to be filled by frontend
    prefillContact: undefined,
  };
}

/**
 * Handle a successful payment (called by webhook or verification).
 * Creates/updates the user's subscription and records the invoice.
 */
export async function handleSuccessfulPayment(params: {
  userId: string;
  planId: string;
  provider: 'stripe' | 'razorpay';
  providerSubscriptionId?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  providerInvoiceId?: string;
  providerCustomerId?: string;
  amountPaid: number;
  currency: string;
}) {
  const db = getDatabase();

  // Verification and webhook delivery can both arrive for the same payment.
  // Make processing idempotent so a retry cannot create duplicate invoices or
  // extend a subscription twice.
  const providerReference = params.providerPaymentId ?? params.providerOrderId ?? params.providerInvoiceId;
  if (providerReference) {
    const [alreadyProcessed] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.provider, params.provider),
          eq(invoices.providerInvoiceId, providerReference),
        ),
      )
      .limit(1);

    if (alreadyProcessed) return;
  }

  // Get plan for period calculation
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, params.planId))
    .limit(1);

  const periodEnd = new Date();
  if (plan?.interval === 'year') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else if (plan?.interval === 'month') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setDate(periodEnd.getDate() + 30); // default 30 days
  }

  // Upsert subscription
  const existingSub = await getUserSubscription(params.userId);

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        planId: params.planId,
        status: 'active',
        provider: params.provider,
        providerSubscriptionId: params.providerSubscriptionId ?? existingSub.providerSubscriptionId,
        providerCustomerId: params.providerCustomerId ?? params.providerPaymentId ?? existingSub.providerCustomerId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      })
      .where(eq(subscriptions.id, existingSub.id));
  } else {
    await db.insert(subscriptions).values({
      userId: params.userId,
      planId: params.planId,
      provider: params.provider,
      providerSubscriptionId: params.providerSubscriptionId,
      providerCustomerId: params.providerCustomerId ?? params.providerPaymentId,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    });
  }

  // Record invoice
  await db.insert(invoices).values({
    userId: params.userId,
    subscriptionId: existingSub?.id,
    provider: params.provider,
    providerInvoiceId: providerReference,
    amountPaid: params.amountPaid,
    currency: params.currency,
    status: 'paid',
    paidAt: new Date(),
  });

  console.log(`💰 Payment recorded: user=${params.userId}, amount=${params.amountPaid} ${params.currency}`);
}

/**
 * Cancel a user's subscription (at period end).
 */
export async function cancelSubscription(userId: string) {
  const db = getDatabase();
  const sub = await getUserSubscription(userId);
  if (!sub) return;

  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  console.log(`🚫 Subscription canceled: user=${userId}`);
}

/**
 * Verify Razorpay payment signature.
 * Used by the frontend to verify payment after checkout.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  try {
    const expected = Buffer.from(expectedSignature, 'utf8');
    const received = Buffer.from(signature, 'utf8');
    return expected.length === received.length && timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

/**
 * Fetch Razorpay order details including notes (userId, planId) and payment amount.
 * Used by the verify endpoint to get real metadata instead of placeholder values.
 */
export async function fetchOrderDetails(orderId: string): Promise<{
  userId: string;
  planId: string;
  amountPaid: number;
  currency: string;
}> {
  const razorpay = getRazorpay();
  const order = await razorpay.orders.fetch(orderId);
  const notes = order.notes as Record<string, string> | undefined;

  // Fetch payment details for actual amount paid
  const payments = await razorpay.orders.fetchPayments(orderId);
  const payment = payments.items?.[0];

  return {
    userId: notes?.userId ?? '',
    planId: notes?.planId ?? '',
    amountPaid: Number(payment?.amount ?? order.amount_paid ?? 0),
    currency: payment?.currency ?? order.currency ?? 'INR',
  };
}

/**
 * Handle subscription charge / renewal event from webhook (Razorpay or Stripe).
 * Updates currentPeriodEnd and creates a paid invoice.
 */
export async function handleSubscriptionCharged(params: {
  provider: 'stripe' | 'razorpay';
  providerSubscriptionId: string;
  amountPaid: number;
  currency: string;
  providerInvoiceId?: string;
  periodEnd?: Date;
}) {
  const db = getDatabase();

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.provider, params.provider),
        eq(subscriptions.providerSubscriptionId, params.providerSubscriptionId),
      ),
    )
    .limit(1);

  if (!sub) {
    console.warn(`⚠️ Subscription not found for charge event: ${params.providerSubscriptionId}`);
    return;
  }

  // Idempotency check for invoice
  if (params.providerInvoiceId) {
    const [alreadyRecorded] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.provider, params.provider),
          eq(invoices.providerInvoiceId, params.providerInvoiceId),
        ),
      )
      .limit(1);

    if (alreadyRecorded) {
      console.log(`ℹ️ Invoice ${params.providerInvoiceId} already processed.`);
      return;
    }
  }

  // Determine new period end
  const nextPeriodEnd = params.periodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db
    .update(subscriptions)
    .set({
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: nextPeriodEnd,
    })
    .where(eq(subscriptions.id, sub.id));

  await db.insert(invoices).values({
    userId: sub.userId,
    subscriptionId: sub.id,
    provider: params.provider,
    providerInvoiceId: params.providerInvoiceId,
    amountPaid: params.amountPaid,
    currency: params.currency,
    status: 'paid',
    paidAt: new Date(),
  });

  console.log(`✅ Subscription renewed: ${params.providerSubscriptionId}, user=${sub.userId}`);
}

/**
 * Handle payment failure or subscription halt / past due.
 */
export async function handleSubscriptionPastDue(params: {
  provider: 'stripe' | 'razorpay';
  providerSubscriptionId: string;
}) {
  const db = getDatabase();
  await db
    .update(subscriptions)
    .set({ status: 'past_due' })
    .where(
      and(
        eq(subscriptions.provider, params.provider),
        eq(subscriptions.providerSubscriptionId, params.providerSubscriptionId),
      ),
    );
  console.log(`⚠️ Subscription marked past_due: ${params.providerSubscriptionId}`);
}

/**
 * Handle subscription cancellation from provider webhook.
 */
export async function handleSubscriptionCancelledByProvider(params: {
  provider: 'stripe' | 'razorpay';
  providerSubscriptionId: string;
}) {
  const db = getDatabase();
  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.provider, params.provider),
        eq(subscriptions.providerSubscriptionId, params.providerSubscriptionId),
      ),
    );
  console.log(`🚫 Subscription canceled via provider: ${params.providerSubscriptionId}`);
}
