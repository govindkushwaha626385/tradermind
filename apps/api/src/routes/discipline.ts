// ──────────────────────────────────────────────
// TradeMind — Discipline Engine Routes
//
// Endpoints for:
//   - Checklist templates (CRUD)
//   - Trade checklists (fill per trade)
//   - Trade plans (planned vs actual)
//   - Trade ratings (self-reflection)
//   - Discipline analytics & insights
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabase, checklistTemplates, tradeChecklists, tradePlans, tradeRatings, journalTrades } from '@trademind/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { calculateStreaks } from '../services/analytics/advanced-analytics.service';
import {
  getTodayPremarketPlan,
  savePremarketPlan,
  lockPremarketSession,
} from '../services/premarket.service';

export const disciplineRouter = new Hono();
disciplineRouter.use('*', authMiddleware);

// ══��═══════════════════════════════════════════
//  Zod Schemas
// ══════════════════════════════════════════════

const checklistRuleSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(500),
  order: z.number().int().min(0),
});

const checklistTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  rules: z.array(checklistRuleSchema).default([]),
  setupPlaybookId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const checklistResultSchema = z.object({
  ruleId: z.string(),
  label: z.string().min(1).max(500),
  passed: z.boolean(),
});

const tradeChecklistSchema = z.object({
  journalTradeId: z.string().uuid(),
  checklistTemplateId: z.string().uuid(),
  results: z.array(checklistResultSchema),
});

const tradePlanSchema = z.object({
  journalTradeId: z.string().uuid(),
  plannedEntryPrice: z.number().optional(),
  plannedStopLoss: z.number().optional(),
  plannedTakeProfit: z.number().optional(),
  plannedQuantity: z.number().optional(),
  plannedRiskAmount: z.number().optional(),
  plannedRR: z.number().optional(),
});

const tradeRatingSchema = z.object({
  journalTradeId: z.string().uuid(),
  executionRating: z.number().min(1).max(5).optional(),
  planRating: z.number().min(1).max(5).optional(),
  psychologyRating: z.number().min(1).max(5).optional(),
  emotions: z.array(z.string()).optional(),
  mistakeTags: z.array(z.string()).optional(),
  reflection: z.string().max(5000).optional(),
  lessonLearned: z.string().max(2000).optional(),
  followedPlan: z.boolean().optional(),
  wouldChange: z.boolean().optional(),
  whatWouldChange: z.string().max(2000).optional(),
});

// ══════════════════════════════════════════════
//  1. CHECKLIST TEMPLATES
// ══════════════════════════════════════════════

/**
 * GET /discipline/checklists — List all checklist templates
 */
disciplineRouter.get('/checklists', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const templates = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.userId, user.id))
    .orderBy(checklistTemplates.sortOrder);

  return c.json({ success: true, data: templates });
});

/**
 * POST /discipline/checklists — Create a new checklist template
 */
disciplineRouter.post('/checklists', validateBody(checklistTemplateSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  const [template] = await db.insert(checklistTemplates).values({
    userId: user.id,
    name: body.name,
    description: body.description,
    rules: body.rules as any,
    setupPlaybookId: body.setupPlaybookId,
    isActive: body.isActive,
    sortOrder: body.sortOrder,
  }).returning();

  return c.json({ success: true, data: template }, 201);
});

/**
 * PUT /discipline/checklists/:id — Update a checklist template
 */
disciplineRouter.put('/checklists/:id', validateBody(checklistTemplateSchema.partial()), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!id) return c.json({ success: false, error: { message: 'Missing checklist ID' } }, 400);
  const body = c.get('validatedBody');
  const db = getDatabase();

  const [existing] = await db
    .select()
    .from(checklistTemplates)
    .where(and(eq(checklistTemplates.id, id), eq(checklistTemplates.userId, user.id)))
    .limit(1);

  if (!existing) return c.json({ success: false, error: { message: 'Checklist not found' } }, 404);

  const [updated] = await db.update(checklistTemplates)
    .set(body)
    .where(eq(checklistTemplates.id, id))
    .returning();

  return c.json({ success: true, data: updated });
});

