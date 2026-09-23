// ──────────────────────────────────────────────
// TradeMind — Admin Configuration Routes
// All system configuration is dynamically managed here
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import {
  getDatabase,
  getSupabaseAdmin,
  adminConfigs,
  taxRates,
  users,
  subscriptions,
  brokerConnections,
  tradeExecutions,
  plans,
  invoices,
  syncLogs,
  journalTrades,
  adminAuditLogs,
  aiCache,
  products,
  productOrders,
  productAccess,
  reviews,
  tradingStrategies,
  leaderboardOptIns,
  leaderboardSnapshots,
  partners,
  backgroundJobs,
  cacheEntries,
  apiRateLimits,
  featureFlags,
} from '@trademind/database';
import { eq, sql, desc, asc, and, gte, lte, ilike } from 'drizzle-orm';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { configManager, CONFIG_DEFINITIONS } from '@trademind/config';
import { recordAdminAudit } from '../services/admin-audit.service';
import { invalidateCache } from '../lib/cache';

export const adminRouter = new Hono();
adminRouter.use('*', authMiddleware);
adminRouter.use('*', adminMiddleware);

const updateConfigSchema = z.object({
  value: z.any(),
});

const taxRateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  segment: z.string(),
  transactionType: z.string().optional().nullable(),
  rateType: z.enum(['percentage', 'flat']),
  rateValue: z.number(),
  appliedOn: z.enum(['buy', 'sell', 'both']),
  maxCap: z.number().optional().nullable(),
  minAmount: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
});

/**
 * GET /admin/config — List all config definitions with current values
 */
adminRouter.get('/config', async (c) => {
  const db = getDatabase();
  const dbConfigs = await db.select().from(adminConfigs);

  const configMap = new Map(dbConfigs.map((cfg) => [cfg.key, cfg]));

  const merged = CONFIG_DEFINITIONS.map((def) => {
    const dbConfig = configMap.get(def.key);
    return {
      key: def.key,
      label: def.label,
      description: def.description,
      type: def.type,
      category: def.category,
      isPublic: def.isPublic,
      value: dbConfig?.value ?? def.defaultValue,
      updatedAt: dbConfig?.updatedAt ?? null,
    };
  });

  return c.json({ success: true, data: merged });
});

/**
 * GET /admin/config/public — Public configs (safe for client)
 */
adminRouter.get('/config/public', async (c) => {
  const publicConfigs = await configManager.getPublicConfigs();
  return c.json({ success: true, data: publicConfigs });
});

/**
 * PUT /admin/config/:key — Update a config value
 */
adminRouter.put('/config/:key', validateBody(updateConfigSchema), async (c) => {
  const key = c.req.param('key')!;
  const { value } = c.get('validatedBody') as { value: unknown };
  const actor = c.get('user') as { id: string; email: string };

  await configManager.set(key, value as never);

  // Update audit trail
  const db = getDatabase();
  await db
    .update(adminConfigs)
    .set({ updatedBy: actor.email })
    .where(eq(adminConfigs.key, key));
  await recordAdminAudit({
    actor,
    action: 'config.update',
    entityType: 'admin_config',
    entityId: key,
    // Never persist credentials or other secret config values in an audit row.
    metadata: { changed: true },
    ipAddress: c.req.header('x-forwarded-for'),
  });

  return c.json({ success: true, data: { key, value, message: 'Configuration updated' } });
});

/**
 * GET /admin/tax-rates — List all tax rates
 */
adminRouter.get('/tax-rates', async (c) => {
  const db = getDatabase();
  const rates = await db.select().from(taxRates).orderBy(taxRates.priority);
  return c.json({ success: true, data: rates });
});

/**
 * POST /admin/tax-rates — Create a new tax rate
 */
adminRouter.post('/tax-rates', validateBody(taxRateSchema), async (c) => {
  const body = c.get('validatedBody') as z.infer<typeof taxRateSchema>;
  const db = getDatabase();

  const [rate] = await db.insert(taxRates).values(body as any).returning();

  return c.json({ success: true, data: rate }, 201);
});

/**
 * PUT /admin/tax-rates/:id — Update a tax rate
 */
adminRouter.put('/tax-rates/:id', validateBody(taxRateSchema), async (c) => {
  const id = c.req.param('id')!;
  const body = c.get('validatedBody') as z.infer<typeof taxRateSchema>;
  const db = getDatabase();

  const [updated] = await db
    .update(taxRates)
    .set({ ...(body as any), updatedAt: new Date() })
    .where(eq(taxRates.id, id))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { message: 'Tax rate not found' } }, 404);
  }

  return c.json({ success: true, data: updated });
});

/**
 * DELETE /admin/tax-rates/:id — Delete a tax rate
 */
adminRouter.delete('/tax-rates/:id', async (c) => {
  const id = c.req.param('id')!;
  const db = getDatabase();

  await db.delete(taxRates).where(eq(taxRates.id, id));

  return c.json({ success: true, data: { message: 'Tax rate deleted' } });
});

// ── User Management Schemas ─────────────────

const userQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

/**
 * GET /admin/users — List all users with pagination, search, and role filter
 *
 * Admin-only endpoint for user management. Supports:
 * - Pagination (page/limit)
 * - Search by name or email
 * - Filter by role
 */
adminRouter.get('/users', async (c) => {
  const db = getDatabase();

  // Parse query params manually (GET requests don't have JSON body)
  const queryRaw = {
    page: c.req.query('page') ? Number(c.req.query('page')) : 1,
    limit: c.req.query('limit') ? Number(c.req.query('limit')) : 20,
    search: c.req.query('search') || undefined,
    role: c.req.query('role') || undefined,
  };

  // Validate with Zod
  const parsed = userQuerySchema.parse(queryRaw);
  const { page, limit, search, role } = parsed;
  const offset = (page - 1) * limit;
  const conditions: ReturnType<typeof eq>[] = [];

  if (search) {
    conditions.push(sql`(${users.name} ILIKE ${'%' + search + '%'} OR ${users.email} ILIKE ${'%' + search + '%'})` as any);
  }
  if (role) {
    conditions.push(eq(users.role, role) as any);
  }

  // Build where clause
  const whereClause = conditions.length > 0
    ? and(...conditions)
    : undefined;

  const [userList, totalResult] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause as any)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(whereClause as any),
  ]);

  // Fetch subscription info for each user
  const userIds = userList.map((u) => u.id);
  const userSubs = userIds.length > 0
    ? await db
        .select()
        .from(subscriptions)
        .where(sql`${subscriptions.userId} = ANY(${userIds})`)
    : [];

  const subMap = new Map(userSubs.map((s) => [s.userId, s]));

  const enriched = userList.map((user) => {
    const sub = subMap.get(user.id);
    return {
      ...user,
      subscription: sub
        ? {
            id: sub.id,
            planId: sub.planId,
            status: sub.status,
            provider: sub.provider,
            currentPeriodEnd: sub.currentPeriodEnd,
          }
        : null,
    };
  });

  const total = Number(totalResult[0]?.count ?? 0);

  return c.json({
    success: true,
    data: {
      users: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * GET /admin/users/:id — Get single user with full details
 */
adminRouter.get('/users/:id', async (c) => {
  const id = c.req.param('id')!;
  const db = getDatabase();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: { message: 'User not found' } }, 404);
  }

  // Get subscription
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, id))
    .limit(1);

  // Get broker connection count
  const [brokerCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, id));

  // Get trade count
  const [tradeCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tradeExecutions)
    .where(eq(tradeExecutions.userId, id));

  return c.json({
    success: true,
    data: {
      ...user,
      subscription: sub ?? null,
      brokerCount: Number(brokerCount?.count ?? 0),
      tradeCount: Number(tradeCount?.count ?? 0),
    },
  });
});

/**
 * PUT /admin/users/:id/role — Update user role (promote to admin, demote to user)
 */
adminRouter.put('/users/:id/role', validateBody(updateUserRoleSchema), async (c) => {
  const id = c.req.param('id')!;
  const { role } = c.get('validatedBody') as z.infer<typeof updateUserRoleSchema>;
  const db = getDatabase();
  const actor = c.get('user') as { id: string; email: string }; // Current admin

  // Prevent self-demotion
  if (actor.id === id) {
    return c.json({ success: false, error: { message: 'Cannot change your own role' } }, 403);
  }

  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

  if (!updated) {
    return c.json({ success: false, error: { message: 'User not found' } }, 404);
  }

  console.log(`🔐 Admin ${actor.email} changed role of ${updated.email} to ${role}`);
  await recordAdminAudit({
    actor,
    action: 'user.role.update',
    entityType: 'user',
    entityId: id,
    metadata: { role },
    ipAddress: c.req.header('x-forwarded-for'),
  });
  return c.json({ success: true, data: updated });
});

