// ──────────────────────────────────────────────
// TradeMind — Broker Token Refresh Service
//
// Runs proactively: before tokens expire (not after).
// Strategy:
//   1. Every hour, find all active broker connections with
//      token_expires_at < NOW() + 30 minutes.
//   2. For each connection, call the broker's refreshTokens().
//   3. Re-encrypt and persist the new tokens.
//   4. If refresh fails (revoked), mark the connection ERROR
//      and send a notification so the user can reconnect.
// ──────────────────────────────────────────────

import {
  getDatabase,
  brokerConnections,
  decrypt,
  encrypt,
  getSupabaseAdmin,
} from '@trademind/database';
import { eq, and, lte, sql } from 'drizzle-orm';
import { getBrokerConnector } from '../connectors/base';
import { sendTokenExpiryWarning } from './notification/email.service';
import type { BrokerId } from '@trademind/shared';
import type { BrokerConnectorConfig } from '../connectors/base';

/** How many minutes before expiry to start refreshing */
const REFRESH_WINDOW_MINUTES = 30;

/**
 * Refresh a single broker connection's access token.
 * Returns true on success, false on failure.
 */
export async function refreshBrokerToken(connectionId: string): Promise<boolean> {
  const db = getDatabase();

  const [conn] = await db
    .select()
    .from(brokerConnections)
    .where(eq(brokerConnections.id, connectionId))
    .limit(1);

  if (!conn || !conn.isActive) return false;
  if (!conn.refreshToken && !conn.apiKey) {
    // No refresh capability — some brokers require daily re-login (Zerodha)
    return false;
  }

  try {
    const config: BrokerConnectorConfig = {
      apiKey:       conn.apiKey    ? decrypt(conn.apiKey)    : undefined,
      apiSecret:    conn.apiSecret ? decrypt(conn.apiSecret) : undefined,
      accessToken:  conn.accessToken ? decrypt(conn.accessToken) : undefined,
      refreshToken: conn.refreshToken ? decrypt(conn.refreshToken) : undefined,
      clientId:     conn.brokerClientId,
    };

    const connector = await getBrokerConnector(conn.brokerId as BrokerId, config);
    const rawRefreshToken = conn.refreshToken ? decrypt(conn.refreshToken) : '';
    const newTokens = await connector.refreshTokens(rawRefreshToken);

    await db
      .update(brokerConnections)
      .set({
        accessToken:    encrypt(newTokens.accessToken),
        refreshToken:   newTokens.refreshToken ? encrypt(newTokens.refreshToken) : conn.refreshToken,
        tokenExpiresAt: newTokens.expiresAt ?? null,
        status:         'ACTIVE',
        updatedAt:      new Date(),
      })
      .where(eq(brokerConnections.id, connectionId));

    console.log(`🔑 Token refreshed: connection=${connectionId} broker=${conn.brokerId}`);
    return true;

  } catch (err: any) {
    console.error(`❌ Token refresh failed: connection=${connectionId}`, err?.message);

    // Mark the connection as ERROR so the dashboard shows a reconnect prompt
    await db
      .update(brokerConnections)
      .set({
        status:    'ERROR',
        updatedAt: new Date(),
      })
      .where(eq(brokerConnections.id, connectionId));

    // Notify the user so they can re-authenticate
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(conn.userId);
      const userEmail = userData?.user?.email ?? '';
      if (userEmail) {
        await sendTokenExpiryWarning(conn.userId, userEmail, conn.label ?? conn.brokerId);
      }
    } catch (notifErr) {
      console.warn('⚠️ Failed to send broker reconnect notification:', notifErr);
    }

    return false;
  }
}

/**
 * Scan all active broker connections whose tokens are expiring within
 * REFRESH_WINDOW_MINUTES and attempt to refresh them.
 *
 * Called by the token-refresh worker on a recurring schedule.
 */
export async function refreshExpiringTokens(): Promise<{
  checked: number;
  refreshed: number;
  failed: number;
}> {
  const db = getDatabase();

  const windowEnd = new Date(Date.now() + REFRESH_WINDOW_MINUTES * 60 * 1000);

  // Find connections with tokens expiring soon OR already expired
  const expiring = await db
    .select({
      id:      brokerConnections.id,
      brokerId: brokerConnections.brokerId,
      userId:  brokerConnections.userId,
    })
    .from(brokerConnections)
    .where(
      and(
        eq(brokerConnections.isActive, true),
        eq(brokerConnections.status, 'ACTIVE'),
        // Only refresh connections that support token refresh (have refreshToken or apiKey)
        sql`(${brokerConnections.refreshToken} IS NOT NULL OR ${brokerConnections.apiKey} IS NOT NULL)`,
        // Token expiry is set AND within our window
        sql`${brokerConnections.tokenExpiresAt} IS NOT NULL`,
        lte(brokerConnections.tokenExpiresAt, windowEnd),
      ),
    )
    .limit(100); // Safety cap to avoid overwhelming broker APIs simultaneously

  let refreshed = 0;
  let failed = 0;

  // Refresh in parallel with concurrency limit of 5
  const CONCURRENCY = 5;
  for (let i = 0; i < expiring.length; i += CONCURRENCY) {
    const batch = expiring.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((conn) => refreshBrokerToken(conn.id)),
    );
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value === true) refreshed++;
      else failed++;
    }
  }

  if (expiring.length > 0) {
    console.log(
      `🔑 Token refresh sweep: checked=${expiring.length} refreshed=${refreshed} failed=${failed}`,
    );
  }

  return { checked: expiring.length, refreshed, failed };
}
