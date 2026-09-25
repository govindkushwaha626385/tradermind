// ──────────────────────────────────────────────
// TradeMind — Direct Broker Sync Service
// Fetches account balance and trades from connected broker,
// calculates statutory taxes/fees, clusters into journal trades,
// and updates the user's dashboard in real-time.
// ──────────────────────────────────────────────

import {
  getDatabase,
  brokerConnections,
  accountBalances,
  tradeExecutions,
  journalTrades,
  tradeExecutionLinks,
  syncLogs,
  decrypt,
  encrypt,
  createFillHash,
} from '@trademind/database';
import { eq, and } from 'drizzle-orm';
import { getBrokerConnector, type BrokerConnectorConfig } from '../connectors/base';
import { calculateFees } from './tax.service';
import { clusterExecutions } from './clustering.service';
import type { BrokerId, TradeExecution } from '@trademind/shared';

export interface BrokerSyncResult {
  success: boolean;
  message?: string;
  error?: string;
  importedCount?: number;
  tradesCreated?: number;
  balance?: {
    availableCash: number;
    usedMargin: number;
    totalCollateral: number;
    currency: string;
  };
}

/**
 * Execute real-time synchronization for a broker connection.
 */
export async function syncBrokerConnection(
  connectionId: string,
  userId: string,
): Promise<BrokerSyncResult> {
  const db = getDatabase();

  const [connection] = await db
    .select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.id, connectionId), eq(brokerConnections.userId, userId)))
    .limit(1);

  if (!connection) {
    return { success: false, error: 'Broker connection not found' };
  }

  if (connection.status === 'EXPIRED') {
    return { success: false, error: 'Connection has expired. Please reconnect your broker account.' };
  }

  if (connection.authType === 'csv_import') {
    return {
      success: true,
      message: 'CSV-based connection. Please use 1-Click CSV Import to upload trade files.',
      importedCount: 0,
      tradesCreated: 0,
    };
  }

  // Create sync log entry
  const [syncLog] = await db
    .insert(syncLogs)
    .values({
      userId,
      brokerConnectionId: connectionId,
      syncType: 'incremental',
      status: 'RUNNING',
      startedAt: new Date(),
    })
    .returning({ id: syncLogs.id });

  try {
    let decryptedAccessToken: string;
    try {
      decryptedAccessToken = decrypt(connection.accessToken);
    } catch {
      // If decryption fails (e.g. was stored plaintext in edge cases), fallback gracefully
      decryptedAccessToken = connection.accessToken;
    }

    let decryptedRefreshToken: string | undefined;
    if (connection.refreshToken) {
      try {
        decryptedRefreshToken = decrypt(connection.refreshToken);
      } catch {
        decryptedRefreshToken = connection.refreshToken;
      }
    }

    let decryptedApiKey: string | undefined;
    if (connection.apiKey) {
      try {
        decryptedApiKey = decrypt(connection.apiKey);
      } catch {
        decryptedApiKey = connection.apiKey;
      }
    }

    let decryptedApiSecret: string | undefined;
    if (connection.apiSecret) {
      try {
        decryptedApiSecret = decrypt(connection.apiSecret);
      } catch {
        decryptedApiSecret = connection.apiSecret;
      }
    }

    const config: BrokerConnectorConfig = {
      apiKey: decryptedApiKey,
      apiSecret: decryptedApiSecret,
      accessToken: decryptedAccessToken,
      refreshToken: decryptedRefreshToken,
      clientId: connection.brokerClientId,
    };

    const connector = await getBrokerConnector(connection.brokerId as BrokerId, config);

    // Proactive token refresh if expired or expiring within 15 minutes
    const isTokenExpiringSoon = connection.tokenExpiresAt &&
      new Date(connection.tokenExpiresAt).getTime() - Date.now() < 15 * 60 * 1000;

    if (isTokenExpiringSoon && decryptedRefreshToken) {
      try {
        console.log(`[broker-sync] Proactively refreshing token for connection ${connectionId} (${connection.brokerId})`);
        const newTokens = await connector.refreshTokens(decryptedRefreshToken);
        await db
          .update(brokerConnections)
          .set({
            accessToken: encrypt(newTokens.accessToken),
            refreshToken: newTokens.refreshToken ? encrypt(newTokens.refreshToken) : connection.refreshToken,
            tokenExpiresAt: newTokens.expiresAt,
            status: 'ACTIVE',
            updatedAt: new Date(),
          })
          .where(eq(brokerConnections.id, connectionId));
        config.accessToken = newTokens.accessToken;
      } catch (refreshErr) {
        console.warn(`[broker-sync] Token refresh failed for ${connectionId}:`, refreshErr);
        if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) < new Date()) {
          await db.update(brokerConnections).set({ status: 'EXPIRED' }).where(eq(brokerConnections.id, connectionId));
          throw new Error('Broker token expired and could not be renewed. Please reconnect your account.');
        }
      }
    }

    // 1. Fetch & persist Account Balance / Margin
    let balanceResult: { availableCash: number; usedMargin: number; totalCollateral: number; currency: string } | undefined;
    try {
      const balance = await connector.fetchAccountBalance();
      if (balance) {
        balanceResult = {
          availableCash: balance.availableCash ?? 0,
          usedMargin: balance.usedMargin ?? 0,
          totalCollateral: balance.totalCollateral ?? 0,
          currency: balance.currency ?? 'INR',
        };

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
      }
    } catch (balErr) {
      console.warn(`[broker-sync] Balance fetch notice for ${connectionId}:`, balErr);
    }

    // 2. Fetch trade book from broker
    let rawExecutions: TradeExecution[] = [];
    try {
      rawExecutions = await connector.fetchTradeBook();
    } catch (tbErr: any) {
      console.warn(`[broker-sync] Trade book fetch notice for ${connectionId}:`, tbErr.message);
      // Even if trade book is empty or throws today, balance update was successful
    }

    // 3. Process statutory charges and taxes
    const processedExecutions: TradeExecution[] = [];
    for (const raw of rawExecutions) {
      try {
        const fees = await calculateFees({
          segment: raw.segment,
          transactionType: raw.transactionType,
          tradeValue: raw.quantity * raw.executionPrice,
        });
        processedExecutions.push({
          ...raw,
          ...fees,
          userId,
          brokerConnectionId: connectionId,
          fillHash: createFillHash(connection.brokerId, raw.brokerExecutionId, userId),
        });
      } catch {
        processedExecutions.push({
          ...raw,
          userId,
          brokerConnectionId: connectionId,
          fillHash: createFillHash(connection.brokerId, raw.brokerExecutionId, userId),
        });
      }
    }

    // 4. Upsert executions
    let importedCount = 0;
    for (const exec of processedExecutions) {
      const [res] = await db
        .insert(tradeExecutions)
        .values(exec)
        .onConflictDoNothing()
        .returning({ id: tradeExecutions.id });
      if (res) importedCount++;
    }

    // 5. Cluster all executions for this connection into journal trades
    let tradesCreated = 0;
    if (processedExecutions.length > 0) {
      const allExecutions = await db
        .select()
        .from(tradeExecutions)
        .where(eq(tradeExecutions.brokerConnectionId, connectionId))
        .orderBy(tradeExecutions.executionTimestamp);

      const domainExecutions = allExecutions.map((e) => ({
        ...e,
        exchangeOrderId: e.exchangeOrderId ?? undefined,
        rawPayload: e.rawPayload as Record<string, unknown> | undefined,
      })) as unknown as TradeExecution[];

      const clusteringResult = clusterExecutions(domainExecutions);

      const existingTrades = await db
        .select()
        .from(journalTrades)
        .where(eq(journalTrades.brokerConnectionId, connectionId));

      const existingByKey = new Map(
        existingTrades.map((t) => [
          `${t.tradingsymbol}:${t.direction}:${new Date(t.openedAt).toISOString()}`,
          t,
        ]),
      );

      const matchedExistingIds = new Set<string>();

      for (const trade of clusteringResult.trades) {
        const tradeOpenedMs = new Date(trade.openedAt ?? new Date()).getTime();
        const key = `${trade.tradingsymbol}:${trade.direction}:${new Date(trade.openedAt ?? new Date()).toISOString()}`;
        let existing = existingByKey.get(key);

        if (!existing) {
          // Fuzzy match within 15 seconds on same symbol & direction to prevent duplicate trades
          existing = existingTrades.find((t) =>
            !matchedExistingIds.has(t.id) &&
            t.tradingsymbol === trade.tradingsymbol &&
            t.direction === trade.direction &&
            Math.abs(new Date(t.openedAt).getTime() - tradeOpenedMs) <= 15000,
          );
        }

        if (existing) {
          matchedExistingIds.add(existing.id);
        }
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
          await db.update(journalTrades).set({ ...values, updatedAt: new Date() }).where(eq(journalTrades.id, existing.id));
          await db.delete(tradeExecutionLinks).where(eq(tradeExecutionLinks.journalTradeId, existing.id));
        } else {
          const [inserted] = await db.insert(journalTrades).values(values).returning({ id: journalTrades.id });
          if (!inserted) continue;
          journalTradeId = inserted.id;
          tradesCreated++;
        }

        const tradeLinks = clusteringResult.links.filter((l) => l.journalTradeId === trade.id);
        for (const link of tradeLinks) {
          await db
            .insert(tradeExecutionLinks)
            .values({
              journalTradeId,
              executionId: link.executionId,
              allocatedQuantity: link.allocatedQuantity,
              allocatedFees: link.allocatedFees,
            })
            .onConflictDoNothing();
        }
      }
    }

    // 6. Update timestamps and log success
    await db
      .update(brokerConnections)
      .set({ lastSyncedAt: new Date(), status: 'ACTIVE', isActive: true })
      .where(eq(brokerConnections.id, connectionId));

    if (syncLog?.id) {
      await db
        .update(syncLogs)
        .set({
          status: 'SUCCESS',
          completedAt: new Date(),
          executionsImported: importedCount,
          tradesCreated,
        })
        .where(eq(syncLogs.id, syncLog.id));
    }

    return {
      success: true,
      message: `Sync completed: ${importedCount} executions imported, ${tradesCreated} journal trades created.`,
      importedCount,
      tradesCreated,
      balance: balanceResult,
    };
  } catch (err: any) {
    console.error(`[broker-sync] Error syncing connection ${connectionId}:`, err);

    if (syncLog?.id) {
      await db
        .update(syncLogs)
        .set({
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message ?? 'Unknown sync error',
        })
        .where(eq(syncLogs.id, syncLog.id));
    }

      return {
        success: false,
        error: err.message ?? 'Failed to synchronize with broker',
      };
    }
  }

