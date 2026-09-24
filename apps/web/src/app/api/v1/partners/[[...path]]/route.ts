// ──────────────────────────────────────────────
// TradeMind — Partners & Affiliate Routes
// GET  /api/v1/partners             — list
// GET  /api/v1/partners/[slug]      — detail
// POST /api/v1/partners/[id]/click  — track click
// No auth required
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, partners } from '@trademind/database';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { ok, notFound } from '@/lib/server/response';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const slugOrId = path?.[0];

    if (!slugOrId) return handleList(req);
    return handleDetail(slugOrId);
  } catch (err: unknown) {
    console.error('[Partners GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const [id, action] = path ?? [];
    if (action === 'click') return handleClick(id);
    return notFound('Route not found');
  } catch (err: unknown) {
    console.error('[Partners POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

async function handleList(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get('category')?.trim();
    const featuredOnly = url.searchParams.get('featured') === 'true';
    const country = url.searchParams.get('country')?.trim();

    const db = getDatabase();
    const conditions: any[] = [eq(partners.isActive, true)];

    if (category && category !== 'all') conditions.push(eq(partners.category, category));
    if (featuredOnly) conditions.push(eq(partners.isFeatured, true));
    if (country) conditions.push(eq(partners.country, country));

    const rows = await db.select().from(partners)
      .where(and(...conditions))
      .orderBy(asc(partners.displayOrder), desc(partners.createdAt));

    return ok({ partners: rows, total: rows.length });
  } catch (err: any) {
    console.error('[partners] DB error:', err.message);
    return NextResponse.json({ success: false, error: { message: 'Service temporarily unavailable' } }, { status: 503 });
  }
}

async function handleDetail(slugOrId: string) {
  try {
    const db = getDatabase();
    const [row] = await db.select().from(partners)
      .where(and(eq(partners.isActive, true), sql`(${partners.slug} = ${slugOrId} OR ${partners.id}::text = ${slugOrId})`))
      .limit(1);
    if (!row) return notFound('Partner not found');
    return ok(row);
  } catch (err: any) {
    console.error('[partners/detail] DB error:', err.message);
    return NextResponse.json({ success: false, error: { message: 'Service temporarily unavailable' } }, { status: 503 });
  }
}

async function handleClick(id: string) {
  try {
    const db = getDatabase();
    const [row] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
    if (!row) return notFound('Partner not found');

    await db.update(partners)
      .set({ clickCount: sql`${partners.clickCount} + 1`, updatedAt: new Date() })
      .where(eq(partners.id, id));

    return ok({ affiliateUrl: row.affiliateUrl, partnerId: row.id, name: row.name });
  } catch (err: any) {
    console.error('[partners/click] DB error:', err.message);
    return NextResponse.json({ success: false, error: { message: 'Service temporarily unavailable' } }, { status: 503 });
  }
}
