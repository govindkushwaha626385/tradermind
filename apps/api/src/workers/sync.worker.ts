// ──────────────────────────────────────────────
// TradeMind — Sync Worker
// Handles scheduled and manual broker trade syncs
// ──────────────────────────────────────────────

import { getDatabase, brokerConnections, tradeExecutions, syncLogs, accountBalances, decrypt, encrypt, createFillHash, plans, subscriptions, journalTrades, tradeExecutionLinks } from '@trademind/database';
import { eq, and, sql, desc } from 'drizzle-orm';
import { createWorker } from '../lib/jobs';
import { getBrokerConnector } from '../connectors/base';
import { clusterExecutions } from '../services/clustering.service';
import { calculateFees } from '../services/tax.service';
import { sendSyncNotification } from '../services/notification/email.service';
import type { BrokerId, TradeExecution, JournalTrade } from '@trademind/shared';
import type { BrokerConnectorConfig } from '../connectors/base';

/**
 * Check how many new executions the user can still import this month
 * based on their plan's maxTradesPerMonth feature.
 * Returns Infinity for unlimited plans.
 */
async function getRemainingTradeQuota(userId: string): Promise<number> {
  const db = getDatabase();

  // Get user's active subscription plan features
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
    .limit(1);

  let maxTrades = 50; // free plan default
  if (sub) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1);
    const features = (plan?.features as Record<string, unknown>) ?? {};
    maxTrades = Number(features.maxTradesPerMonth ?? 50);
  }

  if (maxTrades <= 0) return Infinity; // 0 or negative = unlimited

  // Count executions this calendar month
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tradeExecutions)
    .where(and(eq(tradeExecutions.userId, userId), sql`${tradeExecutions.executionTimestamp} >= ${firstOfMonth}`));

  const used = Number(result?.count ?? 0);
  return Math.max(0, maxTrades - used);
}

