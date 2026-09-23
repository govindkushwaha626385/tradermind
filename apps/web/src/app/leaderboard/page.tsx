// ──────────────────────────────────────────────
// TradeMind — Public Trader Leaderboard Hub
// ──────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, ArrowLeft, ShieldCheck, Sparkles, BarChart2 } from 'lucide-react';
import { APP_NAME } from '@trademind/shared';
import { PublicLeaderboardView } from '@/components/leaderboard/PublicLeaderboardView';

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://trademind.app';

export const metadata: Metadata = {
  title: 'Top Consistent Traders Leaderboard — Verified Discipline & Win Rate | TradeMind',
  description:
    'Discover the top ranked traders worldwide on TradeMind. Ranked by composite mathematical discipline score, win rate, and risk-adjusted performance. Opt in to compete and build verified trading credibility.',
  keywords: [
    'trader leaderboard',
    'verified trading leaderboard',
    'profitable traders ranking',
    'discipline score leaderboard',
    'best intraday traders india',
    'trading consistency leaderboard',
    'nifty options trader ranking',
  ],
  alternates: {
    canonical: `${APP_URL}/leaderboard`,
  },
  openGraph: {
    title: `Top Consistent Traders Leaderboard — ${APP_NAME}`,
    description:
      'Verified rankings of the most disciplined and consistent traders based on real journaled executions.',
    url: `${APP_URL}/leaderboard`,
    type: 'website',
  },
};

export default function PublicLeaderboardPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'TradeMind Verified Trader Leaderboard',
    description: 'Top consistent and disciplined traders ranked by win rate and rule compliance.',
    url: `${APP_URL}/leaderboard`,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Top Navigation Bar ──────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-zinc-300 hover:text-white transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center font-black text-white text-sm shadow-md shadow-brand-500/20">
                TM
              </div>
              <span className="font-bold text-base tracking-tight text-white">TradeMind</span>
            </Link>

            <span className="text-zinc-600">/</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Leaderboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard/leaderboard"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all shadow-md shadow-amber-500/20"
            >
              Dashboard View
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Page Hero Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mathematical Edge Ranking</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            The Verified Trader Leaderboard
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Real performance backed by verified journaling. Rankings reward traders who consistently follow rules, protect capital, and achieve positive expectancy.
          </p>
        </div>

        {/* Live Leaderboard View */}
        <PublicLeaderboardView />
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950/60 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>© {new Date().getFullYear()} TradeMind. Verified Trading Intelligence.</div>
          <div className="flex items-center gap-4">
            <Link href="/calculators" className="hover:text-zinc-300 transition-colors">
              Free Calculators
            </Link>
            <Link href="/store" className="hover:text-zinc-300 transition-colors">
              Products Store
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
              Trader Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
