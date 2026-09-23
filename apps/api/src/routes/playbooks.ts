// ──────────────────────────────────────────────
// TradeMind — Playbook Routes
//
// Endpoints for CRUD operations on setup playbooks.
// Playbooks let users define their trading strategies
// and track rule compliance per trade.
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabase, setupPlaybooks } from '@trademind/database';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const playbooksRouter = new Hono();
playbooksRouter.use('*', authMiddleware);

const playbookSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  entryCriteria: z.string().max(4000).optional(),
  exitCriteria: z.string().max(4000).optional(),
  riskRules: z.any().optional(),
  isActive: z.boolean().default(true),
});

/**
 * GET /playbooks
 * Returns all playbooks for the current user.
 */
playbooksRouter.get('/', async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const playbooks = await db
    .select()
    .from(setupPlaybooks)
    .where(eq(setupPlaybooks.userId, user.id))
    .orderBy(setupPlaybooks.createdAt);

  return c.json({ success: true, data: playbooks });
});

/**
 * POST /playbooks
 * Create a new playbook.
 */
playbooksRouter.post('/', validateBody(playbookSchema), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody') as z.infer<typeof playbookSchema>;
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

  return c.json({ success: true, data: playbook }, 201);
});

/**
 * GET /playbooks/:id
 * Get a single playbook by ID.
 */
playbooksRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const db = getDatabase();

  const [playbook] = await db
    .select()
    .from(setupPlaybooks)
    .where(and(eq(setupPlaybooks.id, id), eq(setupPlaybooks.userId, user.id)))
    .limit(1);

  if (!playbook) {
    return c.json({ success: false, error: { message: 'Playbook not found' } }, 404);
  }

  return c.json({ success: true, data: playbook });
});

/**
 * PUT /playbooks/:id
 * Update a playbook.
 */
playbooksRouter.put('/:id', validateBody(playbookSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = c.get('validatedBody') as z.infer<typeof playbookSchema>;
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

  if (!updated) {
    return c.json({ success: false, error: { message: 'Playbook not found' } }, 404);
  }

  return c.json({ success: true, data: updated });
});

/**
 * DELETE /playbooks/:id
 * Delete a playbook.
 */
playbooksRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const db = getDatabase();

  await db
    .delete(setupPlaybooks)
    .where(and(eq(setupPlaybooks.id, id), eq(setupPlaybooks.userId, user.id)));

  return c.json({ success: true, data: { message: 'Playbook deleted' } });
});
