// ──────────────────────────────────────────────
// TradeMind — Playbooks Routes
// GET    /api/v1/playbooks
// POST   /api/v1/playbooks
// GET    /api/v1/playbooks/[id]
// PUT    /api/v1/playbooks/[id]
// DELETE /api/v1/playbooks/[id]
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase, setupPlaybooks, journalTrades } from '@trademind/database';
import { eq, and, isNotNull } from 'drizzle-orm';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, created, notFound, parseBody } from '@/lib/server/response';

export const runtime = 'nodejs';

const playbookSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  entryCriteria: z.string().max(4000).optional(),
  exitCriteria: z.string().max(4000).optional(),
  riskRules: z.any().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;
    const rl = await checkRateLimit(req, user.id);
    if (rl) return rl;

    const { path } = await params;
    const id = path?.[0];
    const db = getDatabase();

    if (!id) {
      const rawPlaybooks = await db
        .select()
        .from(setupPlaybooks)
        .where(eq(setupPlaybooks.userId, user.id))
        .orderBy(setupPlaybooks.createdAt);

      const trades = await db
        .select({
          setupPlaybookId: journalTrades.setupPlaybookId,
          netPnl: journalTrades.netPnl,
          grossPnl: journalTrades.grossPnl,
          rMultiple: journalTrades.rMultiple,
          status: journalTrades.status,
        })
        .from(journalTrades)
        .where(and(eq(journalTrades.userId, user.id), isNotNull(journalTrades.setupPlaybookId)));

      const metricsByPlaybook: Record<string, {
        totalTrades: number;
        winTrades: number;
        lossTrades: number;
        netPnl: number;
        grossProfit: number;
        grossLoss: number;
        rMultipleSum: number;
        rMultipleCount: number;
      }> = {};

      for (const t of trades) {
        if (!t.setupPlaybookId) continue;
        if (!metricsByPlaybook[t.setupPlaybookId]) {
          metricsByPlaybook[t.setupPlaybookId] = {
            totalTrades: 0,
            winTrades: 0,
            lossTrades: 0,
            netPnl: 0,
            grossProfit: 0,
            grossLoss: 0,
            rMultipleSum: 0,
            rMultipleCount: 0,
          };
        }
        const m = metricsByPlaybook[t.setupPlaybookId];
        m.totalTrades += 1;
        const pnl = Number(t.netPnl || 0);
        m.netPnl += pnl;
        if (pnl > 0) {
          m.winTrades += 1;
          m.grossProfit += pnl;
        } else if (pnl < 0) {
          m.lossTrades += 1;
          m.grossLoss += Math.abs(pnl);
        }
        if (t.rMultiple != null && !isNaN(Number(t.rMultiple))) {
          m.rMultipleSum += Number(t.rMultiple);
          m.rMultipleCount += 1;
        }
      }

      const enrichedPlaybooks = rawPlaybooks.map((pb) => {
        const m = metricsByPlaybook[pb.id];
        const total = m ? m.totalTrades : 0;
        const wins = m ? m.winTrades : 0;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        const netPnl = m ? Math.round(m.netPnl * 100) / 100 : 0;
        const profitFactor = m && m.grossLoss > 0
          ? Math.round((m.grossProfit / m.grossLoss) * 100) / 100
          : (m && m.grossProfit > 0 ? 9.99 : 0);
        const avgRMultiple = m && m.rMultipleCount > 0
          ? Math.round((m.rMultipleSum / m.rMultipleCount) * 100) / 100
          : 0;

        return {
          ...pb,
          metrics: {
            totalTrades: total,
            winTrades: wins,
            lossTrades: m ? m.lossTrades : 0,
            winRate,
            netPnl,
            profitFactor,
            avgRMultiple,
          },
        };
      });

      return ok(enrichedPlaybooks);
    }

    const [playbook] = await db
      .select()
      .from(setupPlaybooks)
      .where(and(eq(setupPlaybooks.id, id), eq(setupPlaybooks.userId, user.id)))
      .limit(1);
    if (!playbook) return notFound('Playbook not found');
    return ok(playbook);
  } catch (err: unknown) {
    console.error('[Playbooks GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;
    void params;

    const { data: body, error: bodyErr } = await parseBody(req, playbookSchema);
    if (bodyErr) return bodyErr;

    const db = getDatabase();
    const [playbook] = await db
      .insert(setupPlaybooks)
      .values({
        userId: user.id,
        name: body.name,
        description: body.description,
        entryCriteria: body.entryCriteria,
        exitCriteria: body.exitCriteria,
        riskRules: body.riskRules as Record<string, unknown> | undefined,
        isActive: body.isActive,
      })
      .returning();

    return created(playbook);
  } catch (err: unknown) {
    console.error('[Playbooks POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    const { path } = await params;
    const id = path?.[0];
    if (!id) return notFound('Playbook ID required');

    const { data: body, error: bodyErr } = await parseBody(req, playbookSchema);
    if (bodyErr) return bodyErr;

    const db = getDatabase();
    const [updated] = await db
      .update(setupPlaybooks)
      .set({
        name: body.name,
        description: body.description,
        entryCriteria: body.entryCriteria,
        exitCriteria: body.exitCriteria,
        riskRules: body.riskRules as Record<string, unknown> | undefined,
        isActive: body.isActive,
      })
      .where(and(eq(setupPlaybooks.id, id), eq(setupPlaybooks.userId, user.id)))
      .returning();

    if (!updated) return notFound('Playbook not found');
    return ok(updated);
  } catch (err: unknown) {
    console.error('[Playbooks PUT] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    const { path } = await params;
    const id = path?.[0];
    if (!id) return notFound('Playbook ID required');

    const db = getDatabase();
    await db
      .delete(setupPlaybooks)
      .where(and(eq(setupPlaybooks.id, id), eq(setupPlaybooks.userId, user.id)));
    return ok({ message: 'Playbook deleted' });
  } catch (err: unknown) {
    console.error('[Playbooks DELETE] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