/**
 * DELETE /discipline/checklists/:id — Delete a checklist template
 */
disciplineRouter.delete('/checklists/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!id) return c.json({ success: false, error: { message: 'Missing checklist ID' } }, 400);
  const db = getDatabase();

  const [existing] = await db
    .select()
    .from(checklistTemplates)
    .where(and(eq(checklistTemplates.id, id), eq(checklistTemplates.userId, user.id)))
    .limit(1);

  if (!existing) return c.json({ success: false, error: { message: 'Checklist not found' } }, 404);

  await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));

  return c.json({ success: true, data: { message: 'Checklist deleted' } });
});

// ══════════════════════════════════════════════
//  2. TRADE CHECKLISTS (filled per trade)
// ══════════════════════════════════════════════

/**
 * GET /discipline/trade-checklists/:tradeId — Get checklist for a trade
 */
disciplineRouter.get('/trade-checklists/:tradeId', async (c) => {
  const user = c.get('user');
  const tradeId = c.req.param('tradeId');
  const db = getDatabase();

  const [checklist] = await db
    .select()
    .from(tradeChecklists)
    .where(and(eq(tradeChecklists.journalTradeId, tradeId), eq(tradeChecklists.userId, user.id)))
    .limit(1);

  return c.json({ success: true, data: checklist ?? null });
});

/**
 * POST /discipline/trade-checklists — Save checklist for a trade
 */
disciplineRouter.post('/trade-checklists', validateBody(tradeChecklistSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  // Verify trade belongs to user
  const [trade] = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.id, body.journalTradeId), eq(journalTrades.userId, user.id)))
    .limit(1);

  if (!trade) return c.json({ success: false, error: { message: 'Trade not found' } }, 404);

  // Calculate compliance score
  const passedCount = body.results.filter((r: any) => r.passed).length;
  const complianceScore = body.results.length > 0 ? passedCount / body.results.length : 0;

  // Upsert (one checklist per trade)
  const [existing] = await db
    .select()
    .from(tradeChecklists)
    .where(and(eq(tradeChecklists.journalTradeId, body.journalTradeId), eq(tradeChecklists.userId, user.id)))
    .limit(1);

  let result;
  if (existing) {
    [result] = await db.update(tradeChecklists)
      .set({
        results: body.results as any,
        complianceScore: complianceScore as any,
        completedAt: new Date(),
      })
      .where(eq(tradeChecklists.id, existing.id))
      .returning();
  } else {
    [result] = await db.insert(tradeChecklists).values({
      userId: user.id,
      journalTradeId: body.journalTradeId,
      checklistTemplateId: body.checklistTemplateId,
      results: body.results as any,
      complianceScore: complianceScore as any,
    }).returning();
  }

  // Update the journal trade's ruleComplianceScore
  await db.update(journalTrades)
    .set({ ruleComplianceScore: complianceScore })
    .where(eq(journalTrades.id, body.journalTradeId));

  return c.json({ success: true, data: result }, existing ? 200 : 201);
});

// ══════════════════════════════════════════════
//  3. TRADE PLANS (planned vs actual)
// ══════════════════════════════════════════════

/**
 * GET /discipline/plans/:tradeId — Get plan for a trade
 */
disciplineRouter.get('/plans/:tradeId', async (c) => {
  const user = c.get('user');
  const tradeId = c.req.param('tradeId');
  const db = getDatabase();

  const [plan] = await db
    .select()
    .from(tradePlans)
    .where(and(eq(tradePlans.journalTradeId, tradeId), eq(tradePlans.userId, user.id)))
    .limit(1);

  return c.json({ success: true, data: plan ?? null });
});

/**
 * POST /discipline/plans — Create or update a trade plan
 */
