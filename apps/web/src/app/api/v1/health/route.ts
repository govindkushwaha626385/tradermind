// ──────────────────────────────────────────────
// TradeMind — Health Check Route
// GET /api/v1/health
// ──────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getDatabase, backgroundJobs } from '@trademind/database';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

async function healthHandler() {
  const checks: Record<string, 'healthy' | 'unhealthy'> = {};

  try {
    const db = getDatabase();
    await db.execute(sql`SELECT 1`);
    checks.database = 'healthy';
  } catch {
    checks.database = 'unhealthy';
  }

  try {
    const db = getDatabase();
    await db.select({ count: sql<number>`COUNT(*)` }).from(backgroundJobs).limit(1);
    checks.queue = 'healthy';
  } catch {
    checks.queue = 'unhealthy';
  }

  const allHealthy = Object.values(checks).every((s) => s === 'healthy');

  return NextResponse.json(
    {
      success: true,
      status: allHealthy ? 'healthy' : 'degraded',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 },
  );
}

export async function GET() {
  return healthHandler();
}
