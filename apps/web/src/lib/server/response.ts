// ──────────────────────────────────────────────
// TradeMind — Server: Standard Response Helpers
//
// Creates consistently-shaped JSON responses that
// match the `ApiResponse<T>` shape the frontend
// api.ts client already expects.
// ──────────────────────────────────────────────

import { NextResponse } from 'next/server';

export type StatusCode =
  | 200 | 201 | 204
  | 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429
  | 500 | 503;

// ── Success responses ────────────────────────────────────────

/**
 * 200 OK — returns `{ success: true, data }`.
 * Optionally include pagination metadata.
 */
export function ok<T>(
  data: T,
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    nextCursor?: string | null;
    hasMore?: boolean;
    message?: string;
    cached?: boolean;
  },
): NextResponse {
  return NextResponse.json({ success: true, data, ...meta }, { status: 200 });
}

/**
 * 201 Created — returns `{ success: true, data }`.
 */
export function created<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

/**
 * 204 No Content — empty body.
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ── Error responses ──────────────────────────────────────────

/**
 * Generic error response.
 * `status` defaults to 400.
 */
export function apiError(
  message: string,
  status: StatusCode = 400,
  details?: unknown[],
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}

export const unauthorized = (msg = 'Authentication required') =>
  apiError(msg, 401);

export const forbidden = (msg = 'Access denied') =>
  apiError(msg, 403);

export const notFound = (msg = 'Resource not found') =>
  apiError(msg, 404);

export const conflict = (msg: string) =>
  apiError(msg, 409);

export const tooLarge = (msg = 'Request body too large') =>
  apiError(msg, 413);

export const tooManyRequests = (msg = 'Rate limit exceeded', retryAfter?: number) => {
  const res = apiError(msg, 429);
  if (retryAfter) {
    res.headers.set('Retry-After', String(retryAfter));
  }
  return res;
};

export const serverError = (
  msg = 'Internal server error',
  isDev = process.env.NODE_ENV !== 'production',
  detail?: string,
) =>
  NextResponse.json(
    {
      success: false,
      error: {
        message: msg,
        ...(isDev && detail ? { detail } : {}),
      },
    },
    { status: 500 },
  );

// ── Validation helpers ───────────────────────────────────────

import { z } from 'zod';

/**
 * Parse and validate the JSON body of a request.
 * Returns `{ data, error }` — never throws.
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const json = await req.json();
    const result = schema.safeParse(json);
    if (!result.success) {
      return {
        data: null,
        error: NextResponse.json(
          {
            success: false,
            error: {
              message: 'Validation failed',
              details: result.error.issues.map((e: any) => ({
                path: Array.isArray(e.path) ? e.path.join('.') : String(e.path),
                message: e.message,
              })),
            },
          },
          { status: 400 },
        ),
      };
    }
    return { data: result.data, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { success: false, error: { message: 'Invalid JSON body' } },
        { status: 400 },
      ),
    };
  }
}

/**
 * Parse and validate URL search params.
 * Returns `{ data, error }` — never throws.
 */
export function parseQuery<T extends Record<string, unknown>>(
  req: Request,
  schema: z.ZodSchema<T>,
): { data: T; error: null } | { data: null; error: NextResponse } {
  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { raw[k] = v; });

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid query parameters',
            details: result.error.issues.map((e: any) => ({
              path: Array.isArray(e.path) ? e.path.join('.') : String(e.path),
              message: e.message,
            })),
          },
        },
        { status: 400 },
      ),
    };
  }
  return { data: result.data, error: null };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate a path parameter is a valid UUID.
 * Returns an error NextResponse if invalid, null if valid.
 */
export function validateUuid(value: string | null | undefined, paramName = 'id'): NextResponse | null {
  if (!value || !UUID_REGEX.test(value)) {
    return NextResponse.json(
      {
        success: false,
        error: { message: `Invalid ${paramName} parameter: expected a valid UUID` },
      },
      { status: 400 },
    );
  }
  return null;
}
