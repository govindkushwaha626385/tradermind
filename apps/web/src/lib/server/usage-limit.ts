// ──────────────────────────────────────────────
// TradeMind — Server: Usage Limit Helpers
//
// Ported from apps/api/src/middleware/usage-limit.ts
// Checks plan-based feature limits (broker connections,
// trade imports, etc.) before allowing resource creation.
// ──────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getDatabase, subscriptions, plans, brokerConnections, tradeExecutions } from '@trademind/database';
import { eq, and, sql } from 'drizzle-orm';

export const FEATURES = {
  MAX_BROKER_CONNECTIONS: 'maxBrokerConnections',
  MAX_TRADES_PER_MONTH: 'maxTradesPerMonth',
  AI_INSIGHTS: 'aiInsights',
  TEAM_ACCESS: 'teamAccess',
  CSV_EXPORT: 'csvExport',
  API_ACCESS: 'apiAccess',
} as const;

/**
 * Get the user's current plan features.
 * Falls back to free plan defaults when no active subscription exists.
 */
export async function getUserPlanFeatures(userId: string): Promise<Record<string, unknown>> {
  const db = getDatabase();

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
    .limit(1);

  if (sub) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1);
    return (plan?.features as Record<string, unknown>) ?? {};
  }

  const [freePlan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, 'free'))
    .limit(1);

  return (freePlan?.features as Record<string, unknown>) ?? {};
}

/**
 * Check if a user has a specific boolean feature enabled.
 */
export async function userHasFeature(userId: string, feature: string): Promise<boolean> {
  const features = await getUserPlanFeatures(userId);
  return Boolean(features[feature]);
}

/**
 * Check if the user has reached their max broker connection limit.
 * Returns a 403 NextResponse if at limit, null if OK.
 */
export async function checkBrokerLimit(userId: string): Promise<NextResponse | null> {
  const features = await getUserPlanFeatures(userId);
  const maxBrokers = Number(features[FEATURES.MAX_BROKER_CONNECTIONS] ?? 1);

  const db = getDatabase();
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, userId));

  const currentCount = Number(result?.count ?? 0);

  if (maxBrokers > 0 && currentCount >= maxBrokers) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: `Broker connection limit reached (${maxBrokers}). Upgrade your plan to connect more brokers.`,
          code: 'LIMIT_BROKER_CONNECTIONS',
          limit: maxBrokers,
          current: currentCount,
        },
      },
      { status: 403 },
    );
  }

  return null;
}

/**
 * Check if the user has reached their monthly trade import limit.
 * Returns a 403 NextResponse if at limit, null if OK.
 */
export async function checkTradeLimit(userId: string): Promise<NextResponse | null> {
  const features = await getUserPlanFeatures(userId);
  const maxTrades = Number(features[FEATURES.MAX_TRADES_PER_MONTH] ?? 50);

  const db = getDatabase();
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tradeExecutions)
    .where(
      and(
        eq(tradeExecutions.userId, userId),
        sql`${tradeExecutions.executionTimestamp} >= ${firstOfMonth}`,
      ),
    );

  const currentCount = Number(result?.count ?? 0);

  if (maxTrades > 0 && currentCount >= maxTrades) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: `Monthly trade limit reached (${maxTrades}). Upgrade your plan to trade more this month.`,
          code: 'LIMIT_TRADES_PER_MONTH',
          limit: maxTrades,
          current: currentCount,
          resetDate: new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 1).toISOString(),
        },
      },
      { status: 403 },
    );
  }

  return null;
}

/**
 * Check if the user has remaining trade quota for sync operations.
 * Returns Infinity for unlimited plans.
 */
export async function getRemainingTradeQuota(userId: string): Promise<number> {
  const features = await getUserPlanFeatures(userId);
  const maxTrades = Number(features[FEATURES.MAX_TRADES_PER_MONTH] ?? 50);

  if (maxTrades <= 0) return Infinity;

  const db = getDatabase();
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tradeExecutions)
    .where(
      and(
        eq(tradeExecutions.userId, userId),
        sql`${tradeExecutions.executionTimestamp} >= ${firstOfMonth}`,
      ),
    );

  const used = Number(result?.count ?? 0);
  return Math.max(0, maxTrades - used);
}
