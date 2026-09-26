// ──────────────────────────────────────────────
// TradeMind — Public Trader Leaderboard Hub
// ──────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, ArrowLeft, ShieldCheck, Sparkles, BarChart2 } from 'lucide-react';
import { APP_NAME } from '@trademind/shared';
import { PublicLeaderboardView } from '@/components/leaderboard/PublicLeaderboardView';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { Footer } from '@/components/landing/Footer';

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

      {/* ── Public Top Nav ── */}
      <LandingNavbar />

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-28 pb-16 space-y-8">
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

      {/* ── Unified Footer ── */}
      <Footer />
    </div>
  );
}
