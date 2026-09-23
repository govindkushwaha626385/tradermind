// ──────────────────────────────────────────────
// TradeMind — Rate Limiting Middleware
//
// Uses Supabase (PostgreSQL) for distributed rate limiting with a
// single atomic INSERT … ON CONFLICT DO UPDATE, which is
// safe against race conditions with no additional locking.
//
// Strategy: sliding 1-minute window per (identifier, minute).
// One row per (identifier, window_start) in api_rate_limits.
// ──────────────────────────────────────────────

import { Context, Next } from 'hono';
import { getDatabase } from '@trademind/database';
import { apiRateLimits } from '@trademind/database';
import { sql } from 'drizzle-orm';
import { configManager } from '@trademind/config';

/**
 * Increment the request counter for this identifier in the current
 * 1-minute window using a single atomic UPSERT.
 * Returns the new count and the number of seconds until window resets.
 */
async function incrementRateLimit(
  identifier: string,
): Promise<{ count: number; retryAfter: number }> {
  const db = getDatabase();

  // Use raw SQL for the atomic upsert — Drizzle doesn't natively surface
  // the updated row value from ON CONFLICT DO UPDATE in a typed way.
  const result = await db.execute(sql`
    INSERT INTO public.api_rate_limits (identifier, window_start, request_count)
    VALUES (
      ${identifier},
      date_trunc('minute', NOW()),
      1
    )
    ON CONFLICT (identifier, window_start)
    DO UPDATE SET request_count = api_rate_limits.request_count + 1
    RETURNING
      request_count,
      EXTRACT(EPOCH FROM (window_start + INTERVAL '1 minute' - NOW()))::int AS retry_after
  `);

  const row = (result as any).rows?.[0];
  return {
    count: Number(row?.request_count ?? 1),
    retryAfter: Number(row?.retry_after ?? 60),
  };
}

/**
 * General API rate limiter — applied to all /api/v1/* routes.
 * Default: 120 requests per minute per user/IP.
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  try {
    const limit =
      (await configManager.get<number>('rate_limit.api_requests_per_minute')) || 120;

    const identifier =
      c.get('user')?.id ??
      c.req.header('x-real-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      'anonymous';

    const { count, retryAfter } = await incrementRateLimit(identifier);

    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - count)));

    if (count > limit) {
      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          success: false,
          error: {
            message: 'Rate limit exceeded. Please wait before making more requests.',
            retryAfter,
          },
        },
        429,
      );
    }
  } catch (err) {
    // Fail open — never block a request due to rate-limit infrastructure errors
    console.warn('[RateLimit] Check skipped due to error:', err);
  }

  await next();
}

/**
 * Strict auth rate limiter — 5 requests per minute per IP.
 * Applied to login, register, forgot-password endpoints.
 */
export async function authRateLimitMiddleware(c: Context, next: Next) {
  try {
    const ip =
      c.req.header('x-real-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';

    const { count, retryAfter } = await incrementRateLimit(`auth:${ip}`);

    if (count > 5) {
      return c.json(
        {
          success: false,
          error: {
            message: 'Too many attempts. Please wait before trying again.',
            retryAfter,
          },
        },
        429,
      );
    }
  } catch (err) {
    console.warn('[RateLimit] Auth check skipped due to error:', err);
  }

  await next();
}
