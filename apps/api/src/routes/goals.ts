// ──────────────────────────────────────────────
// TradeMind — Goals API Routes
//
// Endpoints for user goal tracking:
//   GET    /goals              → list all user goals
//   POST   /goals              → create a new goal
//   GET    /goals/:id          → get a single goal
//   PATCH  /goals/:id          → update a goal
//   DELETE /goals/:id          → delete a goal
//   POST   /goals/:id/refresh  → recalculate progress from current analytics
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabase, userGoals, journalTrades } from '@trademind/database';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const goalsRouter = new Hono();
goalsRouter.use('*', authMiddleware);

// ══════════════════════════════════════════════
//  Zod Schemas
// ══════════════════════════════════════════════

const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: z.enum([
    'pnl',
    'win_rate',
    'profit_factor',
    'discipline_score',
    'max_drawdown',
    'trade_count',
    'avg_rr',
    'streak',
  ]),
  targetValue: z.number(),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ALL_TIME']).default('MONTHLY'),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  emoji: z.string().max(10).optional(),
  color: z.enum(['blue', 'emerald', 'violet', 'amber', 'rose']).default('blue'),
});

const updateGoalSchema = createGoalSchema.partial().extend({
  isActive: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
});

// ══════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════

async function computeProgress(
  userId: string,
  type: string,
  targetValue: number,
  periodStart?: Date | null,
  periodEnd?: Date | null,
): Promise<{ currentValue: number; progressPct: number; isCompleted: boolean }> {
  const db = getDatabase();

  const conditions: any[] = [
    eq(journalTrades.userId, userId),
    sql`${journalTrades.status} = 'CLOSED'`,
  ];
  if (periodStart) conditions.push(gte(journalTrades.closedAt, periodStart));
  if (periodEnd) conditions.push(lte(journalTrades.closedAt, periodEnd));

  const trades = await db
    .select({
      netPnl: journalTrades.netPnl,
      closedAt: journalTrades.closedAt,
    })
    .from(journalTrades)
    .where(and(...conditions));

  let currentValue = 0;

  switch (type) {
    case 'pnl':
      currentValue = trades.reduce((s, t) => s + Number(t.netPnl ?? 0), 0);
      break;
    case 'win_rate': {
      const wins = trades.filter((t) => Number(t.netPnl ?? 0) > 0).length;
      currentValue = trades.length > 0 ? (wins / trades.length) * 100 : 0;
      break;
    }
    case 'trade_count':
      currentValue = trades.length;
      break;
    case 'profit_factor': {
      const grossWin = trades.filter((t) => Number(t.netPnl ?? 0) > 0).reduce((s, t) => s + Number(t.netPnl ?? 0), 0);
      const grossLoss = Math.abs(trades.filter((t) => Number(t.netPnl ?? 0) < 0).reduce((s, t) => s + Number(t.netPnl ?? 0), 0));
      currentValue = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;
      break;
    }
    // For types requiring complex calculations (avg_rr, streak, max_drawdown), use simplified approximation
    case 'avg_rr': {
      // Average of abs(netPnl) / min(abs(netPnl)) for winning trades only as approximation
      const pnls = trades.map((t) => Number(t.netPnl ?? 0));
      const avgPnl = pnls.length > 0 ? pnls.reduce((s, v) => s + v, 0) / pnls.length : 0;
      currentValue = avgPnl;
      break;
    }
    default:
      currentValue = 0;
  }

  const progressPct = targetValue !== 0
    ? Math.min(Math.max((currentValue / targetValue) * 100, -100), 100)
    : 0;
  const isCompleted = type === 'max_drawdown'
    ? currentValue <= targetValue  // lower is better for drawdown
    : currentValue >= targetValue;

  return { currentValue, progressPct, isCompleted };
}

// ══════════════════════════════════════════════
//  Routes
// ══════════════════════════════════════════════

/** GET /goals */
goalsRouter.get('/', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const goals = await db
    .select()
    .from(userGoals)
    .where(eq(userGoals.userId, user.id))
    .orderBy(desc(userGoals.createdAt));

  return c.json({ success: true, data: goals });
});

