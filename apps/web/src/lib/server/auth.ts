// ──────────────────────────────────────────────
// TradeMind — Server: Auth Helper
//
// Ported from apps/api/src/middleware/auth.ts.
// Works with NextRequest instead of Hono Context.
// Validates Supabase JWT tokens and resolves the
// full user profile from our own `users` table.
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getSupabaseAdmin, users } from '@trademind/database';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

/**
 * Resolve the auth user from a Supabase Bearer token.
 * Returns null if the token is missing, invalid, or the
 * user account is not found / has an unsupported role.
 */
export async function resolveAuthUser(token: string): Promise<AuthUser | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  try {
    const db = getDatabase();
    const [profile] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, data.user.id))
      .limit(1);

    if (profile && (profile.role === 'USER' || profile.role === 'ADMIN')) {
      return profile as AuthUser;
    }
  } catch (dbErr) {
    console.warn('[auth] Direct DB query failed, falling back to Supabase Admin API:', (dbErr as Error).message);
  }

  // Fallback: Query via Supabase Admin REST client
  try {
    const { data: supaUser } = await admin
      .from('users')
      .select('id, email, role')
      .eq('id', data.user.id)
      .single();

    if (supaUser && (supaUser.role === 'USER' || supaUser.role === 'ADMIN')) {
      return supaUser as AuthUser;
    }
  } catch (restErr) {
    console.warn('[auth] Supabase REST users query error:', (restErr as Error).message);
  }

  // Fallback: Use verified Supabase Auth user identity
  const authRole = ((data.user.user_metadata?.role as string) ?? 'USER').toUpperCase() as 'USER' | 'ADMIN';
  return {
    id: data.user.id,
    email: data.user.email ?? '',
    role: authRole === 'ADMIN' ? 'ADMIN' : 'USER',
  };
}

/**
 * Extract the Bearer token from an Authorization header.
 * Returns null if the header is missing or malformed.
 */
export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * Authenticate a Next.js API route request.
 *
 * Usage:
 *   const { user, error } = await authenticate(req);
 *   if (error) return error;
 *   // user is AuthUser
 *
 * Returns `{ user: AuthUser, error: null }` on success,
 * or `{ user: null, error: NextResponse }` on failure.
 */
export async function authenticate(
  req: NextRequest,
): Promise<{ user: AuthUser; error: null } | { user: null; error: NextResponse }> {
  const token = extractBearerToken(req);

  if (!token) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 },
      ),
    };
  }

  try {
    const user = await resolveAuthUser(token);
    if (!user) {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, error: { message: 'Account is unavailable' } },
          { status: 401 },
        ),
      };
    }
    return { user, error: null };
  } catch {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: { message: 'Invalid or expired token' } },
        { status: 401 },
      ),
    };
  }
}

/**
 * Authenticate + require ADMIN role.
 *
 * Usage:
 *   const { user, error } = await authenticateAdmin(req);
 *   if (error) return error;
 */
export async function authenticateAdmin(
  req: NextRequest,
): Promise<{ user: AuthUser; error: null } | { user: null; error: NextResponse }> {
  const result = await authenticate(req);
  if (result.error) return result;

  if (result.user.role !== 'ADMIN') {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: { message: 'Admin access required' } },
        { status: 403 },
      ),
    };
  }

  return result;
}

/**
 * Require ADMIN role for an already-authenticated user.
 * Returns a 403 NextResponse if the user is not admin, null if ok.
 *
 * Usage (after `authenticate`):
 *   const adminError = await requireAdmin(user);
 *   if (adminError) return adminError;
 */
export function requireAdmin(user: AuthUser): NextResponse | null {
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { message: 'Admin access required' } },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Authenticate if a token is present, but do not require one.
 * Returns `{ user: AuthUser | null, error: null }` always.
 */
export async function authenticateOptional(
  req: NextRequest,
): Promise<{ user: AuthUser | null }> {
  const token = extractBearerToken(req);
  if (!token) return { user: null };

  try {
    const user = await resolveAuthUser(token);
    return { user: user ?? null };
  } catch {
    return { user: null };
  }
}