/**
 * DELETE /admin/users/:id — Delete a user and associated data (admin-only)
 */
adminRouter.delete('/users/:id', async (c) => {
  const id = c.req.param('id')!;
  const db = getDatabase();
  const actor = c.get('user') as { id: string; email: string };

  // Prevent self-deletion
  if (actor.id === id) {
    return c.json({ success: false, error: { message: 'Cannot delete your own admin account' } }, 403);
  }

  const [existingUser] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!existingUser) {
    return c.json({ success: false, error: { message: 'User not found' } }, 404);
  }

  // Delete from public.users (cascades to all user related tables)
  await db.delete(users).where(eq(users.id, id));

  // Also attempt to delete from Supabase Auth if provisioned
  try {
    const supabase = getSupabaseAdmin();
    await supabase.auth.admin.deleteUser(id);
  } catch (authErr) {
    console.warn(`[Supabase Auth] Note: Failed to delete user ${id} from auth.users (might not exist in auth):`, authErr);
  }

  console.log(`🗑️ Admin ${actor.email} deleted user ${existingUser.email} (${id})`);
  await recordAdminAudit({
    actor,
    action: 'user.delete',
    entityType: 'user',
    entityId: id,
    metadata: { email: existingUser.email, name: existingUser.name, role: existingUser.role },
    ipAddress: c.req.header('x-forwarded-for'),
  });

  return c.json({
    success: true,
    data: { message: `User ${existingUser.email} deleted successfully` },
  });
});

// ── Admin: Plan Management ─────────────────

const createPlanSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  amount: z.coerce.number().int().min(0).default(0),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).default('INR'),
  interval: z.enum(['month', 'year', 'one-time', 'free']).default('month'),
  features: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  isPopular: z.boolean().default(false),
});

const updatePlanSchema = createPlanSchema.partial();

/**
 * GET /admin/plans — List all subscription plans
 */
adminRouter.get('/plans', async (c) => {
  const db = getDatabase();
  const allPlans = await db
    .select()
    .from(plans)
    .orderBy(plans.sortOrder);
  return c.json({ success: true, data: allPlans });
});

/**
 * POST /admin/plans — Create a new plan
 */
adminRouter.post('/plans', validateBody(createPlanSchema), async (c) => {
  const body = c.get('validatedBody') as z.infer<typeof createPlanSchema>;
  const db = getDatabase();
  const actor = c.get('user') as { id: string; email: string };

  const [plan] = await db.insert(plans).values(body as any).returning();
  if (plan) {
    await recordAdminAudit({
      actor,
      action: 'plan.create',
      entityType: 'plan',
      entityId: plan.id,
      metadata: { slug: plan.slug, amount: plan.amount, currency: plan.currency },
      ipAddress: c.req.header('x-forwarded-for'),
    });
  }
  return c.json({ success: true, data: plan }, 201);
});

/**
 * PUT /admin/plans/:id — Update a plan
 */
adminRouter.put('/plans/:id', validateBody(updatePlanSchema), async (c) => {
  const id = c.req.param('id')!;
  const body = c.get('validatedBody') as z.infer<typeof updatePlanSchema>;
  const db = getDatabase();
  const actor = c.get('user') as { id: string; email: string };

  const [updated] = await db
    .update(plans)
    .set({ ...(body as any), updatedAt: new Date() })
    .where(eq(plans.id, id))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { message: 'Plan not found' } }, 404);
  }
  await recordAdminAudit({
    actor,
    action: 'plan.update',
    entityType: 'plan',
    entityId: id,
    metadata: { changedFields: Object.keys(body) },
    ipAddress: c.req.header('x-forwarded-for'),
  });
  return c.json({ success: true, data: updated });
});

/**
 * DELETE /admin/plans/:id — Delete a plan
 */
adminRouter.delete('/plans/:id', async (c) => {
  const id = c.req.param('id')!;
  const db = getDatabase();
  const actor = c.get('user') as { id: string; email: string };

  const [deactivated] = await db
    .update(plans)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(plans.id, id))
    .returning({ id: plans.id, slug: plans.slug });
  if (!deactivated) {
    return c.json({ success: false, error: { message: 'Plan not found' } }, 404);
  }
  await recordAdminAudit({
    actor,
    action: 'plan.delete',
    entityType: 'plan',
    entityId: id,
    metadata: { slug: deactivated.slug, action: 'deactivated' },
    ipAddress: c.req.header('x-forwarded-for'),
  });
  return c.json({ success: true, data: { message: 'Plan deleted' } });
});

// ── Admin: Journal Trades Viewer ───────────

const adminJournalQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.string().optional(),
  symbol: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /admin/journal — List all journal trades across users
 */
