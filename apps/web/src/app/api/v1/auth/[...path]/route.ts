// ──────────────────────────────────────────────
// TradeMind — Auth Routes
// POST /api/v1/auth/register
// POST /api/v1/auth/login
// POST /api/v1/auth/logout
// POST /api/v1/auth/forgot-password
// POST /api/v1/auth/reset-password
// POST /api/v1/auth/resend-verification
// GET  /api/v1/auth/me
// PUT  /api/v1/auth/me
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin, getSupabaseClient, getDatabase, users } from '@trademind/database';
import { eq } from 'drizzle-orm';
import { authenticate, extractBearerToken } from '@/lib/server/auth';
import { checkAuthRateLimit } from '@/lib/server/rate-limit';
import { ok, created, apiError, notFound, parseBody } from '@/lib/server/response';

export const runtime = 'nodejs';

// ── Schemas ─────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(1).max(255),
});

const updateProfileSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email().optional(),
  preferredCurrency: z.string().length(3).optional(),
  timezone: z.string().max(50).optional(),
});

// ── Route handlers ───────────────────────────────────────────

/**
 * POST /api/v1/auth/[path] — dynamic dispatch
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const action = path?.[0];

    switch (action) {
      case 'register':    return await handleRegister(req);
      case 'login':       return await handleLogin(req);
      case 'logout':      return await handleLogout(req);
      case 'forgot-password': return await handleForgotPassword(req);
      case 'reset-password':  return await handleResetPassword(req);
      case 'resend-verification': return await handleResendVerification(req);
      default:
        return apiError(`Route not found: POST /api/v1/auth/${action}`, 404);
    }
  } catch (err: unknown) {
    console.error('[Auth POST] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

/**
 * GET /api/v1/auth/[path]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const action = path?.[0];

    if (action === 'me') return await handleGetMe(req);
    return apiError(`Route not found: GET /api/v1/auth/${action}`, 404);
  } catch (err: unknown) {
    console.error('[Auth GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

/**
 * PUT /api/v1/auth/[path]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const action = path?.[0];

    if (action === 'me') return await handleUpdateMe(req);
    return apiError(`Route not found: PUT /api/v1/auth/${action}`, 404);
  } catch (err: unknown) {
    console.error('[Auth PUT] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

// ── Handlers ──────────────────────────────────────────────────

async function handleRegister(req: NextRequest) {
  const rateLimitErr = await checkAuthRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const { data: body, error: bodyErr } = await parseBody(req, registerSchema);
  if (bodyErr) return bodyErr;

  // Sign up via Supabase Auth — this fires the `handle_new_user` trigger
  // which auto-provisions: public.users, user_onboarding, risk_profiles
  const { data: authData, error: authError } = await getSupabaseClient().auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: { name: body.name, full_name: body.name },
    },
  });

  if (authError) {
    // Friendly error for duplicate email
    if (authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('already been registered')) {
      return apiError('An account with this email already exists.', 409);
    }
    return apiError(authError.message, 400);
  }

  const supabaseUserId = authData.user?.id;
  if (!supabaseUserId) return apiError('Failed to create user account', 500);

  // Upsert the public.users record — handles cases where the trigger fires
  // slower than this response, or if the trigger doesn't exist yet.
  try {
    const db = getDatabase();
    await db.insert(users).values({
      id: supabaseUserId,
      email: body.email,
      name: body.name,
      role: 'USER',
    }).onConflictDoUpdate({
      target: users.id,
      set: { name: body.name, email: body.email },
    });
  } catch (dbErr) {
    // Non-fatal: the Supabase trigger may have already created the row
    console.warn('[Register] DB upsert warning (trigger may have handled it):', dbErr);
  }

  return created({ id: supabaseUserId, email: body.email, name: body.name, role: 'USER' });
}

async function handleLogin(req: NextRequest) {
  const rateLimitErr = await checkAuthRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const { data: body, error: bodyErr } = await parseBody(req, loginSchema);
  if (bodyErr) return bodyErr;

  const { data, error } = await getSupabaseAdmin().auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error) {
    if (error.message?.includes('Email not confirmed')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Please verify your email before logging in. Check your inbox for the verification link.',
            code: 'EMAIL_NOT_VERIFIED',
          },
        },
        { status: 401 },
      );
    }
    return apiError('Invalid email or password', 401);
  }

  return ok({ user: data.user, session: data.session });
}

async function handleLogout(req: NextRequest) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const token = extractBearerToken(req) ?? '';
  if (token) {
    await getSupabaseAdmin().auth.admin.signOut(token).catch(() => {});
  }
  void user; // authenticated, user logged out
  return ok({ message: 'Logged out successfully' });
}

async function handleGetMe(req: NextRequest) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  try {
    const db = getDatabase();
    const [profile] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (profile) return ok(profile);
  } catch (err) {
    console.warn('[handleGetMe] DB select failed, falling back to Supabase client:', (err as Error).message);
  }

  // Fallback to Supabase Admin REST client
  try {
    const admin = getSupabaseAdmin();
    const { data: supaProfile } = await admin.from('users').select('*').eq('id', user.id).single();
    if (supaProfile) return ok(supaProfile);
  } catch (restErr) {
    console.warn('[handleGetMe] Supabase REST select failed:', (restErr as Error).message);
  }

  return ok({ id: user.id, email: user.email, role: user.role, name: user.email.split('@')[0], preferredCurrency: 'INR' });
}

async function handleUpdateMe(req: NextRequest) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { data: body, error: bodyErr } = await parseBody(req, updateProfileSchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const [updated] = await db
    .update(users)
    .set(body)
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) return notFound('User not found');
  return ok(updated);
}

async function handleForgotPassword(req: NextRequest) {
  const rateLimitErr = await checkAuthRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const { data: body, error: bodyErr } = await parseBody(req, z.object({ email: z.string().email() }));
  if (bodyErr) return bodyErr;

  const successMsg = { message: 'If that email is registered, a password reset link has been sent.' };

  const db = getDatabase();
  const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (!user) return ok(successMsg); // Don't reveal whether email exists

  const { error } = await getSupabaseAdmin().auth.resetPasswordForEmail(body.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  });
  if (error) console.error('Password reset error:', error.message);

  return ok(successMsg);
}

async function handleResetPassword(req: NextRequest) {
  const rateLimitErr = await checkAuthRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const { user, error: authErr } = await authenticate(req);
  if (authErr) return authErr;

  const { data: body, error: bodyErr } = await parseBody(req, z.object({ password: z.string().min(8) }));
  if (bodyErr) return bodyErr;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: body.password });
  if (error) return apiError(error.message);

  await supabase.auth.admin.signOut(user.id).catch(() => {});
  return ok({ message: 'Password reset successfully. Please log in again.' });
}

async function handleResendVerification(req: NextRequest) {
  const rateLimitErr = await checkAuthRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const { data: body, error: bodyErr } = await parseBody(req, z.object({ email: z.string().email() }));
  if (bodyErr) return bodyErr;

  const { error } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(body.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3000'}/dashboard`,
  });

  if (error) return apiError(error.message);
  return ok({ message: 'Verification email sent. Please check your inbox.' });
}
