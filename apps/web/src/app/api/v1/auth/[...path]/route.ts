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
  const { path } = await params;
  const action = path?.[0];

  switch (action) {
    case 'register':    return handleRegister(req);
    case 'login':       return handleLogin(req);
    case 'logout':      return handleLogout(req);
    case 'forgot-password': return handleForgotPassword(req);
    case 'reset-password':  return handleResetPassword(req);
    case 'resend-verification': return handleResendVerification(req);
    default:
      return apiError(`Route not found: POST /api/v1/auth/${action}`, 404);
  }
}

/**
 * GET /api/v1/auth/[path]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const action = path?.[0];

  if (action === 'me') return handleGetMe(req);
  return apiError(`Route not found: GET /api/v1/auth/${action}`, 404);
}

/**
 * PUT /api/v1/auth/[path]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const action = path?.[0];

  if (action === 'me') return handleUpdateMe(req);
  return apiError(`Route not found: PUT /api/v1/auth/${action}`, 404);
}

// ── Handlers ──────────────────────────────────────────────────

async function handleRegister(req: NextRequest) {
  const rateLimitErr = await checkAuthRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const { data: body, error: bodyErr } = await parseBody(req, registerSchema);
  if (bodyErr) return bodyErr;

  const db = getDatabase();
  const { data: authData, error: authError } = await getSupabaseClient().auth.signUp({
    email: body.email,
    password: body.password,
  });

  if (authError) return apiError(authError.message);

  const supabaseUserId = authData.user?.id;
  if (!supabaseUserId) return apiError('Failed to create user', 500);

  await db.insert(users).values({
    id: supabaseUserId,
    email: body.email,
    name: body.name,
    role: 'USER',
  });

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

  const db = getDatabase();
  const [profile] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!profile) return notFound('User not found');

  return ok(profile);
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
