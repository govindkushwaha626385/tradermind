// ──────────────────────────────────────────────
// TradeMind — Discipline Engine Routes
// GET  /api/v1/discipline/checklists
// POST /api/v1/discipline/checklists
// PUT  /api/v1/discipline/checklists/[id]
// DELETE /api/v1/discipline/checklists/[id]
// GET  /api/v1/discipline/trade-checklists/[tradeId]
// POST /api/v1/discipline/trade-checklists
// GET  /api/v1/discipline/plans/[tradeId]
// POST /api/v1/discipline/plans
// GET  /api/v1/discipline/ratings/[tradeId]
// POST /api/v1/discipline/ratings
// GET  /api/v1/discipline/stats
// GET  /api/v1/discipline/streaks
// GET  /api/v1/discipline/premarket
// POST /api/v1/discipline/premarket
// POST /api/v1/discipline/premarket/lock
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDatabase, checklistTemplates, tradeChecklists, tradePlans, tradeRatings, journalTrades } from '@trademind/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, created, notFound, apiError, parseBody } from '@/lib/server/response';
import { calculateStreaks } from '@/lib/server/services/analytics/advanced-analytics.service';
import { getTodayPremarketPlan, savePremarketPlan, lockPremarketSession } from '@/lib/server/services/premarket.service';

export const runtime = 'nodejs';

// ── Schemas ──────────────────────────────────────────────────

const checklistRuleSchema = z.object({ id: z.string(), label: z.string().min(1).max(500), order: z.number().int().min(0) });
const checklistTemplateSchema = z.object({ name: z.string().min(1).max(255), description: z.string().max(1000).optional(), rules: z.array(checklistRuleSchema).default([]), setupPlaybookId: z.string().uuid().optional(), isActive: z.boolean().default(true), sortOrder: z.number().int().default(0) });
const checklistResultSchema = z.object({ ruleId: z.string(), label: z.string().min(1).max(500), passed: z.boolean() });
const tradeChecklistSchema = z.object({ journalTradeId: z.string().uuid(), checklistTemplateId: z.string().uuid(), results: z.array(checklistResultSchema) });
const tradePlanSchema = z.object({ journalTradeId: z.string().uuid(), plannedEntryPrice: z.number().optional(), plannedStopLoss: z.number().optional(), plannedTakeProfit: z.number().optional(), plannedQuantity: z.number().optional(), plannedRiskAmount: z.number().optional(), plannedRR: z.number().optional() });
const tradeRatingSchema = z.object({ journalTradeId: z.string().uuid(), executionRating: z.number().min(1).max(5).optional(), planRating: z.number().min(1).max(5).optional(), psychologyRating: z.number().min(1).max(5).optional(), emotions: z.array(z.string()).optional(), mistakeTags: z.array(z.string()).optional(), reflection: z.string().max(5000).optional(), lessonLearned: z.string().max(2000).optional(), followedPlan: z.boolean().optional(), wouldChange: z.boolean().optional(), whatWouldChange: z.string().max(2000).optional() });

