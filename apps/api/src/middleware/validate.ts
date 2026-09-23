// ──────────────────────────────────────────────
// TradeMind — Request Validation Middleware
// Uses Zod schemas for runtime validation
// ──────────────────────────────────────────────

import { Context, Next } from 'hono';
import { z } from 'zod';

type ZodSchema = z.ZodObject<any> | z.ZodEffects<any>;

/**
 * Validate request body against a Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const result = schema.parse(body);
      c.set('validatedBody', result);
      await next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: {
              message: 'Validation failed',
              details: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            },
          },
          400,
        );
      }
      throw err;
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      const result = schema.parse(query);
      c.set('validatedQuery', result);
      await next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: {
              message: 'Invalid query parameters',
              details: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            },
          },
          400,
        );
      }
      throw err;
    }
  };
}
