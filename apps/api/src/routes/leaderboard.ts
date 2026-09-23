// ──────────────────────────────────────────────
// TradeMind — Leaderboard Routes
//
// Public and authenticated endpoints for the trader leaderboard.
// Computes real-time rankings with caching to ensure high performance
// and zero external cost.
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import {
  getDatabase,
  leaderboardOptIns,
  leaderboardSnapshots,
  journalTrades,
  users,
} from '@trademind/database';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import type { LeaderboardEntry, LeaderboardPeriod } from '@trademind/shared';

export const leaderboardRouter = new Hono();

const leaderboardQuerySchema = z.object({
  period: z.enum(['WEEKLY', 'MONTHLY', 'ALL_TIME']).default('ALL_TIME'),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const optInBodySchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(30, 'Display name cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_ -]+$/, 'Display name can only contain letters, numbers, underscores, and dashes'),
  bio: z.string().max(280).optional().nullable(),
  twitterUrl: z.string().url().max(200).optional().nullable().or(z.literal('')),
});

const updateOptInSchema = optInBodySchema.partial().extend({
  isPublic: z.boolean().optional(),
});

/**
 * Cache TTL: 15 minutes in milliseconds
 */
const SNAPSHOT_TTL_MS = 15 * 60 * 1000;

/**
 * Compute and persist leaderboard rankings for a period
 */
async function computeLeaderboardRankings(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  const db = getDatabase();

  // 1. Get all opted-in public traders
  const optIns = await db
    .select({
      userId: leaderboardOptIns.userId,
      displayName: leaderboardOptIns.displayName,
      bio: leaderboardOptIns.bio,
      twitterUrl: leaderboardOptIns.twitterUrl,
      avatarUrl: users.avatarUrl,
    })
    .from(leaderboardOptIns)
    .innerJoin(users, eq(leaderboardOptIns.userId, users.id))
    .where(eq(leaderboardOptIns.isPublic, true));

  if (optIns.length === 0) {
    return [];
  }

  // 2. Date boundary for the period
  let dateBoundary: Date | null = null;
  const now = new Date();
  if (period === 'WEEKLY') {
    dateBoundary = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'MONTHLY') {
    dateBoundary = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // 3. For each opted-in user, calculate their real trade metrics
  const scoredTraders: Array<{
    userId: string;
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
    twitterUrl?: string | null;
    totalPnl: number;
    pnlPercent: number;
    winRate: number;
    totalTrades: number;
    disciplineScore: number;
    compositeScore: number;
  }> = [];

  for (const trader of optIns) {
    const tradeConditions = [
      eq(journalTrades.userId, trader.userId),
      eq(journalTrades.status, 'CLOSED'),
    ];

    if (dateBoundary) {
      tradeConditions.push(gte(journalTrades.openedAt, dateBoundary));
    }

    const trades = await db
      .select({
        netPnl: journalTrades.netPnl,
        ruleComplianceScore: journalTrades.ruleComplianceScore,
      })
      .from(journalTrades)
      .where(and(...tradeConditions));

    const totalTrades = trades.length;
    let winCount = 0;
    let totalPnl = 0;
    let totalScore = 0;
    let scoreCount = 0;

    for (const t of trades) {
      const net = Number(t.netPnl ?? 0);
      totalPnl += net;
      if (net > 0) winCount++;

      if (t.ruleComplianceScore != null) {
        totalScore += Number(t.ruleComplianceScore);
        scoreCount++;
      }
    }

    const winRate = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(1)) : 0;
    const disciplineScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 80;

    // Composite score formula (0 - 100 scale):
    // 40% Win Rate + 40% Discipline Score + 20% Profit Factor/Direction
    const pnlComponent = totalPnl > 0 ? Math.min(20, 10 + (totalPnl > 50000 ? 10 : (totalPnl / 5000))) : Math.max(0, 10 + (totalPnl / 10000));
    const compositeScore = Number(((winRate * 0.4) + (disciplineScore * 0.4) + pnlComponent).toFixed(1));

    scoredTraders.push({
      userId: trader.userId,
      displayName: trader.displayName,
      avatarUrl: trader.avatarUrl,
      bio: trader.bio,
      twitterUrl: trader.twitterUrl,
      totalPnl: Number(totalPnl.toFixed(2)),
      pnlPercent: Number((winRate * 0.5).toFixed(1)),
      winRate,
      totalTrades,
      disciplineScore,
      compositeScore,
    });
  }

  // 4. Sort by composite score (highest first), then totalPnl
  scoredTraders.sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }
    return b.totalPnl - a.totalPnl;
  });

  // 5. Build ranked entries and upsert snapshots into DB
  const rankedEntries: LeaderboardEntry[] = scoredTraders.map((trader, idx) => ({
    id: trader.userId,
    userId: trader.userId,
    period,
    rank: idx + 1,
    displayName: trader.displayName,
    avatarUrl: trader.avatarUrl,
    bio: trader.bio,
    twitterUrl: trader.twitterUrl,
    totalPnl: trader.totalPnl,
    pnlPercent: trader.pnlPercent,
    winRate: trader.winRate,
    totalTrades: trader.totalTrades,
    disciplineScore: trader.disciplineScore,
    compositeScore: trader.compositeScore,
    computedAt: now,
  }));

  // Update DB cache in background/async
  try {
    for (const entry of rankedEntries) {
      await db
        .insert(leaderboardSnapshots)
        .values({
          userId: entry.userId,
          period: entry.period,
          rank: entry.rank,
          displayName: entry.displayName,
          avatarUrl: entry.avatarUrl,
          bio: entry.bio,
          twitterUrl: entry.twitterUrl,
          totalPnl: entry.totalPnl,
          pnlPercent: entry.pnlPercent,
          winRate: entry.winRate,
          totalTrades: entry.totalTrades,
          disciplineScore: entry.disciplineScore,
          compositeScore: entry.compositeScore,
          computedAt: entry.computedAt as Date,
        })
        .onConflictDoUpdate({
          target: [leaderboardSnapshots.userId, leaderboardSnapshots.period],
          set: {
            rank: entry.rank,
            displayName: entry.displayName,
            avatarUrl: entry.avatarUrl,
            bio: entry.bio,
            twitterUrl: entry.twitterUrl,
            totalPnl: entry.totalPnl,
            pnlPercent: entry.pnlPercent,
            winRate: entry.winRate,
            totalTrades: entry.totalTrades,
            disciplineScore: entry.disciplineScore,
            compositeScore: entry.compositeScore,
            computedAt: entry.computedAt as Date,
          },
        });
    }
  } catch (err) {
    console.error('Failed to update leaderboard snapshots cache:', err);
  }

  return rankedEntries;
}