adminRouter.get('/journal', async (c) => {
  const db = getDatabase();
  const parsed = adminJournalQuerySchema.parse({
    page: c.req.query('page') ? Number(c.req.query('page')) : 1,
    limit: c.req.query('limit') ? Number(c.req.query('limit')) : 20,
    status: c.req.query('status') || undefined,
    symbol: c.req.query('symbol') || undefined,
    userId: c.req.query('userId') || undefined,
    startDate: c.req.query('startDate') || undefined,
    endDate: c.req.query('endDate') || undefined,
  });

  const { page, limit, status, symbol, userId, startDate, endDate } = parsed;
  const offset = (page - 1) * limit;
  const conditions: any[] = [];

  if (status) conditions.push(eq(journalTrades.status, status));
  if (symbol) conditions.push(sql`${journalTrades.tradingsymbol} ILIKE ${'%' + symbol + '%'}`);
  if (userId) conditions.push(eq(journalTrades.userId, userId));
  if (startDate) conditions.push(gte(journalTrades.openedAt, new Date(startDate)));
  if (endDate) conditions.push(lte(journalTrades.openedAt, new Date(endDate)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: journalTrades.id,
        userId: journalTrades.userId,
        userEmail: users.email,
        userName: users.name,
        tradingsymbol: journalTrades.tradingsymbol,
        exchange: journalTrades.exchange,
        assetClass: journalTrades.assetClass,
        direction: journalTrades.direction,
        status: journalTrades.status,
        totalQuantity: journalTrades.totalQuantity,
        avgEntryPrice: journalTrades.avgEntryPrice,
        avgExitPrice: journalTrades.avgExitPrice,
        grossPnl: journalTrades.grossPnl,
        netPnl: journalTrades.netPnl,
        rMultiple: journalTrades.rMultiple,
        openedAt: journalTrades.openedAt,
        closedAt: journalTrades.closedAt,
        tradeType: journalTrades.tradeType,
        emotions: journalTrades.emotions,
        mistakeTags: journalTrades.mistakeTags,
        traderNotes: journalTrades.traderNotes,
      })
      .from(journalTrades)
      .leftJoin(users, eq(users.id, journalTrades.userId))
      .where(whereClause as any)
      .orderBy(desc(journalTrades.openedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(journalTrades)
      .where(whereClause as any),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return c.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── Admin: Broker Connections Viewer ───────

/**
 * GET /admin/brokers — List all broker connections across users
 */
adminRouter.get('/brokers', async (c) => {
  const db = getDatabase();
  const page = Math.max(1, Math.min(100000, Number(c.req.query('page') ?? 1)));
  const limit = Math.max(1, Math.min(100, Number(c.req.query('limit') ?? 20)));
  const offset = (page - 1) * limit;

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: brokerConnections.id,
        userId: brokerConnections.userId,
        userEmail: users.email,
        userName: users.name,
        brokerId: brokerConnections.brokerId,
        brokerClientId: brokerConnections.brokerClientId,
        label: brokerConnections.label,
        authType: brokerConnections.authType,
        status: brokerConnections.status,
        isActive: brokerConnections.isActive,
        lastSyncedAt: brokerConnections.lastSyncedAt,
        createdAt: brokerConnections.createdAt,
      })
      .from(brokerConnections)
      .leftJoin(users, eq(users.id, brokerConnections.userId))
      .orderBy(desc(brokerConnections.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(brokerConnections),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return c.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── Admin: Invoices Viewer ─────────────────

/**
 * GET /admin/invoices — List all invoices
 */
adminRouter.get('/invoices', async (c) => {
  const db = getDatabase();
  const page = Math.max(1, Math.min(100000, Number(c.req.query('page') ?? 1)));
  const limit = Math.max(1, Math.min(100, Number(c.req.query('limit') ?? 20)));
  const offset = (page - 1) * limit;

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: invoices.id,
        userId: invoices.userId,
        userEmail: users.email,
        userName: users.name,
        provider: invoices.provider,
        amountPaid: invoices.amountPaid,
        currency: invoices.currency,
        status: invoices.status,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(users, eq(users.id, invoices.userId))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invoices),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return c.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── Admin: Trade Executions Viewer ─────────

/**
 * GET /admin/executions — List all trade executions across users
 */
adminRouter.get('/executions', async (c) => {
  const db = getDatabase();
  const page = Math.max(1, Math.min(100000, Number(c.req.query('page') ?? 1)));
  const limit = Math.max(1, Math.min(100, Number(c.req.query('limit') ?? 50)));
  const offset = (page - 1) * limit;

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: tradeExecutions.id,
        userId: tradeExecutions.userId,
        userEmail: users.email,
        userName: users.name,
        tradingsymbol: tradeExecutions.tradingsymbol,
        exchange: tradeExecutions.exchange,
        segment: tradeExecutions.segment,
        transactionType: tradeExecutions.transactionType,
        orderType: tradeExecutions.orderType,
        quantity: tradeExecutions.quantity,
        executionPrice: tradeExecutions.executionPrice,
        brokerOrderId: tradeExecutions.brokerOrderId,
        brokerExecutionId: tradeExecutions.brokerExecutionId,
        executionTimestamp: tradeExecutions.executionTimestamp,
        brokerConnectionId: tradeExecutions.brokerConnectionId,
      })
      .from(tradeExecutions)
      .leftJoin(users, eq(users.id, tradeExecutions.userId))
      .orderBy(desc(tradeExecutions.executionTimestamp))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tradeExecutions),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return c.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/** ******************
 * GET /admin/stats — Aggregate system statistics
 * ******************/
adminRouter.get('/stats', async (c) => {
  const db = getDatabase();

  const [userCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users);

  const [tradeCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tradeExecutions);

  const [brokerCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(brokerConnections)
    .where(eq(brokerConnections.isActive, true));

  const [planCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(plans)
    .where(eq(plans.isActive, true));

  const [productCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(eq(products.isActive, true));

  const [orderStats] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(amount_paid), 0)`,
    })
    .from(productOrders)
    .where(eq(productOrders.status, 'paid'));

  // Subscription invoice revenue (all-time paid invoices from subscriptions)
  const [subRevenueStats] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(amount_paid), 0)`,
    })
    .from(invoices)
    .where(eq(invoices.status, 'paid'));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [activeUserCount] = await db
    .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
    .from(journalTrades)
    .where(gte(journalTrades.createdAt, thirtyDaysAgo));

  const [strategyCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tradingStrategies);

  const [leaderboardCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(leaderboardOptIns)
    .where(eq(leaderboardOptIns.isPublic, true));

  const [pendingReviewsCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reviews)
    .where(eq(reviews.isApproved, false));

  return c.json({
    success: true,
    data: {
      totalUsers:            String(userCount?.count ?? 0),
      activeUsers:           String(activeUserCount?.count ?? 0),
      activeUsers30d:        String(activeUserCount?.count ?? 0),
      totalTrades:           String(tradeCount?.count ?? 0),
      connectedBrokers:      String(brokerCount?.count ?? 0),
      activePlans:           String(planCount?.count ?? 0),
      activeProducts:        String(productCount?.count ?? 0),
      storeOrders:           String(orderStats?.count ?? 0),
      storeRevenue:          String(orderStats?.revenue ?? 0),
      subscriptionRevenue:   String(subRevenueStats?.revenue ?? 0),
      totalPaidInvoices:     String(subRevenueStats?.count ?? 0),
      pendingReviews:        String(pendingReviewsCount?.count ?? 0),
      totalStrategies:       String(strategyCount?.count ?? 0),
      leaderboardUsers:      String(leaderboardCount?.count ?? 0),
    },
  });
});

// ── Admin Billing / Revenue Summary ──────────

/**
 * GET /admin/billing/summary — Comprehensive billing & revenue intelligence
 *
 * Returns:
 * - Total subscription revenue (all-time)
 * - MRR (Monthly Recurring Revenue — revenue this calendar month)
 * - ARR (Annual Recurring Revenue — MRR × 12)
 * - Revenue by provider (razorpay / stripe)
 * - Active subscription count by status
 * - 12-month monthly revenue trend
 */
adminRouter.get('/billing/summary', async (c) => {
  const db = getDatabase();

  // ── Total all-time subscription revenue ──
  const [totalRevRow] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(amount_paid), 0)`,
      totalInvoices: sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .where(eq(invoices.status, 'paid'));

  // ── MRR — revenue invoiced this calendar month ──
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [mrrRow] = await db
    .select({ mrr: sql<number>`COALESCE(SUM(amount_paid), 0)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.status, 'paid'),
        gte(invoices.paidAt, startOfMonth),
      ),
    );

  const mrrPaise = Number(mrrRow?.mrr ?? 0);
  const arrPaise = mrrPaise * 12;

  // ── Revenue by provider ──
  const byProvider = await db
    .select({
      provider: invoices.provider,
      revenue:  sql<number>`COALESCE(SUM(amount_paid), 0)`,
      count:    sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .where(eq(invoices.status, 'paid'))
    .groupBy(invoices.provider);

  // ── Active subscriptions by status ──
  const byStatus = await db
    .select({
      status: subscriptions.status,
      count:  sql<number>`COUNT(*)`,
    })
    .from(subscriptions)
    .groupBy(subscriptions.status);

  // ── Active subscriptions by plan ──
  const byPlan = await db
    .select({
      planName: plans.name,
      planSlug: plans.slug,
      count:    sql<number>`COUNT(*)`,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.status, 'active'))
    .groupBy(plans.name, plans.slug);

  // ── 12-month monthly revenue trend ──
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyTrend = await db
    .select({
      month:   sql<string>`TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM')`,
      revenue: sql<number>`COALESCE(SUM(amount_paid), 0)`,
      count:   sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.status, 'paid'),
        gte(invoices.paidAt, twelveMonthsAgo),
      ),
    )
    .groupBy(sql`DATE_TRUNC('month', paid_at)`)
    .orderBy(sql`DATE_TRUNC('month', paid_at)`);

  // ── Recent 10 invoices ──
  const recentInvoices = await db
    .select({
      id:         invoices.id,
      userId:     invoices.userId,
      userEmail:  users.email,
      userName:   users.name,
      provider:   invoices.provider,
      amountPaid: invoices.amountPaid,
      currency:   invoices.currency,
      status:     invoices.status,
      paidAt:     invoices.paidAt,
      createdAt:  invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(users, eq(users.id, invoices.userId))
    .where(eq(invoices.status, 'paid'))
    .orderBy(desc(invoices.paidAt))
    .limit(10);

  return c.json({
    success: true,
    data: {
      // Revenue totals (in paise/smallest unit)
      totalRevenuePaise:   Number(totalRevRow?.totalRevenue ?? 0),
      totalPaidInvoices:   Number(totalRevRow?.totalInvoices ?? 0),
      mrrPaise,
      arrPaise,
      // Breakdown by payment provider
      byProvider: byProvider.map((p) => ({
        provider: p.provider,
        revenue:  Number(p.revenue),
        count:    Number(p.count),
      })),
      // Subscription health by status
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count:  Number(s.count),
      })),
      // Plan distribution (active only)
      byPlan: byPlan.map((p) => ({
        planName: p.planName ?? 'Unknown',
        planSlug: p.planSlug ?? 'unknown',
        count:    Number(p.count),
      })),
      // 12-month monthly trend
      monthlyTrend: monthlyTrend.map((m) => ({
        month:   m.month,
        revenue: Number(m.revenue),
        count:   Number(m.count),
      })),
      // Most recent invoices
      recentInvoices,
    },
  });
});

// ── Admin Subscription Management ─────────

const updateSubSchema = z.object({
  planId: z.string().uuid().optional(),
  status: z.enum(['active', 'canceled', 'past_due', 'expired']).optional(),
});

/**
 * GET /admin/subscriptions — List all subscriptions with user info (paginated)
 */
adminRouter.get('/subscriptions', async (c) => {
  const db = getDatabase();
  const page   = Math.max(1, Math.min(100000, Number(c.req.query('page')  ?? 1)));
  const limit  = Math.max(1, Math.min(100,    Number(c.req.query('limit') ?? 50)));
  const offset = (page - 1) * limit;
  const status = c.req.query('status') || undefined;
  const search = c.req.query('search') || undefined;

  const conditions: any[] = [];
  if (status) conditions.push(eq(subscriptions.status, status));
  if (search) {
    conditions.push(sql`(${users.email} ILIKE ${'%' + search + '%'} OR ${users.name} ILIKE ${'%' + search + '%'})`);
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [subs, totalResult] = await Promise.all([
    db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        userEmail: users.email,
        userName: users.name,
        planId: subscriptions.planId,
        planName: plans.name,
        status: subscriptions.status,
        provider: subscriptions.provider,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .leftJoin(users, eq(users.id, subscriptions.userId))
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(whereClause as any)
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .leftJoin(users, eq(users.id, subscriptions.userId))
      .where(whereClause as any),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  return c.json({
    success: true,
    data: subs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * PUT /admin/subscriptions/:id — Update a subscription
 */
adminRouter.put('/subscriptions/:id', validateBody(updateSubSchema), async (c) => {
  const id = c.req.param('id')!;
  const body = c.get('validatedBody') as z.infer<typeof updateSubSchema>;
  const db = getDatabase();
  const actor = c.get('user') as { id: string; email: string };

  const [updated] = await db
    .update(subscriptions)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(subscriptions.id, id))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { message: 'Subscription not found' } }, 404);
  }

  console.log(`💳 Admin ${actor.email} updated subscription ${id}`);
  await recordAdminAudit({
    actor,
    action: 'subscription.update',
    entityType: 'subscription',
    entityId: id,
    metadata: body,
    ipAddress: c.req.header('x-forwarded-for'),
  });
  return c.json({ success: true, data: updated });
});

/**
 * GET /admin/audit-logs — Immutable administrative action history with filtering
 */
adminRouter.get('/audit-logs', async (c) => {
  const db = getDatabase();
  const page = Math.max(1, Math.min(100000, Number(c.req.query('page') ?? 1)));
  const limit = Math.max(1, Math.min(100, Number(c.req.query('limit') ?? 50)));
  const action = c.req.query('action');
  const actorId = c.req.query('actorId');
  const entityType = c.req.query('entityType');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const conditions = [];
  if (action) conditions.push(eq(adminAuditLogs.action, action));
  if (actorId) conditions.push(eq(adminAuditLogs.actorId, actorId));
  if (entityType) conditions.push(eq(adminAuditLogs.entityType, entityType));
  if (startDate) conditions.push(gte(adminAuditLogs.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(adminAuditLogs.createdAt, new Date(endDate)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [logs, totalResult] = await Promise.all([
    db
      .select()
      .from(adminAuditLogs)
      .where(whereClause)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(adminAuditLogs)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  return c.json({
    success: true,
    data: { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
});

/**
 * GET /admin/audit-logs/export/csv — Export filtered audit logs as CSV
 */
adminRouter.get('/audit-logs/export/csv', async (c) => {
  const db = getDatabase();
  const action = c.req.query('action');
  const actorId = c.req.query('actorId');
  const entityType = c.req.query('entityType');

  const conditions = [];
  if (action) conditions.push(eq(adminAuditLogs.action, action));
  if (actorId) conditions.push(eq(adminAuditLogs.actorId, actorId));
  if (entityType) conditions.push(eq(adminAuditLogs.entityType, entityType));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db
    .select()
    .from(adminAuditLogs)
    .where(whereClause)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(2000);

  const header = ['ID', 'Created At', 'Actor ID', 'Actor Email', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Metadata'].join(',');
  const rows = logs.map((l) => [
    `"${l.id}"`,
    `"${l.createdAt ? new Date(l.createdAt).toISOString() : ''}"`,
    `"${l.actorId ?? ''}"`,
    `"${l.actorEmail ?? ''}"`,
    `"${l.action ?? ''}"`,
    `"${l.entityType ?? ''}"`,
    `"${l.entityId ?? ''}"`,
    `"${l.ipAddress ?? ''}"`,
    `"${JSON.stringify(l.metadata ?? {}).replace(/"/g, '""')}"`,
  ].join(','));

  const csv = [header, ...rows].join('\n');

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="admin-audit-logs-${Date.now()}.csv"`);
  return c.text(csv);
});

/**
 * GET /admin/ai-analytics — AI Token Usage, Cost, and Cache Efficiency
 */
adminRouter.get('/ai-analytics', async (c) => {
  const db = getDatabase();

  try {
    const [totalCacheRecords, tokensResult, providerCounts] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(aiCache),
      db.select({ totalTokens: sql<number>`COALESCE(SUM(${aiCache.tokensUsed}), 0)` }).from(aiCache),
      db.select({
        provider: aiCache.provider,
        count: sql<number>`COUNT(*)`,
        tokens: sql<number>`COALESCE(SUM(${aiCache.tokensUsed}), 0)`
      }).from(aiCache).groupBy(aiCache.provider),
    ]);

    const totalEntries = Number(totalCacheRecords[0]?.count ?? 0);
    const totalTokens = Number(tokensResult[0]?.totalTokens ?? 0);
    const estimatedSavingsUsd = (totalTokens / 1_000_000) * 0.15;

    return c.json({
      success: true,
      data: {
        totalRequestsCached: totalEntries,
        totalTokensConsumed: totalTokens,
        estimatedCostUsd: 0.00,
        estimatedSavingsUsd: Number(estimatedSavingsUsd.toFixed(4)),
        activeProviders: providerCounts.map(p => ({
          provider: p.provider,
          cachedEntries: Number(p.count),
          tokensUsed: Number(p.tokens),
        })),
        geminiFreeTierLimit: '1,000,000 tokens/day (Free Tier)',
        groqFreeTierLimit: '14,400 req/day (Free Tier)',
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err?.message ?? 'Failed to fetch AI analytics' } }, 500);
  }
});

// ── Admin Sync Log Viewer ─────────────────

/**
 * GET /admin/sync-logs — View sync history across all users
 */
adminRouter.get('/sync-logs', async (c) => {
  const db = getDatabase();
  const page = Math.max(1, Math.min(100000, Number(c.req.query('page') ?? 1)));
  const limit = Math.max(1, Math.min(100, Number(c.req.query('limit') ?? 20)));
  const offset = (page - 1) * limit;

  const [logs, totalResult] = await Promise.all([
    db
      .select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.startedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(syncLogs),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return c.json({
    success: true,
    data: {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// ── Admin Digital Products Store Management ───

const productCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  longDescription: z.string().optional().nullable(),
  productType: z.enum(['PDF', 'VIDEO', 'COURSE', 'BUNDLE', 'TEMPLATE']).default('PDF'),
  price: z.number().int().min(0).default(0),
  currency: z.string().length(3).default('INR'),
  downloadUrl: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  previewImageUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
  isFree: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const productUpdateSchema = productCreateSchema.partial();

/**
 * GET /admin/products — List all store products with stats
 */
adminRouter.get('/products', async (c) => {
  const db = getDatabase();
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const limit = Math.max(1, Math.min(100, Number(c.req.query('limit') ?? 50)));
  const offset = (page - 1) * limit;
  const search = c.req.query('search')?.trim();
  const type = c.req.query('type');
  const status = c.req.query('status'); // 'active' | 'inactive' | 'all'

  const conditions: any[] = [];
  if (search) {
    conditions.push(ilike(products.title, `%${search}%`));
  }
  if (type) {
    conditions.push(eq(products.productType, type));
  }
  if (status === 'active') {
    conditions.push(eq(products.isActive, true));
  } else if (status === 'inactive') {
    conditions.push(eq(products.isActive, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(products.sortOrder, desc(products.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return c.json({
    success: true,
    data: {
      products: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

/**
 * POST /admin/products — Create new store product
 */
adminRouter.post('/products', validateBody(productCreateSchema), async (c) => {
  const actor = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  const [newProduct] = await db
    .insert(products)
    .values({
      title: body.title,
      description: body.description,
      longDescription: body.longDescription ?? null,
      productType: body.productType,
      price: body.isFree ? 0 : body.price,
      currency: body.currency,
      downloadUrl: body.downloadUrl ?? null,
      videoUrl: body.videoUrl ?? null,
      previewImageUrl: body.previewImageUrl ?? null,
      tags: body.tags,
      metadata: body.metadata,
      isActive: body.isActive,
      isFree: body.isFree,
      sortOrder: body.sortOrder,
    })
    .returning();

  if (!newProduct) {
    return c.json({ success: false, error: { message: 'Failed to create product' } }, 500);
  }

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_PRODUCT_CREATED',
    entityType: 'product',
    entityId: newProduct.id,
    metadata: { title: newProduct.title, productType: newProduct.productType, price: newProduct.price },
  });

  return c.json({ success: true, data: newProduct }, 201);
});

/**
 * GET /admin/products/:id — Get product details + purchasers
 */
adminRouter.get('/products/:id', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  if (!id) return c.json({ success: false, error: { message: 'ID required' } }, 400);

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) {
    return c.json({ success: false, error: { message: 'Product not found' } }, 404);
  }

  const accessList = await db
    .select({
      id: productAccess.id,
      userId: productAccess.userId,
      userEmail: users.email,
      userName: users.name,
      grantReason: productAccess.grantReason,
      downloadCount: productAccess.downloadCount,
      lastAccessedAt: productAccess.lastAccessedAt,
      accessGrantedAt: productAccess.accessGrantedAt,
    })
    .from(productAccess)
    .innerJoin(users, eq(productAccess.userId, users.id))
    .where(eq(productAccess.productId, id))
    .orderBy(desc(productAccess.accessGrantedAt))
    .limit(100);

  return c.json({
    success: true,
    data: { product, accessList },
  });
});

/**
 * PUT /admin/products/:id — Update existing product
 */
adminRouter.put('/products/:id', validateBody(productUpdateSchema), async (c) => {
  const actor = c.get('user');
  const id = c.req.param('id');
  if (!id) return c.json({ success: false, error: { message: 'ID required' } }, 400);
  const body = c.get('validatedBody');
  const db = getDatabase();

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) {
    return c.json({ success: false, error: { message: 'Product not found' } }, 404);
  }

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.longDescription !== undefined) updateData.longDescription = body.longDescription;
  if (body.productType !== undefined) updateData.productType = body.productType;
  if (body.price !== undefined) updateData.price = body.price;
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.downloadUrl !== undefined) updateData.downloadUrl = body.downloadUrl;
  if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
  if (body.previewImageUrl !== undefined) updateData.previewImageUrl = body.previewImageUrl;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.metadata !== undefined) updateData.metadata = body.metadata;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.isFree !== undefined) {
    updateData.isFree = body.isFree;
    if (body.isFree) updateData.price = 0;
  }
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

  const [updated] = await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .returning();

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_PRODUCT_UPDATED',
    entityType: 'product',
    entityId: id,
    metadata: { changedFields: Object.keys(body) },
  });

  return c.json({ success: true, data: updated });
});

/**
 * DELETE /admin/products/:id — Delete product
 */
adminRouter.delete('/products/:id', async (c) => {
  const actor = c.get('user');
  const id = c.req.param('id');
  if (!id) return c.json({ success: false, error: { message: 'ID required' } }, 400);
  const db = getDatabase();

  const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
  if (!deleted) {
    return c.json({ success: false, error: { message: 'Product not found' } }, 404);
  }

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_PRODUCT_DELETED',
    entityType: 'product',
    entityId: id,
    metadata: { title: deleted.title },
  });

  return c.json({ success: true, message: 'Product deleted successfully' });
});

/**
 * GET /admin/store/orders — List all digital product purchase orders
 */
adminRouter.get('/store/orders', async (c) => {
  const db = getDatabase();
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const limit = Math.max(1, Math.min(100, Number(c.req.query('limit') ?? 50)));
  const offset = (page - 1) * limit;
  const status = c.req.query('status'); // 'paid' | 'pending' | 'failed'

  const conditions: any[] = [];
  if (status) conditions.push(eq(productOrders.status, status));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [ordersList, totalResult] = await Promise.all([
    db
      .select({
        id: productOrders.id,
        amountPaid: productOrders.amountPaid,
        currency: productOrders.currency,
        provider: productOrders.provider,
        providerOrderId: productOrders.providerOrderId,
        providerPaymentId: productOrders.providerPaymentId,
        status: productOrders.status,
        paidAt: productOrders.paidAt,
        createdAt: productOrders.createdAt,
        userId: productOrders.userId,
        userName: users.name,
        userEmail: users.email,
        productId: productOrders.productId,
        productTitle: products.title,
        productType: products.productType,
      })
      .from(productOrders)
      .innerJoin(users, eq(productOrders.userId, users.id))
      .innerJoin(products, eq(productOrders.productId, products.id))
      .where(whereClause)
      .orderBy(desc(productOrders.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(productOrders)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return c.json({
    success: true,
    data: {
      orders: ordersList,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

/**
 * GET /admin/store/analytics — Summary metrics for products & store revenue
 */
adminRouter.get('/store/analytics', async (c) => {
  const db = getDatabase();

  const [totalRevenueRow] = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(amount_paid), 0)`,
      paidOrders: sql<number>`COUNT(*)`,
    })
    .from(productOrders)
    .where(eq(productOrders.status, 'paid'));

  const [productsCountRow] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      active: sql<number>`COUNT(*) FILTER (WHERE is_active = true)`,
    })
    .from(products);

  const [pendingReviewsRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reviews)
    .where(eq(reviews.isApproved, false));

  const topProducts = await db
    .select({
      id: products.id,
      title: products.title,
      productType: products.productType,
      price: products.price,
      currency: products.currency,
      totalSales: products.totalSales,
    })
    .from(products)
    .orderBy(desc(products.totalSales))
    .limit(5);

  return c.json({
    success: true,
    data: {
      totalRevenuePaise: Number(totalRevenueRow?.revenue ?? 0),
      totalPaidOrders: Number(totalRevenueRow?.paidOrders ?? 0),
      totalProducts: Number(productsCountRow?.total ?? 0),
      activeProducts: Number(productsCountRow?.active ?? 0),
      pendingReviewsCount: Number(pendingReviewsRow?.count ?? 0),
      topProducts,
    },
  });
});

/**
 * POST /admin/products/:id/grant — Manually grant product access to a user
 */
adminRouter.post('/products/:id/grant', async (c) => {
  const actor = c.get('user');
  const productId = c.req.param('id');
  if (!productId) return c.json({ success: false, error: { message: 'Product ID required' } }, 400);

  const body = await c.req.json().catch(() => ({}));
  const targetUserId = body.userId;
  if (!targetUserId) return c.json({ success: false, error: { message: 'Target userId required' } }, 400);

  const db = getDatabase();

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return c.json({ success: false, error: { message: 'Product not found' } }, 404);

  const [granted] = await db
    .insert(productAccess)
    .values({
      userId: targetUserId,
      productId,
      grantReason: 'admin_granted',
      accessGrantedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_PRODUCT_ACCESS_GRANTED',
    entityType: 'product_access',
    entityId: granted?.id ?? productId,
    metadata: { productId, targetUserId, productTitle: product.title },
  });

  return c.json({ success: true, message: 'Access granted successfully', data: granted });
});

/**
 * DELETE /admin/products/:id/revoke/:userId — Revoke product access
 */
adminRouter.delete('/products/:id/revoke/:userId', async (c) => {
  const actor = c.get('user');
  const productId = c.req.param('id');
  const targetUserId = c.req.param('userId');
  if (!productId || !targetUserId) {
    return c.json({ success: false, error: { message: 'Product ID and User ID required' } }, 400);
  }

  const db = getDatabase();
  await db
    .delete(productAccess)
    .where(and(eq(productAccess.productId, productId), eq(productAccess.userId, targetUserId)));

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_PRODUCT_ACCESS_REVOKED',
    entityType: 'product_access',
    entityId: `${productId}:${targetUserId}`,
    metadata: { productId, targetUserId },
  });

  return c.json({ success: true, message: 'Access revoked successfully' });
});

// ── Admin Reviews / Testimonials Moderation ───

/**
 * GET /admin/reviews — List testimonials with moderation status
 */
adminRouter.get('/reviews', async (c) => {
  const db = getDatabase();
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const limit = Math.max(1, Math.min(100, Number(c.req.query('limit') ?? 50)));
  const offset = (page - 1) * limit;
  const status = c.req.query('status'); // 'pending' | 'approved' | 'featured' | 'all'

  const conditions: any[] = [];
  if (status === 'pending') conditions.push(eq(reviews.isApproved, false));
  else if (status === 'approved') conditions.push(eq(reviews.isApproved, true));
  else if (status === 'featured') conditions.push(eq(reviews.isFeatured, true));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [reviewsList, totalResult] = await Promise.all([
    db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        rating: reviews.rating,
        headline: reviews.headline,
        body: reviews.body,
        traderType: reviews.traderType,
        displayName: reviews.displayName,
        isApproved: reviews.isApproved,
        isFeatured: reviews.isFeatured,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(whereClause)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reviews)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return c.json({
    success: true,
    data: {
      reviews: reviewsList,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

/**
 * PATCH /admin/reviews/:id/approve — Approve review
 */
adminRouter.patch('/reviews/:id/approve', async (c) => {
  const actor = c.get('user');
  const id = c.req.param('id');
  if (!id) return c.json({ success: false, error: { message: 'ID required' } }, 400);

  const db = getDatabase();
  const [updated] = await db
    .update(reviews)
    .set({ isApproved: true, updatedAt: new Date() })
    .where(eq(reviews.id, id))
    .returning();

  if (!updated) return c.json({ success: false, error: { message: 'Review not found' } }, 404);

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_REVIEW_APPROVED',
    entityType: 'review',
    entityId: id,
    metadata: { headline: updated.headline, rating: updated.rating },
  });

  return c.json({ success: true, data: updated, message: 'Review approved' });
});

/**
 * PATCH /admin/reviews/:id/reject — Reject (un-approve) review
 */
adminRouter.patch('/reviews/:id/reject', async (c) => {
  const actor = c.get('user');
  const id = c.req.param('id');
  if (!id) return c.json({ success: false, error: { message: 'ID required' } }, 400);

  const db = getDatabase();
  const [updated] = await db
    .update(reviews)
    .set({ isApproved: false, isFeatured: false, updatedAt: new Date() })
    .where(eq(reviews.id, id))
    .returning();

  if (!updated) return c.json({ success: false, error: { message: 'Review not found' } }, 404);

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_REVIEW_REJECTED',
    entityType: 'review',
    entityId: id,
    metadata: { headline: updated.headline },
  });

  return c.json({ success: true, data: updated, message: 'Review rejected' });
});

/**
 * PATCH /admin/reviews/:id/feature — Toggle review featured status
 */
adminRouter.patch('/reviews/:id/feature', async (c) => {
  const actor = c.get('user');
  const id = c.req.param('id');
  if (!id) return c.json({ success: false, error: { message: 'ID required' } }, 400);

  const body = await c.req.json().catch(() => ({}));
  const isFeatured = typeof body.isFeatured === 'boolean' ? body.isFeatured : true;

  const db = getDatabase();
  const [updated] = await db
    .update(reviews)
    .set({ isFeatured, isApproved: true, updatedAt: new Date() })
    .where(eq(reviews.id, id))
    .returning();

  if (!updated) return c.json({ success: false, error: { message: 'Review not found' } }, 404);

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_REVIEW_FEATURE_TOGGLED',
    entityType: 'review',
    entityId: id,
    metadata: { isFeatured },
  });

  return c.json({ success: true, data: updated });
});

/**
 * DELETE /admin/reviews/:id — Delete review
 */
adminRouter.delete('/reviews/:id', async (c) => {
  const actor = c.get('user');
  const id = c.req.param('id');
  if (!id) return c.json({ success: false, error: { message: 'ID required' } }, 400);

  const db = getDatabase();
  const [deleted] = await db.delete(reviews).where(eq(reviews.id, id)).returning();
  if (!deleted) return c.json({ success: false, error: { message: 'Review not found' } }, 404);

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_REVIEW_DELETED',
    entityType: 'review',
    entityId: id,
    metadata: { headline: deleted.headline },
  });

  return c.json({ success: true, message: 'Review deleted successfully' });
});

// ── Admin Leaderboard Moderation ─────────

const adminLeaderboardActionSchema = z.object({
  isPublic: z.boolean().optional(),
  action: z.enum(['disqualify', 'reinstate', 'delete_snapshot']).optional(),
});

/**
 * GET /admin/leaderboard — List all leaderboard opt-in users with their snapshots and metrics
 */
adminRouter.get('/leaderboard', async (c) => {
  const db = getDatabase();
  const period = c.req.query('period') || 'ALL_TIME';
  const search = c.req.query('search')?.toLowerCase().trim();

  // Query opt-ins with user data
  const optIns = await db
    .select({
      userId: leaderboardOptIns.userId,
      isPublic: leaderboardOptIns.isPublic,
      displayName: leaderboardOptIns.displayName,
      bio: leaderboardOptIns.bio,
      twitterUrl: leaderboardOptIns.twitterUrl,
      updatedAt: leaderboardOptIns.updatedAt,
      userEmail: users.email,
      userName: users.name,
    })
    .from(leaderboardOptIns)
    .innerJoin(users, eq(leaderboardOptIns.userId, users.id))
    .orderBy(desc(leaderboardOptIns.updatedAt));

  // Query snapshots for the chosen period
  const snapshots = await db
    .select()
    .from(leaderboardSnapshots)
    .where(eq(leaderboardSnapshots.period, period));

  const snapshotMap = new Map(snapshots.map((s) => [s.userId, s]));

  let entries = optIns.map((opt) => {
    const snap = snapshotMap.get(opt.userId);
    return {
      userId: opt.userId,
      isPublic: opt.isPublic,
      displayName: opt.displayName,
      bio: opt.bio,
      twitterUrl: opt.twitterUrl,
      userEmail: opt.userEmail,
      userName: opt.userName,
      updatedAt: opt.updatedAt,
      rank: snap?.rank ?? null,
      totalPnl: snap?.totalPnl ?? 0,
      pnlPercent: snap?.pnlPercent ?? 0,
      winRate: snap?.winRate ?? 0,
      totalTrades: snap?.totalTrades ?? 0,
      disciplineScore: snap?.disciplineScore ?? 0,
      compositeScore: snap?.compositeScore ?? 0,
      computedAt: snap?.computedAt ?? null,
    };
  });

  if (search) {
    entries = entries.filter(
      (e) =>
        e.displayName.toLowerCase().includes(search) ||
        e.userEmail.toLowerCase().includes(search) ||
        e.userName.toLowerCase().includes(search),
    );
  }

  // Summary statistics
  const totalOptedIn = optIns.length;
  const publicCount = optIns.filter((o) => o.isPublic).length;
  const avgWinRate =
    snapshots.length > 0
      ? Number((snapshots.reduce((acc, s) => acc + s.winRate, 0) / snapshots.length).toFixed(1))
      : 0;
  const avgCompositeScore =
    snapshots.length > 0
      ? Number((snapshots.reduce((acc, s) => acc + s.compositeScore, 0) / snapshots.length).toFixed(1))
      : 0;

  return c.json({
    success: true,
    data: {
      entries,
      stats: {
        totalOptedIn,
        publicCount,
        disqualifiedCount: totalOptedIn - publicCount,
        avgWinRate,
        avgCompositeScore,
      },
    },
  });
});

/**
 * PATCH /admin/leaderboard/:userId — Moderate a user's leaderboard status
 */
adminRouter.patch('/leaderboard/:userId', validateBody(adminLeaderboardActionSchema), async (c) => {
  const actor = c.get('user');
  const targetUserId = c.req.param('userId');
  if (!targetUserId) {
    return c.json({ success: false, error: { message: 'User ID is required' } }, 400);
  }
  const body = c.get('validatedBody');
  const db = getDatabase();

  const isPublic = body.action === 'disqualify' ? false : body.action === 'reinstate' ? true : body.isPublic ?? false;

  const [updated] = await db
    .update(leaderboardOptIns)
    .set({
      isPublic,
      updatedAt: new Date(),
    })
    .where(eq(leaderboardOptIns.userId, targetUserId))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { message: 'Leaderboard opt-in not found for this user' } }, 404);
  }

  // If disqualified or delete_snapshot requested, delete snapshots
  if (!isPublic || body.action === 'delete_snapshot') {
    await db.delete(leaderboardSnapshots).where(eq(leaderboardSnapshots.userId, targetUserId));
  }

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: isPublic ? 'ADMIN_LEADERBOARD_REINSTATED' : 'ADMIN_LEADERBOARD_DISQUALIFIED',
    entityType: 'leaderboard_opt_in',
    entityId: targetUserId,
    metadata: { isPublic, action: body.action },
  });

  return c.json({
    success: true,
    data: updated,
    message: isPublic ? 'User reinstated to leaderboard' : 'User disqualified and hidden from leaderboard',
  });
});

/**
 * GET /admin/strategies — List all user strategies for administrative compliance and oversight
 */
adminRouter.get('/strategies', async (c) => {
  const db = getDatabase();
  const search = c.req.query('search')?.toLowerCase().trim();
  const marketType = c.req.query('marketType');

  const strats = await db
    .select({
      id: tradingStrategies.id,
      userId: tradingStrategies.userId,
      name: tradingStrategies.name,
      description: tradingStrategies.description,
      marketType: tradingStrategies.marketType,
      timeframe: tradingStrategies.timeframe,
      entryCriteria: tradingStrategies.entryCriteria,
      exitCriteria: tradingStrategies.exitCriteria,
      tags: tradingStrategies.tags,
      winCount: tradingStrategies.winCount,
      lossCount: tradingStrategies.lossCount,
      totalTrades: tradingStrategies.totalTrades,
      totalPnl: tradingStrategies.totalPnl,
      avgRMultiple: tradingStrategies.avgRMultiple,
      isActive: tradingStrategies.isActive,
      createdAt: tradingStrategies.createdAt,
      updatedAt: tradingStrategies.updatedAt,
      userEmail: users.email,
      userName: users.name,
    })
    .from(tradingStrategies)
    .innerJoin(users, eq(tradingStrategies.userId, users.id))
    .orderBy(desc(tradingStrategies.createdAt));

  let filtered = strats;
  if (marketType) {
    filtered = filtered.filter((s) => s.marketType === marketType);
  }
  if (search) {
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        (s.description && s.description.toLowerCase().includes(search)) ||
        s.userEmail.toLowerCase().includes(search) ||
        s.userName.toLowerCase().includes(search),
    );
  }

  return c.json({
    success: true,
    data: {
      strategies: filtered,
      total: filtered.length,
    },
  });
});

// ──────────────────────────────────────────────
// PARTNERS & AFFILIATE MANAGEMENT
// ──────────────────────────────────────────────

const partnerAdminSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1).optional(),
  logoUrl: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  affiliateUrl: z.string().min(1, 'Affiliate URL is required'),
  description: z.string().optional().nullable(),
  category: z.string().default('discount'),
  country: z.string().default('IN'),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  commissionNote: z.string().optional().nullable(),
  tag: z.string().optional().nullable(),
  features: z.array(z.string()).default([]),
  rating: z.string().default('4.8'),
  accountOpeningFee: z.string().default('Free'),
  maintenanceCharges: z.string().default('₹0 for 1st Year'),
});

const partnerReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int(),
    }),
  ),
});

/**
 * GET /admin/partners — List all partners with administrative details
 */
adminRouter.get('/partners', async (c) => {
  const db = getDatabase();
  const search = c.req.query('search')?.toLowerCase().trim();
  const category = c.req.query('category')?.trim();
  const status = c.req.query('status')?.trim(); // 'all', 'active', 'inactive'

  const allPartners = await db
    .select()
    .from(partners)
    .orderBy(asc(partners.displayOrder), desc(partners.createdAt));

  let filtered = allPartners;
  if (category && category !== 'all') {
    filtered = filtered.filter((p) => p.category === category);
  }
  if (status === 'active') {
    filtered = filtered.filter((p) => p.isActive === true);
  } else if (status === 'inactive') {
    filtered = filtered.filter((p) => p.isActive === false);
  }
  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.slug.toLowerCase().includes(search) ||
        (p.description && p.description.toLowerCase().includes(search)) ||
        (p.tag && p.tag.toLowerCase().includes(search)),
    );
  }

  return c.json({
    success: true,
    data: {
      partners: filtered,
      total: filtered.length,
    },
  });
});

/**
 * GET /admin/partners/:id — Get partner details
 */
adminRouter.get('/partners/:id', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id')!;

  const [row] = await db
    .select()
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1);

  if (!row) {
    return c.json({ success: false, error: { message: 'Partner not found' } }, 404);
  }

  return c.json({ success: true, data: row });
});

