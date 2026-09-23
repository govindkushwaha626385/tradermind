// ──────────────────────────────────────────────
// TradeMind — Admin Routes (admin-only, all endpoints)
// All routes require authenticated admin user.
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate, requireAdmin } from '@/lib/server/auth';
import { ok, apiError } from '@/lib/server/response';
import {
  getDatabase, getSupabaseAdmin,
  adminConfigs, taxRates, users, subscriptions, brokerConnections,
  tradeExecutions, plans, invoices, syncLogs, journalTrades,
  adminAuditLogs, aiCache, products, productOrders, productAccess,
  reviews, tradingStrategies, leaderboardOptIns, leaderboardSnapshots,
  partners, backgroundJobs, cacheEntries, apiRateLimits, featureFlags,
} from '@trademind/database';
import { eq, sql, desc, asc, and, gte, lte, ilike } from 'drizzle-orm';
import { configManager, CONFIG_DEFINITIONS } from '@trademind/config';
import { recordAdminAudit } from '@/lib/server/services/admin-audit.service';
import { invalidateCache } from '@/lib/server/cache';

export const runtime = 'nodejs';

// ── Schemas ──────────────────────────────────

const updateConfigSchema = z.object({ value: z.any() });
const taxRateSchema = z.object({ name: z.string().min(1), description: z.string().optional(), segment: z.string(), transactionType: z.string().optional().nullable(), rateType: z.enum(['percentage', 'flat']), rateValue: z.number(), appliedOn: z.enum(['buy', 'sell', 'both']), maxCap: z.number().optional().nullable(), minAmount: z.number().optional().nullable(), isActive: z.boolean().default(true), priority: z.number().default(0) });
const updateUserRoleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) });
const createPlanSchema = z.object({ slug: z.string().trim().regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/).max(50), name: z.string().min(1).max(100), description: z.string().max(500).optional(), amount: z.coerce.number().int().min(0).default(0), currency: z.string().length(3).transform((v) => v.toUpperCase()).default('INR'), interval: z.enum(['month', 'year', 'one-time', 'free']).default('month'), features: z.record(z.unknown()).default({}), isActive: z.boolean().default(true), sortOrder: z.number().int().default(0), isPopular: z.boolean().default(false) });
const updatePlanSchema = createPlanSchema.partial();
const updateSubSchema = z.object({ planId: z.string().uuid().optional(), status: z.enum(['active', 'canceled', 'past_due', 'expired']).optional() });
const productCreateSchema = z.object({ title: z.string().min(1).max(200), description: z.string().min(1), longDescription: z.string().optional().nullable(), productType: z.enum(['PDF', 'VIDEO', 'COURSE', 'BUNDLE', 'TEMPLATE']).default('PDF'), price: z.number().int().min(0).default(0), currency: z.string().length(3).default('INR'), downloadUrl: z.string().optional().nullable(), videoUrl: z.string().optional().nullable(), previewImageUrl: z.string().optional().nullable(), tags: z.array(z.string()).default([]), metadata: z.record(z.unknown()).default({}), isActive: z.boolean().default(true), isFree: z.boolean().default(false), sortOrder: z.number().int().default(0) });
const productUpdateSchema = productCreateSchema.partial();
const adminLeaderboardActionSchema = z.object({ isPublic: z.boolean().optional(), action: z.enum(['disqualify', 'reinstate', 'delete_snapshot']).optional() });
const partnerAdminSchema = z.object({ name: z.string().min(1), slug: z.string().min(1).optional(), logoUrl: z.string().optional().nullable(), websiteUrl: z.string().optional().nullable(), affiliateUrl: z.string().min(1), description: z.string().optional().nullable(), category: z.string().default('discount'), country: z.string().default('IN'), isFeatured: z.boolean().default(false), isActive: z.boolean().default(true), displayOrder: z.number().int().default(0), commissionNote: z.string().optional().nullable(), tag: z.string().optional().nullable(), features: z.array(z.string()).default([]), rating: z.string().default('4.8'), accountOpeningFee: z.string().default('Free'), maintenanceCharges: z.string().default('₹0 for 1st Year') });
const partnerReorderSchema = z.object({ items: z.array(z.object({ id: z.string().uuid(), displayOrder: z.number().int() })) });
const createFeatureFlagSchema = z.object({ name: z.string().min(2).max(100), description: z.string().optional(), isEnabled: z.boolean().default(false), rules: z.record(z.any()).optional() });

