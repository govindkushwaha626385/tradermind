// ──────────────────────────────────────────────
// TradeMind — Pre-Market Broker Token Health Checker Service
//
// Performs proactive morning audits of broker session tokens:
// - Zerodha Kite (Daily 06:00 AM IST token invalidation)
// - Dhan, Angel One, Upstox, Delta Exchange, Interactive Brokers
// - Alerts traders during the critical pre-market window (8:45 AM IST / 9:00 AM EST)
//   so no executions or journal entries are missed at the market open bell.
// ──────────────────────────────────────────────

import { getDatabase, brokerConnections } from '@trademind/database';
import { eq, and } from 'drizzle-orm';
import type { BrokerId } from '@trademind/shared';

export interface BrokerConnectionHealth {
  id: string;
  brokerId: string;
  brokerName: string;
  label: string;
  status: 'HEALTHY' | 'EXPIRING_SOON' | 'EXPIRED' | 'ERROR';
  tokenExpiresAt: string | null;
  minutesRemaining: number | null;
  requiresDailyRelogin: boolean;
  reconnectUrl: string;
  actionMessage: string;
}

export interface UserBrokerHealthReport {
  allHealthy: boolean;
  hasExpiringOrExpired: boolean;
  criticalAlert: string | null;
  marketContext: {
    isPreMarketWindow: boolean;
    marketName: 'NSE/BSE' | 'US' | 'Crypto' | 'Global';
    marketOpenTime: string;
    minutesToOpen: number | null;
  };
  connections: BrokerConnectionHealth[];
}

const BROKER_DISPLAY_NAMES: Record<string, string> = {
  zerodha: 'Zerodha Kite',
  dhan: 'Dhan HQ',
  angelone: 'Angel One SmartAPI',
  upstox: 'Upstox Pro',
  groww: 'Groww Direct',
  delta: 'Delta Exchange',
  fyers: 'Fyers API',
  ibkr: 'Interactive Brokers',
  binance: 'Binance API',
};

/**
 * Calculates current market session timing (IST for Indian, EST for US).
 */
export function getMarketSessionContext(): UserBrokerHealthReport['marketContext'] {
  const now = new Date();

  // Convert to IST
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffsetMs);
  const istHours = istDate.getHours();
  const istMinutes = istDate.getMinutes();
  const istTotalMinutes = istHours * 60 + istMinutes;

  // Indian Pre-Market Window: 8:00 AM to 9:15 AM IST (480 min to 555 min)
  const isIndianPreMarket = istTotalMinutes >= 480 && istTotalMinutes <= 555;
  const minutesToIndianOpen = 555 - istTotalMinutes;

  return {
    isPreMarketWindow: isIndianPreMarket,
    marketName: 'NSE/BSE',
    marketOpenTime: '9:15 AM IST',
    minutesToOpen: isIndianPreMarket ? Math.max(0, minutesToIndianOpen) : null,
  };
}

/**
 * Evaluate health of all broker connections for a specific user.
 */