/**
 * POST /admin/partners — Create new partner
 */
adminRouter.post('/partners', validateBody(partnerAdminSchema), async (c) => {
  const db = getDatabase();
  const body = c.get('validatedBody') as z.infer<typeof partnerAdminSchema>;
  const actor = c.get('user') as { id: string; email: string };

  const slug =
    body.slug?.trim() ||
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const [created] = await db
    .insert(partners)
    .values({
      name: body.name,
      slug,
      logoUrl: body.logoUrl ?? null,
      websiteUrl: body.websiteUrl ?? null,
      affiliateUrl: body.affiliateUrl,
      description: body.description ?? null,
      category: body.category,
      country: body.country,
      isFeatured: body.isFeatured,
      isActive: body.isActive,
      displayOrder: body.displayOrder,
      commissionNote: body.commissionNote ?? null,
      tag: body.tag ?? null,
      features: body.features,
      rating: body.rating,
      accountOpeningFee: body.accountOpeningFee,
      maintenanceCharges: body.maintenanceCharges,
    })
    .returning();

  if (!created) {
    return c.json({ success: false, error: { message: 'Failed to create partner' } }, 500);
  }

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_PARTNER_CREATED',
    entityType: 'partner',
    entityId: created.id,
    metadata: { name: created.name, slug: created.slug, affiliateUrl: created.affiliateUrl },
  });

  return c.json({ success: true, data: created }, 201);
});

