// ──────────────────────────────────────────────
// TradeMind — Register Page (Premium Redesign)
//
// Split-screen layout:
//   Left  — Form with glass card, animated password strength
//   Right — Feature panel (matches login for consistency)
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Zap,
  TrendingUp,
  Brain,
  BarChart3,
  Shield,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Password strength helper ──────────────────
const REQUIREMENTS = [
  { label: 'At least 8 characters',    test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter',      test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter',      test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number',                test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character',     test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function usePasswordStrength(password: string) {
  return useMemo(() => {
    const metCount = REQUIREMENTS.filter((r) => r.test(password)).length;
    if (password.length === 0) return { score: 0, label: '',          color: 'bg-muted' };
    if (metCount <= 1)         return { score: 1, label: 'Weak',      color: 'bg-red-500' };
    if (metCount === 2)        return { score: 2, label: 'Fair',      color: 'bg-amber-500' };
    if (metCount === 3)        return { score: 3, label: 'Good',      color: 'bg-yellow-500' };
    if (metCount === 4)        return { score: 4, label: 'Strong',    color: 'bg-emerald-400' };
    return                            { score: 5, label: 'Very Strong', color: 'bg-emerald-500' };
  }, [password]);
}

const FEATURES = [
  { icon: TrendingUp, text: 'Auto-sync from all major Indian brokers' },
  { icon: Brain,      text: 'Behavioral pattern detection with AI' },
  { icon: BarChart3,  text: '50+ performance metrics, zero manual entry' },
  { icon: Shield,     text: 'Bank-grade encryption — your data is private' },
];

const PERKS = [
  'Free forever plan — no credit card needed',
  'Start analyzing trades in under 2 minutes',
  'Supports Zerodha, Dhan, Angel One, Upstox & more',
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [showStrength, setShowStrength] = useState(false);

  const strength = usePasswordStrength(password);
  const allMet   = REQUIREMENTS.every((r) => r.test(password));

  useEffect(() => {
    document.title = 'Create Account — TradeMind';
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allMet) {
      setError('Please meet all password requirements before continuing.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await api.register(email, password, name);
      if (res.success) {
        router.push('/login?registered=true');
      }
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left — Form Panel ───────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12 bg-background">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-white font-bold text-sm">TM</span>
            </div>
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
              TradeMind
            </span>
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="text-muted-foreground text-sm mt-1">Start journaling in under 2 minutes — free forever</p>
          </div>

          {/* Perk list */}
          <ul className="space-y-1.5 mb-7">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                {perk}
              </li>
            ))}
          </ul>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium mb-1.5">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium mb-1.5">
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setShowStrength(true); }}
                  onFocus={() => setShowStrength(true)}
                  placeholder="Create a strong password"
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-input bg-background text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength meter */}
              {showStrength && password.length > 0 && (
                <div className="mt-2.5 animate-slide-down">
                  {/* Bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-all duration-300',
                            i < strength.score ? strength.color : 'bg-muted',
                          )}
                        />
                      ))}
                    </div>
                    <span className={cn(
                      'text-xs font-medium transition-colors',
                      strength.score <= 1 && 'text-red-500',
                      strength.score === 2 && 'text-amber-500',
                      strength.score === 3 && 'text-yellow-500',
                      strength.score >= 4 && 'text-emerald-500',
                    )}>
                      {strength.label}
                    </span>
                  </div>

                  {/* Requirements checklist */}
                  <ul className="space-y-1">
                    {REQUIREMENTS.map((req) => {
                      const met = req.test(password);
                      return (
                        <li key={req.label} className={cn('flex items-center gap-1.5 text-xs transition-colors', met ? 'text-success' : 'text-muted-foreground')}>
                          <Check className={cn('w-3 h-3 flex-shrink-0', met ? 'opacity-100' : 'opacity-30')} />
                          {req.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive animate-slide-down"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="register-submit-btn"
              disabled={loading || !allMet}
              className="w-full mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account — Free
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-5">
            By signing up you agree to our{' '}
            <Link href="/terms" className="underline hover:text-foreground">Terms</Link>{' '}and{' '}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>

          <p className="mt-4 text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right — Gradient Feature Panel ─────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-violet-900 via-indigo-900 to-blue-900">
        {/* Animated orbs */}
        <div className="absolute top-16 right-10 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-16 left-16 w-56 h-56 rounded-full bg-blue-500/20 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 text-white">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-8 backdrop-blur-sm">
            <Zap className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Stop Guessing.<br />Start Growing.
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed mb-10 max-w-xs">
            TradeMind is the only journaling platform that automatically connects behavioral data to your P&amp;L — so you improve faster.
          </p>

          {/* Feature list */}
          <ul className="space-y-4 mb-10">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-blue-100">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          {/* Social proof */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1 mb-2">
              {[1,2,3,4,5].map((s) => (
                <svg key={s} className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-sm text-white leading-snug">
              &ldquo;Finally understood why I kept losing on Tuesdays. My FOMO trades were eating 40% of my profits.&rdquo;
            </p>
            <p className="text-xs text-blue-300 mt-2">— Rohit S., F&O Trader, Mumbai</p>
          </div>
        </div>
      </div>
    </div>
  );
}