// ── GET ───────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const rl = await checkRateLimit(req, user.id);
  if (rl) return rl;

  const { path } = await params;
  const [section, id] = path ?? [];
  const db = getDatabase();

  if (section === 'checklists') {
    const templates = await db.select().from(checklistTemplates).where(eq(checklistTemplates.userId, user.id)).orderBy(checklistTemplates.sortOrder);
    return ok(templates);
  }

  if (section === 'trade-checklists' && id) {
    const [checklist] = await db.select().from(tradeChecklists).where(and(eq(tradeChecklists.journalTradeId, id), eq(tradeChecklists.userId, user.id))).limit(1);
    return ok(checklist ?? null);
  }

  if (section === 'plans' && id) {
    const [plan] = await db.select().from(tradePlans).where(and(eq(tradePlans.journalTradeId, id), eq(tradePlans.userId, user.id))).limit(1);
    return ok(plan ?? null);
  }

  if (section === 'ratings' && id) {
    const [rating] = await db.select().from(tradeRatings).where(and(eq(tradeRatings.journalTradeId, id), eq(tradeRatings.userId, user.id))).limit(1);
    return ok(rating ?? null);
  }

  if (section === 'stats') {
    const [complianceResult] = await db.select({ avgCompliance: sql<number>`AVG(compliance_score)`.as('avg_compliance'), totalChecked: sql<number>`COUNT(*)`.as('total_checked') }).from(tradeChecklists).where(eq(tradeChecklists.userId, user.id));
    const [adherenceResult] = await db.select({ avgAdherence: sql<number>`AVG(plan_adherence_score)`.as('avg_adherence'), totalPlanned: sql<number>`COUNT(*)`.as('total_planned') }).from(tradePlans).where(eq(tradePlans.userId, user.id));
    const mistakeCostsRaw = await db.execute(sql`SELECT unnest(mistake_tags) AS mistake_tag, SUM(net_pnl) AS total_pnl, COUNT(*) AS trade_count FROM journal_trades WHERE user_id = ${user.id} AND mistake_tags IS NOT NULL GROUP BY mistake_tag ORDER BY total_pnl ASC`);
    const mistakeCosts = Array.isArray(mistakeCostsRaw) ? mistakeCostsRaw : [];
    const [avgRatings] = await db.select({ avgExecution: sql<number>`AVG(execution_rating)`, avgPlan: sql<number>`AVG(plan_rating)`, avgPsychology: sql<number>`AVG(psychology_rating)` }).from(tradeRatings).where(eq(tradeRatings.userId, user.id));
    const planComparison = await db.select({ followedPlan: tradeRatings.followedPlan, avgPnl: sql<number>`AVG(${journalTrades.netPnl})`, tradeCount: sql<number>`COUNT(*)` }).from(tradeRatings).innerJoin(journalTrades, eq(tradeRatings.journalTradeId, journalTrades.id)).where(eq(tradeRatings.userId, user.id)).groupBy(tradeRatings.followedPlan);
    const emotionPnlRaw = await db.execute(sql`SELECT unnest(emotions) AS emotion, AVG(net_pnl) AS avg_pnl, COUNT(*) AS trade_count FROM journal_trades WHERE user_id = ${user.id} AND emotions IS NOT NULL GROUP BY emotion ORDER BY avg_pnl ASC`);
    const emotionPnl = Array.isArray(emotionPnlRaw) ? emotionPnlRaw : [];
    return ok({ compliance: { avgCompliance: Number(complianceResult?.avgCompliance ?? 0) * 100, totalChecked: Number(complianceResult?.totalChecked ?? 0) }, planAdherence: { avgAdherence: Number(adherenceResult?.avgAdherence ?? 0) * 100, totalPlanned: Number(adherenceResult?.totalPlanned ?? 0) }, mistakeCosts: mistakeCosts.map((m: any) => ({ mistake: m.mistake_tag, totalCost: Number(m.total_pnl ?? 0), tradeCount: Number(m.trade_count ?? 0) })), avgRatings: { execution: Number(avgRatings?.avgExecution ?? 0).toFixed(1), plan: Number(avgRatings?.avgPlan ?? 0).toFixed(1), psychology: Number(avgRatings?.avgPsychology ?? 0).toFixed(1) }, planComparison: planComparison.map((p: any) => ({ followedPlan: p.followedPlan, avgPnl: Number(p.avgPnl ?? 0), tradeCount: Number(p.tradeCount ?? 0) })), emotionPnl: emotionPnl.map((e: any) => ({ emotion: e.emotion, avgPnl: Number(e.avg_pnl ?? 0), tradeCount: Number(e.trade_count ?? 0) })) });
  }

  if (section === 'streaks') {
    const trades = await db.select({ netPnl: journalTrades.netPnl }).from(journalTrades).where(and(eq(journalTrades.userId, user.id), eq(journalTrades.status, 'CLOSED'))).orderBy(journalTrades.closedAt);
    const streaks = calculateStreaks(trades.map((t) => ({ netPnl: t.netPnl ?? 0 })));
    return ok({ currentWinStreak: streaks.currentWinStreak, currentLossStreak: streaks.currentLossStreak, maxWinStreak: streaks.longestWinStreak, maxLossStreak: streaks.longestLossStreak });
  }

  if (section === 'premarket') {
    try {
      const plan = await getTodayPremarketPlan(user.id);
      return ok(plan);
    } catch (err: any) {
      return apiError(err?.message ?? 'Failed to fetch premarket plan', 500);
    }
  }

  return apiError('Route not found', 404);
}

