// ──────────────────────────────────────────────
// TradeMind — Broker Webhook Routes
// POST /api/v1/webhooks/zerodha
// POST /api/v1/webhooks/dhan
// POST /api/v1/webhooks/angelone
// POST /api/v1/webhooks/delta
// POST /api/v1/webhooks/razorpay
// No authentication — webhook sources authenticated via signatures
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, brokerConnections } from '@trademind/database';
import { eq } from 'drizzle-orm';
import { decrypt, sha256, createHmac } from '@trademind/database';
import { configManager } from '@trademind/config';
import {
  handleSuccessfulPayment, handleSubscriptionCharged,
  handleSubscriptionPastDue, handleSubscriptionCancelledByProvider,
} from '@/lib/server/services/payment/payment.service';
import { createHmac as nodeHmac, timingSafeEqual } from 'crypto';
import { ok, apiError } from '@/lib/server/response';

export const runtime = 'nodejs';

/** Enqueue broker webhook for async processing via background_jobs table */
async function enqueueWebhook(brokerId: string, connectionId: string, userId: string, payload: unknown) {
  const db = getDatabase();
  const { sql } = await import('drizzle-orm');
  await db.execute(
    sql`INSERT INTO public.background_jobs (type, payload, status) VALUES ('process-webhook', ${JSON.stringify({ brokerId, connectionId, userId, payload })}::jsonb, 'PENDING')`
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const broker = path?.[0];

  if (broker === 'zerodha') {
    const body = await req.json();
    const db = getDatabase();
    const verifyChecksum = await configManager.get<boolean>('broker.zerodha.postback_enabled');
    if (verifyChecksum) {
      const [connection] = await db.select().from(brokerConnections).where(eq(brokerConnections.brokerClientId, body.user_id)).limit(1);
      if (!connection) return apiError('Unknown user', 404);
      const apiSecret = decrypt(connection.apiSecret!);
      const expectedChecksum = sha256(`${body.order_id}${body.order_timestamp}${apiSecret}`);
      if (body.checksum !== expectedChecksum) {
        console.warn('⚠️ Invalid Zerodha postback checksum');
        return apiError('Invalid checksum', 403);
      }
      await enqueueWebhook('zerodha', connection.id, connection.userId, body);
    } else {
      const [connection] = await db.select().from(brokerConnections).where(eq(brokerConnections.brokerClientId, body.user_id ?? '')).limit(1);
      if (connection) await enqueueWebhook('zerodha', connection.id, connection.userId, body);
    }
    return ok({ message: 'Webhook received' });
  }

  if (broker === 'dhan') {
    const rawBody = await req.text();
    let body: Record<string, unknown>;
    try { body = JSON.parse(rawBody); } catch { return apiError('Invalid JSON body'); }
    const db = getDatabase();
    const [connection] = await db.select().from(brokerConnections).where(eq(brokerConnections.brokerClientId, body.dhanClientId as string)).limit(1);
    if (!connection) return apiError('Unknown client', 404);
    const signature = req.headers.get('x-dhan-signature');
    if (signature) {
      const decryptedSecret = decrypt(connection.accessToken);
      const expectedSignature = createHmac('sha256', decryptedSecret).update(rawBody).digest('hex');
      if (signature !== expectedSignature) {
        console.warn('⚠️ Invalid Dhan webhook signature');
        return apiError('Invalid signature', 403);
      }
    }
    await enqueueWebhook('dhan', connection.id, connection.userId, body);
    return ok({ message: 'Webhook received' });
  }

  if (broker === 'angelone') {
    const body = await req.json();
    const clientCode = body.clientcode ?? body.clientId;
    if (!clientCode) return apiError('Missing client identifier');
    const db = getDatabase();
    const [connection] = await db.select().from(brokerConnections).where(eq(brokerConnections.brokerClientId, clientCode)).limit(1);
    if (!connection) return apiError('Unknown client', 404);
    await enqueueWebhook('angelone', connection.id, connection.userId, body);
    return ok({ message: 'Webhook received' });
  }

  if (broker === 'delta') {
    const body = await req.json();
    const apiKeyFromBody = body.api_key ?? body.apiKey;
    if (!apiKeyFromBody) return apiError('Missing API key identifier');
    const db = getDatabase();
    const connections = await db.select().from(brokerConnections).where(eq(brokerConnections.brokerId, 'delta_exchange')).limit(50);
    let matchedConnection: typeof connections[0] | undefined;
    for (const conn of connections) {
      try { if (conn.apiKey && decrypt(conn.apiKey) === apiKeyFromBody) { matchedConnection = conn; break; } } catch { continue; }
    }
    if (!matchedConnection) return apiError('Unknown client', 404);
    await enqueueWebhook('delta_exchange', matchedConnection.id, matchedConnection.userId, body);
    return ok({ message: 'Webhook received' });
  }

  if (broker === 'razorpay') {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const expectedSig = nodeHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      const expected = Buffer.from(expectedSig, 'utf8');
      const received = Buffer.from(signature, 'utf8');
      if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
        console.warn('⚠️ Invalid Razorpay webhook signature — rejected');
        return apiError('Invalid signature', 403);
      }
    } else if (!webhookSecret) {
      console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification');
    }

    let event: Record<string, unknown>;
    try { event = JSON.parse(rawBody); } catch { return apiError('Invalid JSON', 400); }
    const eventType = event.event as string;
    const payload = (event.payload as Record<string, unknown>) ?? {};
    console.log(`📬 Razorpay webhook: ${eventType}`);

    try {
      switch (eventType) {
        case 'payment.captured': {
          const payment = (payload.payment as Record<string, unknown>)?.entity as Record<string, unknown>;
          if (!payment) break;
          const notes = (payment.notes ?? {}) as Record<string, string>;
          const userId = notes.userId; const planId = notes.planId; const productId = notes.productId;
          if (userId && planId) {
            await handleSuccessfulPayment({ userId, planId, provider: 'razorpay', providerPaymentId: String(payment.id ?? ''), providerOrderId: String(payment.order_id ?? ''), amountPaid: Number(payment.amount ?? 0), currency: String(payment.currency ?? 'INR') });
          } else if (userId && productId) {
            await enqueueWebhook('razorpay-product', '', userId, { userId, productId, paymentId: payment.id, orderId: payment.order_id, amount: payment.amount, currency: payment.currency });
          }
          break;
        }
        case 'subscription.charged': {
          const s = (payload.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;
          const p = (payload.payment as Record<string, unknown>)?.entity as Record<string, unknown>;
          if (!s) break;
          await handleSubscriptionCharged({ provider: 'razorpay', providerSubscriptionId: String(s.id ?? ''), amountPaid: Number(p?.amount ?? 0), currency: String(p?.currency ?? 'INR'), providerInvoiceId: p ? String(p.id) : undefined, periodEnd: s.current_end ? new Date(Number(s.current_end) * 1000) : undefined });
          break;
        }
        case 'subscription.cancelled': {
          const s = (payload.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;
          if (!s) break;
          await handleSubscriptionCancelledByProvider({ provider: 'razorpay', providerSubscriptionId: String(s.id ?? '') });
          break;
        }
        case 'payment.failed': {
          const s = (payload.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;
          if (s?.id) await handleSubscriptionPastDue({ provider: 'razorpay', providerSubscriptionId: String(s.id) });
          break;
        }
        default: console.log(`ℹ️ Unhandled Razorpay event: ${eventType}`);
      }
    } catch (err: any) {
      console.error(`❌ Razorpay webhook processing error [${eventType}]:`, err?.message);
      // Return 200 to prevent Razorpay from retrying non-recoverable errors
      return NextResponse.json({ success: false, error: err?.message }, { status: 200 });
    }

    return ok({ event: eventType });
  }

  return apiError(`Unknown webhook broker: ${broker}`, 404);
  } catch (err: unknown) {
    console.error('[Webhooks POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}
