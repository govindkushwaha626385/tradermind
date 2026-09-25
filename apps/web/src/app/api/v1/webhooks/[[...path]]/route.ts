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

import { processBrokerWebhook } from '@/lib/server/services/webhook-ingestion.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const broker = path?.[0] ?? 'generic';
  return ok({
    status: 'online',
    broker,
    service: 'TradeMind Institutional Webhook Engine',
    timestamp: new Date().toISOString(),
    supportedBrokers: [
      'zerodha',
      'dhan',
      'angelone',
      'upstox',
      'delta',
      'binance',
      'bybit',
      'ibkr',
      'generic',
    ],
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const broker = path?.[0];
    if (!broker) return apiError('Broker identifier required in path', 400);

    // Razorpay Webhooks (Payments & Subscriptions)
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
              // Direct product access
              console.log(`🎁 Product access granted via Razorpay for user=${userId}, product=${productId}`);
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
        return NextResponse.json({ success: false, error: err?.message }, { status: 200 });
      }

      return ok({ event: eventType });
    }

    // Broker Trade Fills & Postback Ingestion (Zerodha, Dhan, Angel One, Upstox, Delta, Binance, IBKR, Generic)
    const rawBody = await req.text();
    const url = new URL(req.url);

    const result = await processBrokerWebhook({
      brokerId: broker,
      rawPayload: rawBody,
      headers: req.headers,
      query: url.searchParams,
    });

    if (!result.success && result.error?.includes('signature')) {
      return apiError(result.error, 403);
    }
    if (!result.success && result.error?.includes('No active broker connection found')) {
      return apiError(result.error, 404);
    }
    if (!result.success) {
      return apiError(result.error ?? 'Webhook processing failed', 400);
    }

    return ok(result);
  } catch (err: unknown) {
    console.error('[Webhooks POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

