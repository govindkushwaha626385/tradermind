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
import { ok, notFound, parseBody, apiError } from '@/lib/server/response';
import type { LeaderboardEntry, LeaderboardPeriod } from '@trademind/shared';

export const runtime = 'nodejs';

import { computeLeaderboardRankings } from '@/lib/server/services/leaderboard.service';

const SNAPSHOT_TTL_MS = 15 * 60 * 1000;

const optInBodySchema = z.object({
  displayName: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_ -]+$/),
  bio: z.string().max(280).optional().nullable(),
  twitterUrl: z.string().url().max(200).optional().nullable().or(z.literal('')),
});
const updateOptInSchema = optInBodySchema.partial().extend({ isPublic: z.boolean().optional() });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
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
    const url = new URL(req.url);
    const period = (url.searchParams.get('period') ?? 'ALL_TIME') as LeaderboardPeriod;
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
    const db = getDatabase();

    const cachedSnapshots = await db.select().from(leaderboardSnapshots).where(eq(leaderboardSnapshots.period, period)).orderBy(leaderboardSnapshots.rank).limit(limit);
    const isFresh = cachedSnapshots.length > 0 && Date.now() - new Date(cachedSnapshots[0]!.computedAt).getTime() < SNAPSHOT_TTL_MS;
    if (isFresh) return ok(cachedSnapshots, { cached: true });

    const rankings = await computeLeaderboardRankings(period);
    return ok(rankings.slice(0, limit), { cached: false });
  } catch (err: unknown) {
    console.error('[Leaderboard GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

export async function POST(
  req: NextRequest,
  _ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
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
  } catch (err: unknown) {
    console.error('[Leaderboard POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  _ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
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
  } catch (err: unknown) {
    console.error('[Leaderboard PATCH] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  _ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    const db = getDatabase();
    await db.update(leaderboardOptIns).set({ isPublic: false, updatedAt: new Date() }).where(eq(leaderboardOptIns.userId, user.id));
    await db.delete(leaderboardSnapshots).where(eq(leaderboardSnapshots.userId, user.id));
    return ok({ message: 'You have opted out of the public leaderboard.' });
  } catch (err: unknown) {
    console.error('[Leaderboard DELETE] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}
