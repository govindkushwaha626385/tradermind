// ──────────────────────────────────────────────
// TradeMind — UUID Path Parameter Validation Middleware
//
// Validates that `:id` path parameters are valid UUIDs
// before they reach the route handler. Returns 400
// with a clear error message if invalid.
// ──────────────────────────────────────────────

import type { Context, Next } from 'hono';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a specific path parameter is a valid UUID.
 *
 * Usage: router.get('/users/:id', validateUuid('id'), handler)
 */
export function validateUuid(paramName: string) {
  return async (c: Context, next: Next) => {
    const value = c.req.param(paramName);
    if (!value || !UUID_REGEX.test(value)) {
      return c.json({
        success: false,
        error: {
          message: `Invalid ${paramName} parameter: expected a valid UUID`,
        },
      }, 400);
    }
    await next();
  };
}
