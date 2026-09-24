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
import { getDatabase, brokerConnections, accountBalances, journalTrades, encrypt } from '@trademind/database';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { checkBrokerLimit } from '@/lib/server/usage-limit';
import { ok, created, notFound, apiError, parseBody } from '@/lib/server/response';
import { getBrokerConnector } from '@/lib/server/connectors/base';
import { parseCsvTrades } from '@/lib/server/services/csv-import.service';
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const rl = await checkRateLimit(req, user.id);
  if (rl) return rl;

  const { path } = await params;
  const [seg1, seg2] = path ?? [];

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
  const { user, error } = await authenticate(req);
  if (error) return error;
  const rl = await checkRateLimit(req, user.id);
  if (rl) return rl;

  const { path } = await params;
  const [seg1, seg2, seg3] = path ?? [];

  if (seg1 === 'connect') return handleConnect(req, user.id);
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
    const [connection] = await db.insert(brokerConnections).values({
      userId, brokerId: body.brokerId, brokerClientId: body.clientId ?? body.brokerId,
      label: body.label ?? body.brokerId, authType: 'csv_import', accessToken: 'csv_placeholder',
      refreshToken: null, apiKey: null, apiSecret: null, tokenExpiresAt: null, status: 'ACTIVE', isActive: true,
    }).returning();
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
    authResult = await connector.authenticate({ request_token: body.authCode ?? '', access_token: body.authCode ?? '' });
  } catch (err: any) {
    return apiError(err.message, 400);
  }

  const encryptedAccessToken = encrypt(authResult.accessToken);
  const encryptedRefreshToken = authResult.refreshToken ? encrypt(authResult.refreshToken) : null;
  const encryptedApiKey = body.apiKey ? encrypt(body.apiKey) : null;
  const encryptedApiSecret = body.apiSecret ? encrypt(body.apiSecret) : null;

  const [connection] = await db.insert(brokerConnections).values({
    userId, brokerId: body.brokerId, brokerClientId: body.clientId ?? body.brokerId,
    label: body.label ?? body.brokerId, authType: authResult.refreshToken ? 'oauth2' : 'api_key_secret',
    accessToken: encryptedAccessToken, refreshToken: encryptedRefreshToken,
    apiKey: encryptedApiKey, apiSecret: encryptedApiSecret,
    tokenExpiresAt: authResult.expiresAt, status: 'ACTIVE', isActive: true,
  }).returning();

  if (!connection) return apiError('Failed to create connection', 500);

  // Note: sync is now triggered via Supabase Edge Function / background job
  // TODO: Enqueue initial-sync job via DB row insert to background_jobs table
  await db.execute(
    require('drizzle-orm').sql`
      INSERT INTO public.background_jobs (type, payload, status)
      VALUES ('sync-trades', ${JSON.stringify({ connectionId: connection.id, userId, brokerId: body.brokerId })}::jsonb, 'PENDING')
    `
  );

  console.log(`🔗 Broker connected: ${userId} -> ${body.brokerId}`);
  return created({ id: connection.id, brokerId: connection.brokerId, status: connection.status, message: `Successfully connected to ${body.brokerId}` });
}

async function handleSync(userId: string, connectionId: string) {
  const db = getDatabase();
  const [connection] = await db.select().from(brokerConnections).where(and(eq(brokerConnections.id, connectionId), eq(brokerConnections.userId, userId))).limit(1);
  if (!connection) return notFound('Broker connection not found');

  // Enqueue sync via background_jobs table (picked up by Edge Function / cron)
  await db.execute(
    require('drizzle-orm').sql`
      INSERT INTO public.background_jobs (type, payload, status)
      VALUES ('sync-trades', ${JSON.stringify({ connectionId, userId, brokerId: connection.brokerId })}::jsonb, 'PENDING')
    `
  );

  return ok({ message: 'Sync initiated. This may take a few minutes.' });
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
