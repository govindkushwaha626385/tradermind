// ──────────────────────────────────────────────
// TradeMind — Leaderboard Ranking Computation Service
// ──────────────────────────────────────────────

import { getDatabase, leaderboardOptIns, leaderboardSnapshots, journalTrades, users } from '@trademind/database';
import { eq, and, gte } from 'drizzle-orm';
import type { LeaderboardEntry, LeaderboardPeriod } from '@trademind/shared';

export async function computeLeaderboardRankings(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  const db = getDatabase();
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

  if (optIns.length === 0) return [];

  let dateBoundary: Date | null = null;
  const now = new Date();
  if (period === 'WEEKLY') dateBoundary = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (period === 'MONTHLY') dateBoundary = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const scoredTraders: any[] = [];
  for (const trader of optIns) {
    const tradeConditions: any[] = [eq(journalTrades.userId, trader.userId), eq(journalTrades.status, 'CLOSED')];
    if (dateBoundary) tradeConditions.push(gte(journalTrades.openedAt, dateBoundary));
    const trades = await db
      .select({ netPnl: journalTrades.netPnl, ruleComplianceScore: journalTrades.ruleComplianceScore })
      .from(journalTrades)
      .where(and(...tradeConditions));

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

    const winRate = trades.length > 0 ? Number(((winCount / trades.length) * 100).toFixed(1)) : 0;
    const disciplineScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 80;
    const pnlComponent = totalPnl > 0 ? Math.min(20, 10 + (totalPnl > 50000 ? 10 : totalPnl / 5000)) : Math.max(0, 10 + totalPnl / 10000);
    const compositeScore = Number((winRate * 0.4 + disciplineScore * 0.4 + pnlComponent).toFixed(1));

    scoredTraders.push({
      userId: trader.userId,
      displayName: trader.displayName,
      avatarUrl: trader.avatarUrl,
      bio: trader.bio,
      twitterUrl: trader.twitterUrl,
      totalPnl: Number(totalPnl.toFixed(2)),
      pnlPercent: Number((winRate * 0.5).toFixed(1)),
      winRate,
      totalTrades: trades.length,
      disciplineScore,
      compositeScore,
    });
  }

  scoredTraders.sort((a, b) => (b.compositeScore !== a.compositeScore ? b.compositeScore - a.compositeScore : b.totalPnl - a.totalPnl));

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

  // Upsert cache in background
  (async () => {
    const db2 = getDatabase();
    for (const entry of rankedEntries) {
      await db2
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
  })().catch((err) => console.error('Background leaderboard cache error:', err));

  return rankedEntries;
}
