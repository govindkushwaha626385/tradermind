// ──────────────────────────────────────────────
// TradeMind — Server: Route Error Boundary
//
// Wraps any Next.js route handler so that an
// unhandled exception always produces a properly
// shaped JSON error response instead of an empty
// 500 body (which crashes the API client).
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<Record<string, string | string[]>> };
type Handler<C = RouteContext> = (req: NextRequest, ctx: C) => Promise<NextResponse> | NextResponse;

/**
 * Wrap a Next.js route handler with a top-level try-catch.
 * Any thrown exception is returned as:
 *   { success: false, error: { message, ...(dev: { detail }) } }
 * with a 500 status code.
 *
 * Usage:
 *   export const GET = withErrorBoundary(async (req, ctx) => { ... });
 */
export function withErrorBoundary<C = RouteContext>(
  handler: Handler<C>,
  routeName?: string,
): Handler<C> {
  return async (req: NextRequest, ctx: C): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (err: unknown) {
      const label = routeName ?? req.url;
      console.error(`[API Error] ${label}:`, err);

      const isDev = process.env.NODE_ENV !== 'production';
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      const detail = isDev && err instanceof Error ? err.stack : undefined;

      return NextResponse.json(
        {
          success: false,
          error: {
            message,
            ...(detail ? { detail } : {}),
          },
        },
        { status: 500 },
      );
    }
  };
}