export interface MultiBrokerSyncResult {
  totalConnections: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalImportedCount: number;
  totalTradesCreated: number;
  details: {
    connectionId: string;
    brokerId: string;
    label: string | null;
    success: boolean;
    importedCount?: number;
    tradesCreated?: number;
    error?: string;
  }[];
}

/**
 * Synchronize all active broker connections for a specific user in parallel.
 */
export async function syncAllUserBrokers(userId: string): Promise<MultiBrokerSyncResult> {
  const db = getDatabase();
  const connections = await db
    .select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.userId, userId), eq(brokerConnections.isActive, true)));

  const result: MultiBrokerSyncResult = {
    totalConnections: connections.length,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalImportedCount: 0,
    totalTradesCreated: 0,
    details: [],
  };

  for (const conn of connections) {
    if (conn.authType === 'csv_import') {
      result.details.push({
        connectionId: conn.id,
        brokerId: conn.brokerId,
        label: conn.label,
        success: true,
        importedCount: 0,
        tradesCreated: 0,
      });
      result.successfulSyncs += 1;
      continue;
    }

    try {
      const syncRes = await syncBrokerConnection(conn.id, userId);
      if (syncRes.success) {
        result.successfulSyncs += 1;
        result.totalImportedCount += syncRes.importedCount ?? 0;
        result.totalTradesCreated += syncRes.tradesCreated ?? 0;
        result.details.push({
          connectionId: conn.id,
          brokerId: conn.brokerId,
          label: conn.label,
          success: true,
          importedCount: syncRes.importedCount,
          tradesCreated: syncRes.tradesCreated,
        });
      } else {
        result.failedSyncs += 1;
        result.details.push({
          connectionId: conn.id,
          brokerId: conn.brokerId,
          label: conn.label,
          success: false,
          error: syncRes.error,
        });
      }
    } catch (err: any) {
      result.failedSyncs += 1;
      result.details.push({
        connectionId: conn.id,
        brokerId: conn.brokerId,
        label: conn.label,
        success: false,
        error: err.message ?? 'Unknown sync failure',
      });
    }
  }

  return result;
}

