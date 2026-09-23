// ──────────────────────────────────────────────
// TradeMind — Leaderboard Routes
// GET  /api/v1/leaderboard          — public rankings
// GET  /api/v1/leaderboard/me       — auth: my rank
// POST /api/v1/leaderboard/opt-in   — auth: opt in
// PATCH /api/v1/leaderboard/opt-in  — auth: update profile
// DELETE /api/v1/leaderboard/opt-in — auth: opt out
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase, leaderboardOptIns, leaderboardSnapshots, journalTrades, users } from '@trademind/database';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { ok, notFound, parseBody } from '@/lib/server/response';
import type { LeaderboardEntry, LeaderboardPeriod } from '@trademind/shared';

export const runtime = 'nodejs';

const SNAPSHOT_TTL_MS = 15 * 60 * 1000;

const optInBodySchema = z.object({
  displayName: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_ -]+$/),
  bio: z.string().max(280).optional().nullable(),
  twitterUrl: z.string().url().max(200).optional().nullable().or(z.literal('')),
});
const updateOptInSchema = optInBodySchema.partial().extend({ isPublic: z.boolean().optional() });

async function computeLeaderboardRankings(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  const db = getDatabase();
  const optIns = await db.select({ userId: leaderboardOptIns.userId, displayName: leaderboardOptIns.displayName, bio: leaderboardOptIns.bio, twitterUrl: leaderboardOptIns.twitterUrl, avatarUrl: users.avatarUrl }).from(leaderboardOptIns).innerJoin(users, eq(leaderboardOptIns.userId, users.id)).where(eq(leaderboardOptIns.isPublic, true));
  if (optIns.length === 0) return [];

  let dateBoundary: Date | null = null;
  const now = new Date();
  if (period === 'WEEKLY') dateBoundary = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (period === 'MONTHLY') dateBoundary = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const scoredTraders: any[] = [];
  for (const trader of optIns) {
    const tradeConditions: any[] = [eq(journalTrades.userId, trader.userId), eq(journalTrades.status, 'CLOSED')];
    if (dateBoundary) tradeConditions.push(gte(journalTrades.openedAt, dateBoundary));
    const trades = await db.select({ netPnl: journalTrades.netPnl, ruleComplianceScore: journalTrades.ruleComplianceScore }).from(journalTrades).where(and(...tradeConditions));
    let winCount = 0, totalPnl = 0, totalScore = 0, scoreCount = 0;
    for (const t of trades) {
      const net = Number(t.netPnl ?? 0); totalPnl += net; if (net > 0) winCount++;
      if (t.ruleComplianceScore != null) { totalScore += Number(t.ruleComplianceScore); scoreCount++; }
    }
    const winRate = trades.length > 0 ? Number(((winCount / trades.length) * 100).toFixed(1)) : 0;
    const disciplineScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 80;
    const pnlComponent = totalPnl > 0 ? Math.min(20, 10 + (totalPnl > 50000 ? 10 : (totalPnl / 5000))) : Math.max(0, 10 + (totalPnl / 10000));
    const compositeScore = Number(((winRate * 0.4) + (disciplineScore * 0.4) + pnlComponent).toFixed(1));
    scoredTraders.push({ userId: trader.userId, displayName: trader.displayName, avatarUrl: trader.avatarUrl, bio: trader.bio, twitterUrl: trader.twitterUrl, totalPnl: Number(totalPnl.toFixed(2)), pnlPercent: Number((winRate * 0.5).toFixed(1)), winRate, totalTrades: trades.length, disciplineScore, compositeScore });
  }

  scoredTraders.sort((a, b) => b.compositeScore !== a.compositeScore ? b.compositeScore - a.compositeScore : b.totalPnl - a.totalPnl);
  const rankedEntries: LeaderboardEntry[] = scoredTraders.map((trader, idx) => ({ id: trader.userId, userId: trader.userId, period, rank: idx + 1, displayName: trader.displayName, avatarUrl: trader.avatarUrl, bio: trader.bio, twitterUrl: trader.twitterUrl, totalPnl: trader.totalPnl, pnlPercent: trader.pnlPercent, winRate: trader.winRate, totalTrades: trader.totalTrades, disciplineScore: trader.disciplineScore, compositeScore: trader.compositeScore, computedAt: now }));

  // Upsert cache in background
  (async () => {
    const db2 = getDatabase();
    for (const entry of rankedEntries) {
      await db2.insert(leaderboardSnapshots).values({ userId: entry.userId, period: entry.period, rank: entry.rank, displayName: entry.displayName, avatarUrl: entry.avatarUrl, bio: entry.bio, twitterUrl: entry.twitterUrl, totalPnl: entry.totalPnl, pnlPercent: entry.pnlPercent, winRate: entry.winRate, totalTrades: entry.totalTrades, disciplineScore: entry.disciplineScore, compositeScore: entry.compositeScore, computedAt: entry.computedAt as Date })
        .onConflictDoUpdate({ target: [leaderboardSnapshots.userId, leaderboardSnapshots.period], set: { rank: entry.rank, displayName: entry.displayName, avatarUrl: entry.avatarUrl, bio: entry.bio, twitterUrl: entry.twitterUrl, totalPnl: entry.totalPnl, pnlPercent: entry.pnlPercent, winRate: entry.winRate, totalTrades: entry.totalTrades, disciplineScore: entry.disciplineScore, compositeScore: entry.compositeScore, computedAt: entry.computedAt as Date } });
    }
  })().catch(err => console.error('Background leaderboard cache error:', err));

  return rankedEntries;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const action = path?.[0];

  if (action === 'me') {
    const { user, error } = await authenticate(req);
    if (error) return error;
    const db = getDatabase();
    const [optIn] = await db.select().from(leaderboardOptIns).where(eq(leaderboardOptIns.userId, user.id)).limit(1);
    if (!optIn) return ok({ optedIn: false, profile: null, ranks: null });
    const snapshots = await db.select().from(leaderboardSnapshots).where(eq(leaderboardSnapshots.userId, user.id));
    const ranksByPeriod: Record<string, any> = {};
    for (const snap of snapshots) ranksByPeriod[snap.period] = snap;
    return ok({ optedIn: optIn.isPublic, profile: optIn, ranks: ranksByPeriod });
  }

  // Public leaderboard
  try {
    const url = new URL(req.url);
    const period = (url.searchParams.get('period') ?? 'ALL_TIME') as LeaderboardPeriod;
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
    const db = getDatabase();

    const cachedSnapshots = await db.select().from(leaderboardSnapshots).where(eq(leaderboardSnapshots.period, period)).orderBy(leaderboardSnapshots.rank).limit(limit);
    const isFresh = cachedSnapshots.length > 0 && Date.now() - new Date(cachedSnapshots[0]!.computedAt).getTime() < SNAPSHOT_TTL_MS;
    if (isFresh) return ok(cachedSnapshots, { cached: true });

    const rankings = await computeLeaderboardRankings(period);
    return ok(rankings.slice(0, limit), { cached: false });
  } catch (err: any) {
    console.error('[leaderboard] DB error:', err.message);
    return NextResponse.json({ success: false, error: { message: 'Service temporarily unavailable' } }, { status: 503 });
  }
}

