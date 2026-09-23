// ──────────────────────────────────────────────
// TradeMind — Usage Limit Enforcement Middleware
//
// Checks user's subscription plan limits before allowing
// resource creation (broker connections, trade imports, etc.)
// Uses the userHasFeature() service from payment.service.
//
// If no subscription is found, falls back to the 'free' plan
// feature limits — same as what userHasFeature returns.
// ──────────────────────────────────────────────

import { Context, Next } from 'hono';
import { getDatabase, subscriptions, plans, brokerConnections, tradeExecutions } from '@trademind/database';
import { eq, and, sql } from 'drizzle-orm';
import type { AuthUser } from './auth';

// ── Feature Keys ────────────────────────────
export const FEATURES = {
  MAX_BROKER_CONNECTIONS: 'maxBrokerConnections',
  MAX_TRADES_PER_MONTH: 'maxTradesPerMonth',
  AI_INSIGHTS: 'aiInsights',
  TEAM_ACCESS: 'teamAccess',
  CSV_EXPORT: 'csvExport',
  API_ACCESS: 'apiAccess',
} as const;

/**
 * Get user's plan features, falling back to free plan defaults.
 */
async function getUserPlanFeatures(userId: string): Promise<Record<string, unknown>> {
  const db = getDatabase();

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
      ),
    )
    .limit(1);

  if (sub) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1);

    return (plan?.features as Record<string, unknown>) ?? {};
  }

  // Fallback: fetch free plan features
  const [freePlan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, 'free'))
    .limit(1);

  return (freePlan?.features as Record<string, unknown>) ?? {};
}

/**
 * Middleware: Check if user has reached max broker connections.
 * Use ON routes that create new broker connections.
 */
export async function checkBrokerLimit(c: Context, next: Next) {
  const user = c.get('user') as AuthUser;
  if (!user) {
    return c.json({ success: false, error: { message: 'Authentication required' } }, 401);
  }

  const features = await getUserPlanFeatures(user.id);
  const maxBrokers = Number(features[FEATURES.MAX_BROKER_CONNECTIONS] ?? 1);

  const db = getDatabase();
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, user.id));

  const currentCount = Number(result?.count ?? 0);

  if (maxBrokers > 0 && currentCount >= maxBrokers) {
    return c.json({
      success: false,
      error: {
        message: `Broker connection limit reached (${maxBrokers}). Upgrade your plan to connect more brokers.`,
        code: 'LIMIT_BROKER_CONNECTIONS',
        limit: maxBrokers,
        current: currentCount,
      },
    }, 403);
  }

  await next();
}

/**
 * Middleware: Check if user has reached monthly trade limit.
 * Use ON routes that create/import new trades.
 */
export async function checkTradeLimit(c: Context, next: Next) {
  const user = c.get('user') as AuthUser;
  if (!user) {
    return c.json({ success: false, error: { message: 'Authentication required' } }, 401);
  }

  const features = await getUserPlanFeatures(user.id);
  const maxTrades = Number(features[FEATURES.MAX_TRADES_PER_MONTH] ?? 50);

  // Count trades in the current calendar month
  const db = getDatabase();
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tradeExecutions)
    .where(
      and(
        eq(tradeExecutions.userId, user.id),
        sql`${tradeExecutions.executionTimestamp} >= ${firstOfMonth}`,
      ),
    );

  const currentCount = Number(result?.count ?? 0);

  if (maxTrades > 0 && currentCount >= maxTrades) {
    return c.json({
      success: false,
      error: {
        message: `Monthly trade limit reached (${maxTrades}). Upgrade your plan to trade more this month.`,
        code: 'LIMIT_TRADES_PER_MONTH',
        limit: maxTrades,
        current: currentCount,
        resetDate: new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 1).toISOString(),
      },
    }, 403);
  }

  await next();
}