/**
 * PUT /admin/partners/:id — Update partner
 */
adminRouter.put('/partners/:id', validateBody(partnerAdminSchema), async (c) => {
  const db = getDatabase();
  const id = c.req.param('id')!;
  const body = c.get('validatedBody') as z.infer<typeof partnerAdminSchema>;
  const actor = c.get('user') as { id: string; email: string };

  const [existing] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
  if (!existing) {
    return c.json({ success: false, error: { message: 'Partner not found' } }, 404);
  }

  const slug =
    body.slug?.trim() ||
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const [updated] = await db
    .update(partners)
    .set({
      name: body.name,
      slug,
      logoUrl: body.logoUrl ?? null,
      websiteUrl: body.websiteUrl ?? null,
      affiliateUrl: body.affiliateUrl,
      description: body.description ?? null,
      category: body.category,
      country: body.country,
      isFeatured: body.isFeatured,
      isActive: body.isActive,
      displayOrder: body.displayOrder,
      commissionNote: body.commissionNote ?? null,
      tag: body.tag ?? null,
      features: body.features,
      rating: body.rating,
      accountOpeningFee: body.accountOpeningFee,
      maintenanceCharges: body.maintenanceCharges,
      updatedAt: new Date(),
    })
    .where(eq(partners.id, id))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { message: 'Failed to update partner' } }, 500);
  }

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_PARTNER_UPDATED',
    entityType: 'partner',
    entityId: id,
    metadata: { previous: existing, updated },
  });

  return c.json({ success: true, data: updated });
});