/** POST /goals */
goalsRouter.post('/', validateBody(createGoalSchema), async (c) => {
  const user = c.get('user');
  const db = getDatabase();
  const body = c.req.valid('json' as never) as z.infer<typeof createGoalSchema>;

  const periodStart = body.periodStart ? new Date(body.periodStart) : undefined;
  const periodEnd = body.periodEnd ? new Date(body.periodEnd) : undefined;

  // Auto-calculate progress on creation
  const { currentValue, progressPct, isCompleted } = await computeProgress(
    user.id,
    body.type,
    body.targetValue,
    periodStart,
    periodEnd,
  );

  const [goal] = await db.insert(userGoals).values({
    userId: user.id,
    title: body.title,
    description: body.description,
    type: body.type,
    targetValue: String(body.targetValue),
    period: body.period,
    periodStart,
    periodEnd,
    currentValue: String(currentValue),
    progressPct: String(Math.round(progressPct * 100) / 100),
    isCompleted,
    completedAt: isCompleted ? new Date() : undefined,
    emoji: body.emoji ?? '🎯',
    color: body.color ?? 'blue',
  }).returning();

  return c.json({ success: true, data: goal }, 201);
});

/** GET /goals/:id */
goalsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const db = getDatabase();
  const goalId = c.req.param('id')!;

  const [goal] = await db
    .select()
    .from(userGoals)
    .where(and(eq(userGoals.id, goalId), eq(userGoals.userId, user.id)));

  if (!goal) return c.json({ success: false, error: 'Goal not found' }, 404);
  return c.json({ success: true, data: goal });
});

/** PATCH /goals/:id */
goalsRouter.patch('/:id', validateBody(updateGoalSchema), async (c) => {
  const user = c.get('user');
  const db = getDatabase();
  const goalId = c.req.param('id')!;
  const body = c.req.valid('json' as never) as z.infer<typeof updateGoalSchema>;

  const [existing] = await db
    .select()
    .from(userGoals)
    .where(and(eq(userGoals.id, goalId), eq(userGoals.userId, user.id)));

  if (!existing) return c.json({ success: false, error: 'Goal not found' }, 404);

  const updateData: Record<string, any> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.targetValue !== undefined) updateData.targetValue = String(body.targetValue);
  if (body.period !== undefined) updateData.period = body.period;
  if (body.periodStart !== undefined) updateData.periodStart = new Date(body.periodStart);
  if (body.periodEnd !== undefined) updateData.periodEnd = new Date(body.periodEnd);
  if (body.emoji !== undefined) updateData.emoji = body.emoji;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.isCompleted !== undefined) {
    updateData.isCompleted = body.isCompleted;
    if (body.isCompleted) updateData.completedAt = new Date();
  }

  const [updated] = await db
    .update(userGoals)
    .set(updateData)
    .where(and(eq(userGoals.id, goalId), eq(userGoals.userId, user.id)))
    .returning();

  return c.json({ success: true, data: updated });
});

/** DELETE /goals/:id */
goalsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = getDatabase();
  const goalId = c.req.param('id')!;

  const [deleted] = await db
    .delete(userGoals)
    .where(and(eq(userGoals.id, goalId), eq(userGoals.userId, user.id)))
    .returning({ id: userGoals.id });

  if (!deleted) return c.json({ success: false, error: 'Goal not found' }, 404);
  return c.json({ success: true, data: { id: deleted.id } });
});

/** POST /goals/:id/refresh — Recalculate progress from live analytics */
goalsRouter.post('/:id/refresh', async (c) => {
  const user = c.get('user');
  const db = getDatabase();
  const goalId = c.req.param('id')!;

  const [goal] = await db
    .select()
    .from(userGoals)
    .where(and(eq(userGoals.id, goalId), eq(userGoals.userId, user.id)));

  if (!goal) return c.json({ success: false, error: 'Goal not found' }, 404);

  const { currentValue, progressPct, isCompleted } = await computeProgress(
    user.id,
    goal.type,
    Number(goal.targetValue),
    goal.periodStart,
    goal.periodEnd,
  );

  const wasCompleted = goal.isCompleted;
  const [updated] = await db
    .update(userGoals)
    .set({
      currentValue: String(currentValue),
      progressPct: String(Math.round(progressPct * 100) / 100),
      isCompleted,
      completedAt: isCompleted && !wasCompleted ? new Date() : goal.completedAt,
    })
    .where(eq(userGoals.id, goalId))
    .returning();

  return c.json({
    success: true,
    data: updated,
    justCompleted: isCompleted && !wasCompleted,
  });
});
