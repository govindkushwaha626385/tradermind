// ──────────────────────────────────────────────
// TradeMind — Reviews / Testimonials Routes
// GET  /api/v1/reviews        — public: list approved
// POST /api/v1/reviews        — auth: submit / update
// GET  /api/v1/reviews/mine   — auth: my review
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase, reviews } from '@trademind/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate, authenticateOptional } from '@/lib/server/auth';
import { ok, created, parseBody } from '@/lib/server/response';

export const runtime = 'nodejs';

const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  headline: z.string().min(5).max(150),
  body: z.string().min(20).max(2000),
  traderType: z.string().max(100).optional(),
  displayName: z.string().max(100).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const action = path?.[0];

  if (action === 'mine') {
    const { user, error } = await authenticate(req);
    if (error) return error;
    const db = getDatabase();
    const [review] = await db.select().from(reviews).where(eq(reviews.userId, user.id)).limit(1);
    return ok(review ?? null);
  }

  // Public list
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
    const featuredOnly = url.searchParams.get('featured') === 'true';

    const db = getDatabase();
    const conditions: any[] = [eq(reviews.isApproved, true)];
    if (featuredOnly) conditions.push(eq(reviews.isFeatured, true));

    const rows = await db.select({ id: reviews.id, rating: reviews.rating, headline: reviews.headline, body: reviews.body, traderType: reviews.traderType, displayName: reviews.displayName, isFeatured: reviews.isFeatured, createdAt: reviews.createdAt })
      .from(reviews).where(and(...conditions)).orderBy(desc(reviews.isFeatured), desc(reviews.createdAt)).limit(limit);

    const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(reviews).where(eq(reviews.isApproved, true));

    return ok(rows, { total: Number(countRow?.count ?? 0) });
  } catch (err: any) {
    console.error('[reviews] DB error:', err.message);
    return NextResponse.json({ success: false, error: { message: 'Service temporarily unavailable' } }, { status: 503 });
  }
}

export async function POST(
  req: NextRequest,
  _ctx: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { data: body, error: bodyErr } = await parseBody(req, submitReviewSchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const [existing] = await db.select({ id: reviews.id }).from(reviews).where(eq(reviews.userId, user.id)).limit(1);

  if (existing) {
    const [updated] = await db.update(reviews)
      .set({ rating: body.rating, headline: body.headline, body: body.body, traderType: body.traderType, displayName: body.displayName, isApproved: false, updatedAt: new Date() })
      .where(eq(reviews.id, existing.id)).returning();
    return ok({ ...updated, message: 'Review updated. It will appear after admin approval.' });
  }

  const [review] = await db.insert(reviews).values({
    userId: user.id, rating: body.rating, headline: body.headline, body: body.body,
    traderType: body.traderType ?? null, displayName: body.displayName ?? null,
    isApproved: false, isFeatured: false,
  }).returning();

  return created({ ...review, message: 'Review submitted successfully. It will appear after admin approval.' });
}
