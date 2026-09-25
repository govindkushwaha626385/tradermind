// ──────────────────────────────────────────────
// TradeMind — Public Product Changelog & Releases
// ──────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  Shield,
  Activity,
  Award,
  Globe2,
  Cpu,
  LineChart,
} from 'lucide-react';
import { APP_NAME } from '@trademind/shared';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { Footer } from '@/components/landing/Footer';

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://trademind.app';

export const metadata: Metadata = {
  title: `Changelog & Product Updates — ${APP_NAME}`,
  description:
    'Discover what is new in TradeMind: Interactive Live Sandbox, TradingView Lightweight Charts, Multi-Broker Sync, AI Trade Autopsy, and Institutional Analytics.',
  keywords: [
    'trademind changelog',
    'trading journal updates',
    'tradingview replay updates',
    'ai trading journal releases',
    'prop firm tracker updates',
  ],
  alternates: {
    canonical: `${APP_URL}/changelog`,
  },
  openGraph: {
    title: `Changelog & Product Updates — ${APP_NAME}`,
    description:
      'Continuous innovations in automated trade sync, behavioral AI, and institutional analytics.',
    url: `${APP_URL}/changelog`,
    type: 'website',
  },
};

interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  highlights: {
    category: string;
    items: string[];
  }[];
}

const RELEASES: ReleaseEntry[] = [
  {
    version: 'v2.4.0',
    date: 'September 2026',
    title: 'Live Sandbox, TradingView 60 FPS Charts & Global Multi-Asset Engine',
    badge: 'Latest Major Release',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    description:
      'A monumental release introducing instant live sandboxing, high-performance canvas candlestick replay, and native global broker support across Equities, F&O, Crypto, and Forex.',
    highlights: [
      {
        category: 'Interactive Live Sandbox',
        items: [
          'Zero-signup interactive sandbox (/demo) with full TradingView replay & sample ledgers',
          'Instant 1-click AI Trade Autopsy preview with real-time process score calculations',
          'Seamless transition from live demo sandbox into your permanent account',
        ],
      },
      {
        category: 'Market Radar & 60 FPS Lightweight Charts',
        items: [
          'TradingView Lightweight Charts v5 hardware-accelerated canvas area charts on the dashboard',
          'Multi-asset index radar switching between NIFTY 50, BANK NIFTY, S&P 500, BTC/USD, and EUR/USD',
          'Enhanced Equity Curve with adaptive baseline, peak tracking, and light/dark theme contrast',
        ],
      },
      {
        category: 'Global Multi-Asset & Multi-Broker Sync',
        items: [
          'Direct API sync for Indian & Crypto brokers (Zerodha, Dhan, Upstox, Groww, Delta Exchange)',
          'Universal smart CSV importer auto-detecting Binance, Bybit, MetaTrader 4/5, and Interactive Brokers',
          'Statutory taxes and multi-currency fee engine supporting INR, USD, EUR, and USDT',
        ],
      },
    ],
  },
  {
    version: 'v2.3.0',
    date: 'August 2026',
    title: 'AI Trade Autopsy & Multi-Persona Assistant Suite',
    badge: 'AI Intelligence',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    description:
      'Deep learning behavioral intelligence that audits your trades, warns against tilt, and acts as your personalized trading coach.',
    highlights: [
      {
        category: 'AI Autopsy & Chart Vision OCR',
        items: [
          'Automated execution autopsy evaluating entry precision, stop placement, and exit efficiency',
          'Multi-timeframe screenshot gallery with 1-click Gemini Vision OCR for technical setups',
          'Batch AI Auto-Journaling with emotional mistake tagging (FOMO, Revenge, Hesitation)',
        ],
      },
      {
        category: 'Real-Time Risk Alerts & Webhooks',
        items: [
          'Instant Discord & Telegram webhook notifications on daily loss limit triggers',
          'Automated End-of-Day debrief dispatch with behavioral leaks and performance metrics',
          'Psychological Tilt Shield with guided breathing exercises and cooldown lockouts',
        ],
      },
    ],
  },
  {
    version: 'v2.2.0',
    date: 'July 2026',
    title: 'Prop Firm Challenge Tracker & 18-Tool Calculator Suite',
    badge: 'Tools & Analytics',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    description:
      'Professional tool suite empowering funded traders to track challenge milestones and simulate risk with mathematical perfection.',
    highlights: [
      {
        category: 'Prop Firm Evaluations',
        items: [
          'Evaluation tracking presets for FTMO, Topstep, FundedNext, Apex Trader, and The5ers',
          'Live drawdown meters with trailing high-water mark vs static baseline switches',
          'Exportable verified credential certificates for social proof on Twitter/Discord',
        ],
      },
      {
        category: 'Calculators Hub',
        items: [
          '18 free mathematical engines: Black-Scholes Greeks, Position Sizing, Camarilla Pivots, and CAGR',
          'Options Strategy Payoff visual diagrams for Bull Call Spreads, Straddles, and Iron Condors',
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <LandingNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Continuous Innovation</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-display text-white">
            TradeMind Changelog
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            See every new feature, performance improvement, and architectural upgrade engineered to give you an institutional edge.
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-12">
          {RELEASES.map((rel) => (
            <article
              key={rel.version}
              className="relative p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-6"
            >
              {/* Release Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-2xl font-bold font-mono text-white tracking-tight">
                    {rel.version}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${rel.badgeColor}`}
                  >
                    {rel.badge}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{rel.date}</span>
                </div>
              </div>

              {/* Title & Desc */}
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  {rel.title}
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  {rel.description}
                </p>
              </div>

              {/* Highlights Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {rel.highlights.map((col) => (
                  <div
                    key={col.category}
                    className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.04] space-y-3"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{col.category}</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-300 leading-normal">
                      {col.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* CTA Footer */}
        <div className="mt-16 text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-violet-950/30 to-slate-900 border border-violet-500/20 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
            Experience the Future of Trading Analytics Today
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Try our interactive live demo without registering or creating an account.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-lg shadow-violet-600/30 transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              <span>Try Live Sandbox</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/20 transition-all"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