/**
 * Super-Admin method to trigger synchronization across all active connections in the platform.
 */
export async function syncAllBrokersAdmin(): Promise<MultiBrokerSyncResult> {
  const db = getDatabase();
  const connections = await db
    .select()
    .from(brokerConnections)
    .where(eq(brokerConnections.isActive, true));

  const result: MultiBrokerSyncResult = {
    totalConnections: connections.length,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalImportedCount: 0,
    totalTradesCreated: 0,
    details: [],
  };

  for (const conn of connections) {
    if (conn.authType === 'csv_import') {
      result.details.push({
        connectionId: conn.id,
        brokerId: conn.brokerId,
        label: conn.label,
        success: true,
        importedCount: 0,
        tradesCreated: 0,
      });
      result.successfulSyncs += 1;
      continue;
    }

    try {
      const syncRes = await syncBrokerConnection(conn.id, conn.userId);
      if (syncRes.success) {
        result.successfulSyncs += 1;
        result.totalImportedCount += syncRes.importedCount ?? 0;
        result.totalTradesCreated += syncRes.tradesCreated ?? 0;
        result.details.push({
          connectionId: conn.id,
          brokerId: conn.brokerId,
          label: conn.label,
          success: true,
          importedCount: syncRes.importedCount,
          tradesCreated: syncRes.tradesCreated,
        });
      } else {
        result.failedSyncs += 1;
        result.details.push({
          connectionId: conn.id,
          brokerId: conn.brokerId,
          label: conn.label,
          success: false,
          error: syncRes.error,
        });
      }
    } catch (err: any) {
      result.failedSyncs += 1;
      result.details.push({
        connectionId: conn.id,
        brokerId: conn.brokerId,
        label: conn.label,
        success: false,
        error: err.message ?? 'Unknown sync failure',
      });
    }
  }

  return result;
}