// ── POST ──────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const [section, sub] = path ?? [];
  const db = getDatabase();

  if (section === 'checklists') {
    const { data: body, error: bodyErr } = await parseBody(req, checklistTemplateSchema);
    if (bodyErr) return bodyErr;
    const [template] = await db.insert(checklistTemplates).values({ userId: user.id, name: body.name, description: body.description, rules: body.rules as any, setupPlaybookId: body.setupPlaybookId, isActive: body.isActive, sortOrder: body.sortOrder }).returning();
    return created(template);
  }

  if (section === 'trade-checklists') {
    const { data: body, error: bodyErr } = await parseBody(req, tradeChecklistSchema);
    if (bodyErr) return bodyErr;
    const [trade] = await db.select().from(journalTrades).where(and(eq(journalTrades.id, body.journalTradeId), eq(journalTrades.userId, user.id))).limit(1);
    if (!trade) return notFound('Trade not found');
    const passedCount = body.results.filter((r: any) => r.passed).length;
    const complianceScore = body.results.length > 0 ? passedCount / body.results.length : 0;
    const [existing] = await db.select().from(tradeChecklists).where(and(eq(tradeChecklists.journalTradeId, body.journalTradeId), eq(tradeChecklists.userId, user.id))).limit(1);
    let result;
    if (existing) {
      [result] = await db.update(tradeChecklists).set({ results: body.results as any, complianceScore: complianceScore as any, completedAt: new Date() }).where(eq(tradeChecklists.id, existing.id)).returning();
    } else {
      [result] = await db.insert(tradeChecklists).values({ userId: user.id, journalTradeId: body.journalTradeId, checklistTemplateId: body.checklistTemplateId, results: body.results as any, complianceScore: complianceScore as any }).returning();
    }
    await db.update(journalTrades).set({ ruleComplianceScore: complianceScore }).where(eq(journalTrades.id, body.journalTradeId));
    return ok(result);
  }

  if (section === 'plans') {
    const { data: body, error: bodyErr } = await parseBody(req, tradePlanSchema);
    if (bodyErr) return bodyErr;
    const [trade] = await db.select().from(journalTrades).where(and(eq(journalTrades.id, body.journalTradeId), eq(journalTrades.userId, user.id))).limit(1);
    if (!trade) return notFound('Trade not found');
    let adherenceScore: number | undefined, entrySlippage: number | undefined, exitSlippage: number | undefined;
    if (trade.status === 'CLOSED' && body.plannedEntryPrice) {
      entrySlippage = Math.abs(body.plannedEntryPrice - (trade.avgEntryPrice ?? 0));
      if (body.plannedStopLoss && trade.avgExitPrice) {
        exitSlippage = Number(trade.netPnl ?? 0) < 0 ? Math.abs(body.plannedStopLoss - trade.avgExitPrice) : body.plannedTakeProfit ? Math.abs(body.plannedTakeProfit - trade.avgExitPrice) : undefined;
      }
      const maxSlippage = Math.max(entrySlippage, exitSlippage ?? 0);
      const price = trade.avgEntryPrice ?? 1;
      adherenceScore = Math.max(0, 1 - (maxSlippage / price) * 10);
    }
    const values = { userId: user.id, journalTradeId: body.journalTradeId, plannedEntryPrice: body.plannedEntryPrice, plannedStopLoss: body.plannedStopLoss, plannedTakeProfit: body.plannedTakeProfit, plannedQuantity: body.plannedQuantity, plannedRiskAmount: body.plannedRiskAmount, plannedRR: body.plannedRR, planAdherenceScore: adherenceScore, entrySlippage, exitSlippage };
    const [existing] = await db.select().from(tradePlans).where(and(eq(tradePlans.journalTradeId, body.journalTradeId), eq(tradePlans.userId, user.id))).limit(1);
    let result;
    if (existing) { [result] = await db.update(tradePlans).set(values).where(eq(tradePlans.id, existing.id)).returning(); }
    else { [result] = await db.insert(tradePlans).values(values).returning(); }
    return ok(result);
  }

  if (section === 'ratings') {
    const { data: body, error: bodyErr } = await parseBody(req, tradeRatingSchema);
    if (bodyErr) return bodyErr;
    const [trade] = await db.select().from(journalTrades).where(and(eq(journalTrades.id, body.journalTradeId), eq(journalTrades.userId, user.id))).limit(1);
    if (!trade) return notFound('Trade not found');
    const values = { userId: user.id, journalTradeId: body.journalTradeId, executionRating: body.executionRating, planRating: body.planRating, psychologyRating: body.psychologyRating, emotions: body.emotions as any, mistakeTags: body.mistakeTags as any, reflection: body.reflection, lessonLearned: body.lessonLearned, followedPlan: body.followedPlan, wouldChange: body.wouldChange, whatWouldChange: body.whatWouldChange };
    if (body.emotions || body.mistakeTags) await db.update(journalTrades).set({ emotions: (body.emotions ?? trade.emotions) as any, mistakeTags: (body.mistakeTags ?? trade.mistakeTags) as any }).where(eq(journalTrades.id, body.journalTradeId));
    const [existing] = await db.select().from(tradeRatings).where(and(eq(tradeRatings.journalTradeId, body.journalTradeId), eq(tradeRatings.userId, user.id))).limit(1);
    let result;
    if (existing) { [result] = await db.update(tradeRatings).set(values).where(eq(tradeRatings.id, existing.id)).returning(); }
    else { [result] = await db.insert(tradeRatings).values(values).returning(); }
    return ok(result);
  }

  if (section === 'premarket') {
    try {
      if (sub === 'lock') {
        const locked = await lockPremarketSession(user.id);
        return ok(locked);
      }
      const body = await req.json();
      const saved = await savePremarketPlan(user.id, body);
      return ok(saved);
    } catch (err: any) {
      return apiError(err?.message ?? 'Failed to save premarket plan', 500);
    }
  }

  return apiError('Route not found', 404);
}

// ── PUT ───────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const [section, id] = path ?? [];
  const db = getDatabase();

  if (section === 'checklists' && id) {
    const { data: body, error: bodyErr } = await parseBody(req, checklistTemplateSchema.partial());
    if (bodyErr) return bodyErr;
    const [existing] = await db.select().from(checklistTemplates).where(and(eq(checklistTemplates.id, id), eq(checklistTemplates.userId, user.id))).limit(1);
    if (!existing) return notFound('Checklist not found');
    const [updated] = await db.update(checklistTemplates).set(body).where(eq(checklistTemplates.id, id)).returning();
    return ok(updated);
  }

  return apiError('Route not found', 404);
}

// ── DELETE ────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const [section, id] = path ?? [];
  const db = getDatabase();

  if (section === 'checklists' && id) {
    const [existing] = await db.select().from(checklistTemplates).where(and(eq(checklistTemplates.id, id), eq(checklistTemplates.userId, user.id))).limit(1);
    if (!existing) return notFound('Checklist not found');
    await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
    return ok({ message: 'Checklist deleted' });
  }

  return apiError('Route not found', 404);
}
