// ──────────────────────────────────────────────
// TradeMind — Health Check Route
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { getDatabase } from '@trademind/database';
import { backgroundJobs } from '@trademind/database';
import { sql } from 'drizzle-orm';

export const healthRouter = new Hono();

const healthHandler = async (c: any) => {
  const checks: Record<string, 'healthy' | 'unhealthy'> = {};

  // Database check
  try {
    const db = getDatabase();
    await db.execute(sql`SELECT 1`);
    checks.database = 'healthy';
  } catch {
    checks.database = 'unhealthy';
  }

  // Job queue check — verifies the background_jobs table is accessible
  try {
    const db = getDatabase();
    await db.select({ count: sql<number>`COUNT(*)` }).from(backgroundJobs).limit(1);
    checks.queue = 'healthy';
  } catch {
    checks.queue = 'unhealthy';
  }

  const allHealthy = Object.values(checks).every((s) => s === 'healthy');

  return c.json(
    {
      success: true,
      status: allHealthy ? 'healthy' : 'degraded',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      checks,
    },
    allHealthy ? 200 : 503,
  );
};

healthRouter.get('/', healthHandler);
healthRouter.get('/health', healthHandler);
