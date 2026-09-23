// ──────────────────────────────────────────────
// TradeMind — API Type Declarations
//
// Declares custom variables injected into Hono's Context
// so that c.get('user'), c.get('validatedBody'), etc.
// return properly typed values.
// ──────────────────────────────────────────────

import type { AuthUser } from './middleware/auth';

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    validatedBody: any;
    validatedQuery: any;
  }
}
