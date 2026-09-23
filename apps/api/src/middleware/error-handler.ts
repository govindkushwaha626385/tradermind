// ──────────────────────────────────────────────
// TradeMind — Async Error Handling Middleware
//
// Wraps async route handlers so that thrown errors
// are caught and passed to the global error handler
// instead of causing unhandled promise rejections.
// ──────────────────────────────────────────────

import type { Context, Next } from 'hono';

/**
 * Wraps an async route handler so errors are caught
 * and forwarded to Hono's onError handler.
 *
 * Usage: app.get('/route', asyncHandler(async (c) => { ... }))
 */
export function asyncHandler(fn: (c: Context) => Promise<Response>) {
  return async (c: Context) => {
    try {
      return await fn(c);
    } catch (err) {
      // Let the global onError handler in index.ts process this
      throw err;
    }
  };
}
