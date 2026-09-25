// ──────────────────────────────────────────────
// TradeMind — Login Page (Premium Redesign)
//
// Split-screen layout:
//   Left  — Form with glass card, smooth focus, social trust signals
//   Right — Animated gradient panel with stats, testimonial, broker logos
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Brain,
  BarChart3,
  Shield,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { api, setAccessToken } from '@/lib/api';

const STATS = [
  { label: 'Active Traders', value: '2,500+' },
  { label: 'Trades Analyzed', value: '1.2M+' },
  { label: 'Avg. Performance Lift', value: '28%' },
];

const FEATURES = [
  { icon: TrendingUp,  text: 'Auto-sync from Zerodha, Dhan, Angel One & more' },
  { icon: Brain,       text: 'AI-powered behavioral pattern detection' },
  { icon: BarChart3,   text: '50+ performance metrics calculated automatically' },
  { icon: Shield,      text: 'Bank-grade AES-256 encryption for your data' },
];

const BROKERS = ['Z', 'D', 'A', 'U', 'G', 'Δ'];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [mounted, setMounted]           = useState(false);

  useEffect(() => {
    setMounted(true);
    document.title = 'Sign In — TradeMind';
  }, []);

  const registered = mounted
    ? new URLSearchParams(window.location.search).get('registered') === 'true'
    : false;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(email, password);
      if (!response.success) throw new Error(response.error?.message ?? 'Login failed');
      const data = response.data as { session?: { access_token?: string } };

      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
        sessionStorage.setItem('trademind_access_token', data.session.access_token);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
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
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your trading journal</p>
          </div>

          {/* Registration success banner */}
          {registered && (
            <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-sm text-success mb-6 flex items-center gap-2 animate-slide-down">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Account created! Check your email to verify, then sign in.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-input bg-background text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
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
              id="login-submit-btn"
              disabled={loading}
              className="w-full mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social trust */}
          <div className="mt-6 pt-5 border-t border-border/50">
            <div className="flex items-center gap-3 justify-center">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                Trusted by <span className="font-semibold text-foreground">2,500+</span> active traders worldwide
              </span>
            </div>
          </div>

          <p className="mt-5 text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right — Gradient Feature Panel ─────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-violet-900">
        {/* Animated orbs */}
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-violet-500/25 blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-indigo-400/15 blur-2xl animate-pulse-slow" style={{ animationDelay: '0.8s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 text-white">
          {/* Brand icon */}
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-8 backdrop-blur-sm">
            <Zap className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Know Your Trades.<br />Know Yourself.
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed mb-10 max-w-xs">
            The only journal that correlates your emotions with real P&amp;L data, so you can finally break the patterns costing you money.
          </p>

          {/* Feature list */}
          <ul className="space-y-4 mb-10">
            {FEATURES.map(({ icon: FeatureIcon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-blue-100">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <FeatureIcon className="w-3.5 h-3.5 text-white" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          {/* Stats row */}
          <div className="flex items-center gap-6 border-t border-white/10 pt-8">
            {STATS.map(({ label, value }) => (
              <div key={label}>
                <div className="text-xl font-bold">{value}</div>
                <div className="text-xs text-blue-300 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Broker logos */}
          <div className="mt-8">
            <p className="text-xs text-blue-400 mb-3 uppercase tracking-wider font-medium">
              Supported Brokers
            </p>
            <div className="flex items-center gap-2">
              {BROKERS.map((letter) => (
                <div
                  key={letter}
                  className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-xs font-bold backdrop-blur-sm"
                >
                  {letter}
                </div>
              ))}
              <span className="text-xs text-blue-300 ml-1">+ CSV</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
