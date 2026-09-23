// ──────────────────────────────────────────────
// TradeMind — Broker Connection Routes
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabase, brokerConnections, accountBalances } from '@trademind/database';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { encrypt } from '@trademind/database';
import { getBrokerConnector } from '../connectors/base';
import type { BrokerId } from '@trademind/shared';
import { BROKER_IDS } from '@trademind/shared';
import type { BrokerConnectorConfig } from '../connectors/base';
import { getQueue } from '../lib/jobs';
import { checkBrokerLimit } from '../middleware/usage-limit';
import { parseCsvTrades } from '../services/csv-import.service';
import { journalTrades } from '@trademind/database';

export const brokersRouter = new Hono();
brokersRouter.use('*', authMiddleware);

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

/**
 * GET /brokers — List user's broker connections
 */
brokersRouter.get('/', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const connections = await db
    .select({
      id: brokerConnections.id,
      brokerId: brokerConnections.brokerId,
      brokerClientId: brokerConnections.brokerClientId,
      label: brokerConnections.label,
      authType: brokerConnections.authType,
      status: brokerConnections.status,
      lastSyncedAt: brokerConnections.lastSyncedAt,
      isActive: brokerConnections.isActive,
      createdAt: brokerConnections.createdAt,
    })
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, user.id))
    .orderBy(brokerConnections.createdAt);

  return c.json({ success: true, data: connections });
});

/**
 * POST /brokers/connect — Connect a new broker
 */
brokersRouter.post('/connect', checkBrokerLimit, validateBody(connectSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  // ── CSV-based brokers skip the OAuth/API key flow ──
  if (CSV_BROKERS.has(body.brokerId)) {
    const [connection] = await db.insert(brokerConnections).values({
      userId: user.id,
      brokerId: body.brokerId,
      brokerClientId: body.clientId ?? body.brokerId,
      label: body.label ?? body.brokerId,
      authType: 'csv_import',
      accessToken: 'csv_placeholder',
      refreshToken: null,
      apiKey: null,
      apiSecret: null,
      tokenExpiresAt: null,
      status: 'ACTIVE',
      isActive: true,
    }).returning();

    if (!connection) {
      return c.json({ success: false, error: { message: 'Failed to create connection' } }, 500);
    }

    console.log(`🔗 Broker connected (CSV): ${user.id} -> ${body.brokerId}`);

    return c.json({
      success: true,
      data: {
        id: connection.id,
        brokerId: connection.brokerId,
        status: connection.status,
        message: `Connected to ${body.brokerId}. Upload your trade CSV to start importing.`,
      },
    }, 201);
  }

  // ── API-based brokers (OAuth / API Key / JWT) ──
  const config: BrokerConnectorConfig = {
    apiKey: body.apiKey,
    apiSecret: body.apiSecret,
    clientId: body.clientId,
    password: body.password,
    totpSeed: body.totpSeed,
    redirectUri: `${process.env.API_URL ?? 'http://localhost:4000'}/api/v1/brokers/callback`,
  };

  const connector = await getBrokerConnector(body.brokerId as BrokerId, config);

  let authResult;
  try {
    authResult = await connector.authenticate({
      request_token: body.authCode ?? '',
      access_token: body.authCode ?? '',
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message } }, 400);
  }

  // Encrypt sensitive data before storing
  const encryptedAccessToken = encrypt(authResult.accessToken);
  const encryptedRefreshToken = authResult.refreshToken ? encrypt(authResult.refreshToken) : null;
  const encryptedApiKey = body.apiKey ? encrypt(body.apiKey) : null;
  const encryptedApiSecret = body.apiSecret ? encrypt(body.apiSecret) : null;

  const [connection] = await db.insert(brokerConnections).values({
    userId: user.id,
    brokerId: body.brokerId,
    brokerClientId: body.clientId ?? body.brokerId,
    label: body.label ?? body.brokerId,
    authType: authResult.refreshToken ? 'oauth2' : 'api_key_secret',
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    apiKey: encryptedApiKey,
    apiSecret: encryptedApiSecret,
    tokenExpiresAt: authResult.expiresAt,
    status: 'ACTIVE',
    isActive: true,
  }).returning();

  if (!connection) {
    return c.json({ success: false, error: { message: 'Failed to create connection' } }, 500);
  }

  // Trigger initial sync
  const syncQueue = getQueue('sync-trades');
  await syncQueue.add('initial-sync', {
    connectionId: connection.id,
    userId: user.id,
    brokerId: body.brokerId,
  });

  console.log(`🔗 Broker connected: ${user.id} -> ${body.brokerId}`);

  return c.json({
    success: true,
    data: {
      id: connection.id,
      brokerId: connection.brokerId,
      status: connection.status,
      message: `Successfully connected to ${body.brokerId}`,
    },
  }, 201);
});

/**
 * POST /brokers/:id/sync — Trigger manual sync
 */
brokersRouter.post('/:id/sync', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = getDatabase();

  const [connection] = await db
    .select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.id, id), eq(brokerConnections.userId, user.id)))
    .limit(1);

  if (!connection) {
    return c.json({ success: false, error: { message: 'Broker connection not found' } }, 404);
  }

  const syncQueue = getQueue('sync-trades');
  await syncQueue.add('manual-sync', {
    connectionId: connection!.id,
    userId: user.id,
    brokerId: connection!.brokerId,
  });

  return c.json({
    success: true,
    data: { message: 'Sync initiated. This may take a few minutes.' },
  });
});

