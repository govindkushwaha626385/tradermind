// ──────────────────────────────────────────────
// TradeMind — Playbooks Routes
// GET    /api/v1/playbooks
// POST   /api/v1/playbooks
// GET    /api/v1/playbooks/[id]
// PUT    /api/v1/playbooks/[id]
// DELETE /api/v1/playbooks/[id]
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDatabase, setupPlaybooks } from '@trademind/database';
import { eq, and } from 'drizzle-orm';
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
  const { user, error } = await authenticate(req);
  if (error) return error;
  const rl = await checkRateLimit(req, user.id);
  if (rl) return rl;

  const { path } = await params;
  const id = path?.[0];
  const db = getDatabase();

  if (!id) {
    const playbooks = await db.select().from(setupPlaybooks).where(eq(setupPlaybooks.userId, user.id)).orderBy(setupPlaybooks.createdAt);
    return ok(playbooks);
  }

  const [playbook] = await db.select().from(setupPlaybooks).where(and(eq(setupPlaybooks.id, id), eq(setupPlaybooks.userId, user.id))).limit(1);
  if (!playbook) return notFound('Playbook not found');
  return ok(playbook);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  void params;

  const { data: body, error: bodyErr } = await parseBody(req, playbookSchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const [playbook] = await db.insert(setupPlaybooks).values({
    userId: user.id, name: body.name, description: body.description,
    entryCriteria: body.entryCriteria, exitCriteria: body.exitCriteria,
    riskRules: body.riskRules as Record<string, unknown> | undefined,
    isActive: body.isActive,
  }).returning();

  return created(playbook);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { path } = await params;
  const id = path?.[0];
  if (!id) return notFound('Playbook ID required');

  const { data: body, error: bodyErr } = await parseBody(req, playbookSchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const [updated] = await db.update(setupPlaybooks)
    .set({ name: body.name, description: body.description, entryCriteria: body.entryCriteria, exitCriteria: body.exitCriteria, riskRules: body.riskRules as Record<string, unknown> | undefined, isActive: body.isActive })
    .where(and(eq(setupPlaybooks.id, id), eq(setupPlaybooks.userId, user.id)))
    .returning();

  if (!updated) return notFound('Playbook not found');
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
  if (!id) return notFound('Playbook ID required');

  const db = getDatabase();
  await db.delete(setupPlaybooks).where(and(eq(setupPlaybooks.id, id), eq(setupPlaybooks.userId, user.id)));
  return ok({ message: 'Playbook deleted' });
}