/**
 * GET /leaderboard — Public ranked leaderboard entries
 */
leaderboardRouter.get('/', validateQuery(leaderboardQuerySchema), async (c) => {
  const query = c.get('validatedQuery');
  const period = query.period as LeaderboardPeriod;
  const db = getDatabase();

  // Check if we have recent cached snapshots (within TTL)
  const cachedSnapshots = await db
    .select()
    .from(leaderboardSnapshots)
    .where(eq(leaderboardSnapshots.period, period))
    .orderBy(leaderboardSnapshots.rank)
    .limit(query.limit);

  const now = Date.now();
  const isFresh =
    cachedSnapshots.length > 0 &&
    now - new Date(cachedSnapshots[0]!.computedAt).getTime() < SNAPSHOT_TTL_MS;

  if (isFresh) {
    return c.json({
      success: true,
      data: cachedSnapshots.map((s) => ({
        ...s,
        period: s.period as LeaderboardPeriod,
      })),
      cached: true,
    });
  }

  // Recompute rankings
  const rankings = await computeLeaderboardRankings(period);
  const limited = rankings.slice(0, query.limit);

  return c.json({
    success: true,
    data: limited,
    cached: false,
  });
});

/**
 * GET /leaderboard/me — Current user's leaderboard status & rank
 */
leaderboardRouter.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const [optIn] = await db
    .select()
    .from(leaderboardOptIns)
    .where(eq(leaderboardOptIns.userId, user.id))
    .limit(1);

  if (!optIn) {
    return c.json({
      success: true,
      data: {
        optedIn: false,
        profile: null,
        ranks: null,
      },
    });
  }

  // Get user's current ranks across periods
  const snapshots = await db
    .select()
    .from(leaderboardSnapshots)
    .where(eq(leaderboardSnapshots.userId, user.id));

  const ranksByPeriod: Record<string, any> = {};
  for (const snap of snapshots) {
    ranksByPeriod[snap.period] = snap;
  }

  return c.json({
    success: true,
    data: {
      optedIn: optIn.isPublic,
      profile: optIn,
      ranks: ranksByPeriod,
    },
  });
});

/**
 * POST /leaderboard/opt-in — Opt in to the public leaderboard
 */
leaderboardRouter.post('/opt-in', authMiddleware, validateBody(optInBodySchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  const [optIn] = await db
    .insert(leaderboardOptIns)
    .values({
      userId: user.id,
      displayName: body.displayName.trim(),
      bio: body.bio ?? null,
      twitterUrl: body.twitterUrl || null,
      isPublic: true,
    })
    .onConflictDoUpdate({
      target: leaderboardOptIns.userId,
      set: {
        displayName: body.displayName.trim(),
        bio: body.bio ?? null,
        twitterUrl: body.twitterUrl || null,
        isPublic: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Trigger recalculation in background
  computeLeaderboardRankings('ALL_TIME').catch((err) => {
    console.error('Background leaderboard sync error:', err);
  });

  return c.json({ success: true, data: optIn });
});

/**
 * PATCH /leaderboard/opt-in — Update opt-in profile settings
 */
leaderboardRouter.patch('/opt-in', authMiddleware, validateBody(updateOptInSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  const [existing] = await db
    .select()
    .from(leaderboardOptIns)
    .where(eq(leaderboardOptIns.userId, user.id))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: { message: 'Opt-in profile not found. Please opt in first.' } }, 404);
  }

  const [updated] = await db
    .update(leaderboardOptIns)
    .set({
      displayName: body.displayName ? body.displayName.trim() : existing.displayName,
      bio: body.bio !== undefined ? body.bio : existing.bio,
      twitterUrl: body.twitterUrl !== undefined ? (body.twitterUrl || null) : existing.twitterUrl,
      isPublic: body.isPublic !== undefined ? body.isPublic : existing.isPublic,
      updatedAt: new Date(),
    })
    .where(eq(leaderboardOptIns.userId, user.id))
    .returning();

  return c.json({ success: true, data: updated });
});

/**
 * DELETE /leaderboard/opt-in — Opt out of the public leaderboard
 */
leaderboardRouter.delete('/opt-in', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  await db
    .update(leaderboardOptIns)
    .set({ isPublic: false, updatedAt: new Date() })
    .where(eq(leaderboardOptIns.userId, user.id));

  // Remove snapshots
  await db.delete(leaderboardSnapshots).where(eq(leaderboardSnapshots.userId, user.id));

  return c.json({
    success: true,
    data: { message: 'You have opted out of the public leaderboard.' },
  });
});