export async function checkUserBrokerTokenHealth(userId: string): Promise<UserBrokerHealthReport> {
  const db = getDatabase();

  const conns = await db
    .select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.userId, userId), eq(brokerConnections.isActive, true)));

  const now = new Date();
  const evaluated: BrokerConnectionHealth[] = [];

  for (const conn of conns) {
    const brokerId = (conn.brokerId || '').toLowerCase();
    const brokerName = BROKER_DISPLAY_NAMES[brokerId] || conn.brokerId.toUpperCase();
    const isZerodha = brokerId === 'zerodha';

    let status: 'HEALTHY' | 'EXPIRING_SOON' | 'EXPIRED' | 'ERROR' = 'HEALTHY';
    let minutesRemaining: number | null = null;
    let actionMessage = 'Connection active & authorized';

    // 1. If connection is already marked ERROR
    if (conn.status === 'ERROR') {
      status = 'ERROR';
      actionMessage = 'Broker reported authorization error. Please re-authenticate.';
    }
    // 2. Zerodha special rule: Kite access tokens expire everyday at 06:00 AM IST
    else if (isZerodha) {
      // Calculate today's 6:00 AM IST cutoff
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffsetMs);
      const istCutoffToday = new Date(istNow);
      istCutoffToday.setHours(6, 0, 0, 0);

      // Revert cutoff to UTC timestamp
      const utcCutoffToday = new Date(istCutoffToday.getTime() - istOffsetMs);

      const lastUpdated = conn.updatedAt ? new Date(conn.updatedAt) : new Date(conn.createdAt);

      if (lastUpdated < utcCutoffToday && now >= utcCutoffToday) {
        status = 'EXPIRED';
        actionMessage = 'Zerodha Kite daily session expired at 6:00 AM IST. Re-authenticate before market open.';
      } else {
        status = 'HEALTHY';
        actionMessage = 'Zerodha session valid for today';
      }
    }
    // 3. Token expiry evaluation
    else if (conn.tokenExpiresAt) {
      const expiresAt = new Date(conn.tokenExpiresAt);
      const diffMs = expiresAt.getTime() - now.getTime();
      minutesRemaining = Math.round(diffMs / 60000);

      if (diffMs <= 0) {
        status = 'EXPIRED';
        actionMessage = 'Session token has expired. Automatic execution syncing is paused.';
      } else if (minutesRemaining <= 120) {
        status = 'EXPIRING_SOON';
        actionMessage = `Session token expires in ${minutesRemaining} minutes. Reconnect soon.`;
      } else {
        status = 'HEALTHY';
        actionMessage = `Session token valid (${Math.round(minutesRemaining / 60)}h remaining)`;
      }
    }
    // 4. API-Key based without explicit expiry (Dhan, Delta, IBKR)
    else if (conn.apiKey || conn.accessToken) {
      status = 'HEALTHY';
      actionMessage = 'Permanent API connection active';
    } else {
      status = 'EXPIRED';
      actionMessage = 'No valid authentication token or API key found.';
    }

    evaluated.push({
      id: conn.id,
      brokerId: conn.brokerId,
      brokerName,
      label: conn.label || brokerName,
      status,
      tokenExpiresAt: conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).toISOString() : null,
      minutesRemaining,
      requiresDailyRelogin: isZerodha,
      reconnectUrl: `/dashboard/brokers?reconnect=${conn.id}&broker=${conn.brokerId}`,
      actionMessage,
    });
  }

  const hasExpired = evaluated.some((c) => c.status === 'EXPIRED' || c.status === 'ERROR');
  const hasExpiringSoon = evaluated.some((c) => c.status === 'EXPIRING_SOON');
  const allHealthy = evaluated.length > 0 && !hasExpired && !hasExpiringSoon;
  const marketContext = getMarketSessionContext();

  let criticalAlert: string | null = null;
  if (hasExpired) {
    const expiredList = evaluated.filter((c) => c.status === 'EXPIRED' || c.status === 'ERROR').map((c) => c.brokerName).join(', ');
    criticalAlert = marketContext.isPreMarketWindow
      ? `🚨 Pre-Market Warning: ${expiredList} session expired! Re-authenticate before market open (${marketContext.marketOpenTime}) to ensure live sync.`
      : `⚠️ Session Expired: ${expiredList} token expired. Automatic trade syncing paused.`;
  } else if (hasExpiringSoon) {
    const soonList = evaluated.filter((c) => c.status === 'EXPIRING_SOON').map((c) => c.brokerName).join(', ');
    criticalAlert = `⚠️ Token Expiring Soon: ${soonList} will expire within 2 hours. Re-authenticate to avoid sync interruption.`;
  }

  return {
    allHealthy,
    hasExpiringOrExpired: hasExpired || hasExpiringSoon,
    criticalAlert,
    marketContext,
    connections: evaluated,
  };
}

/**
 * Cluster-wide pre-market broker token health audit.
 * Used by Admin Console and automated background jobs.
 */
export async function auditAllBrokerConnectionsHealth(): Promise<{
  totalConnections: number;
  healthyCount: number;
  expiringCount: number;
  expiredCount: number;
  errorCount: number;
  brokersBreakdown: Record<string, { total: number; healthy: number; expired: number }>;
}> {
  const db = getDatabase();

  const allConns = await db
    .select({
      id: brokerConnections.id,
      userId: brokerConnections.userId,
      brokerId: brokerConnections.brokerId,
      status: brokerConnections.status,
      tokenExpiresAt: brokerConnections.tokenExpiresAt,
      updatedAt: brokerConnections.updatedAt,
      createdAt: brokerConnections.createdAt,
    })
    .from(brokerConnections)
    .where(eq(brokerConnections.isActive, true));

  const now = new Date();
  let healthyCount = 0;
  let expiringCount = 0;
  let expiredCount = 0;
  let errorCount = 0;
  const brokersBreakdown: Record<string, { total: number; healthy: number; expired: number }> = {};

  for (const conn of allConns) {
    const broker = conn.brokerId.toLowerCase();
    if (!brokersBreakdown[broker]) {
      brokersBreakdown[broker] = { total: 0, healthy: 0, expired: 0 };
    }
    brokersBreakdown[broker]!.total++;

    if (conn.status === 'ERROR') {
      errorCount++;
      brokersBreakdown[broker]!.expired++;
    } else if (broker === 'zerodha') {
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffsetMs);
      const istCutoffToday = new Date(istNow);
      istCutoffToday.setHours(6, 0, 0, 0);
      const utcCutoffToday = new Date(istCutoffToday.getTime() - istOffsetMs);
      const lastUpdated = conn.updatedAt ? new Date(conn.updatedAt) : new Date(conn.createdAt);

      if (lastUpdated < utcCutoffToday && now >= utcCutoffToday) {
        expiredCount++;
        brokersBreakdown[broker]!.expired++;
      } else {
        healthyCount++;
        brokersBreakdown[broker]!.healthy++;
      }
    } else if (conn.tokenExpiresAt) {
      const diffMs = new Date(conn.tokenExpiresAt).getTime() - now.getTime();
      if (diffMs <= 0) {
        expiredCount++;
        brokersBreakdown[broker]!.expired++;
      } else if (diffMs <= 120 * 60 * 1000) {
        expiringCount++;
        brokersBreakdown[broker]!.healthy++;
      } else {
        healthyCount++;
        brokersBreakdown[broker]!.healthy++;
      }
    } else {
      healthyCount++;
      brokersBreakdown[broker]!.healthy++;
    }
  }

  return {
    totalConnections: allConns.length,
    healthyCount,
    expiringCount,
    expiredCount,
    errorCount,
    brokersBreakdown,
  };
}