/**
 * DELETE /admin/partners/:id — Delete partner
 */
adminRouter.delete('/partners/:id', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id')!;
  const actor = c.get('user') as { id: string; email: string };

  const [existing] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
  if (!existing) {
    return c.json({ success: false, error: { message: 'Partner not found' } }, 404);
  }

  await db.delete(partners).where(eq(partners.id, id));

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_PARTNER_DELETED',
    entityType: 'partner',
    entityId: id,
    metadata: { name: existing.name, slug: existing.slug },
  });

  return c.json({ success: true, message: 'Partner deleted successfully' });
});

/**
 * PATCH /admin/partners/:id/toggle — Quick toggle active state
 */
adminRouter.patch('/partners/:id/toggle', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id')!;
  const actor = c.get('user') as { id: string; email: string };

  const [existing] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
  if (!existing) {
    return c.json({ success: false, error: { message: 'Partner not found' } }, 404);
  }

  const [updated] = await db
    .update(partners)
    .set({
      isActive: !existing.isActive,
      updatedAt: new Date(),
    })
    .where(eq(partners.id, id))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { message: 'Failed to update partner' } }, 500);
  }

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_PARTNER_STATUS_TOGGLED',
    entityType: 'partner',
    entityId: id,
    metadata: { name: existing.name, newActiveState: updated.isActive },
  });

  return c.json({ success: true, data: updated });
});

/**
 * PATCH /admin/partners/reorder — Reorder multiple partners
 */
adminRouter.patch('/partners/reorder', validateBody(partnerReorderSchema), async (c) => {
  const db = getDatabase();
  const { items } = c.get('validatedBody') as z.infer<typeof partnerReorderSchema>;
  const actor = c.get('user') as { id: string; email: string };

  for (const item of items) {
    await db
      .update(partners)
      .set({ displayOrder: item.displayOrder, updatedAt: new Date() })
      .where(eq(partners.id, item.id));
  }

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_PARTNERS_REORDERED',
    entityType: 'partner',
    entityId: 'multiple',
    metadata: { count: items.length },
  });

  return c.json({ success: true, message: 'Partners reordered successfully' });
});

// ══════════════════════════════════════════════
// Phase 3 — Admin Super-Controls & Real-Time
// ══════════════════════════════════════════════

/**
 * GET /admin/revenue — High-level Revenue KPI Dashboard
 */
