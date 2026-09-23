// ──────────────────────────────────────────────
// TradeMind — Pre-Market Preparation Service
//
// Manages daily pre-market routine, risk budgets,
// morning checklists, and market bias guardrails.
// ──────────────────────────────────────────────

import { getDatabase, dailyPremarketPlans } from '@trademind/database';
import { eq, and } from 'drizzle-orm';
import type { DailyPremarketPlan } from '@trademind/shared';

function getTodayDateStr(): string {
  const now = new Date();
  return now.toISOString().split('T')[0] ?? now.toISOString().slice(0, 10);
}

/**
 * Fetch today's pre-market plan for a user.
 */
export async function getTodayPremarketPlan(userId: string): Promise<DailyPremarketPlan | null> {
  const db = getDatabase();
  const today = getTodayDateStr();

  const [plan] = await db
    .select()
    .from(dailyPremarketPlans)
    .where(
      and(
        eq(dailyPremarketPlans.userId, userId),
        eq(dailyPremarketPlans.date, today),
      ),
    )
    .limit(1);

  if (!plan) return null;

  return {
    id: plan.id,
    userId: plan.userId,
    date: plan.date,
    marketBias: plan.marketBias as any,
    keyLevels: plan.keyLevels ?? undefined,
    maxDailyLoss: plan.maxDailyLoss ?? undefined,
    maxDailyTrades: plan.maxDailyTrades ?? undefined,
    maxRiskPerTrade: plan.maxRiskPerTrade ?? undefined,
    checklistItems: (plan.checklistItems as any) ?? [],
    watchlist: (plan.watchlist as any) ?? [],
    mentalState: plan.mentalState ?? undefined,
    notes: plan.notes ?? undefined,
    isLocked: plan.isLocked,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

/**
 * Create or update today's pre-market plan.
 */
export async function savePremarketPlan(
  userId: string,
  data: Partial<DailyPremarketPlan>,
): Promise<DailyPremarketPlan> {
  const db = getDatabase();
  const today = getTodayDateStr();

  const existing = await getTodayPremarketPlan(userId);

  if (existing) {
    const [updated] = await db
      .update(dailyPremarketPlans)
      .set({
        marketBias: data.marketBias ?? existing.marketBias,
        keyLevels: data.keyLevels !== undefined ? data.keyLevels : existing.keyLevels,
        maxDailyLoss: data.maxDailyLoss !== undefined ? data.maxDailyLoss : existing.maxDailyLoss,
        maxDailyTrades: data.maxDailyTrades !== undefined ? data.maxDailyTrades : existing.maxDailyTrades,
        maxRiskPerTrade: data.maxRiskPerTrade !== undefined ? data.maxRiskPerTrade : existing.maxRiskPerTrade,
        checklistItems: data.checklistItems !== undefined ? data.checklistItems : existing.checklistItems,
        watchlist: data.watchlist !== undefined ? data.watchlist : existing.watchlist,
        mentalState: data.mentalState !== undefined ? data.mentalState : existing.mentalState,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        isLocked: data.isLocked !== undefined ? data.isLocked : existing.isLocked,
      })
      .where(eq(dailyPremarketPlans.id, existing.id!))
      .returning();

    return {
      id: updated!.id,
      userId: updated!.userId,
      date: updated!.date,
      marketBias: updated!.marketBias as any,
      keyLevels: updated!.keyLevels ?? undefined,
      maxDailyLoss: updated!.maxDailyLoss ?? undefined,
      maxDailyTrades: updated!.maxDailyTrades ?? undefined,
      maxRiskPerTrade: updated!.maxRiskPerTrade ?? undefined,
      checklistItems: (updated!.checklistItems as any) ?? [],
      watchlist: (updated!.watchlist as any) ?? [],
      mentalState: updated!.mentalState ?? undefined,
      notes: updated!.notes ?? undefined,
      isLocked: updated!.isLocked,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    };
  }

  // Insert new daily plan
  const [created] = await db
    .insert(dailyPremarketPlans)
    .values({
      userId,
      date: today,
      marketBias: data.marketBias ?? 'NEUTRAL',
      keyLevels: data.keyLevels,
      maxDailyLoss: data.maxDailyLoss,
      maxDailyTrades: data.maxDailyTrades,
      maxRiskPerTrade: data.maxRiskPerTrade,
      checklistItems: data.checklistItems ?? [],
      watchlist: data.watchlist ?? [],
      mentalState: data.mentalState,
      notes: data.notes,
      isLocked: data.isLocked ?? false,
    })
    .returning();

  return {
    id: created!.id,
    userId: created!.userId,
    date: created!.date,
    marketBias: created!.marketBias as any,
    keyLevels: created!.keyLevels ?? undefined,
    maxDailyLoss: created!.maxDailyLoss ?? undefined,
    maxDailyTrades: created!.maxDailyTrades ?? undefined,
    maxRiskPerTrade: created!.maxRiskPerTrade ?? undefined,
    checklistItems: (created!.checklistItems as any) ?? [],
    watchlist: (created!.watchlist as any) ?? [],
    mentalState: created!.mentalState ?? undefined,
    notes: created!.notes ?? undefined,
    isLocked: created!.isLocked,
    createdAt: created!.createdAt,
    updatedAt: created!.updatedAt,
  };
}

/**
 * Lock in today's pre-market session.
 */
export async function lockPremarketSession(userId: string): Promise<DailyPremarketPlan> {
  const existing = await getTodayPremarketPlan(userId);
  if (!existing) {
    // Create default plan and lock it
    return savePremarketPlan(userId, { isLocked: true });
  }

  const db = getDatabase();
  const [updated] = await db
    .update(dailyPremarketPlans)
    .set({ isLocked: true })
    .where(eq(dailyPremarketPlans.id, existing.id!))
    .returning();

  return {
    ...existing,
    isLocked: true,
    updatedAt: updated!.updatedAt,
  };
}
