// ──────────────────────────────────────────────
// TradeMind — Server: Rate Limiting
//
// Ported from apps/api/src/middleware/rate-limit.ts
// Works as a plain async function instead of
// Hono middleware. Uses the same PostgreSQL-backed
// atomic UPSERT strategy (safe for distributed
// Vercel serverless environments).
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@trademind/database';
import { sql } from 'drizzle-orm';

const DEFAULT_LIMIT = 120; // requests per minute
const AUTH_LIMIT = 5;      // requests per minute for auth endpoints

/**
 * Atomically increment the request counter for this identifier
 * in the current 1-minute window.
 * Returns the new count and seconds until window resets.
 */
async function incrementRateLimit(
  identifier: string,
): Promise<{ count: number; retryAfter: number }> {
  const db = getDatabase();

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
 * Get the identifier for rate limiting: user ID > real IP > forwarded IP > 'anonymous'.
 */
export function getRateLimitIdentifier(req: NextRequest, userId?: string): string {
  if (userId) return userId;
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'anonymous'
  );
}

/**
 * General API rate limiter — 120 req/min per user/IP.
 * Call at the top of any API route handler.
 *
 * Returns a NextResponse (429) if rate limited, null if OK.
 * Also sets X-RateLimit-* headers on the passed mutableHeaders object.
 *
 * Usage:
 *   const rateLimitError = await checkRateLimit(req, userId);
 *   if (rateLimitError) return rateLimitError;
 */
export async function checkRateLimit(
  req: NextRequest,
  userId?: string,
  limit: number = DEFAULT_LIMIT,
): Promise<NextResponse | null> {
  try {
    const identifier = getRateLimitIdentifier(req, userId);
    const { count, retryAfter } = await incrementRateLimit(identifier);

    if (count > limit) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Rate limit exceeded. Please wait before making more requests.',
            retryAfter,
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'Retry-After': String(retryAfter),
          },
        },
      );
    }
    return null; // not rate limited
  } catch {
    // Fail open — never block a request due to rate-limit infrastructure errors
    return null;
  }
}

/**
 * Strict auth rate limiter — 5 req/min per IP.
 * Use on login, register, forgot-password endpoints.
 */
export async function checkAuthRateLimit(req: NextRequest): Promise<NextResponse | null> {
  try {
    const ip =
      req.headers.get('x-real-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';

    const { count, retryAfter } = await incrementRateLimit(`auth:${ip}`);

    if (count > AUTH_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Too many attempts. Please wait before trying again.',
            retryAfter,
          },
        },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }
    return null;
  } catch {
    return null;
  }
}
