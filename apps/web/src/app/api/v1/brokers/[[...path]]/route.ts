// ──────────────────────────────────────────────
// TradeMind — Broker Connection Routes
// GET    /api/v1/brokers               — list
// GET    /api/v1/brokers/funds         — account balances
// GET    /api/v1/brokers/[id]/status   — connection status
// POST   /api/v1/brokers/connect       — connect broker
// POST   /api/v1/brokers/[id]/sync     — trigger sync
// POST   /api/v1/brokers/import/csv/preview — parse CSV preview
// POST   /api/v1/brokers/import/csv    — import CSV trades
// DELETE /api/v1/brokers/[id]          — disconnect
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDatabase, brokerConnections, accountBalances, journalTrades, backgroundJobs, encrypt } from '@trademind/database';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { checkBrokerLimit } from '@/lib/server/usage-limit';
import { ok, created, notFound, apiError, parseBody } from '@/lib/server/response';
import { getBrokerConnector } from '@/lib/server/connectors/base';
import { parseCsvTrades } from '@/lib/server/services/csv-import.service';
import { syncBrokerConnection, syncAllUserBrokers } from '@/lib/server/services/broker-sync.service';
import type { BrokerId } from '@trademind/shared';
import { BROKER_IDS } from '@trademind/shared';
import type { BrokerConnectorConfig } from '@/lib/server/connectors/base';

export const runtime = 'nodejs';

const connectSchema = z.object({
  brokerId: z.enum(BROKER_IDS as unknown as [string, ...string[]]),
  authCode: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  clientId: z.string().optional(),
  password: z.string().optional(),
  totpSeed: z.string().optional(),
  label: z.string().optional(),
});

const CSV_BROKERS = new Set(['sahi', 'lemonn']);

