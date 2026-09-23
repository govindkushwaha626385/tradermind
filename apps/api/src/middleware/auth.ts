// ──────────────────────────────────────────────
// TradeMind — Authentication Middleware
//
// Validates JWT tokens issued by Supabase Auth.
// In production, JWT_SECRET must be set in the environment.
// If missing, the server refuses to start rather than using
// a fallback secret that could be exploited.
// ──────────────────────────────────────────────

import { Context, Next } from 'hono';
import { getDatabase, getSupabaseAdmin, users } from '@trademind/database';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

async function resolveAuthUser(token: string): Promise<AuthUser | null> {
  // Supabase issues the access token returned by /auth/login. Validate it
  // through Supabase rather than with an unrelated local signing secret.
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;

  const db = getDatabase();
  const [profile] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, data.user.id))
    .limit(1);

  if (!profile || (profile.role !== 'USER' && profile.role !== 'ADMIN')) return null;
  return profile as AuthUser;
}

/**
 * Verify JWT token and attach user to context.
 * Requires 'Authorization: Bearer <token>' header.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { message: 'Authentication required' } }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const user = await resolveAuthUser(token);
    if (!user) {
      return c.json({ success: false, error: { message: 'Account is unavailable' } }, 401);
    }
    c.set('user', user);
    await next();
  } catch (err) {
    return c.json({ success: false, error: { message: 'Invalid or expired token' } }, 401);
  }
}

/**
 * Admin-only middleware
 */
export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get('user') as AuthUser | undefined;

  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, error: { message: 'Admin access required' } }, 403);
  }

  await next();
}

/**
 * Optional auth — attaches user if token present, continues regardless.
 * Useful for routes that work differently for authenticated vs anonymous users.
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const user = await resolveAuthUser(token);
      if (user) c.set('user', user);
    } catch {
      // Token invalid, continue without user
    }
  }

  await next();
}
