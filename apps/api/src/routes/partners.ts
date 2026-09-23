// ──────────────────────────────────────────────
// TradeMind — Partners & Affiliate Directory Routes
//
// Public:
//   GET  /partners             → List active partners (filtered by category / featured)
//   GET  /partners/:slug       → Get partner details
//   POST /partners/:id/click   → Record click and return affiliate URL
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { getDatabase, partners } from '@trademind/database';
import { eq, and, asc, desc, sql } from 'drizzle-orm';

export const partnersRouter = new Hono();

/**
 * GET /partners — List all active partners
 */
partnersRouter.get('/', async (c) => {
  const db = getDatabase();
  const category = c.req.query('category')?.trim();
  const featuredOnly = c.req.query('featured') === 'true';
  const country = c.req.query('country')?.trim();

  const conditions = [eq(partners.isActive, true)];

  if (category && category !== 'all') {
    conditions.push(eq(partners.category, category));
  }
  if (featuredOnly) {
    conditions.push(eq(partners.isFeatured, true));
  }
  if (country) {
    conditions.push(eq(partners.country, country));
  }

  const rows = await db
    .select()
    .from(partners)
    .where(and(...conditions))
    .orderBy(asc(partners.displayOrder), desc(partners.createdAt));

  return c.json({
    success: true,
    data: {
      partners: rows,
      total: rows.length,
    },
  });
});

/**
 * GET /partners/:slug — Get single partner by slug or id
 */
partnersRouter.get('/:slug', async (c) => {
  const db = getDatabase();
  const slugOrId = c.req.param('slug');

  const [row] = await db
    .select()
    .from(partners)
    .where(
      and(
        eq(partners.isActive, true),
        sql`(${partners.slug} = ${slugOrId} OR ${partners.id}::text = ${slugOrId})`,
      ),
    )
    .limit(1);

  if (!row) {
    return c.json({ success: false, error: { message: 'Partner not found' } }, 404);
  }

  return c.json({
    success: true,
    data: row,
  });
});

/**
 * POST /partners/:id/click — Track affiliate link click and return redirect URL
 */
partnersRouter.post('/:id/click', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id');

  const [row] = await db
    .select()
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1);

  if (!row) {
    return c.json({ success: false, error: { message: 'Partner not found' } }, 404);
  }

  // Increment click count atomically
  await db
    .update(partners)
    .set({
      clickCount: sql`${partners.clickCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(partners.id, id));

  return c.json({
    success: true,
    data: {
      affiliateUrl: row.affiliateUrl,
      partnerId: row.id,
      name: row.name,
    },
  });
});