disciplineRouter.post('/plans', validateBody(tradePlanSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  // Verify trade belongs to user
  const [trade] = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.id, body.journalTradeId), eq(journalTrades.userId, user.id)))
    .limit(1);

  if (!trade) return c.json({ success: false, error: { message: 'Trade not found' } }, 404);

  // Compute plan adherence after trade is closed
  let adherenceScore: number | undefined;
  let entrySlippage: number | undefined;
  let exitSlippage: number | undefined;

  if (trade.status === 'CLOSED' && body.plannedEntryPrice) {
    entrySlippage = Math.abs(body.plannedEntryPrice - (trade.avgEntryPrice ?? 0));

    if (body.plannedStopLoss && trade.avgExitPrice) {
      if (trade.netPnl < 0) {
        // Losing trade — check if SL was respected
        exitSlippage = Math.abs(body.plannedStopLoss - trade.avgExitPrice);
      } else if (body.plannedTakeProfit) {
        // Winning trade — check if TP was respected
        exitSlippage = Math.abs(body.plannedTakeProfit - trade.avgExitPrice);
      }
    }

    // Simple adherence: 1.0 if slippage < 0.1%, degrades linearly
    const maxSlippage = Math.max(entrySlippage, exitSlippage ?? 0);
    const price = trade.avgEntryPrice ?? 1;
    adherenceScore = Math.max(0, 1 - (maxSlippage / price) * 10);
  }

  // Upsert
  const [existing] = await db
    .select()
    .from(tradePlans)
    .where(and(eq(tradePlans.journalTradeId, body.journalTradeId), eq(tradePlans.userId, user.id)))
    .limit(1);

  let result;
  const values = {
    userId: user.id,
    journalTradeId: body.journalTradeId,
    plannedEntryPrice: body.plannedEntryPrice,
    plannedStopLoss: body.plannedStopLoss,
    plannedTakeProfit: body.plannedTakeProfit,
    plannedQuantity: body.plannedQuantity,
    plannedRiskAmount: body.plannedRiskAmount,
    plannedRR: body.plannedRR,
    planAdherenceScore: adherenceScore,
    entrySlippage,
    exitSlippage,
    slHitExactly: body.plannedStopLoss ? (trade.avgExitPrice && Math.abs(trade.avgExitPrice - body.plannedStopLoss) < 0.01 ? body.plannedStopLoss : undefined) : undefined,
    tpHitExactly: body.plannedTakeProfit ? (trade.avgExitPrice && Math.abs(trade.avgExitPrice - body.plannedTakeProfit) < 0.01 ? body.plannedTakeProfit : undefined) : undefined,
  };

  if (existing) {
    [result] = await db.update(tradePlans)
      .set(values)
      .where(eq(tradePlans.id, existing.id))
      .returning();
  } else {
    [result] = await db.insert(tradePlans).values(values).returning();
  }

  return c.json({ success: true, data: result }, existing ? 200 : 201);
});

// ══════════════════════════════════════════════
//  4. TRADE RATINGS (self-reflection)
// ══════════════════════════════════════════════

/**
 * GET /discipline/ratings/:tradeId — Get rating for a trade
 */
disciplineRouter.get('/ratings/:tradeId', async (c) => {
  const user = c.get('user');
  const tradeId = c.req.param('tradeId');
  const db = getDatabase();

  const [rating] = await db
    .select()
    .from(tradeRatings)
    .where(and(eq(tradeRatings.journalTradeId, tradeId), eq(tradeRatings.userId, user.id)))
    .limit(1);

  return c.json({ success: true, data: rating ?? null });
});

/**
 * POST /discipline/ratings — Save trade rating & reflection
 */
