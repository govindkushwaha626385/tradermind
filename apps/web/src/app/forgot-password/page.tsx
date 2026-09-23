// ──────────────────────────────────────────────
// TradeMind — Forgot Password Page (Premium)
//
// Sends a password reset email via Supabase.
// Features animated success state, resend flow,
// and a centered glass card design.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]       = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    document.title = 'Forgot Password — TradeMind';
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendReset = async (isResend = false) => {
    if (isResend) setResending(true);
    else setLoading(true);
    setError('');

    try {
      const res = await api.forgotPassword(email);
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to send reset email');
      setSent(true);
      setCountdown(60);
    } catch (err: any) {
      setError(err.message ?? 'Failed to send reset email');
    } finally {
      setLoading(false);
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-950 dark:to-slate-950">
      {/* Background decorations */}
      <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-48 h-48 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-10 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white font-bold text-sm">TM</span>
          </div>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
            TradeMind
          </span>
        </Link>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 shadow-card-lg animate-bounce-in">
          {sent ? (
            /* ── Success state ─────────────────── */
            <div className="text-center space-y-5">
              {/* Animated check */}
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-full bg-success/10 animate-ping opacity-30" />
                <div className="relative w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
              </div>

              <div>
                <h1 className="text-xl font-bold text-foreground">Check your inbox</h1>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  We&apos;ve sent a password reset link to{' '}
                  <span className="font-semibold text-foreground">{email}</span>.{' '}
                  The link expires in 1 hour.
                </p>
              </div>

              {/* Resend */}
              <div className="text-sm text-muted-foreground">
                Didn&apos;t receive it?{' '}
                {countdown > 0 ? (
                  <span className="text-foreground font-medium">
                    Resend in {countdown}s
                  </span>
                ) : (
                  <button
                    onClick={() => sendReset(true)}
                    disabled={resending}
                    className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    {resending && <RefreshCw className="w-3 h-3 animate-spin" />}
                    Resend email
                  </button>
                )}
              </div>

              {/* Tips */}
              <div className="text-left p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground mb-1.5">Not seeing it?</p>
                <p>• Check your spam / junk folder</p>
                <p>• Make sure you used the right email</p>
                <p>• Allow a minute for delivery</p>
              </div>

              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium mt-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          ) : (
            /* ── Request form ──────────────────── */
            <>
              <div className="mb-7">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Forgot your password?</h1>
                <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
                  No worries. Enter your email and we&apos;ll send you a secure reset link.
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); sendReset(); }} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive animate-slide-down"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  id="forgot-password-submit-btn"
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <p className="mt-6 text-sm text-center text-muted-foreground">
                Remembered it?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
