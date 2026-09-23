// ──────────────────────────────────────────────
// TradeMind — Authentication Routes
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabaseAdmin, getSupabaseClient } from '@trademind/database';
import { getDatabase, users } from '@trademind/database';
import { eq } from 'drizzle-orm';
import { validateBody } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { authRateLimitMiddleware } from '../middleware/rate-limit';

// Auth rate limiter is now shared from middleware/rate-limit.ts
// (authRateLimitMiddleware — 5 req/min per IP, PostgreSQL-backed)
const authRateLimit = authRateLimitMiddleware;

export const authRouter = new Hono();

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

/**
 * POST /auth/register — Create account
 */
authRouter.post('/register', authRateLimit, validateBody(registerSchema), async (c) => {
  const { email, password, name } = c.get('validatedBody') as { email: string; password: string; name: string };
  const db = getDatabase();

  // Use the public Auth flow so Supabase sends the verification email.
  const { data: authData, error: authError } = await getSupabaseClient().auth.signUp({
    email,
    password,
  });

  if (authError) {
    return c.json({ success: false, error: { message: authError.message } }, 400);
  }

  const supabaseUserId = authData.user?.id;
  if (!supabaseUserId) {
    return c.json({ success: false, error: { message: 'Failed to create user' } }, 500);
  }

  // Create user profile in our database
  await db.insert(users).values({
    id: supabaseUserId,
    email,
    name,
    role: 'USER',
  });

  return c.json({
    success: true,
    data: {
      id: supabaseUserId,
      email,
      name,
      role: 'USER',
    },
  }, 201);
});

/**
 * POST /auth/login — Sign in
 */
authRouter.post('/login', authRateLimit, validateBody(loginSchema), async (c) => {
  const { email, password } = c.get('validatedBody') as { email: string; password: string };
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Check if the error is because email is not confirmed
    if (error.message?.includes('Email not confirmed')) {
      return c.json({
        success: false,
        error: {
          message: 'Please verify your email before logging in. Check your inbox for the verification link.',
          code: 'EMAIL_NOT_VERIFIED',
        },
      }, 401);
    }
    return c.json({ success: false, error: { message: 'Invalid email or password' } }, 401);
  }

  return c.json({
    success: true,
    data: {
      user: data.user,
      session: data.session,
    },
  });
});

/**
 * POST /auth/resend-verification — Resend email verification
 */
authRouter.post('/resend-verification', authRateLimit, validateBody(z.object({
  email: z.string().email(),
})), async (c) => {
  const { email } = c.get('validatedBody') as { email: string };
  const supabase = getSupabaseAdmin();

  // Use Supabase admin API to resend verification
  // Note: generateLink with type='signup' requires password,
  // so we use the invite approach — generate a signup link
  // which effectively sends a verification email.
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/dashboard`,
  });

  if (error) {
    return c.json({ success: false, error: { message: error.message } }, 400);
  }

  return c.json({
    success: true,
    data: { message: 'Verification email sent. Please check your inbox.' },
  });
});

/**
 * POST /auth/logout — Sign out
 */
authRouter.post('/logout', authMiddleware, async (c) => {
  const supabase = getSupabaseAdmin();
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.slice(7) ?? '';

  if (token) {
    await supabase.auth.admin.signOut(token);
  }

  return c.json({ success: true, data: { message: 'Logged out successfully' } });
});

/**
 * GET /auth/me — Current user profile
 */
authRouter.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDatabase();

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!profile) {
    return c.json({ success: false, error: { message: 'User not found' } }, 404);
  }

  return c.json({ success: true, data: profile });
});

/**
 * PUT /auth/me — Update current user profile
 */
authRouter.put('/me', authMiddleware, validateBody(z.object({
  name: z.string().max(255).optional(),
  email: z.string().email().optional(),
  preferredCurrency: z.string().length(3).optional(),
  timezone: z.string().max(50).optional(),
})), async (c) => {
  const user = c.get('user');
  const body = c.get('validatedBody');
  const db = getDatabase();

  const [updated] = await db
    .update(users)
    .set(body)
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: { message: 'User not found' } }, 404);
  }

  return c.json({ success: true, data: updated });
});

/**
 * POST /auth/forgot-password — Send password reset email
 */
authRouter.post('/forgot-password', authRateLimit, validateBody(z.object({
  email: z.string().email(),
})), async (c) => {
  const { email } = c.get('validatedBody') as { email: string };
  const db = getDatabase();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    // Don't reveal whether the email exists
    return c.json({ success: true, data: { message: 'If that email is registered, a password reset link has been sent.' } });
  }

  // Use Supabase's built-in password reset (sends recovery email automatically)
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error('Password reset error:', error.message);
  }

  console.log(`🔐 Password reset requested for ${email}`);
  return c.json({ success: true, data: { message: 'If that email is registered, a password reset link has been sent.' } });
});

/**
 * POST /auth/reset-password — Update password using Supabase recovery link
 *
 * The user receives a recovery email from Supabase with a type=recovery URL.
 * They click it, get redirected to the frontend which captures the access_token
 * from the URL fragment, then calls this endpoint with the new password.
 */
authRouter.post('/reset-password', authRateLimit, authMiddleware, validateBody(z.object({
  password: z.string().min(8),
})), async (c) => {
  const user = c.get('user') as { id: string; email: string };
  const { password } = c.get('validatedBody') as { password: string };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
  });

  if (error) {
    return c.json({ success: false, error: { message: error.message } }, 400);
  }

  // Invalidate all existing sessions for this user
  await supabase.auth.admin.signOut(user.id).catch(() => {});

  return c.json({ success: true, data: { message: 'Password reset successfully. Please log in again.' } });
});