disciplineRouter.post('/ratings', validateBody(tradeRatingSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  // Verify trade belongs to user
  const [trade] = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.id, body.journalTradeId), eq(journalTrades.userId, user.id)))
    .limit(1);

  if (!trade) return c.json({ success: false, error: { message: 'Trade not found' } }, 404);

  // Upsert
  const [existing] = await db
    .select()
    .from(tradeRatings)
    .where(and(eq(tradeRatings.journalTradeId, body.journalTradeId), eq(tradeRatings.userId, user.id)))
    .limit(1);

  const values = {
    userId: user.id,
    journalTradeId: body.journalTradeId,
    executionRating: body.executionRating,
    planRating: body.planRating,
    psychologyRating: body.psychologyRating,
    emotions: body.emotions as any,
    mistakeTags: body.mistakeTags as any,
    reflection: body.reflection,
    lessonLearned: body.lessonLearned,
    followedPlan: body.followedPlan,
    wouldChange: body.wouldChange,
    whatWouldChange: body.whatWouldChange,
  };

  // Also update the journal trade's emotions and mistakeTags
  if (body.emotions || body.mistakeTags) {
    await db.update(journalTrades)
      .set({
        emotions: (body.emotions ?? trade.emotions) as any,
        mistakeTags: (body.mistakeTags ?? trade.mistakeTags) as any,
      })
      .where(eq(journalTrades.id, body.journalTradeId));
  }

  let result;
  if (existing) {
    [result] = await db.update(tradeRatings)
      .set(values)
      .where(eq(tradeRatings.id, existing.id))
      .returning();
  } else {
    [result] = await db.insert(tradeRatings).values(values).returning();
  }

  return c.json({ success: true, data: result }, existing ? 200 : 201);
});

// ══════════════════════════════════════════════
//  5. DISCIPLINE ANALYTICS
// ══════════════════════════════════════════════

/**
 * GET /discipline/stats — Overall discipline statistics
 */
disciplineRouter.get('/stats', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  // ── Checklist compliance ──────────────────
  const [complianceResult] = await db
    .select({
      avgCompliance: sql<number>`AVG(compliance_score)`.as('avg_compliance'),
      totalChecked: sql<number>`COUNT(*)`.as('total_checked'),
    })
    .from(tradeChecklists)
    .where(eq(tradeChecklists.userId, user.id));

  // ── Plan adherence ────────────────────────
  const [adherenceResult] = await db
    .select({
      avgAdherence: sql<number>`AVG(plan_adherence_score)`.as('avg_adherence'),
      totalPlanned: sql<number>`COUNT(*)`.as('total_planned'),
    })
    .from(tradePlans)
    .where(eq(tradePlans.userId, user.id));

  // ── Mistake costs (sum of netPnl grouped by mistake) ──
  // Using raw SQL because Drizzle's unnest + GROUP BY needs special handling
  const mistakeCostsRaw = await db.execute(
    sql`
      SELECT unnest(mistake_tags) AS mistake_tag,
             SUM(net_pnl) AS total_pnl,
             COUNT(*) AS trade_count
      FROM journal_trades
      WHERE user_id = ${user.id} AND mistake_tags IS NOT NULL
      GROUP BY mistake_tag
      ORDER BY total_pnl ASC
    `,
  );
  const mistakeCosts = Array.isArray(mistakeCostsRaw) ? mistakeCostsRaw : [];

  // ── Average ratings ───────────────────────
  const [avgRatings] = await db
    .select({
      avgExecution: sql<number>`AVG(execution_rating)`,
      avgPlan: sql<number>`AVG(plan_rating)`,
      avgPsychology: sql<number>`AVG(psychology_rating)`,
    })
    .from(tradeRatings)
    .where(eq(tradeRatings.userId, user.id));

  // ── Followed plan vs not — P&L comparison ──
  const planComparison = await db
    .select({
      followedPlan: tradeRatings.followedPlan,
      avgPnl: sql<number>`AVG(${journalTrades.netPnl})`,
      tradeCount: sql<number>`COUNT(*)`,
    })
    .from(tradeRatings)
    .innerJoin(journalTrades, eq(tradeRatings.journalTradeId, journalTrades.id))
    .where(eq(tradeRatings.userId, user.id))
    .groupBy(tradeRatings.followedPlan);

  // ── Emotion → P&L correlation ─────────────
  const emotionPnlRaw = await db.execute(
    sql`
      SELECT unnest(emotions) AS emotion,
             AVG(net_pnl) AS avg_pnl,
             COUNT(*) AS trade_count
      FROM journal_trades
      WHERE user_id = ${user.id} AND emotions IS NOT NULL
      GROUP BY emotion
      ORDER BY avg_pnl ASC
    `,
  );
  const emotionPnl = Array.isArray(emotionPnlRaw) ? emotionPnlRaw : [];

  return c.json({
    success: true,
    data: {
      compliance: {
        avgCompliance: Number(complianceResult?.avgCompliance ?? 0) * 100,
        totalChecked: Number(complianceResult?.totalChecked ?? 0),
      },
      planAdherence: {
        avgAdherence: Number(adherenceResult?.avgAdherence ?? 0) * 100,
        totalPlanned: Number(adherenceResult?.totalPlanned ?? 0),
      },
      mistakeCosts: mistakeCosts.map((m: any) => ({
        mistake: m.mistake_tag ?? m.mistakeTag,
        totalCost: Number(m.total_pnl ?? m.totalPnl ?? 0),
        tradeCount: Number(m.trade_count ?? m.tradeCount ?? 0),
      })),
      avgRatings: {
        execution: Number(avgRatings?.avgExecution ?? 0).toFixed(1),
        plan: Number(avgRatings?.avgPlan ?? 0).toFixed(1),
        psychology: Number(avgRatings?.avgPsychology ?? 0).toFixed(1),
      },
      planComparison: planComparison.map((p: any) => ({
        followedPlan: p.followedPlan,
        avgPnl: Number(p.avgPnl ?? 0),
        tradeCount: Number(p.tradeCount ?? 0),
      })),
      emotionPnl: emotionPnl.map((e: any) => ({
        emotion: e.emotion,
        avgPnl: Number(e.avgPnl ?? 0),
        tradeCount: Number(e.tradeCount ?? 0),
      })),
    },
  });
});

