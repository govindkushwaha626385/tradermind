// ──────────────────────────────────────────────
// TradeMind — Webhook Routes
//
// Handles real-time postbacks from:
//   • Broker order gateways (Zerodha, Dhan, Angel, Delta)
//   • Razorpay subscription/payment events
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { getDatabase, brokerConnections } from '@trademind/database';
import { eq } from 'drizzle-orm';
import { decrypt, sha256, createHmac } from '@trademind/database';
import { getQueue } from '../lib/jobs';
import { configManager } from '@trademind/config';
import {
  handleSuccessfulPayment,
  handleSubscriptionCharged,
  handleSubscriptionPastDue,
  handleSubscriptionCancelledByProvider,
} from '../services/payment/payment.service';
import { createHmac as nodeHmac, timingSafeEqual } from 'crypto';

export const webhooksRouter = new Hono();

/**
 * POST /webhooks/zerodha — Zerodha Kite Postback
 * Receives real-time order updates with SHA-256 checksum verification
 */
webhooksRouter.post('/zerodha', async (c) => {
  const body = await c.req.json();
  const db = getDatabase();

  // Verify checksum if postback security is enabled
  const verifyChecksum = await configManager.get<boolean>('broker.zerodha.postback_enabled');
  if (verifyChecksum) {
    // Find the broker connection by order user_id
    const [connection] = await db
      .select()
      .from(brokerConnections)
      .where(eq(brokerConnections.brokerClientId, body.user_id))
      .limit(1);

    if (!connection) {
      return c.json({ success: false, error: 'Unknown user' }, 404);
    }

    // Decrypt API secret for checksum verification
    const apiSecret = decrypt(connection.apiSecret!);
    const expectedChecksum = sha256(`${body.order_id}${body.order_timestamp}${apiSecret}`);

    if (body.checksum !== expectedChecksum) {
      console.warn('⚠️ Invalid Zerodha postback checksum');
      return c.json({ success: false, error: 'Invalid checksum' }, 403);
    }
  }

  // Queue the webhook for processing
  const webhookQueue = getQueue('process-webhook');
  await webhookQueue.add('zerodha-postback', {
    brokerId: 'zerodha',
    payload: body,
  });

  return c.json({ success: true, data: { message: 'Webhook received' } });
});

/**
 * POST /webhooks/dhan — Dhan HQ Postback
 *
 * Dhan sends an HMAC-SHA256 signature in the X-Dhan-Signature header.
 * The signature is HMAC(AccessToken, rawBody).
 */
webhooksRouter.post('/dhan', async (c) => {
  // Read raw body FIRST, then parse JSON from it
  const rawBody = await c.req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const db = getDatabase();

  const [connection] = await db
    .select()
    .from(brokerConnections)
    .where(eq(brokerConnections.brokerClientId, body.dhanClientId as string))
    .limit(1);

  if (!connection) {
    return c.json({ success: false, error: 'Unknown client' }, 404);
  }

  // Verify HMAC signature if provided
  const signature = c.req.header('x-dhan-signature');
  if (signature) {
    const decryptedSecret = decrypt(connection.accessToken);
    const expectedSignature = createHmac('sha256', decryptedSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('⚠️ Invalid Dhan webhook signature');
      return c.json({ success: false, error: 'Invalid signature' }, 403);
    }
  }

  const webhookQueue = getQueue('process-webhook');
  await webhookQueue.add('dhan-postback', {
    brokerId: 'dhan',
    connectionId: connection.id,
    userId: connection.userId,
    payload: body,
  });

  return c.json({ success: true, data: { message: 'Webhook received' } });
});

/**
 * POST /webhooks/angelone — Angel One Webhook
 *
 * Looks up the connection by client code from the payload,
 * then queues the webhook for processing with connection context.
 */
webhooksRouter.post('/angelone', async (c) => {
  const body = await c.req.json();
  const db = getDatabase();

  // Angel One payload includes clientcode — use it to find the connection
  const clientCode = body.clientcode ?? body.clientId;
  if (!clientCode) {
    return c.json({ success: false, error: 'Missing client identifier' }, 400);
  }

  const [connection] = await db
    .select()
    .from(brokerConnections)
    .where(eq(brokerConnections.brokerClientId, clientCode))
    .limit(1);

  if (!connection) {
    return c.json({ success: false, error: 'Unknown client' }, 404);
  }

  const webhookQueue = getQueue('process-webhook');
  await webhookQueue.add('angelone-webhook', {
    brokerId: 'angelone',
    connectionId: connection.id,
    userId: connection.userId,
    payload: body,
  });

  return c.json({ success: true, data: { message: 'Webhook received' } });
});

/**
 * POST /webhooks/delta — Delta Exchange Webhook
 *
 * Looks up the connection by API key from the payload.
 * Since apiKey is encrypted at rest, we decrypt all Delta connections
 * in-memory and find the match. This is safe because Delta connections
 * are typically few per deployment.
 */