import { processBrokerWebhook } from '@/lib/server/services/webhook-ingestion.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const [seg1, seg2] = path ?? [];

    if (seg1 === 'webhook') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tradermind-web.vercel.app';
      return ok({
        service: 'TradeMind Institutional Broker Ingestion',
        endpoints: {
          zerodha: `${appUrl}/api/v1/webhooks/zerodha`,
          dhan: `${appUrl}/api/v1/webhooks/dhan`,
          angelone: `${appUrl}/api/v1/webhooks/angelone`,
          upstox: `${appUrl}/api/v1/webhooks/upstox`,
          delta: `${appUrl}/api/v1/webhooks/delta`,
          binance: `${appUrl}/api/v1/webhooks/binance`,
          ibkr: `${appUrl}/api/v1/webhooks/ibkr`,
          generic: `${appUrl}/api/v1/webhooks/generic`,
        },
        alternateEndpoints: {
          zerodha: `${appUrl}/api/v1/brokers/webhook/zerodha`,
          dhan: `${appUrl}/api/v1/brokers/webhook/dhan`,
          angelone: `${appUrl}/api/v1/brokers/webhook/angelone`,
          upstox: `${appUrl}/api/v1/brokers/webhook/upstox`,
          delta: `${appUrl}/api/v1/brokers/webhook/delta`,
          binance: `${appUrl}/api/v1/brokers/webhook/binance`,
          ibkr: `${appUrl}/api/v1/brokers/webhook/ibkr`,
          generic: `${appUrl}/api/v1/brokers/webhook/generic`,
        },
        documentation: 'Configure these webhook URLs in your broker developer console to receive real-time execution postbacks with SHA-256 deduplication.',
      });
    }

    const { user, error } = await authenticate(req);
    if (error) return error;
    const rl = await checkRateLimit(req, user.id);
    if (rl) return rl;

    if (!seg1) return handleList(user.id);
    if (seg1 === 'funds') return handleFunds(user.id);
    if (seg2 === 'status') return handleStatus(user.id, seg1);
    return apiError('Route not found', 404);
  } catch (err: unknown) {
    console.error('[Brokers GET] Unhandled error:', err);
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
    const [seg1, seg2, seg3] = path ?? [];

    // Webhook receiver (unauthenticated / signature-verified machine-to-machine)
    if (seg1 === 'webhook') {
      const brokerId = seg2 ?? 'generic';
      const rawBody = await req.text();
      const url = new URL(req.url);

      const result = await processBrokerWebhook({
        brokerId,
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
    }

    const { user, error } = await authenticate(req);
    if (error) return error;
    const rl = await checkRateLimit(req, user.id);
    if (rl) return rl;

    if (seg1 === 'connect') return handleConnect(req, user.id);
    if (seg1 === 'sync-all') return handleSyncAll(user.id);
    if (seg2 === 'sync') return handleSync(user.id, seg1);
    if (seg1 === 'import' && seg2 === 'csv' && seg3 === 'preview') return handleCsvPreview(req);
    if (seg1 === 'import' && seg2 === 'csv') return handleCsvImport(req, user.id);
    return apiError('Route not found', 404);
  } catch (err: unknown) {
    console.error('[Brokers POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const id = path?.[0];
  if (!id) return notFound('Broker ID required');

  const db = getDatabase();
  const [connection] = await db.select().from(brokerConnections).where(and(eq(brokerConnections.id, id), eq(brokerConnections.userId, user.id))).limit(1);
  if (!connection) return notFound('Broker connection not found');

  await db.update(brokerConnections).set({ status: 'DISCONNECTED', isActive: false }).where(eq(brokerConnections.id, id));
  return ok({ message: 'Broker disconnected successfully' });
  } catch (err: unknown) {
    console.error('[Brokers DELETE] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

// ── Handlers ─────────────────────────────────────────────────

async function handleList(userId: string) {
  const db = getDatabase();
  const connections = await db.select({
    id: brokerConnections.id, brokerId: brokerConnections.brokerId, brokerClientId: brokerConnections.brokerClientId,
    label: brokerConnections.label, authType: brokerConnections.authType, status: brokerConnections.status,
    lastSyncedAt: brokerConnections.lastSyncedAt, isActive: brokerConnections.isActive, createdAt: brokerConnections.createdAt,
  }).from(brokerConnections).where(eq(brokerConnections.userId, userId)).orderBy(brokerConnections.createdAt);
  return ok(connections);
}

async function handleFunds(userId: string) {
  const db = getDatabase();
  const balances = await db.select({
    id: accountBalances.id, brokerConnectionId: accountBalances.brokerConnectionId,
    brokerId: brokerConnections.brokerId, brokerLabel: brokerConnections.label,
    availableCash: accountBalances.availableCash, usedMargin: accountBalances.usedMargin,
    totalCollateral: accountBalances.totalCollateral, payinAmount: accountBalances.payinAmount,
    payoutAmount: accountBalances.payoutAmount, currency: accountBalances.currency, updatedAt: accountBalances.updatedAt,
  }).from(accountBalances).leftJoin(brokerConnections, eq(brokerConnections.id, accountBalances.brokerConnectionId)).where(eq(accountBalances.userId, userId)).orderBy(desc(accountBalances.updatedAt));
  return ok(balances);
}

async function handleStatus(userId: string, id: string) {
  const db = getDatabase();
  const [connection] = await db.select().from(brokerConnections).where(and(eq(brokerConnections.id, id), eq(brokerConnections.userId, userId))).limit(1);
  if (!connection) return notFound('Broker connection not found');
  return ok({ id: connection.id, brokerId: connection.brokerId, status: connection.status, lastSyncedAt: connection.lastSyncedAt, tokenExpiresAt: connection.tokenExpiresAt, isActive: connection.isActive });
}

async function handleConnect(req: NextRequest, userId: string) {
  const limitErr = await checkBrokerLimit(userId);
  if (limitErr) return limitErr;

  const { data: body, error: bodyErr } = await parseBody(req, connectSchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();

  // CSV-only brokers or credentials-free connect mode
  const isCsvMode = CSV_BROKERS.has(body.brokerId) || (!body.apiKey && !body.authCode && !body.password);
  if (isCsvMode) {
    const [connection] = await db
      .insert(brokerConnections)
      .values({
        userId,
        brokerId: body.brokerId,
        brokerClientId: body.clientId ?? body.brokerId,
        label: body.label || body.brokerId,
        authType: 'csv_import',
        accessToken: 'csv_placeholder',
        refreshToken: null,
        apiKey: null,
        apiSecret: null,
        tokenExpiresAt: null,
        status: 'ACTIVE',
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [brokerConnections.userId, brokerConnections.brokerId, brokerConnections.brokerClientId],
        set: {
          label: body.label || body.brokerId,
          authType: 'csv_import',
          status: 'ACTIVE',
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!connection) return apiError('Failed to create connection', 500);
    console.log(`🔗 Broker connected (CSV): ${userId} -> ${body.brokerId}`);
    return created({ id: connection.id, brokerId: connection.brokerId, status: connection.status, message: `Connected to ${body.brokerId}. Upload your trade CSV to start importing.` });
  }

  // API/OAuth brokers
  const config: BrokerConnectorConfig = {
    apiKey: body.apiKey, apiSecret: body.apiSecret, clientId: body.clientId,
    password: body.password, totpSeed: body.totpSeed,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/v1/brokers/callback`,
  };

  const connector = await getBrokerConnector(body.brokerId as BrokerId, config);
  let authResult: any;
  try {
    authResult = await connector.authenticate({
      request_token: body.authCode ?? '',
      access_token: body.authCode ?? body.apiKey ?? '',
      api_key: body.apiKey ?? '',
      api_secret: body.apiSecret ?? '',
    });
  } catch (err: any) {
    return apiError(err.message, 400);
  }

  if (!authResult?.accessToken) {
    return apiError('Authentication failed: broker did not return an access token', 400);
  }

  let encryptedAccessToken: string;
  let encryptedRefreshToken: string | null = null;
  let encryptedApiKey: string | null = null;
  let encryptedApiSecret: string | null = null;

  try {
    encryptedAccessToken = encrypt(authResult.accessToken);
    if (authResult.refreshToken) encryptedRefreshToken = encrypt(authResult.refreshToken);
    if (body.apiKey) encryptedApiKey = encrypt(body.apiKey);
    if (body.apiSecret) encryptedApiSecret = encrypt(body.apiSecret);
  } catch (encErr: any) {
    console.error('[broker:connect] Encryption error:', encErr);
    return apiError(`Encryption failed: ${encErr.message}`, 500);
  }

  const [connection] = await db
    .insert(brokerConnections)
    .values({
      userId,
      brokerId: body.brokerId,
      brokerClientId: body.clientId ?? body.brokerId,
      label: body.label || body.brokerId,
      authType: authResult.refreshToken ? 'oauth2' : 'api_key_secret',
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      apiKey: encryptedApiKey,
      apiSecret: encryptedApiSecret,
      tokenExpiresAt: authResult.expiresAt,
      status: 'ACTIVE',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [brokerConnections.userId, brokerConnections.brokerId, brokerConnections.brokerClientId],
      set: {
        label: body.label || body.brokerId,
        authType: authResult.refreshToken ? 'oauth2' : 'api_key_secret',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        tokenExpiresAt: authResult.expiresAt,
        status: 'ACTIVE',
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!connection) return apiError('Failed to create connection', 500);

  // Optional background sync job
  try {
    await db.insert(backgroundJobs).values({
      queue: 'sync-trades',
      jobName: `initial-sync-${body.brokerId}`,
      payload: { connectionId: connection.id, userId, brokerId: body.brokerId },
      status: 'PENDING',
    });
  } catch (bgErr) {
    console.warn('[broker:connect] Background sync enqueue notice:', bgErr);
  }

  // Attempt immediate balance and trade sync (non-blocking)
  syncBrokerConnection(connection.id, userId).catch((syncErr) => {
    console.warn(`[broker:connect] Initial sync notice for ${connection.id}:`, syncErr?.message);
  });

  console.log(`🔗 Broker connected: ${userId} -> ${body.brokerId}`);
  return created({ id: connection.id, brokerId: connection.brokerId, status: connection.status, message: `Successfully connected to ${body.brokerId}` });
}

async function handleSync(userId: string, connectionId: string) {
  const db = getDatabase();
  const [connection] = await db.select().from(brokerConnections).where(and(eq(brokerConnections.id, connectionId), eq(brokerConnections.userId, userId))).limit(1);
  if (!connection) return notFound('Broker connection not found');

  try {
    await db.insert(backgroundJobs).values({
      queue: 'sync-trades',
      jobName: `sync-${connection.brokerId}`,
      payload: { connectionId, userId, brokerId: connection.brokerId },
      status: 'PENDING',
    });
  } catch (bgErr) {
    console.warn('[broker:sync] Background sync enqueue notice:', bgErr);
  }

  // Execute in-process sync for real-time trade and balance synchronization
  const syncResult = await syncBrokerConnection(connectionId, userId);

  return ok({
    message: syncResult.success
      ? (syncResult.message ?? 'Broker synchronization completed.')
      : `Sync queued. (Notice: ${syncResult.error})`,
    ...syncResult,
  });
}

async function handleSyncAll(userId: string) {
  const result = await syncAllUserBrokers(userId);
  return ok({
    message: `Synchronized ${result.successfulSyncs} of ${result.totalConnections} active connections (${result.totalImportedCount} fills imported, ${result.totalTradesCreated} trades created).`,
    ...result,
  });
}

async function handleCsvPreview(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const csvContent: string = body.csv ?? '';
    if (!csvContent || typeof csvContent !== 'string') return apiError('Missing or invalid csv field in request body');

    const result = parseCsvTrades(csvContent);
    return ok({ broker: result.broker, totalRows: result.totalRows, preview: result.parsedTrades.slice(0, 10), totalParsed: result.parsedTrades.length, skippedRows: result.skippedRows, errors: result.errors });
  } catch (err: any) {
    return apiError(err.message ?? 'Failed to parse CSV', 400);
  }
}

async function handleCsvImport(req: NextRequest, userId: string) {
  try {
    const body = await req.json().catch(() => ({}));
    const csvContent: string = body.csv ?? '';
    const brokerConnectionId: string | undefined = body.brokerConnectionId;

    if (!csvContent || typeof csvContent !== 'string') return apiError('Missing csv field');

    const result = parseCsvTrades(csvContent);
    if (result.parsedTrades.length === 0) return apiError(result.errors.length > 0 ? result.errors[0] : 'No trades could be parsed from this CSV');

    const db = getDatabase();
    let targetConnectionId = brokerConnectionId;

    if (targetConnectionId) {
      const [connection] = await db.select({ id: brokerConnections.id, brokerId: brokerConnections.brokerId })
        .from(brokerConnections).where(and(eq(brokerConnections.id, targetConnectionId), eq(brokerConnections.userId, userId))).limit(1);
      if (!connection) return notFound('Broker connection not found or not authorized');
    } else {
      // Find existing connection for this broker or auto-create one
      const [existing] = await db.select({ id: brokerConnections.id })
        .from(brokerConnections)
        .where(and(eq(brokerConnections.userId, userId), eq(brokerConnections.brokerId, result.broker)))
        .limit(1);

      if (existing) {
        targetConnectionId = existing.id;
      } else {
        const brokerNames: Record<string, string> = {
          zerodha: 'Zerodha Kite',
          upstox: 'Upstox',
          angelone: 'Angel One',
          dhan: 'Dhan',
          fyers: 'Fyers',
          groww: 'Groww',
        };
        const label = `${brokerNames[result.broker] ?? result.broker.toUpperCase()} (CSV)`;
        const [created] = await db.insert(brokerConnections).values({
          userId,
          brokerId: result.broker,
          brokerClientId: `${result.broker}_import`,
          label,
          authType: 'csv_import',
          accessToken: 'csv_placeholder',
          status: 'ACTIVE',
          isActive: true,
        }).returning({ id: brokerConnections.id });

        if (!created) return apiError('Failed to initialize broker connection for import', 500);
        targetConnectionId = created.id;
      }
    }

    const BATCH_SIZE = 50;
    let inserted = 0;
    const now = new Date();

    for (let i = 0; i < result.parsedTrades.length; i += BATCH_SIZE) {
      const batch = result.parsedTrades.slice(i, i + BATCH_SIZE);
      const records = batch.map((t) => ({
        userId,
        brokerConnectionId: targetConnectionId!,
        tradingsymbol: t.tradingsymbol,
        exchange: t.exchange,
        assetClass: t.assetClass,
        direction: t.direction,
        status: t.status,
        totalQuantity: t.totalQuantity,
        openQuantity: t.status === 'OPEN' ? t.totalQuantity : 0,
        avgEntryPrice: t.avgEntryPrice,
        avgExitPrice: t.avgExitPrice ?? null,
        openedAt: t.openedAt,
        closedAt: t.closedAt ?? null,
        grossPnl: t.grossPnl,
        totalFeesAndTaxes: t.totalFeesAndTaxes,
        netPnl: t.netPnl,
        holdingPeriodMinutes: t.holdingPeriodMinutes ?? null,
        tradeType: t.tradeType,
        createdAt: now,
        updatedAt: now,
      }));
      await db.insert(journalTrades).values(records).onConflictDoNothing();
      inserted += batch.length;
    }

    return ok({ broker: result.broker, inserted, totalRows: result.totalRows, skippedRows: result.skippedRows, errors: result.errors });
  } catch (err: any) {
    console.error('[CSV IMPORT]', err);
    return apiError(err.message ?? 'CSV import failed', 500);
  }
}