adminRouter.get('/revenue', async (c) => {
  const db = getDatabase();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    subRevenueAllTime,
    subRevenueThisMonth,
    storeRevenueAllTime,
    activeSubCount,
    cancelledSubCount,
    totalCustomerCount,
  ] = await Promise.all([
    db.select({ total: sql<number>`COALESCE(SUM(amount_paid), 0)` }).from(invoices).where(eq(invoices.status, 'PAID')),
    db.select({ total: sql<number>`COALESCE(SUM(amount_paid), 0)` }).from(invoices).where(and(eq(invoices.status, 'PAID'), gte(invoices.createdAt, startOfMonth))),
    db.select({ total: sql<number>`COALESCE(SUM(amount_paid), 0)` }).from(productOrders).where(eq(productOrders.status, 'PAID')),
    db.select({ count: sql<number>`COUNT(*)` }).from(subscriptions).where(eq(subscriptions.status, 'ACTIVE')),
    db.select({ count: sql<number>`COUNT(*)` }).from(subscriptions).where(eq(subscriptions.status, 'CANCELLED')),
    db.select({ count: sql<number>`COUNT(*)` }).from(users),
  ]);

  const mrrPaise = Number(subRevenueThisMonth[0]?.total ?? 0);
  const arrPaise = mrrPaise * 12;
  const totalSubRevPaise = Number(subRevenueAllTime[0]?.total ?? 0);
  const totalStoreRevPaise = Number(storeRevenueAllTime[0]?.total ?? 0);
  const activeSubs = Number(activeSubCount[0]?.count ?? 0);
  const cancelledSubs = Number(cancelledSubCount[0]?.count ?? 0);
  const totalSubsEver = activeSubs + cancelledSubs;
  const churnRate = totalSubsEver > 0 ? (cancelledSubs / totalSubsEver) * 100 : 0;

  return c.json({
    success: true,
    data: {
      mrrPaise,
      mrrInr: mrrPaise / 100,
      arrPaise,
      arrInr: arrPaise / 100,
      totalSubscriptionRevenueInr: totalSubRevPaise / 100,
      totalStoreRevenueInr: totalStoreRevPaise / 100,
      totalRevenueInr: (totalSubRevPaise + totalStoreRevPaise) / 100,
      activeSubscribers: activeSubs,
      churnRatePercent: Number(churnRate.toFixed(2)),
      totalUsers: Number(totalCustomerCount[0]?.count ?? 0),
    },
  });
});

/**
 * GET /admin/system-health — Real-time Queue Depth, Cache Stats & System Vitals
 */
adminRouter.get('/system-health', async (c) => {
  const db = getDatabase();

  const [
    dbPing,
    jobStats,
    cacheStats,
    activeRateLimits,
    totalUsersCount,
  ] = await Promise.all([
    db.execute(sql`SELECT 1 as ping`).then(() => 'HEALTHY').catch(() => 'DEGRADED'),
    db.select({
      status: backgroundJobs.status,
      count: sql<number>`COUNT(*)`,
    }).from(backgroundJobs).groupBy(backgroundJobs.status),
    db.select({
      total: sql<number>`COUNT(*)`,
      expired: sql<number>`COUNT(*) FILTER (WHERE expires_at < NOW())`,
    }).from(cacheEntries),
    db.select({ count: sql<number>`COUNT(*)` }).from(apiRateLimits),
    db.select({ count: sql<number>`COUNT(*)` }).from(users),
  ]);

  const queueDepth: Record<string, number> = { PENDING: 0, RUNNING: 0, DONE: 0, FAILED: 0 };
  for (const row of jobStats) {
    queueDepth[row.status] = Number(row.count);
  }

  const memoryUsage = process.memoryUsage();

  return c.json({
    success: true,
    data: {
      status: dbPing === 'HEALTHY' ? 'OPERATIONAL' : 'DEGRADED',
      database: { status: dbPing },
      queue: {
        depth: queueDepth,
        pendingJobs: queueDepth.PENDING ?? 0,
        runningJobs: queueDepth.RUNNING ?? 0,
        failedJobs: queueDepth.FAILED ?? 0,
        totalCompleted: queueDepth.DONE ?? 0,
      },
      cache: {
        totalEntries: Number(cacheStats[0]?.total ?? 0),
        expiredEntries: Number(cacheStats[0]?.expired ?? 0),
      },
      rateLimiter: {
        activeWindows: Number(activeRateLimits[0]?.count ?? 0),
      },
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
      totalUsers: Number(totalUsersCount[0]?.count ?? 0),
    },
  });
});

/**
 * POST /admin/users/:id/impersonate — Generate Audited User Impersonation Token
 */
adminRouter.post('/users/:id/impersonate', async (c) => {
  const db = getDatabase();
  const targetUserId = c.req.param('id');
  const actor = c.get('user') as { id: string; email: string };

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!targetUser) {
    return c.json({ success: false, error: { message: 'Target user not found' } }, 404);
  }

  if (targetUser.role === 'ADMIN' && targetUser.id !== actor.id) {
    return c.json({ success: false, error: { message: 'Cannot impersonate another administrator' } }, 403);
  }

  // Generate impersonation payload with 1 hour TTL
  const impersonationToken = Buffer.from(
    JSON.stringify({
      sub: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      impersonatedBy: actor.id,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64');

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_USER_IMPERSONATED',
    entityType: 'user',
    entityId: targetUserId,
    metadata: { targetEmail: targetUser.email, targetRole: targetUser.role },
  });

  return c.json({
    success: true,
    data: {
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
      },
      token: impersonationToken,
      expiresIn: 3600,
    },
  });
});

/**
 * Feature Flags Management
 */
adminRouter.get('/feature-flags', async (c) => {
  const db = getDatabase();
  const flags = await db.select().from(featureFlags).orderBy(desc(featureFlags.createdAt));
  return c.json({ success: true, data: flags });
});

const createFeatureFlagSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  isEnabled: z.boolean().default(false),
  rules: z.record(z.any()).optional(),
});

adminRouter.post('/feature-flags', validateBody(createFeatureFlagSchema), async (c) => {
  const db = getDatabase();
  const body = c.get('validatedBody') as z.infer<typeof createFeatureFlagSchema>;
  const actor = c.get('user') as { id: string; email: string };

  const [created] = await db
    .insert(featureFlags)
    .values({
      name: body.name.toLowerCase().trim(),
      description: body.description,
      isEnabled: body.isEnabled,
      rules: body.rules,
    })
    .returning();

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'FEATURE_FLAG_CREATED',
    entityType: 'feature_flag',
    entityId: created!.id,
    metadata: { name: created!.name, isEnabled: created!.isEnabled },
  });

  return c.json({ success: true, data: created });
});

adminRouter.patch('/feature-flags/:id', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const actor = c.get('user') as { id: string; email: string };
  const body = await c.req.json();

  const [existing] = await db.select().from(featureFlags).where(eq(featureFlags.id, id)).limit(1);
  if (!existing) {
    return c.json({ success: false, error: { message: 'Feature flag not found' } }, 404);
  }

  const [updated] = await db
    .update(featureFlags)
    .set({
      isEnabled: body.isEnabled !== undefined ? Boolean(body.isEnabled) : existing.isEnabled,
      description: body.description ?? existing.description,
      rules: body.rules ?? existing.rules,
      updatedAt: new Date(),
    })
    .where(eq(featureFlags.id, id))
    .returning();

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'FEATURE_FLAG_UPDATED',
    entityType: 'feature_flag',
    entityId: id,
    metadata: { name: existing.name, isEnabled: updated!.isEnabled },
  });

  return c.json({ success: true, data: updated });
});

adminRouter.delete('/feature-flags/:id', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const actor = c.get('user') as { id: string; email: string };

  const [deleted] = await db.delete(featureFlags).where(eq(featureFlags.id, id)).returning();
  if (!deleted) {
    return c.json({ success: false, error: { message: 'Feature flag not found' } }, 404);
  }

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'FEATURE_FLAG_DELETED',
    entityType: 'feature_flag',
    entityId: id,
    metadata: { name: deleted.name },
  });

  return c.json({ success: true, message: 'Feature flag deleted' });
});

/**
 * DELETE /admin/cache — Flush Cache Entries by Pattern
 */
adminRouter.delete('/cache', async (c) => {
  const pattern = c.req.query('pattern') ?? '*';
  const actor = c.get('user') as { id: string; email: string };

  await invalidateCache(pattern);

  await recordAdminAudit({
    actor: { id: actor.id, email: actor.email },
    action: 'ADMIN_CACHE_FLUSHED',
    entityType: 'cache',
    entityId: pattern,
    metadata: { pattern },
  });

  return c.json({ success: true, message: `Cache flushed for pattern "${pattern}"` });
});

/**
 * GET /admin/sync-logs/live — Real-Time Sync Logs Stream / Polling
 */
adminRouter.get('/sync-logs/live', async (c) => {
  const db = getDatabase();
  const limit = Math.min(100, Number(c.req.query('limit') ?? 30));

  const logs = await db
    .select({
      id: syncLogs.id,
      brokerConnectionId: syncLogs.brokerConnectionId,
      userId: syncLogs.userId,
      syncType: syncLogs.syncType,
      status: syncLogs.status,
      executionsImported: syncLogs.executionsImported,
      tradesCreated: syncLogs.tradesCreated,
      tradesUpdated: syncLogs.tradesUpdated,
      errorMessage: syncLogs.errorMessage,
      startedAt: syncLogs.startedAt,
      completedAt: syncLogs.completedAt,
    })
    .from(syncLogs)
    .orderBy(desc(syncLogs.startedAt))
    .limit(limit);

  return c.json({ success: true, data: logs });
});