/**
 * DELETE /brokers/:id — Disconnect broker
 */
brokersRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = getDatabase();

  const [connection] = await db
    .select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.id, id), eq(brokerConnections.userId, user.id)))
    .limit(1);

  if (!connection) {
    return c.json({ success: false, error: { message: 'Broker connection not found' } }, 404);
  }

  await db
    .update(brokerConnections)
    .set({ status: 'DISCONNECTED', isActive: false })
    .where(eq(brokerConnections.id, id!));

  return c.json({ success: true, data: { message: 'Broker disconnected successfully' } });
});

/**
 * GET /brokers/funds — Get account balances for all connected brokers
 */
brokersRouter.get('/funds', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const balances = await db
    .select({
      id: accountBalances.id,
      brokerConnectionId: accountBalances.brokerConnectionId,
      brokerId: brokerConnections.brokerId,
      brokerLabel: brokerConnections.label,
      availableCash: accountBalances.availableCash,
      usedMargin: accountBalances.usedMargin,
      totalCollateral: accountBalances.totalCollateral,
      payinAmount: accountBalances.payinAmount,
      payoutAmount: accountBalances.payoutAmount,
      currency: accountBalances.currency,
      updatedAt: accountBalances.updatedAt,
    })
    .from(accountBalances)
    .leftJoin(brokerConnections, eq(brokerConnections.id, accountBalances.brokerConnectionId))
    .where(eq(accountBalances.userId, user.id))
    .orderBy(desc(accountBalances.updatedAt));

  return c.json({ success: true, data: balances });
});

/**
 * GET /brokers/:id/status — Check connection status
 */
brokersRouter.get('/:id/status', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = getDatabase();

  const [connection] = await db
    .select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.id, id), eq(brokerConnections.userId, user.id)))
    .limit(1);

  if (!connection) {
    return c.json({ success: false, error: { message: 'Broker connection not found' } }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: connection!.id,
      brokerId: connection!.brokerId,
      status: connection!.status,
      lastSyncedAt: connection.lastSyncedAt,
      tokenExpiresAt: connection.tokenExpiresAt,
      isActive: connection.isActive,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /brokers/import/csv/preview
 * Parse the CSV and return a preview (no DB writes). Used for the import modal.
 */
brokersRouter.post('/import/csv/preview', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const csvContent: string = body.csv ?? '';

    if (!csvContent || typeof csvContent !== 'string') {
      return c.json({ success: false, error: { message: 'Missing or invalid csv field in request body' } }, 400);
    }

    const result = parseCsvTrades(csvContent);

    return c.json({
      success: true,
      data: {
        broker: result.broker,
        totalRows: result.totalRows,
        preview: result.parsedTrades.slice(0, 10), // First 10 rows for preview
        totalParsed: result.parsedTrades.length,
        skippedRows: result.skippedRows,
        errors: result.errors,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message ?? 'Failed to parse CSV' } }, 400);
  }
});

/**
 * POST /brokers/import/csv
 * Parse CSV and write to journal_trades table. Requires brokerConnectionId.
 */
brokersRouter.post('/import/csv', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  try {
    const body = await c.req.json().catch(() => ({}));
    const csvContent: string = body.csv ?? '';
    const brokerConnectionId: string = body.brokerConnectionId ?? '';

    if (!csvContent || typeof csvContent !== 'string') {
      return c.json({ success: false, error: { message: 'Missing csv field' } }, 400);
    }

    if (!brokerConnectionId) {
      return c.json({ success: false, error: { message: 'brokerConnectionId is required' } }, 400);
    }

    // Verify the broker connection belongs to this user
    const [connection] = await db
      .select({ id: brokerConnections.id, brokerId: brokerConnections.brokerId })
      .from(brokerConnections)
      .where(
        and(
          eq(brokerConnections.id, brokerConnectionId),
          eq(brokerConnections.userId, user.id),
        ),
      )
      .limit(1);

    if (!connection) {
      return c.json({ success: false, error: { message: 'Broker connection not found or not authorized' } }, 404);
    }

    const result = parseCsvTrades(csvContent);

    if (result.parsedTrades.length === 0) {
      return c.json({
        success: false,
        error: {
          message: result.errors.length > 0 ? result.errors[0] : 'No trades could be parsed from this CSV',
          details: result.errors,
        },
      }, 400);
    }

    // Insert trades in batches of 50
    const BATCH_SIZE = 50;
    let inserted = 0;
    const now = new Date();

    for (let i = 0; i < result.parsedTrades.length; i += BATCH_SIZE) {
      const batch = result.parsedTrades.slice(i, i + BATCH_SIZE);
      const records = batch.map((t) => ({
        userId: user.id,
        brokerConnectionId,
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

    return c.json({
      success: true,
      data: {
        broker: result.broker,
        inserted,
        totalRows: result.totalRows,
        skippedRows: result.skippedRows,
        errors: result.errors,
      },
    });
  } catch (err: any) {
    console.error('[CSV IMPORT]', err);
    return c.json({ success: false, error: { message: err.message ?? 'CSV import failed' } }, 500);
  }
});