// ── GET Handler ──────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const adminError = await requireAdmin(user);
  if (adminError) return adminError;

  const { path } = await params;
  const [section, sub, detail] = path ?? [];
  const url = new URL(req.url);
  const db = getDatabase();

  // GET /admin/config
  if (!section || section === 'config') {
    if (sub === 'public') {
      const publicConfigs = await configManager.getPublicConfigs();
      return ok(publicConfigs);
    }
    const dbConfigs = await db.select().from(adminConfigs);
    const configMap = new Map(dbConfigs.map((cfg) => [cfg.key, cfg]));
    const merged = CONFIG_DEFINITIONS.map((def) => {
      const dbConfig = configMap.get(def.key);
      return { key: def.key, label: def.label, description: def.description, type: def.type, category: def.category, isPublic: def.isPublic, value: dbConfig?.value ?? def.defaultValue, updatedAt: dbConfig?.updatedAt ?? null };
    });
    return ok(merged);
  }

  // GET /admin/tax-rates
  if (section === 'tax-rates') {
    const rates = await db.select().from(taxRates).orderBy(taxRates.priority);
    return ok(rates);
  }

  // GET /admin/users
  if (section === 'users') {
    if (sub && !['role'].includes(sub)) {
      // GET /admin/users/:id
      const id = sub;
      const [user2] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!user2) return apiError('User not found', 404);
      const [sub2] = await db.select().from(subscriptions).where(eq(subscriptions.userId, id)).limit(1);
      const [brokerCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(brokerConnections).where(eq(brokerConnections.userId, id));
      const [tradeCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(tradeExecutions).where(eq(tradeExecutions.userId, id));
      return ok({ ...user2, subscription: sub2 ?? null, brokerCount: Number(brokerCount?.count ?? 0), tradeCount: Number(tradeCount?.count ?? 0) });
    }
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 20)));
    const search = url.searchParams.get('search') || undefined;
    const role = url.searchParams.get('role') || undefined;
    const offset = (page - 1) * limit;
    const conditions: any[] = [];
    if (search) conditions.push(sql`(${users.name} ILIKE ${'%' + search + '%'} OR ${users.email} ILIKE ${'%' + search + '%'})` as any);
    if (role) conditions.push(eq(users.role, role) as any);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [userList, totalResult] = await Promise.all([
      db.select({ id: users.id, email: users.email, name: users.name, role: users.role, avatarUrl: users.avatarUrl, createdAt: users.createdAt, updatedAt: users.updatedAt }).from(users).where(whereClause as any).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(users).where(whereClause as any),
    ]);
    const userIds = userList.map((u) => u.id);
    const userSubs = userIds.length > 0 ? await db.select().from(subscriptions).where(sql`${subscriptions.userId} = ANY(${userIds})`) : [];
    const subMap = new Map(userSubs.map((s) => [s.userId, s]));
    const enriched = userList.map((u) => { const s = subMap.get(u.id); return { ...u, subscription: s ? { id: s.id, planId: s.planId, status: s.status, provider: s.provider, currentPeriodEnd: s.currentPeriodEnd } : null }; });
    const total = Number(totalResult[0]?.count ?? 0);
    return ok({ users: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  // GET /admin/plans
  if (section === 'plans') {
    const allPlans = await db.select().from(plans).orderBy(plans.sortOrder);
    return ok(allPlans);
  }

  // GET /admin/journal
  if (section === 'journal') {
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 20)));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status') || undefined;
    const symbol = url.searchParams.get('symbol') || undefined;
    const userId = url.searchParams.get('userId') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;
    const conditions: any[] = [];
    if (status) conditions.push(eq(journalTrades.status, status));
    if (symbol) conditions.push(sql`${journalTrades.tradingsymbol} ILIKE ${'%' + symbol + '%'}`);
    if (userId) conditions.push(eq(journalTrades.userId, userId));
    if (startDate) conditions.push(gte(journalTrades.openedAt, new Date(startDate)));
    if (endDate) conditions.push(lte(journalTrades.openedAt, new Date(endDate)));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [data, totalResult] = await Promise.all([
      db.select({ id: journalTrades.id, userId: journalTrades.userId, userEmail: users.email, userName: users.name, tradingsymbol: journalTrades.tradingsymbol, exchange: journalTrades.exchange, assetClass: journalTrades.assetClass, direction: journalTrades.direction, status: journalTrades.status, totalQuantity: journalTrades.totalQuantity, avgEntryPrice: journalTrades.avgEntryPrice, avgExitPrice: journalTrades.avgExitPrice, grossPnl: journalTrades.grossPnl, netPnl: journalTrades.netPnl, rMultiple: journalTrades.rMultiple, openedAt: journalTrades.openedAt, closedAt: journalTrades.closedAt, tradeType: journalTrades.tradeType, emotions: journalTrades.emotions, mistakeTags: journalTrades.mistakeTags, traderNotes: journalTrades.traderNotes }).from(journalTrades).leftJoin(users, eq(users.id, journalTrades.userId)).where(whereClause as any).orderBy(desc(journalTrades.openedAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(journalTrades).where(whereClause as any),
    ]);
    const total = Number(totalResult[0]?.count ?? 0);
    return ok(data, { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } as any);
  }

  // GET /admin/brokers
  if (section === 'brokers') {
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 20)));
    const offset = (page - 1) * limit;
    const [data, totalResult] = await Promise.all([
      db.select({ id: brokerConnections.id, userId: brokerConnections.userId, userEmail: users.email, userName: users.name, brokerId: brokerConnections.brokerId, brokerClientId: brokerConnections.brokerClientId, label: brokerConnections.label, authType: brokerConnections.authType, status: brokerConnections.status, isActive: brokerConnections.isActive, lastSyncedAt: brokerConnections.lastSyncedAt, createdAt: brokerConnections.createdAt }).from(brokerConnections).leftJoin(users, eq(users.id, brokerConnections.userId)).orderBy(desc(brokerConnections.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(brokerConnections),
    ]);
    const total = Number(totalResult[0]?.count ?? 0);
    return NextResponse.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  // GET /admin/invoices
  if (section === 'invoices') {
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 20)));
    const offset = (page - 1) * limit;
    const [data, totalResult] = await Promise.all([
      db.select({ id: invoices.id, userId: invoices.userId, userEmail: users.email, userName: users.name, provider: invoices.provider, amountPaid: invoices.amountPaid, currency: invoices.currency, status: invoices.status, paidAt: invoices.paidAt, createdAt: invoices.createdAt }).from(invoices).leftJoin(users, eq(users.id, invoices.userId)).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(invoices),
    ]);
    const total = Number(totalResult[0]?.count ?? 0);
    return NextResponse.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  // GET /admin/executions
  if (section === 'executions') {
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 50)));
    const offset = (page - 1) * limit;
    const [data, totalResult] = await Promise.all([
      db.select({ id: tradeExecutions.id, userId: tradeExecutions.userId, userEmail: users.email, userName: users.name, tradingsymbol: tradeExecutions.tradingsymbol, exchange: tradeExecutions.exchange, segment: tradeExecutions.segment, transactionType: tradeExecutions.transactionType, orderType: tradeExecutions.orderType, quantity: tradeExecutions.quantity, executionPrice: tradeExecutions.executionPrice, brokerOrderId: tradeExecutions.brokerOrderId, brokerExecutionId: tradeExecutions.brokerExecutionId, executionTimestamp: tradeExecutions.executionTimestamp, brokerConnectionId: tradeExecutions.brokerConnectionId }).from(tradeExecutions).leftJoin(users, eq(users.id, tradeExecutions.userId)).orderBy(desc(tradeExecutions.executionTimestamp)).limit(limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(tradeExecutions),
    ]);
    const total = Number(totalResult[0]?.count ?? 0);
    return NextResponse.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  // GET /admin/stats
  if (section === 'stats') {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [userCount, tradeCount, brokerCount, planCount, productCount, orderStats, subRevenueStats, activeUserCount, strategyCount, leaderboardCount, pendingReviewsCount] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(users),
      db.select({ count: sql<number>`COUNT(*)` }).from(tradeExecutions),
      db.select({ count: sql<number>`COUNT(*)` }).from(brokerConnections).where(eq(brokerConnections.isActive, true)),
      db.select({ count: sql<number>`COUNT(*)` }).from(plans).where(eq(plans.isActive, true)),
      db.select({ count: sql<number>`COUNT(*)` }).from(products).where(eq(products.isActive, true)),
      db.select({ count: sql<number>`COUNT(*)`, revenue: sql<number>`COALESCE(SUM(amount_paid), 0)` }).from(productOrders).where(eq(productOrders.status, 'paid')),
      db.select({ count: sql<number>`COUNT(*)`, revenue: sql<number>`COALESCE(SUM(amount_paid), 0)` }).from(invoices).where(eq(invoices.status, 'paid')),
      db.select({ count: sql<number>`COUNT(DISTINCT user_id)` }).from(journalTrades).where(gte(journalTrades.createdAt, thirtyDaysAgo)),
      db.select({ count: sql<number>`COUNT(*)` }).from(tradingStrategies),
      db.select({ count: sql<number>`COUNT(*)` }).from(leaderboardOptIns).where(eq(leaderboardOptIns.isPublic, true)),
      db.select({ count: sql<number>`COUNT(*)` }).from(reviews).where(eq(reviews.isApproved, false)),
    ]);
    return ok({ totalUsers: String(userCount[0]?.count ?? 0), activeUsers: String(activeUserCount[0]?.count ?? 0), activeUsers30d: String(activeUserCount[0]?.count ?? 0), totalTrades: String(tradeCount[0]?.count ?? 0), connectedBrokers: String(brokerCount[0]?.count ?? 0), activePlans: String(planCount[0]?.count ?? 0), activeProducts: String(productCount[0]?.count ?? 0), storeOrders: String(orderStats[0]?.count ?? 0), storeRevenue: String(orderStats[0]?.revenue ?? 0), subscriptionRevenue: String(subRevenueStats[0]?.revenue ?? 0), totalPaidInvoices: String(subRevenueStats[0]?.count ?? 0), pendingReviews: String(pendingReviewsCount[0]?.count ?? 0), totalStrategies: String(strategyCount[0]?.count ?? 0), leaderboardUsers: String(leaderboardCount[0]?.count ?? 0) });
  }

  // GET /admin/billing/summary
  if (section === 'billing' && sub === 'summary') {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const twelveMonthsAgo = new Date(); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11); twelveMonthsAgo.setDate(1); twelveMonthsAgo.setHours(0, 0, 0, 0);
    const [totalRevRow, mrrRow, byProvider, byStatus, byPlan, monthlyTrend, recentInvoices] = await Promise.all([
      db.select({ totalRevenue: sql<number>`COALESCE(SUM(amount_paid), 0)`, totalInvoices: sql<number>`COUNT(*)` }).from(invoices).where(eq(invoices.status, 'paid')),
      db.select({ mrr: sql<number>`COALESCE(SUM(amount_paid), 0)` }).from(invoices).where(and(eq(invoices.status, 'paid'), gte(invoices.paidAt, startOfMonth))),
      db.select({ provider: invoices.provider, revenue: sql<number>`COALESCE(SUM(amount_paid), 0)`, count: sql<number>`COUNT(*)` }).from(invoices).where(eq(invoices.status, 'paid')).groupBy(invoices.provider),
      db.select({ status: subscriptions.status, count: sql<number>`COUNT(*)` }).from(subscriptions).groupBy(subscriptions.status),
      db.select({ planName: plans.name, planSlug: plans.slug, count: sql<number>`COUNT(*)` }).from(subscriptions).leftJoin(plans, eq(plans.id, subscriptions.planId)).where(eq(subscriptions.status, 'active')).groupBy(plans.name, plans.slug),
      db.select({ month: sql<string>`TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM')`, revenue: sql<number>`COALESCE(SUM(amount_paid), 0)`, count: sql<number>`COUNT(*)` }).from(invoices).where(and(eq(invoices.status, 'paid'), gte(invoices.paidAt, twelveMonthsAgo))).groupBy(sql`DATE_TRUNC('month', paid_at)`).orderBy(sql`DATE_TRUNC('month', paid_at)`),
      db.select({ id: invoices.id, userId: invoices.userId, userEmail: users.email, userName: users.name, provider: invoices.provider, amountPaid: invoices.amountPaid, currency: invoices.currency, status: invoices.status, paidAt: invoices.paidAt, createdAt: invoices.createdAt }).from(invoices).leftJoin(users, eq(users.id, invoices.userId)).where(eq(invoices.status, 'paid')).orderBy(desc(invoices.paidAt)).limit(10),
    ]);
    const mrrPaise = Number(mrrRow[0]?.mrr ?? 0);
    return ok({ totalRevenuePaise: Number(totalRevRow[0]?.totalRevenue ?? 0), totalPaidInvoices: Number(totalRevRow[0]?.totalInvoices ?? 0), mrrPaise, arrPaise: mrrPaise * 12, byProvider: byProvider.map((p) => ({ provider: p.provider, revenue: Number(p.revenue), count: Number(p.count) })), byStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.count) })), byPlan: byPlan.map((p) => ({ planName: p.planName ?? 'Unknown', planSlug: p.planSlug ?? 'unknown', count: Number(p.count) })), monthlyTrend: monthlyTrend.map((m) => ({ month: m.month, revenue: Number(m.revenue), count: Number(m.count) })), recentInvoices });
  }

  // GET /admin/subscriptions
  if (section === 'subscriptions') {
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 50)));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const conditions: any[] = [];
    if (status) conditions.push(eq(subscriptions.status, status));
    if (search) conditions.push(sql`(${users.email} ILIKE ${'%' + search + '%'} OR ${users.name} ILIKE ${'%' + search + '%'})`);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [subs, totalResult] = await Promise.all([
      db.select({ id: subscriptions.id, userId: subscriptions.userId, userEmail: users.email, userName: users.name, planId: subscriptions.planId, planName: plans.name, status: subscriptions.status, provider: subscriptions.provider, currentPeriodEnd: subscriptions.currentPeriodEnd, createdAt: subscriptions.createdAt }).from(subscriptions).leftJoin(users, eq(users.id, subscriptions.userId)).leftJoin(plans, eq(plans.id, subscriptions.planId)).where(whereClause as any).orderBy(desc(subscriptions.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(subscriptions).leftJoin(users, eq(users.id, subscriptions.userId)).where(whereClause as any),
    ]);
    const total = Number(totalResult[0]?.count ?? 0);
    return NextResponse.json({ success: true, data: subs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  // GET /admin/audit-logs
  if (section === 'audit-logs') {
    if (sub === 'export' && detail === 'csv') {
      const action = url.searchParams.get('action');
      const actorId = url.searchParams.get('actorId');
      const entityType = url.searchParams.get('entityType');
      const conditions: any[] = [];
      if (action) conditions.push(eq(adminAuditLogs.action, action));
      if (actorId) conditions.push(eq(adminAuditLogs.actorId, actorId));
      if (entityType) conditions.push(eq(adminAuditLogs.entityType, entityType));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const logsList = await db.select().from(adminAuditLogs).where(whereClause).orderBy(desc(adminAuditLogs.createdAt)).limit(2000);
      const header = ['ID', 'Created At', 'Actor ID', 'Actor Email', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Metadata'].join(',');
      const rows = logsList.map((l) => [`"${l.id}"`, `"${l.createdAt ? new Date(l.createdAt).toISOString() : ''}"`, `"${l.actorId ?? ''}"`, `"${l.actorEmail ?? ''}"`, `"${l.action ?? ''}"`, `"${l.entityType ?? ''}"`, `"${l.entityId ?? ''}"`, `"${l.ipAddress ?? ''}"`, `"${JSON.stringify(l.metadata ?? {}).replace(/"/g, '""')}"`].join(','));
      const csv = [header, ...rows].join('\n');
      return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="admin-audit-logs-${Date.now()}.csv"` } });
    }
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 50)));
    const offset = (page - 1) * limit;
    const action = url.searchParams.get('action');
    const actorId = url.searchParams.get('actorId');
    const entityType = url.searchParams.get('entityType');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const conditions: any[] = [];
    if (action) conditions.push(eq(adminAuditLogs.action, action));
    if (actorId) conditions.push(eq(adminAuditLogs.actorId, actorId));
    if (entityType) conditions.push(eq(adminAuditLogs.entityType, entityType));
    if (startDate) conditions.push(gte(adminAuditLogs.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(adminAuditLogs.createdAt, new Date(endDate)));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [logsList, totalResult] = await Promise.all([
      db.select().from(adminAuditLogs).where(whereClause).orderBy(desc(adminAuditLogs.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(adminAuditLogs).where(whereClause),
    ]);
    const total = Number(totalResult[0]?.count ?? 0);
    return ok({ logs: logsList, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  // GET /admin/ai-analytics
  if (section === 'ai-analytics') {
    const [totalCacheRecords, tokensResult, providerCounts] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(aiCache),
      db.select({ totalTokens: sql<number>`COALESCE(SUM(${aiCache.tokensUsed}), 0)` }).from(aiCache),
      db.select({ provider: aiCache.provider, count: sql<number>`COUNT(*)`, tokens: sql<number>`COALESCE(SUM(${aiCache.tokensUsed}), 0)` }).from(aiCache).groupBy(aiCache.provider),
    ]);
    const totalEntries = Number(totalCacheRecords[0]?.count ?? 0);
    const totalTokens = Number(tokensResult[0]?.totalTokens ?? 0);
    return ok({ totalRequestsCached: totalEntries, totalTokensConsumed: totalTokens, estimatedCostUsd: 0.00, estimatedSavingsUsd: Number(((totalTokens / 1_000_000) * 0.15).toFixed(4)), activeProviders: providerCounts.map((p) => ({ provider: p.provider, cachedEntries: Number(p.count), tokensUsed: Number(p.tokens) })), geminiFreeTierLimit: '1,000,000 tokens/day (Free Tier)', groqFreeTierLimit: '14,400 req/day (Free Tier)' });
  }

  // GET /admin/sync-logs
  if (section === 'sync-logs') {
    if (sub === 'live') {
      const limit = Math.min(100, Number(url.searchParams.get('limit') ?? 30));
      const logsList = await db.select({ id: syncLogs.id, brokerConnectionId: syncLogs.brokerConnectionId, userId: syncLogs.userId, syncType: syncLogs.syncType, status: syncLogs.status, executionsImported: syncLogs.executionsImported, tradesCreated: syncLogs.tradesCreated, tradesUpdated: syncLogs.tradesUpdated, errorMessage: syncLogs.errorMessage, startedAt: syncLogs.startedAt, completedAt: syncLogs.completedAt }).from(syncLogs).orderBy(desc(syncLogs.startedAt)).limit(limit);
      return ok(logsList);
    }
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 20)));
    const offset = (page - 1) * limit;
    const [logsList, totalResult] = await Promise.all([
      db.select().from(syncLogs).orderBy(desc(syncLogs.startedAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(syncLogs),
    ]);
    const total = Number(totalResult[0]?.count ?? 0);
    return ok({ logs: logsList, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  // GET /admin/products
  if (section === 'products') {
    if (sub && sub !== 'grant') {
      const [product] = await db.select().from(products).where(eq(products.id, sub)).limit(1);
      if (!product) return apiError('Product not found', 404);
      const accessList = await db.select({ id: productAccess.id, userId: productAccess.userId, userEmail: users.email, userName: users.name, grantReason: productAccess.grantReason, downloadCount: productAccess.downloadCount, lastAccessedAt: productAccess.lastAccessedAt, accessGrantedAt: productAccess.accessGrantedAt }).from(productAccess).innerJoin(users, eq(productAccess.userId, users.id)).where(eq(productAccess.productId, sub)).orderBy(desc(productAccess.accessGrantedAt)).limit(100);
      return ok({ product, accessList });
    }
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 50)));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search')?.trim();
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const conditions: any[] = [];
    if (search) conditions.push(ilike(products.title, `%${search}%`));
    if (type) conditions.push(eq(products.productType, type));
    if (status === 'active') conditions.push(eq(products.isActive, true));
    else if (status === 'inactive') conditions.push(eq(products.isActive, false));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [rows, totalResult] = await Promise.all([
      db.select().from(products).where(whereClause).orderBy(products.sortOrder, desc(products.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(products).where(whereClause),
    ]);
    const total = Number(totalResult[0]?.count ?? 0);
    return ok({ products: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  // GET /admin/store/orders & /admin/store/analytics
  if (section === 'store') {
    if (sub === 'orders') {
      const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 50)));
      const offset = (page - 1) * limit;
      const status = url.searchParams.get('status');
      const conditions: any[] = [];
      if (status) conditions.push(eq(productOrders.status, status));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [ordersList, totalResult] = await Promise.all([
        db.select({ id: productOrders.id, amountPaid: productOrders.amountPaid, currency: productOrders.currency, provider: productOrders.provider, providerOrderId: productOrders.providerOrderId, providerPaymentId: productOrders.providerPaymentId, status: productOrders.status, paidAt: productOrders.paidAt, createdAt: productOrders.createdAt, userId: productOrders.userId, userName: users.name, userEmail: users.email, productId: productOrders.productId, productTitle: products.title, productType: products.productType }).from(productOrders).innerJoin(users, eq(productOrders.userId, users.id)).innerJoin(products, eq(productOrders.productId, products.id)).where(whereClause).orderBy(desc(productOrders.createdAt)).limit(limit).offset(offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(productOrders).where(whereClause),
      ]);
      const total = Number(totalResult[0]?.count ?? 0);
      return ok({ orders: ordersList, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }
    if (sub === 'analytics') {
      const [totalRevenueRow, productsCountRow, pendingReviewsRow, topProducts] = await Promise.all([
        db.select({ revenue: sql<number>`COALESCE(SUM(amount_paid), 0)`, paidOrders: sql<number>`COUNT(*)` }).from(productOrders).where(eq(productOrders.status, 'paid')),
        db.select({ total: sql<number>`COUNT(*)`, active: sql<number>`COUNT(*) FILTER (WHERE is_active = true)` }).from(products),
        db.select({ count: sql<number>`COUNT(*)` }).from(reviews).where(eq(reviews.isApproved, false)),
        db.select({ id: products.id, title: products.title, productType: products.productType, price: products.price, currency: products.currency, totalSales: products.totalSales }).from(products).orderBy(desc(products.totalSales)).limit(5),
      ]);
      return ok({ totalRevenuePaise: Number(totalRevenueRow[0]?.revenue ?? 0), totalPaidOrders: Number(totalRevenueRow[0]?.paidOrders ?? 0), totalProducts: Number(productsCountRow[0]?.total ?? 0), activeProducts: Number(productsCountRow[0]?.active ?? 0), pendingReviewsCount: Number(pendingReviewsRow[0]?.count ?? 0), topProducts });
    }
  }

  // GET /admin/reviews
  if (section === 'reviews') {
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 50)));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status');
    const conditions: any[] = [];
    if (status === 'pending') conditions.push(eq(reviews.isApproved, false));
    else if (status === 'approved') conditions.push(eq(reviews.isApproved, true));
    else if (status === 'featured') conditions.push(eq(reviews.isFeatured, true));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [reviewsList, totalResult] = await Promise.all([
      db.select({ id: reviews.id, userId: reviews.userId, rating: reviews.rating, headline: reviews.headline, body: reviews.body, traderType: reviews.traderType, displayName: reviews.displayName, isApproved: reviews.isApproved, isFeatured: reviews.isFeatured, createdAt: reviews.createdAt, updatedAt: reviews.updatedAt, userName: users.name, userEmail: users.email }).from(reviews).innerJoin(users, eq(reviews.userId, users.id)).where(whereClause).orderBy(desc(reviews.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(reviews).where(whereClause),
    ]);
    const total = Number(totalResult[0]?.count ?? 0);
    return ok({ reviews: reviewsList, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  // GET /admin/leaderboard
  if (section === 'leaderboard') {
    const period = url.searchParams.get('period') || 'ALL_TIME';
    const search = url.searchParams.get('search')?.toLowerCase().trim();
    const [optIns, snapshots] = await Promise.all([
      db.select({ userId: leaderboardOptIns.userId, isPublic: leaderboardOptIns.isPublic, displayName: leaderboardOptIns.displayName, bio: leaderboardOptIns.bio, twitterUrl: leaderboardOptIns.twitterUrl, updatedAt: leaderboardOptIns.updatedAt, userEmail: users.email, userName: users.name }).from(leaderboardOptIns).innerJoin(users, eq(leaderboardOptIns.userId, users.id)).orderBy(desc(leaderboardOptIns.updatedAt)),
      db.select().from(leaderboardSnapshots).where(eq(leaderboardSnapshots.period, period)),
    ]);
    const snapshotMap = new Map(snapshots.map((s) => [s.userId, s]));
    let entries = optIns.map((opt) => { const snap = snapshotMap.get(opt.userId); return { userId: opt.userId, isPublic: opt.isPublic, displayName: opt.displayName, bio: opt.bio, twitterUrl: opt.twitterUrl, userEmail: opt.userEmail, userName: opt.userName, updatedAt: opt.updatedAt, rank: snap?.rank ?? null, totalPnl: snap?.totalPnl ?? 0, pnlPercent: snap?.pnlPercent ?? 0, winRate: snap?.winRate ?? 0, totalTrades: snap?.totalTrades ?? 0, disciplineScore: snap?.disciplineScore ?? 0, compositeScore: snap?.compositeScore ?? 0, computedAt: snap?.computedAt ?? null }; });
    if (search) entries = entries.filter((e) => e.displayName.toLowerCase().includes(search) || e.userEmail.toLowerCase().includes(search) || e.userName.toLowerCase().includes(search));
    const totalOptedIn = optIns.length;
    const publicCount = optIns.filter((o) => o.isPublic).length;
    const avgWinRate = snapshots.length > 0 ? Number((snapshots.reduce((acc, s) => acc + s.winRate, 0) / snapshots.length).toFixed(1)) : 0;
    const avgCompositeScore = snapshots.length > 0 ? Number((snapshots.reduce((acc, s) => acc + s.compositeScore, 0) / snapshots.length).toFixed(1)) : 0;
    return ok({ entries, stats: { totalOptedIn, publicCount, disqualifiedCount: totalOptedIn - publicCount, avgWinRate, avgCompositeScore } });
  }

  // GET /admin/strategies
  if (section === 'strategies') {
    const search = url.searchParams.get('search')?.toLowerCase().trim();
    const marketType = url.searchParams.get('marketType');
    const strats = await db.select({ id: tradingStrategies.id, userId: tradingStrategies.userId, name: tradingStrategies.name, description: tradingStrategies.description, marketType: tradingStrategies.marketType, timeframe: tradingStrategies.timeframe, entryCriteria: tradingStrategies.entryCriteria, exitCriteria: tradingStrategies.exitCriteria, tags: tradingStrategies.tags, winCount: tradingStrategies.winCount, lossCount: tradingStrategies.lossCount, totalTrades: tradingStrategies.totalTrades, totalPnl: tradingStrategies.totalPnl, avgRMultiple: tradingStrategies.avgRMultiple, isActive: tradingStrategies.isActive, createdAt: tradingStrategies.createdAt, updatedAt: tradingStrategies.updatedAt, userEmail: users.email, userName: users.name }).from(tradingStrategies).innerJoin(users, eq(tradingStrategies.userId, users.id)).orderBy(desc(tradingStrategies.createdAt));
    let filtered = strats;
    if (marketType) filtered = filtered.filter((s) => s.marketType === marketType);
    if (search) filtered = filtered.filter((s) => s.name.toLowerCase().includes(search) || (s.description && s.description.toLowerCase().includes(search)) || s.userEmail.toLowerCase().includes(search) || s.userName.toLowerCase().includes(search));
    return ok({ strategies: filtered, total: filtered.length });
  }

  // GET /admin/partners
  if (section === 'partners') {
    if (sub) {
      const [row] = await db.select().from(partners).where(eq(partners.id, sub)).limit(1);
      if (!row) return apiError('Partner not found', 404);
      return ok(row);
    }
    const search = url.searchParams.get('search')?.toLowerCase().trim();
    const category = url.searchParams.get('category')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const allPartners = await db.select().from(partners).orderBy(asc(partners.displayOrder), desc(partners.createdAt));
    let filtered = allPartners;
    if (category && category !== 'all') filtered = filtered.filter((p) => p.category === category);
    if (status === 'active') filtered = filtered.filter((p) => p.isActive === true);
    else if (status === 'inactive') filtered = filtered.filter((p) => p.isActive === false);
    if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search) || p.slug.toLowerCase().includes(search) || (p.description && p.description.toLowerCase().includes(search)) || (p.tag && p.tag.toLowerCase().includes(search)));
    return ok({ partners: filtered, total: filtered.length });
  }

  // GET /admin/revenue
  if (section === 'revenue') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [subRevenueAllTime, subRevenueThisMonth, storeRevenueAllTime, activeSubCount, cancelledSubCount, totalCustomerCount] = await Promise.all([
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
    return ok({ mrrPaise, mrrInr: mrrPaise / 100, arrPaise, arrInr: arrPaise / 100, totalSubscriptionRevenueInr: totalSubRevPaise / 100, totalStoreRevenueInr: totalStoreRevPaise / 100, totalRevenueInr: (totalSubRevPaise + totalStoreRevPaise) / 100, activeSubscribers: activeSubs, churnRatePercent: Number(churnRate.toFixed(2)), totalUsers: Number(totalCustomerCount[0]?.count ?? 0) });
  }

  // GET /admin/system-health
  if (section === 'system-health') {
    const [dbPing, jobStats, cacheStats, activeRateLimits, totalUsersCount] = await Promise.all([
      db.execute(sql`SELECT 1 as ping`).then(() => 'HEALTHY').catch(() => 'DEGRADED'),
      db.select({ status: backgroundJobs.status, count: sql<number>`COUNT(*)` }).from(backgroundJobs).groupBy(backgroundJobs.status),
      db.select({ total: sql<number>`COUNT(*)`, expired: sql<number>`COUNT(*) FILTER (WHERE expires_at < NOW())` }).from(cacheEntries),
      db.select({ count: sql<number>`COUNT(*)` }).from(apiRateLimits),
      db.select({ count: sql<number>`COUNT(*)` }).from(users),
    ]);
    const queueDepth: Record<string, number> = { PENDING: 0, RUNNING: 0, DONE: 0, FAILED: 0 };
    for (const row of jobStats) queueDepth[row.status] = Number(row.count);
    const memoryUsage = process.memoryUsage();
    return ok({ status: dbPing === 'HEALTHY' ? 'OPERATIONAL' : 'DEGRADED', database: { status: dbPing }, queue: { depth: queueDepth, pendingJobs: queueDepth.PENDING ?? 0, runningJobs: queueDepth.RUNNING ?? 0, failedJobs: queueDepth.FAILED ?? 0, totalCompleted: queueDepth.DONE ?? 0 }, cache: { totalEntries: Number(cacheStats[0]?.total ?? 0), expiredEntries: Number(cacheStats[0]?.expired ?? 0) }, rateLimiter: { activeWindows: Number(activeRateLimits[0]?.count ?? 0) }, server: { uptimeSeconds: Math.floor(process.uptime()), nodeVersion: process.version, rssMb: Math.round(memoryUsage.rss / 1024 / 1024), heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024) }, totalUsers: Number(totalUsersCount[0]?.count ?? 0) });
  }

  // GET /admin/feature-flags
  if (section === 'feature-flags') {
    const flags = await db.select().from(featureFlags).orderBy(desc(featureFlags.createdAt));
    return ok(flags);
  }

  return apiError('Admin route not found', 404);
}

// ── POST Handler ─────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const adminError = await requireAdmin(user);
  if (adminError) return adminError;

  const { path } = await params;
  const [section, sub, detail] = path ?? [];
  const db = getDatabase();
  const actor = { id: user.id, email: user.email };
  const body = await req.json().catch(() => ({}));

  // POST /admin/tax-rates
  if (section === 'tax-rates') {
    const parsed = taxRateSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const [rate] = await db.insert(taxRates).values(parsed.data as any).returning();
    return NextResponse.json({ success: true, data: rate }, { status: 201 });
  }

  // POST /admin/plans
  if (section === 'plans') {
    const parsed = createPlanSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const [plan] = await db.insert(plans).values(parsed.data as any).returning();
    if (plan) await recordAdminAudit({ actor, action: 'plan.create', entityType: 'plan', entityId: plan.id, metadata: { slug: plan.slug, amount: plan.amount, currency: plan.currency }, ipAddress: req.headers.get('x-forwarded-for') ?? undefined });
    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  }

  // POST /admin/products
  if (section === 'products') {
    if (sub && detail === 'grant') {
      // POST /admin/products/:id/grant
      const productId = sub;
      const targetUserId = body.userId;
      if (!targetUserId) return apiError('Target userId required', 400);
      const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      if (!product) return apiError('Product not found', 404);
      const [granted] = await db.insert(productAccess).values({ userId: targetUserId, productId, grantReason: 'admin_granted', accessGrantedAt: new Date() }).onConflictDoNothing().returning();
      await recordAdminAudit({ actor, action: 'ADMIN_PRODUCT_ACCESS_GRANTED', entityType: 'product_access', entityId: granted?.id ?? productId, metadata: { productId, targetUserId, productTitle: product.title } });
      return NextResponse.json({ success: true, data: granted, message: 'Access granted successfully' });
    }
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const b = parsed.data;
    const [newProduct] = await db.insert(products).values({ title: b.title, description: b.description, longDescription: b.longDescription ?? null, productType: b.productType, price: b.isFree ? 0 : b.price, currency: b.currency, downloadUrl: b.downloadUrl ?? null, videoUrl: b.videoUrl ?? null, previewImageUrl: b.previewImageUrl ?? null, tags: b.tags, metadata: b.metadata, isActive: b.isActive, isFree: b.isFree, sortOrder: b.sortOrder }).returning();
    if (!newProduct) return apiError('Failed to create product', 500);
    await recordAdminAudit({ actor, action: 'ADMIN_PRODUCT_CREATED', entityType: 'product', entityId: newProduct.id, metadata: { title: newProduct.title, productType: newProduct.productType, price: newProduct.price } });
    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  }

  // POST /admin/users/:id/impersonate
  if (section === 'users' && detail === 'impersonate') {
    const targetUserId = sub;
    if (!targetUserId) return apiError('User ID required', 400);
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser) return apiError('Target user not found', 404);
    if (targetUser.role === 'ADMIN' && targetUser.id !== actor.id) return apiError('Cannot impersonate another administrator', 403);
    const impersonationToken = Buffer.from(JSON.stringify({ sub: targetUser.id, email: targetUser.email, name: targetUser.name, role: targetUser.role, impersonatedBy: actor.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64');
    await recordAdminAudit({ actor, action: 'ADMIN_USER_IMPERSONATED', entityType: 'user', entityId: targetUserId, metadata: { targetEmail: targetUser.email, targetRole: targetUser.role } });
    return ok({ targetUser: { id: targetUser.id, email: targetUser.email, name: targetUser.name, role: targetUser.role }, token: impersonationToken, expiresIn: 3600 });
  }

  // POST /admin/feature-flags
  if (section === 'feature-flags') {
    const parsed = createFeatureFlagSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const [created] = await db.insert(featureFlags).values({ name: parsed.data.name.toLowerCase().trim(), description: parsed.data.description, isEnabled: parsed.data.isEnabled, rules: parsed.data.rules }).returning();
    await recordAdminAudit({ actor, action: 'FEATURE_FLAG_CREATED', entityType: 'feature_flag', entityId: created!.id, metadata: { name: created!.name, isEnabled: created!.isEnabled } });
    return ok(created);
  }

  // POST /admin/partners
  if (section === 'partners') {
    const parsed = partnerAdminSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const b = parsed.data;
    const slug = b.slug?.trim() || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const [created] = await db.insert(partners).values({ name: b.name, slug, logoUrl: b.logoUrl ?? null, websiteUrl: b.websiteUrl ?? null, affiliateUrl: b.affiliateUrl, description: b.description ?? null, category: b.category, country: b.country, isFeatured: b.isFeatured, isActive: b.isActive, displayOrder: b.displayOrder, commissionNote: b.commissionNote ?? null, tag: b.tag ?? null, features: b.features, rating: b.rating, accountOpeningFee: b.accountOpeningFee, maintenanceCharges: b.maintenanceCharges }).returning();
    if (!created) return apiError('Failed to create partner', 500);
    await recordAdminAudit({ actor, action: 'ADMIN_PARTNER_CREATED', entityType: 'partner', entityId: created.id, metadata: { name: created.name, slug: created.slug, affiliateUrl: created.affiliateUrl } });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  }

  return apiError('Admin route not found', 404);
}

// ── PUT Handler ──────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const adminError = await requireAdmin(user);
  if (adminError) return adminError;

  const { path } = await params;
  const [section, sub, detail] = path ?? [];
  const db = getDatabase();
  const actor = { id: user.id, email: user.email };
  const body = await req.json().catch(() => ({}));

  // PUT /admin/config/:key
  if (section === 'config' && sub) {
    const parsed = updateConfigSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const key = sub;
    await configManager.set(key, parsed.data.value as never);
    await db.update(adminConfigs).set({ updatedBy: actor.email }).where(eq(adminConfigs.key, key));
    await recordAdminAudit({ actor, action: 'config.update', entityType: 'admin_config', entityId: key, metadata: { changed: true }, ipAddress: req.headers.get('x-forwarded-for') ?? undefined });
    return ok({ key, value: parsed.data.value, message: 'Configuration updated' });
  }

  // PUT /admin/tax-rates/:id
  if (section === 'tax-rates' && sub) {
    const parsed = taxRateSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const [updated] = await db.update(taxRates).set({ ...(parsed.data as any), updatedAt: new Date() }).where(eq(taxRates.id, sub)).returning();
    if (!updated) return apiError('Tax rate not found', 404);
    return ok(updated);
  }

  // PUT /admin/users/:id/role
  if (section === 'users' && sub && detail === 'role') {
    const parsed = updateUserRoleSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    if (actor.id === sub) return apiError('Cannot change your own role', 403);
    const [updated] = await db.update(users).set({ role: parsed.data.role, updatedAt: new Date() }).where(eq(users.id, sub)).returning({ id: users.id, email: users.email, name: users.name, role: users.role });
    if (!updated) return apiError('User not found', 404);
    await recordAdminAudit({ actor, action: 'user.role.update', entityType: 'user', entityId: sub, metadata: { role: parsed.data.role }, ipAddress: req.headers.get('x-forwarded-for') ?? undefined });
    return ok(updated);
  }

  // PUT /admin/plans/:id
  if (section === 'plans' && sub) {
    const parsed = updatePlanSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const [updated] = await db.update(plans).set({ ...(parsed.data as any), updatedAt: new Date() }).where(eq(plans.id, sub)).returning();
    if (!updated) return apiError('Plan not found', 404);
    await recordAdminAudit({ actor, action: 'plan.update', entityType: 'plan', entityId: sub, metadata: { changedFields: Object.keys(parsed.data) }, ipAddress: req.headers.get('x-forwarded-for') ?? undefined });
    return ok(updated);
  }

  // PUT /admin/subscriptions/:id
  if (section === 'subscriptions' && sub) {
    const parsed = updateSubSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const [updated] = await db.update(subscriptions).set({ ...parsed.data, updatedAt: new Date() }).where(eq(subscriptions.id, sub)).returning();
    if (!updated) return apiError('Subscription not found', 404);
    await recordAdminAudit({ actor, action: 'subscription.update', entityType: 'subscription', entityId: sub, metadata: parsed.data, ipAddress: req.headers.get('x-forwarded-for') ?? undefined });
    return ok(updated);
  }

  // PUT /admin/products/:id
  if (section === 'products' && sub) {
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const b = parsed.data;
    const [existing] = await db.select().from(products).where(eq(products.id, sub)).limit(1);
    if (!existing) return apiError('Product not found', 404);
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (b.title !== undefined) updateData.title = b.title;
    if (b.description !== undefined) updateData.description = b.description;
    if (b.longDescription !== undefined) updateData.longDescription = b.longDescription;
    if (b.productType !== undefined) updateData.productType = b.productType;
    if (b.price !== undefined) updateData.price = b.price;
    if (b.currency !== undefined) updateData.currency = b.currency;
    if (b.downloadUrl !== undefined) updateData.downloadUrl = b.downloadUrl;
    if (b.videoUrl !== undefined) updateData.videoUrl = b.videoUrl;
    if (b.previewImageUrl !== undefined) updateData.previewImageUrl = b.previewImageUrl;
    if (b.tags !== undefined) updateData.tags = b.tags;
    if (b.metadata !== undefined) updateData.metadata = b.metadata;
    if (b.isActive !== undefined) updateData.isActive = b.isActive;
    if (b.isFree !== undefined) { updateData.isFree = b.isFree; if (b.isFree) updateData.price = 0; }
    if (b.sortOrder !== undefined) updateData.sortOrder = b.sortOrder;
    const [updated] = await db.update(products).set(updateData).where(eq(products.id, sub)).returning();
    await recordAdminAudit({ actor, action: 'ADMIN_PRODUCT_UPDATED', entityType: 'product', entityId: sub, metadata: { changedFields: Object.keys(parsed.data) } });
    return ok(updated);
  }

  // PUT /admin/partners/:id
  if (section === 'partners' && sub) {
    const parsed = partnerAdminSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const b = parsed.data;
    const [existing] = await db.select().from(partners).where(eq(partners.id, sub)).limit(1);
    if (!existing) return apiError('Partner not found', 404);
    const slug = b.slug?.trim() || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const [updated] = await db.update(partners).set({ name: b.name, slug, logoUrl: b.logoUrl ?? null, websiteUrl: b.websiteUrl ?? null, affiliateUrl: b.affiliateUrl, description: b.description ?? null, category: b.category, country: b.country, isFeatured: b.isFeatured, isActive: b.isActive, displayOrder: b.displayOrder, commissionNote: b.commissionNote ?? null, tag: b.tag ?? null, features: b.features, rating: b.rating, accountOpeningFee: b.accountOpeningFee, maintenanceCharges: b.maintenanceCharges, updatedAt: new Date() }).where(eq(partners.id, sub)).returning();
    if (!updated) return apiError('Failed to update partner', 500);
    await recordAdminAudit({ actor, action: 'ADMIN_PARTNER_UPDATED', entityType: 'partner', entityId: sub, metadata: { previous: existing, updated } });
    return ok(updated);
  }

  return apiError('Admin route not found', 404);
}

// ── PATCH Handler ────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const adminError = await requireAdmin(user);
  if (adminError) return adminError;

  const { path } = await params;
  const [section, sub, detail] = path ?? [];
  const db = getDatabase();
  const actor = { id: user.id, email: user.email };
  const body = await req.json().catch(() => ({}));

  // PATCH /admin/reviews/:id/approve|reject|feature
  if (section === 'reviews' && sub) {
    if (detail === 'approve') {
      const [updated] = await db.update(reviews).set({ isApproved: true, updatedAt: new Date() }).where(eq(reviews.id, sub)).returning();
      if (!updated) return apiError('Review not found', 404);
      await recordAdminAudit({ actor, action: 'ADMIN_REVIEW_APPROVED', entityType: 'review', entityId: sub, metadata: { headline: updated.headline, rating: updated.rating } });
      return ok(updated, { message: 'Review approved' } as any);
    }
    if (detail === 'reject') {
      const [updated] = await db.update(reviews).set({ isApproved: false, isFeatured: false, updatedAt: new Date() }).where(eq(reviews.id, sub)).returning();
      if (!updated) return apiError('Review not found', 404);
      await recordAdminAudit({ actor, action: 'ADMIN_REVIEW_REJECTED', entityType: 'review', entityId: sub, metadata: { headline: updated.headline } });
      return ok(updated, { message: 'Review rejected' } as any);
    }
    if (detail === 'feature') {
      const isFeatured = typeof body.isFeatured === 'boolean' ? body.isFeatured : true;
      const [updated] = await db.update(reviews).set({ isFeatured, isApproved: true, updatedAt: new Date() }).where(eq(reviews.id, sub)).returning();
      if (!updated) return apiError('Review not found', 404);
      await recordAdminAudit({ actor, action: 'ADMIN_REVIEW_FEATURE_TOGGLED', entityType: 'review', entityId: sub, metadata: { isFeatured } });
      return ok(updated);
    }
  }

  // PATCH /admin/leaderboard/:userId
  if (section === 'leaderboard' && sub) {
    const parsed = adminLeaderboardActionSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    const b = parsed.data;
    const isPublic = b.action === 'disqualify' ? false : b.action === 'reinstate' ? true : b.isPublic ?? false;
    const [updated] = await db.update(leaderboardOptIns).set({ isPublic, updatedAt: new Date() }).where(eq(leaderboardOptIns.userId, sub)).returning();
    if (!updated) return apiError('Leaderboard opt-in not found for this user', 404);
    if (!isPublic || b.action === 'delete_snapshot') await db.delete(leaderboardSnapshots).where(eq(leaderboardSnapshots.userId, sub));
    await recordAdminAudit({ actor, action: isPublic ? 'ADMIN_LEADERBOARD_REINSTATED' : 'ADMIN_LEADERBOARD_DISQUALIFIED', entityType: 'leaderboard_opt_in', entityId: sub, metadata: { isPublic, action: b.action } });
    return ok(updated, { message: isPublic ? 'User reinstated to leaderboard' : 'User disqualified and hidden from leaderboard' } as any);
  }

  // PATCH /admin/partners/:id/toggle
  if (section === 'partners' && sub && detail === 'toggle') {
    const [existing] = await db.select().from(partners).where(eq(partners.id, sub)).limit(1);
    if (!existing) return apiError('Partner not found', 404);
    const [updated] = await db.update(partners).set({ isActive: !existing.isActive, updatedAt: new Date() }).where(eq(partners.id, sub)).returning();
    if (!updated) return apiError('Failed to update partner', 500);
    await recordAdminAudit({ actor, action: 'ADMIN_PARTNER_STATUS_TOGGLED', entityType: 'partner', entityId: sub, metadata: { name: existing.name, newActiveState: updated.isActive } });
    return ok(updated);
  }

  // PATCH /admin/partners/reorder
  if (section === 'partners' && sub === 'reorder') {
    const parsed = partnerReorderSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400);
    for (const item of parsed.data.items) {
      await db.update(partners).set({ displayOrder: item.displayOrder, updatedAt: new Date() }).where(eq(partners.id, item.id));
    }
    await recordAdminAudit({ actor, action: 'ADMIN_PARTNERS_REORDERED', entityType: 'partner', entityId: 'multiple', metadata: { count: parsed.data.items.length } });
    return ok({ message: 'Partners reordered successfully' });
  }

  // PATCH /admin/feature-flags/:id
  if (section === 'feature-flags' && sub) {
    const [existing] = await db.select().from(featureFlags).where(eq(featureFlags.id, sub)).limit(1);
    if (!existing) return apiError('Feature flag not found', 404);
    const [updated] = await db.update(featureFlags).set({ isEnabled: body.isEnabled !== undefined ? Boolean(body.isEnabled) : existing.isEnabled, description: body.description ?? existing.description, rules: body.rules ?? existing.rules, updatedAt: new Date() }).where(eq(featureFlags.id, sub)).returning();
    await recordAdminAudit({ actor, action: 'FEATURE_FLAG_UPDATED', entityType: 'feature_flag', entityId: sub, metadata: { name: existing.name, isEnabled: updated!.isEnabled } });
    return ok(updated);
  }

  return apiError('Admin route not found', 404);
}

// ── DELETE Handler ───────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const adminError = await requireAdmin(user);
  if (adminError) return adminError;

  const { path } = await params;
  const [section, sub, detail, extra] = path ?? [];
  const db = getDatabase();
  const actor = { id: user.id, email: user.email };
  const url = new URL(req.url);

  // DELETE /admin/tax-rates/:id
  if (section === 'tax-rates' && sub) {
    await db.delete(taxRates).where(eq(taxRates.id, sub));
    return ok({ message: 'Tax rate deleted' });
  }

  // DELETE /admin/users/:id
  if (section === 'users' && sub && !detail) {
    if (actor.id === sub) return apiError('Cannot delete your own admin account', 403);
    const [existingUser] = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role }).from(users).where(eq(users.id, sub)).limit(1);
    if (!existingUser) return apiError('User not found', 404);
    await db.delete(users).where(eq(users.id, sub));
    try { const supabase = getSupabaseAdmin(); await supabase.auth.admin.deleteUser(sub); } catch {}
    await recordAdminAudit({ actor, action: 'user.delete', entityType: 'user', entityId: sub, metadata: { email: existingUser.email, name: existingUser.name, role: existingUser.role }, ipAddress: req.headers.get('x-forwarded-for') ?? undefined });
    return ok({ message: `User ${existingUser.email} deleted successfully` });
  }

  // DELETE /admin/plans/:id
  if (section === 'plans' && sub) {
    const [deactivated] = await db.update(plans).set({ isActive: false, updatedAt: new Date() }).where(eq(plans.id, sub)).returning({ id: plans.id, slug: plans.slug });
    if (!deactivated) return apiError('Plan not found', 404);
    await recordAdminAudit({ actor, action: 'plan.delete', entityType: 'plan', entityId: sub, metadata: { slug: deactivated.slug, action: 'deactivated' }, ipAddress: req.headers.get('x-forwarded-for') ?? undefined });
    return ok({ message: 'Plan deleted' });
  }

  // DELETE /admin/products/:id
  if (section === 'products' && sub && !detail) {
    const [deleted] = await db.delete(products).where(eq(products.id, sub)).returning();
    if (!deleted) return apiError('Product not found', 404);
    await recordAdminAudit({ actor, action: 'ADMIN_PRODUCT_DELETED', entityType: 'product', entityId: sub, metadata: { title: deleted.title } });
    return ok({ message: 'Product deleted successfully' });
  }

  // DELETE /admin/products/:id/revoke/:userId
  if (section === 'products' && sub && detail === 'revoke' && extra) {
    await db.delete(productAccess).where(and(eq(productAccess.productId, sub), eq(productAccess.userId, extra)));
    await recordAdminAudit({ actor, action: 'ADMIN_PRODUCT_ACCESS_REVOKED', entityType: 'product_access', entityId: `${sub}:${extra}`, metadata: { productId: sub, targetUserId: extra } });
    return ok({ message: 'Access revoked successfully' });
  }

  // DELETE /admin/reviews/:id
  if (section === 'reviews' && sub) {
    const [deleted] = await db.delete(reviews).where(eq(reviews.id, sub)).returning();
    if (!deleted) return apiError('Review not found', 404);
    await recordAdminAudit({ actor, action: 'ADMIN_REVIEW_DELETED', entityType: 'review', entityId: sub, metadata: { headline: deleted.headline } });
    return ok({ message: 'Review deleted successfully' });
  }

  // DELETE /admin/partners/:id
  if (section === 'partners' && sub) {
    const [existing] = await db.select().from(partners).where(eq(partners.id, sub)).limit(1);
    if (!existing) return apiError('Partner not found', 404);
    await db.delete(partners).where(eq(partners.id, sub));
    await recordAdminAudit({ actor, action: 'ADMIN_PARTNER_DELETED', entityType: 'partner', entityId: sub, metadata: { name: existing.name, slug: existing.slug } });
    return ok({ message: 'Partner deleted successfully' });
  }

  // DELETE /admin/feature-flags/:id
  if (section === 'feature-flags' && sub) {
    const [deleted] = await db.delete(featureFlags).where(eq(featureFlags.id, sub)).returning();
    if (!deleted) return apiError('Feature flag not found', 404);
    await recordAdminAudit({ actor, action: 'FEATURE_FLAG_DELETED', entityType: 'feature_flag', entityId: sub, metadata: { name: deleted.name } });
    return ok({ message: 'Feature flag deleted' });
  }

  // DELETE /admin/cache
  if (section === 'cache') {
    const pattern = url.searchParams.get('pattern') ?? '*';
    await invalidateCache(pattern);
    await recordAdminAudit({ actor, action: 'ADMIN_CACHE_FLUSHED', entityType: 'cache', entityId: pattern, metadata: { pattern } });
    return ok({ message: `Cache flushed for pattern "${pattern}"` });
  }

  return apiError('Admin route not found', 404);
}