webhooksRouter.post('/delta', async (c) => {
  const body = await c.req.json();
  const db = getDatabase();

  // Delta payload includes api_key to identify the connection
  const apiKeyFromBody = body.api_key ?? body.apiKey;
  if (!apiKeyFromBody) {
    return c.json({ success: false, error: 'Missing API key identifier' }, 400);
  }

  // Fetch all active Delta connections
  const connections = await db
    .select()
    .from(brokerConnections)
    .where(eq(brokerConnections.brokerId, 'delta_exchange'))
    .limit(50);

  // Decrypt each apiKey and find the match
  let matchedConnection: typeof connections[0] | undefined;
  for (const conn of connections) {
    try {
      if (conn.apiKey) {
        const decrypted = decrypt(conn.apiKey);
        if (decrypted === apiKeyFromBody) {
          matchedConnection = conn;
          break;
        }
      }
    } catch {
      // Skip connections where decryption fails
      continue;
    }
  }

  if (!matchedConnection) {
    return c.json({ success: false, error: 'Unknown client' }, 404);
  }

  const webhookQueue = getQueue('process-webhook');
  await webhookQueue.add('delta-webhook', {
    brokerId: 'delta_exchange',
    connectionId: matchedConnection.id,
    userId: matchedConnection.userId,
    payload: body,
  });

  return c.json({ success: true, data: { message: 'Webhook received' } });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /webhooks/razorpay — Razorpay Subscription & Payment Events
//
// Handled events:
//   payment.captured         → one-time / order payment success
//   subscription.charged     → recurring billing renewal
//   subscription.cancelled   → user or admin cancelled
//   payment.failed           → payment failure (mark past_due)
//
// Security: HMAC-SHA256 over raw body using RAZORPAY_WEBHOOK_SECRET
// ─────────────────────────────────────────────────────────────────────────────
webhooksRouter.post('/razorpay', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-razorpay-signature');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // ── Verify HMAC signature (required in production) ───────────────────────
  if (webhookSecret && signature) {
    const expectedSig = nodeHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expected = Buffer.from(expectedSig, 'utf8');
    const received = Buffer.from(signature,   'utf8');

    const isValid =
      expected.length === received.length &&
      timingSafeEqual(expected, received);

    if (!isValid) {
      console.warn('⚠️ Invalid Razorpay webhook signature — rejected');
      return c.json({ success: false, error: 'Invalid signature' }, 403);
    }
  } else if (!webhookSecret) {
    // Log a warning in production if secret is not configured
    console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification');
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ success: false, error: 'Invalid JSON' }, 400);
  }

  const eventType = event.event as string;
  const payload   = (event.payload as Record<string, unknown>) ?? {};

  console.log(`📬 Razorpay webhook: ${eventType}`);

  try {
    switch (eventType) {
      // ── One-time product order payment (digital store) ──────────────────
      case 'payment.captured': {
        const payment = (payload.payment as Record<string, unknown>)?.entity as Record<string, unknown>;
        if (!payment) break;

        const notes     = (payment.notes ?? {}) as Record<string, string>;
        const userId    = notes.userId;
        const planId    = notes.planId;
        const productId = notes.productId;

        if (userId && planId) {
          // Subscription plan purchase via order
          await handleSuccessfulPayment({
            userId,
            planId,
            provider:         'razorpay',
            providerPaymentId: String(payment.id ?? ''),
            providerOrderId:   String(payment.order_id ?? ''),
            amountPaid:        Number(payment.amount ?? 0),
            currency:          String(payment.currency ?? 'INR'),
          });
        } else if (userId && productId) {
          // Digital product purchase — queue processing
          await getQueue('process-webhook').add('razorpay-product-payment', {
            userId,
            productId,
            paymentId: payment.id,
            orderId:   payment.order_id,
            amount:    payment.amount,
            currency:  payment.currency,
          });
        }
        break;
      }

      // ── Recurring subscription renewal ─────────────────────────────────
      case 'subscription.charged': {
        const sub     = (payload.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;
        const payment = (payload.payment     as Record<string, unknown>)?.entity as Record<string, unknown>;
        if (!sub) break;

        // Calculate next period end
        const currentEnd = sub.current_end ? new Date(Number(sub.current_end) * 1000) : undefined;

        await handleSubscriptionCharged({
          provider:               'razorpay',
          providerSubscriptionId: String(sub.id ?? ''),
          amountPaid:             Number(payment?.amount ?? 0),
          currency:               String(payment?.currency ?? 'INR'),
          providerInvoiceId:      payment ? String(payment.id) : undefined,
          periodEnd:              currentEnd,
        });
        break;
      }

      // ── Subscription cancelled ─────────────────────────────────────────
      case 'subscription.cancelled': {
        const sub = (payload.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;
        if (!sub) break;

        await handleSubscriptionCancelledByProvider({
          provider:               'razorpay',
          providerSubscriptionId: String(sub.id ?? ''),
        });
        break;
      }

      // ── Payment failure / past due ─────────────────────────────────────
      case 'payment.failed': {
        const sub = (payload.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;
        if (sub?.id) {
          await handleSubscriptionPastDue({
            provider:               'razorpay',
            providerSubscriptionId: String(sub.id),
          });
        }
        break;
      }

      default:
        // Non-critical — just acknowledge
        console.log(`ℹ️ Unhandled Razorpay event: ${eventType}`);
    }
  } catch (err: any) {
    console.error(`❌ Razorpay webhook processing error [${eventType}]:`, err?.message);
    // Return 200 to prevent Razorpay from retrying non-recoverable errors
    return c.json({ success: false, error: err?.message }, 200);
  }

  return c.json({ success: true, data: { event: eventType } });
});
