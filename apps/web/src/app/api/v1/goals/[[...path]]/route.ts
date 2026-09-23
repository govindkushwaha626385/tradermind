// ──────────────────────────────────────────────
// TradeMind — Goals Routes
// GET    /api/v1/goals
// POST   /api/v1/goals
// GET    /api/v1/goals/[id]
// PATCH  /api/v1/goals/[id]
// DELETE /api/v1/goals/[id]
// POST   /api/v1/goals/[id]/refresh
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDatabase, userGoals, journalTrades } from '@trademind/database';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, created, notFound, parseBody } from '@/lib/server/response';

export const runtime = 'nodejs';

const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: z.enum(['pnl', 'win_rate', 'profit_factor', 'discipline_score', 'max_drawdown', 'trade_count', 'avg_rr', 'streak']),
  targetValue: z.number(),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ALL_TIME']).default('MONTHLY'),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  emoji: z.string().max(10).optional(),
  color: z.enum(['blue', 'emerald', 'violet', 'amber', 'rose']).default('blue'),
});

const updateGoalSchema = createGoalSchema.partial().extend({ isActive: z.boolean().optional(), isCompleted: z.boolean().optional() });

async function computeProgress(userId: string, type: string, targetValue: number, periodStart?: Date | null, periodEnd?: Date | null) {
  const db = getDatabase();
  const conditions: any[] = [eq(journalTrades.userId, userId), sql`${journalTrades.status} = 'CLOSED'`];
  if (periodStart) conditions.push(gte(journalTrades.closedAt, periodStart));
  if (periodEnd) conditions.push(lte(journalTrades.closedAt, periodEnd));

  const trades = await db.select({ netPnl: journalTrades.netPnl, closedAt: journalTrades.closedAt }).from(journalTrades).where(and(...conditions));
  let currentValue = 0;

  switch (type) {
    case 'pnl': currentValue = trades.reduce((s, t) => s + Number(t.netPnl ?? 0), 0); break;
    case 'win_rate': { const wins = trades.filter((t) => Number(t.netPnl ?? 0) > 0).length; currentValue = trades.length > 0 ? (wins / trades.length) * 100 : 0; break; }
    case 'trade_count': currentValue = trades.length; break;
    case 'profit_factor': { const gw = trades.filter((t) => Number(t.netPnl ?? 0) > 0).reduce((s, t) => s + Number(t.netPnl ?? 0), 0); const gl = Math.abs(trades.filter((t) => Number(t.netPnl ?? 0) < 0).reduce((s, t) => s + Number(t.netPnl ?? 0), 0)); currentValue = gl > 0 ? gw / gl : gw > 0 ? 999 : 0; break; }
    case 'avg_rr': { const pnls = trades.map((t) => Number(t.netPnl ?? 0)); currentValue = pnls.length > 0 ? pnls.reduce((s, v) => s + v, 0) / pnls.length : 0; break; }
    default: currentValue = 0;
  }

  const progressPct = targetValue !== 0 ? Math.min(Math.max((currentValue / targetValue) * 100, -100), 100) : 0;
  const isCompleted = type === 'max_drawdown' ? currentValue <= targetValue : currentValue >= targetValue;
  return { currentValue, progressPct, isCompleted };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const rl = await checkRateLimit(req, user.id);
  if (rl) return rl;

  const { path } = await params;
  const id = path?.[0];
  const db = getDatabase();

  if (!id) {
    const goals = await db.select().from(userGoals).where(eq(userGoals.userId, user.id)).orderBy(desc(userGoals.createdAt));
    return ok(goals);
  }

  const [goal] = await db.select().from(userGoals).where(and(eq(userGoals.id, id), eq(userGoals.userId, user.id)));
  if (!goal) return notFound('Goal not found');
  return ok(goal);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const [id, action] = path ?? [];

  // POST /goals/:id/refresh
  if (id && action === 'refresh') {
    const db = getDatabase();
    const [goal] = await db.select().from(userGoals).where(and(eq(userGoals.id, id), eq(userGoals.userId, user.id)));
    if (!goal) return notFound('Goal not found');

    const { currentValue, progressPct, isCompleted } = await computeProgress(user.id, goal.type, Number(goal.targetValue), goal.periodStart, goal.periodEnd);
    const wasCompleted = goal.isCompleted;
    const [updated] = await db.update(userGoals)
      .set({ currentValue: String(currentValue), progressPct: String(Math.round(progressPct * 100) / 100), isCompleted, completedAt: isCompleted && !wasCompleted ? new Date() : goal.completedAt })
      .where(eq(userGoals.id, id)).returning();

    return ok({ ...updated, justCompleted: isCompleted && !wasCompleted });
  }

  // POST /goals (create)
  const { data: body, error: bodyErr } = await parseBody(req, createGoalSchema);
  if (bodyErr) return bodyErr;

  const periodStart = body.periodStart ? new Date(body.periodStart) : undefined;
  const periodEnd = body.periodEnd ? new Date(body.periodEnd) : undefined;
  const { currentValue, progressPct, isCompleted } = await computeProgress(user.id, body.type, body.targetValue, periodStart, periodEnd);

  const db = getDatabase();
  const [goal] = await db.insert(userGoals).values({
    userId: user.id, title: body.title, description: body.description, type: body.type,
    targetValue: String(body.targetValue), period: body.period, periodStart, periodEnd,
    currentValue: String(currentValue), progressPct: String(Math.round(progressPct * 100) / 100),
    isCompleted, completedAt: isCompleted ? new Date() : undefined, emoji: body.emoji ?? '🎯', color: body.color ?? 'blue',
  }).returning();

  return created(goal);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const id = path?.[0];
  if (!id) return notFound('Goal ID required');

  const { data: body, error: bodyErr } = await parseBody(req, updateGoalSchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const [existing] = await db.select().from(userGoals).where(and(eq(userGoals.id, id), eq(userGoals.userId, user.id)));
  if (!existing) return notFound('Goal not found');

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
  if (body.isCompleted !== undefined) { updateData.isCompleted = body.isCompleted; if (body.isCompleted) updateData.completedAt = new Date(); }

  const [updated] = await db.update(userGoals).set(updateData).where(and(eq(userGoals.id, id), eq(userGoals.userId, user.id))).returning();
  return ok(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const id = path?.[0];
  if (!id) return notFound('Goal ID required');

  const db = getDatabase();
  const [deleted] = await db.delete(userGoals).where(and(eq(userGoals.id, id), eq(userGoals.userId, user.id))).returning({ id: userGoals.id });
  if (!deleted) return notFound('Goal not found');
  return ok({ id: deleted.id });
}
