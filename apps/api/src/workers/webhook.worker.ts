// ──────────────────────────────────────────────
// TradeMind — Webhook Processing Worker
// Handles real-time order updates from broker postbacks
// ──────────────────────────────────────────────

import { createWorker, getQueue } from '../lib/jobs';
import { getDatabase, tradeExecutions, brokerConnections, users } from '@trademind/database';
import { eq } from 'drizzle-orm';
import { createFillHash } from '@trademind/database';
import { calculateFees } from '../services/tax.service';
import { sendSyncNotification } from '../services/notification/email.service';

export function webhookWorker() {
  createWorker<{ brokerId: string; connectionId: string; userId: string; payload: Record<string, any> }>('process-webhook', async (job) => {
    const { brokerId, connectionId, userId, payload } = job.data;
    const db = getDatabase();

    console.log(`📡 Processing webhook: ${brokerId} — ${payload.orderId}`);

    // Only process COMPLETE/TRADED orders (executed fills)
    const orderStatus = payload.status ?? payload.orderStatus;
    if (orderStatus !== 'COMPLETE' && orderStatus !== 'TRADED') {
      return; // Ignore non-fill updates
    }

    // Map broker payload to our TradeExecution schema
    const execution = {
      brokerExecutionId: payload.orderId ?? payload.exchangeOrderId,
      brokerOrderId: payload.orderId,
      exchangeOrderId: payload.exchangeOrderId,
      tradingsymbol: payload.tradingsymbol,
      exchange: mapExchange(payload.exchange ?? payload.exchangeSegment),
      segment: mapSegment(payload.exchange ?? payload.exchangeSegment),
      transactionType: payload.transaction_type ?? payload.transactionType,
      orderType: payload.order_type ?? payload.orderType,
      quantity: payload.filled_quantity ?? payload.filled_qty ?? payload.quantity,
      executionPrice: parseFloat(payload.average_price ?? payload.price ?? '0'),
      executionTimestamp: new Date(payload.exchange_timestamp ?? payload.exchangeTime ?? payload.order_timestamp),
      rawPayload: payload,
    };

    // Calculate fees
    const fees = await calculateFees({
      segment: execution.segment as any,
      transactionType: execution.transactionType as any,
      tradeValue: execution.quantity * execution.executionPrice,
    });

    const fillHash = createFillHash(brokerId, execution.brokerExecutionId, userId);

    // Insert execution atomically — ON CONFLICT silently skips duplicates
    const [inserted] = await db
      .insert(tradeExecutions)
      .values({
        ...execution,
        ...fees,
        userId,
        brokerConnectionId: connectionId,
        fillHash,
      })
      .onConflictDoNothing()
      .returning({ id: tradeExecutions.id });

    if (!inserted) {
      console.log(`  ↳ Duplicate webhook ignored: ${fillHash}`);
      return;
    }

    console.log(`  ✓ Execution recorded: ${execution.tradingsymbol} ${execution.transactionType} ${execution.quantity}@${execution.executionPrice}`);

    // Trigger clustering for this symbol
    const clusteringQueue = getQueue('cluster-trades');
    await clusteringQueue.add('recluster', {
      connectionId,
      userId,
      symbol: execution.tradingsymbol,
    });

    // Notify user about the new trade execution (non-critical)
    try {
      const [conn] = await db
        .select()
        .from(brokerConnections)
        .where(eq(brokerConnections.id, connectionId))
        .limit(1);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (conn && user) {
        await sendSyncNotification(
          userId,
          user.email,
          conn.brokerId,
          'SUCCESS',
          `${execution.transactionType} ${execution.quantity} ${execution.tradingsymbol} @ ₹${execution.executionPrice}`,
        );
      }
    } catch (notifyErr) {
      console.error('  ⚠️ Failed to send notification:', notifyErr);
    }
  });
}

function mapExchange(exchange: string): string {
  const map: Record<string, string> = {
    NSE: 'NSE',
    NSE_EQ: 'NSE',
    NSE_FNO: 'NFO',
    BSE: 'BSE',
    BSE_EQ: 'BSE',
    MCX: 'MCX',
    MCX_COMM: 'MCX',
    NSE_CURRENCY: 'CDS',
    DELTA: 'DELTA',
  };
  return map[exchange] ?? exchange;
}

function mapSegment(exchange: string): string {
  const map: Record<string, string> = {
    NSE: 'EQUITY',
    NSE_EQ: 'EQUITY',
    NSE_FNO: 'FNO',
    BSE: 'EQUITY',
    BSE_EQ: 'EQUITY',
    MCX: 'COMMODITY',
    MCX_COMM: 'COMMODITY',
    NSE_CURRENCY: 'CURRENCY',
    DELTA: 'CRYPTO_DERIVATIVES',
  };
  return map[exchange] ?? 'EQUITY';
}
