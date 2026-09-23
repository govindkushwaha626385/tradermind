// ──────────────────────────────────────────────
// TradeMind — Reset Password Page
//
// Handles the Supabase recovery link callback.
// The recovery email contains a link with a token;
// the user lands here, enters a new password,
// and we update it via Supabase.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';
import { api, setAccessToken } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  // On mount, check for the recovery session in the URL hash
  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        setAccessToken(data.session.access_token);
        sessionStorage.setItem('trademind_access_token', data.session.access_token);
        setReady(true);
      } else {
        // Try to parse the hash fragment (Supabase puts tokens there)
        const hash = window.location.hash;
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.slice(1));
          const token = params.get('access_token');
          if (token) {
            setAccessToken(token);
            sessionStorage.setItem('trademind_access_token', token);
            setReady(true);
            return;
          }
        }
        setError('Invalid or expired reset link. Please request a new one.');
      }
    });
    return () => { cancelled = true; };
  }, []); // Empty deps — runs once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await api.resetPassword(password);
      if (!response.success) throw new Error(response.error?.message ?? 'Failed to reset password');
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">TM</span>
          </div>
          <span className="font-semibold text-lg">TradeMind</span>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <h1 className="text-2xl font-bold">Password updated!</h1>
            <p className="text-muted-foreground text-sm">Redirecting to login...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-1">Set a new password</h1>
            <p className="text-muted-foreground mb-8">Choose a strong password for your account.</p>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !ready}
                className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