export function syncWorker() {
  createWorker<{ connectionId: string; userId: string; brokerId: string }>('sync-trades', async (job) => {
    const { connectionId, userId, brokerId } = job.data;
    const db = getDatabase();
    const syncLogId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create sync log entry
    await db.insert(syncLogs).values({
      id: syncLogId,
      userId,
      brokerConnectionId: connectionId,
      syncType: job.name === 'initial-sync' ? 'full' : 'incremental',
      status: 'RUNNING',
    });

    try {
      const [connection] = await db
        .select()
        .from(brokerConnections)
        .where(eq(brokerConnections.id, connectionId))
        .limit(1);

      if (!connection) {
        throw new Error('Broker connection not found');
      }

      // ── Skip if connection is permanently expired ──
      if (connection.status === 'EXPIRED' && (!connection.tokenExpiresAt || new Date(connection.tokenExpiresAt) < new Date())) {
        console.log(`⏭️ Skipping sync for expired connection: ${connectionId}`);
        await db.update(syncLogs)
          .set({ status: 'FAILED', completedAt: new Date(), errorMessage: 'Connection is expired. Reconnect your broker.' })
          .where(eq(syncLogs.id, syncLogId));
        return; // Don't throw — no retry needed
      }

      // ── CSV-import brokers don't use API sync ──
      if (connection.authType === 'csv_import') {
        console.log(`⏭️ Skipping sync for CSV-based broker: ${connectionId}`);
        await db.update(syncLogs)
          .set({
            status: 'SUCCESS',
            completedAt: new Date(),
            executionsImported: 0,
            tradesCreated: 0,
          })
          .where(eq(syncLogs.id, syncLogId));
        return;
      }

      // Decrypt credentials
      const decryptedAccessToken = decrypt(connection.accessToken);
      const decryptedRefreshToken = connection.refreshToken ? decrypt(connection.refreshToken) : undefined;
      const decryptedApiKey = connection.apiKey ? decrypt(connection.apiKey) : undefined;
      const decryptedApiSecret = connection.apiSecret ? decrypt(connection.apiSecret) : undefined;

      const config: BrokerConnectorConfig = {
        apiKey: decryptedApiKey,
        apiSecret: decryptedApiSecret,
        accessToken: decryptedAccessToken,
        refreshToken: decryptedRefreshToken,
        clientId: connection.brokerClientId,
      };

      const connector = await getBrokerConnector(brokerId as BrokerId, config);

      // Check if token is expired
      if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) < new Date()) {
        if (decryptedRefreshToken) {
          try {
            const newTokens = await connector.refreshTokens(decryptedRefreshToken);
            // Update stored tokens
            await db.update(brokerConnections)
              .set({
                accessToken: encrypt(newTokens.accessToken),
                refreshToken: newTokens.refreshToken ? encrypt(newTokens.refreshToken) : connection.refreshToken,
                tokenExpiresAt: newTokens.expiresAt,
                status: 'ACTIVE',
              })
              .where(eq(brokerConnections.id, connectionId));

            // Update connector with new token
            config.accessToken = newTokens.accessToken;
          } catch {
            await db.update(brokerConnections)
              .set({ status: 'EXPIRED' })
              .where(eq(brokerConnections.id, connectionId));
            throw new Error('Broker token expired and refresh failed');
          }
        } else if (decryptedApiKey && decryptedApiSecret) {
          // Some brokers (e.g. Groww) can re-auth with apiKey+apiSecret
          try {
            const newTokens = await connector.refreshTokens(''); // no refresh token, uses apiKey+apiSecret
            await db.update(brokerConnections)
              .set({
                accessToken: encrypt(newTokens.accessToken),
                tokenExpiresAt: newTokens.expiresAt,
                status: 'ACTIVE',
              })
              .where(eq(brokerConnections.id, connectionId));
            config.accessToken = newTokens.accessToken;
          } catch {
            await db.update(brokerConnections)
              .set({ status: 'EXPIRED' })
              .where(eq(brokerConnections.id, connectionId));
            throw new Error('Broker token expired and re-authentication failed');
          }
        } else {
          await db.update(brokerConnections)
            .set({ status: 'EXPIRED' })
            .where(eq(brokerConnections.id, connectionId));
          throw new Error('Broker token expired');
        }
      }

      // Fetch trade executions
      const rawExecutions = await connector.fetchTradeBook();

      // Persist the latest real-time account balance for the dashboard.
      try {
        const balance = await connector.fetchAccountBalance();
        await db
        .insert(accountBalances)
        .values({
          userId,
          brokerConnectionId: connectionId,
          availableCash: balance.availableCash ?? 0,
          usedMargin: balance.usedMargin ?? 0,
          totalCollateral: balance.totalCollateral ?? 0,
          payinAmount: balance.payinAmount ?? 0,
          payoutAmount: balance.payoutAmount ?? 0,
          currency: balance.currency ?? 'INR',
        })
        .onConflictDoUpdate({
          target: accountBalances.brokerConnectionId,
          set: {
            availableCash: balance.availableCash ?? 0,
            usedMargin: balance.usedMargin ?? 0,
            totalCollateral: balance.totalCollateral ?? 0,
            payinAmount: balance.payinAmount ?? 0,
            payoutAmount: balance.payoutAmount ?? 0,
            currency: balance.currency ?? 'INR',
            updatedAt: new Date(),
          },
        });
      } catch (balanceError) {
        console.warn(`⚠️ Balance refresh failed for ${connectionId}:`, balanceError);
      }

      // Calculate fees for each execution and create fill hashes
      const processedExecutions: TradeExecution[] = [];
      for (const raw of rawExecutions) {
        const fees = await calculateFees({
          segment: raw.segment,
          transactionType: raw.transactionType,
          tradeValue: raw.quantity * raw.executionPrice,
        });

        processedExecutions.push({
          ...raw,
          ...fees,
          userId,                        // override empty placeholder from connector
          brokerConnectionId: connectionId, // override empty placeholder from connector
          fillHash: createFillHash(brokerId, raw.brokerExecutionId, userId),
        });
      }

      // Insert executions with atomic deduplication (fillHash unique constraint) + quota enforcement
      let importedCount = 0;
      const remainingQuota = await getRemainingTradeQuota(userId);
      let quotaExceeded = false;

      for (const exec of processedExecutions) {
        if (importedCount >= remainingQuota) {
          quotaExceeded = true;
          break;
        }
        // Atomic insert — if fillHash already exists, ON CONFLICT silently skips
        const [result] = await db
          .insert(tradeExecutions)
          .values(exec)
          .onConflictDoNothing()
          .returning({ id: tradeExecutions.id });
        if (result) importedCount++;
      }

      if (quotaExceeded) {
        console.warn(`⚠️ Trade quota reached for user ${userId} — imported ${importedCount}/${remainingQuota} new executions`);
      }

      const newExecutions = await db
        .select()
        .from(tradeExecutions)
        .where(eq(tradeExecutions.brokerConnectionId, connectionId))
        .orderBy(tradeExecutions.executionTimestamp);

      // Map Drizzle rows to the domain TradeExecution type
      const domainExecutions = newExecutions.map((exec) => ({
        ...exec,
        exchangeOrderId: exec.exchangeOrderId ?? undefined,
        rawPayload: exec.rawPayload as Record<string, unknown> | undefined,
      })) as unknown as TradeExecution[];

      const clusteringResult = clusterExecutions(domainExecutions);

      // Reconcile clustered trades with existing rows. The stable identity is
      // the connection, symbol, direction, and opening execution timestamp.
      // Quantitative fields are refreshed while user-authored journal fields
      // (notes, emotions, ratings, screenshots) remain untouched.
      const existingTrades = await db
        .select()
        .from(journalTrades)
        .where(eq(journalTrades.brokerConnectionId, connectionId));
      const existingByKey = new Map(
        existingTrades.map((trade) => [
          `${trade.tradingsymbol}:${trade.direction}:${new Date(trade.openedAt).toISOString()}`,
          trade,
        ]),
      );
      const reconciledIds = new Set<string>();

      // Insert or update clustered journal trades with execution links
      let tradesCreated = 0;
      for (const trade of clusteringResult.trades) {
        const key = `${trade.tradingsymbol}:${trade.direction}:${new Date(trade.openedAt ?? new Date()).toISOString()}`;
        const existing = existingByKey.get(key);
        const values = {
            userId: trade.userId!,
            brokerConnectionId: connectionId,
            tradingsymbol: trade.tradingsymbol!,
            exchange: trade.exchange!,
            assetClass: trade.assetClass!,
            direction: trade.direction!,
            status: trade.status ?? 'OPEN',
            totalQuantity: trade.totalQuantity ?? 0,
            openQuantity: trade.openQuantity ?? trade.totalQuantity ?? 0,
            avgEntryPrice: trade.avgEntryPrice ?? 0,
            avgExitPrice: trade.avgExitPrice,
            openedAt: trade.openedAt ?? new Date(),
            closedAt: trade.closedAt,
            grossPnl: trade.grossPnl ?? 0,
            totalFeesAndTaxes: trade.totalFeesAndTaxes ?? 0,
            netPnl: trade.netPnl ?? 0,
            maxFavorableExcursion: trade.maxFavorableExcursion,
            maxAdverseExcursion: trade.maxAdverseExcursion,
            rMultiple: trade.rMultiple,
            holdingPeriodMinutes: trade.holdingPeriodMinutes,
          };

        let journalTradeId: string;
        if (existing) {
          journalTradeId = existing.id;
          reconciledIds.add(existing.id);
          await db.update(journalTrades).set({ ...values, updatedAt: new Date() }).where(eq(journalTrades.id, existing.id));
          await db.delete(tradeExecutionLinks).where(eq(tradeExecutionLinks.journalTradeId, existing.id));
        } else {
          const [inserted] = await db.insert(journalTrades).values(values).returning({ id: journalTrades.id });
          if (!inserted) continue;
          journalTradeId = inserted.id;
          reconciledIds.add(inserted.id);
          tradesCreated++;
        }

        // Create execution links for this trade
        const tradeLinks = clusteringResult.links.filter((l) => l.journalTradeId === trade.id);
        for (const link of tradeLinks) {
          await db.insert(tradeExecutionLinks).values({
            journalTradeId,
            executionId: link.executionId,
            allocatedQuantity: link.allocatedQuantity,
            allocatedFees: link.allocatedFees,
          }).onConflictDoNothing();
        }
      }

      // Remove only rows that no longer correspond to broker executions. This
      // keeps the database consistent after broker-side corrections while the
      // reconciliation above preserves journal annotations for stable trades.
      for (const existing of existingTrades) {
        if (!reconciledIds.has(existing.id)) {
          await db.delete(journalTrades).where(eq(journalTrades.id, existing.id));
        }
      }

      // Update sync log
      await db.update(syncLogs)
        .set({
          status: 'SUCCESS',
          completedAt: new Date(),
          executionsImported: importedCount,
          tradesCreated: clusteringResult.trades.length,
        })
        .where(eq(syncLogs.id, syncLogId));

      // Update last synced timestamp
      await db.update(brokerConnections)
        .set({ lastSyncedAt: new Date() })
        .where(eq(brokerConnections.id, connectionId));

      console.log(`✅ Sync complete: ${connectionId} — ${importedCount} new executions, ${clusteringResult.trades.length} trades clustered`);

    } catch (error: any) {
      await db.update(syncLogs)
        .set({
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        })
        .where(eq(syncLogs.id, syncLogId));

      console.error(`❌ Sync failed: ${connectionId} — ${error.message}`);
      throw error;
    }
  });
}