/**
 * GET /discipline/streaks — Consecutive win/loss streaks
 */
disciplineRouter.get('/streaks', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const trades = await db
    .select({
      id: journalTrades.id,
      netPnl: journalTrades.netPnl,
      closedAt: journalTrades.closedAt,
    })
    .from(journalTrades)
    .where(and(
      eq(journalTrades.userId, user.id),
      eq(journalTrades.status, 'CLOSED'),
    ))
    .orderBy(journalTrades.closedAt);

  const streaks = calculateStreaks(trades.map((t) => ({ netPnl: t.netPnl ?? 0 })));

  return c.json({
    success: true,
    data: {
      currentWinStreak: streaks.currentWinStreak,
      currentLossStreak: streaks.currentLossStreak,
      maxWinStreak: streaks.longestWinStreak,
      maxLossStreak: streaks.longestLossStreak,
    },
  });
});

// ═══════════════════════════════════════════════
//  Pre-Market Preparation Routine
// ═══════════════════════════════════════════════

/**
 * GET /discipline/premarket — Get today's pre-market plan
 */
disciplineRouter.get('/premarket', async (c) => {
  const user = c.get('user');
  try {
    const plan = await getTodayPremarketPlan(user.id);
    return c.json({ success: true, data: plan });
  } catch (err: any) {
    console.error('[Premarket Fetch Error]', err);
    return c.json({ success: false, error: { message: err?.message ?? 'Failed to fetch premarket plan' } }, 500);
  }
});

/**
 * POST /discipline/premarket — Save today's pre-market plan
 */
disciplineRouter.post('/premarket', async (c) => {
  const user = c.get('user');
  try {
    const body = await c.req.json();
    const saved = await savePremarketPlan(user.id, body);
    return c.json({ success: true, data: saved });
  } catch (err: any) {
    console.error('[Premarket Save Error]', err);
    return c.json({ success: false, error: { message: err?.message ?? 'Failed to save premarket plan' } }, 500);
  }
});

/**
 * POST /discipline/premarket/lock — Lock session & activate guardrails
 */
disciplineRouter.post('/premarket/lock', async (c) => {
  const user = c.get('user');
  try {
    const locked = await lockPremarketSession(user.id);
    return c.json({ success: true, data: locked });
  } catch (err: any) {
    console.error('[Premarket Lock Error]', err);
    return c.json({ success: false, error: { message: err?.message ?? 'Failed to lock premarket session' } }, 500);
  }
});