export async function POST(
  req: NextRequest,
  _ctx: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { data: body, error: bodyErr } = await parseBody(req, optInBodySchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const [optIn] = await db.insert(leaderboardOptIns)
    .values({ userId: user.id, displayName: body.displayName.trim(), bio: body.bio ?? null, twitterUrl: body.twitterUrl || null, isPublic: true })
    .onConflictDoUpdate({ target: leaderboardOptIns.userId, set: { displayName: body.displayName.trim(), bio: body.bio ?? null, twitterUrl: body.twitterUrl || null, isPublic: true, updatedAt: new Date() } })
    .returning();

  computeLeaderboardRankings('ALL_TIME').catch(err => console.error('Background leaderboard sync error:', err));
  return ok(optIn);
}

export async function PATCH(
  req: NextRequest,
  _ctx: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { data: body, error: bodyErr } = await parseBody(req, updateOptInSchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const [existing] = await db.select().from(leaderboardOptIns).where(eq(leaderboardOptIns.userId, user.id)).limit(1);
  if (!existing) return notFound('Opt-in profile not found. Please opt in first.');

  const [updated] = await db.update(leaderboardOptIns).set({
    displayName: body.displayName ? body.displayName.trim() : existing.displayName,
    bio: body.bio !== undefined ? body.bio : existing.bio,
    twitterUrl: body.twitterUrl !== undefined ? (body.twitterUrl || null) : existing.twitterUrl,
    isPublic: body.isPublic !== undefined ? body.isPublic : existing.isPublic,
    updatedAt: new Date(),
  }).where(eq(leaderboardOptIns.userId, user.id)).returning();
  return ok(updated);
}

export async function DELETE(
  req: NextRequest,
  _ctx: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const db = getDatabase();
  await db.update(leaderboardOptIns).set({ isPublic: false, updatedAt: new Date() }).where(eq(leaderboardOptIns.userId, user.id));
  await db.delete(leaderboardSnapshots).where(eq(leaderboardSnapshots.userId, user.id));
  return ok({ message: 'You have opted out of the public leaderboard.' });
}
