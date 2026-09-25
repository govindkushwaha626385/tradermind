// ──────────────────────────────────────────────
// TradeMind — Public SEO Trading & Investing Calculators Hub
// ──────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Calculator,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Sparkles,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';
import { APP_NAME } from '@trademind/shared';
import { CalculatorSuite } from '@/components/calculators/CalculatorSuite';

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://trademind.app';

export const metadata: Metadata = {
  title: '19 Free Trading & Investing Calculators — Prop Firm Buffer, Position Size, Margin & Options',
  description:
    '19 free high-precision financial calculators for active traders and investors. Calculate prop firm drawdown buffers (FTMO, Topstep, Apex), position sizing, F&O margin requirements, Kelly Criterion, CAGR growth, ATR stop loss, Black-Scholes Greeks, and multi-asset brokerage.',
  keywords: [
    'prop firm calculator',
    'ftmo risk calculator',
    'topstep drawdown calculator',
    'apex trailing drawdown calculator',
    'trading calculator',
    'position size calculator',
    'cagr calculator',
    'fo margin calculator',
    'kelly criterion calculator',
    'break even calculator trading',
    'atr stop loss calculator',
    'options greeks calculator',
    'black scholes calculator',
    'options payoff simulator',
    'brokerage calculator zerodha',
    'fno charges calculator',
    'pivot points calculator camarilla',
    'fibonacci retracement calculator',
    'compounding calculator trading',
    'drawdown recovery calculator',
    'sip step up calculator',
    'emi calculator loan',
    'nifty position sizing',
  ],
  alternates: {
    canonical: `${APP_URL}/calculators`,
  },
  openGraph: {
    title: `19 Free Trading & Investing Calculators — ${APP_NAME}`,
    description:
      'Professional-grade calculators for prop firm drawdown buffers, position sizing, F&O margins, Kelly Criterion, ATR stop loss, CAGR growth, Black-Scholes Greeks, options strategy payoffs, and brokerage fees.',
    url: `${APP_URL}/calculators`,
    type: 'website',
  },
};

export default function PublicCalculatorsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'TradeMind Trading & Investing Calculators',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description:
      'Free suite of financial calculators including Position Sizing, Black-Scholes Options Greeks, Options Payoff Diagrams, NSE/BSE Brokerage & Taxes, and Pivot Points.',
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do I calculate position size for stocks and options?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Position size is calculated by dividing your maximum dollar risk (e.g. 1% of your account) by the per-share stop loss distance. For index options or futures, the number of units is rounded down to the nearest official contract lot size.',
        },
      },
      {
        '@type': 'Question',
        name: 'What formula is used for the Options Greeks calculator?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TradeMind uses the Black-Scholes-Merton model with high-precision Abramowitz & Stegun approximation to compute theoretical price, Delta, Gamma, Theta decay, Vega, and Rho.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is Indian F&O brokerage and STT calculated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'For Indian markets, brokerage is flat ₹20 or 0.03%. Securities Transaction Tax (STT) is 0.1% on sell side premium turnover for options, and 0.02% on futures sell turnover. GST of 18% is applied on brokerage, exchange turnover charges, and SEBI fees.',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Structured Data Schema ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── Public Top Nav ── */}
      <header className="sticky top-0 z-50 glass border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">TM</span>
            </div>
            <span className="font-semibold text-lg text-foreground">{APP_NAME}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <Link href="/#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/calculators" className="text-primary font-bold">
              Calculators
            </Link>
            <Link href="/store" className="hover:text-foreground transition-colors">
              Store
            </Link>
            <Link href="/leaderboard" className="hover:text-foreground transition-colors">
              Leaderboard
            </Link>
            <Link href="/#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md hover:shadow-primary/20"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden pt-10 pb-6 border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% Free · No Registration Required</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
            The Ultimate <span className="gradient-text">Trading & Investing</span> Calculator Suite
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Mathematically precise financial tools engineered for day traders, options strategists, and long-term investors. Seamlessly switch between ₹ INR and $ USD.
          </p>
        </div>
      </div>

      {/* ── Main Calculator Suite ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CalculatorSuite defaultCurrency="INR" isPublicView={true} />
      </main>

      {/* ── Conversion CTA Banner ── */}
      <section className="border-t border-border bg-gradient-to-br from-primary/10 via-card to-violet-600/10 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 mx-auto flex items-center justify-center text-white shadow-lg">
            <BarChart2 className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">
              Ready to Turn Calculated Trades into Consistent Profits?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Calculators plan your trades — <strong>TradeMind journals and automates your discipline</strong>. Auto-sync trades from Zerodha, Dhan, Angel One, Upstox, and more in 1 click.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-foreground pt-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Automatic Broker Sync
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Behavioral Mindset AI
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Sec 44AB Tax Audit Ready
            </span>
          </div>

          <div className="pt-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xl hover:shadow-primary/30"
            >
              <span>Start Your Free 14-Day Pro Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Simple Footer ── */}
      <footer className="border-t border-border/60 py-8 bg-card text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
              TM
            </div>
            <span>© {new Date().getFullYear()} TradeMind Technologies. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
