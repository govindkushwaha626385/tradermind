// ──────────────────────────────────────────────
// TradeMind — Landing / Home Page (Server Component)
//
// Optimized for Core Web Vitals, SEO, and fast SSR.
// Interactive islands (Navbar, Hero, Pricing, Reviews)
// are client components.
// ──────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { APP_NAME } from '@trademind/shared';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { LiveTradingSimulationTerminal } from '@/components/landing/LiveTradingSimulationTerminal';
import { StatsSection } from '@/components/landing/StatsSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CompetitorComparisonSection } from '@/components/landing/CompetitorComparisonSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { BrokersSection } from '@/components/landing/BrokersSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { GlobalMarketTickerStrip } from '@/components/landing/GlobalMarketTickerStrip';
import { TradingLeakCalculator } from '@/components/landing/TradingLeakCalculator';
import { LandingNewsIntelligenceSection } from '@/components/landing/LandingNewsIntelligenceSection';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: `${APP_NAME} — Automated Trading Journal & AI Analytics | Stocks, F&O, Crypto & Forex`,
  description:
    'The premier automated trading journal for active traders worldwide. Real-time broker sync (Groww, Zerodha, Dhan, Angel One, Upstox, Delta Exchange, CSV), bar-by-bar TradingView candlestick replay, AI trade autopsy, behavioral risk shield, and multi-currency performance analytics.',
  keywords: [
    'automated trading journal',
    'trading journal software',
    'crypto trading journal',
    'forex trade journal',
    'options trading journal',
    'tradingview replay journal',
    'ai trading copilot',
    'tradezella alternative',
    'ultratrader alternative',
    'groww trade sync',
    'zerodha trading journal',
    'dhan api journal',
    'mfe mae trade metrics',
    'behavioral trading analysis',
    'trading psychology app',
  ],
  alternates: {
    canonical: 'https://trademind.app',
  },
  openGraph: {
    title: `${APP_NAME} — Automated Trading Journal & AI Analytics`,
    description:
      'Real-time broker sync, bar-by-bar candlestick replay, behavioral risk shield, and institutional trade autopsy. Built for stocks, crypto, forex, and options traders.',
    type: 'website',
    url: 'https://trademind.app',
    siteName: APP_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Automated Trading Journal & AI Analytics`,
    description:
      'Auto-sync trades from global brokers, eliminate emotional trading errors, and build an institutional trading edge.',
    site: '@trademindapp',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

const FAQS = [
  {
    q: 'How does the broker sync work?',
    a: 'Once you connect your broker via OAuth or API key, our backend securely stores your credentials (encrypted at rest) and syncs your trades automatically on a daily schedule. You can also trigger a manual sync anytime from the Brokers page.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Broker tokens and API keys are encrypted using AES-256-GCM. All connections use TLS 1.3. Row-Level Security ensures every user can only access their own data. We never share your trading data with third parties.',
  },
  {
    q: 'Which brokers and exchanges do you support?',
    a: 'We support Zerodha, Dhan, Angel One, Upstox, Groww, and Delta Exchange via official direct APIs. We also support Binance, Bybit, Interactive Brokers (IBKR), MetaTrader 4 & 5, Sahi, Lemonn, and 50+ international brokers through our smart universal CSV auto-importer.',
  },
  {
    q: 'Can I cancel my subscription?',
    a: 'Yes, anytime. Your access continues until the end of the current billing period. Downgrading to the free plan keeps your historical data intact.',
  },
  {
    q: 'What is MFE/MAE tracking?',
    a: 'Maximum Favorable/Adverse Excursion measures how far a trade moved in your favor or against you before it was closed. It helps evaluate whether your exits are optimal relative to the price action during the trade.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes! The Starter plan is free forever and includes up to 50 trades per month, 1 broker connection, and basic analytics. Upgrade to Pro or Elite when you need more.',
  },
];

export default function HomePage() {
  // Structured Data (JSON-LD) for Search Engine Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: APP_NAME,
        operatingSystem: 'All',
        applicationCategory: 'FinanceApplication',
        description:
          'Automated trading journal with broker sync, behavioral analytics, and Indian tax calculations.',
        url: 'https://trademind.app',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '347',
          bestRating: '5',
        },
        offers: [
          { '@type': 'Offer', name: 'Starter', price: '0', priceCurrency: 'INR' },
          { '@type': 'Offer', name: 'Pro', price: '499', priceCurrency: 'INR' },
          { '@type': 'Offer', name: 'Elite', price: '999', priceCurrency: 'INR' },
        ],
      },
      {
        '@type': 'Organization',
        name: APP_NAME,
        url: 'https://trademind.app',
        logo: 'https://trademind.app/og-image.png',
        sameAs: ['https://twitter.com/trademindapp'],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'support@trademind.app',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://trademind.app' },
          { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://trademind.app/#pricing' },
          { '@type': 'ListItem', position: 3, name: 'Register', item: 'https://trademind.app/register' },
        ],
      },
    ],
  };

  return (
    <div className="relative bg-slate-950 min-h-screen">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Sticky Navigation Bar ────────── */}
      <LandingNavbar />

      {/* ── Live Global Market Pulse Ticker ─ */}
      <div className="pt-16">
        <GlobalMarketTickerStrip />
      </div>

      {/* ── Hero Section ─────────────────── */}
      <HeroSection />

      {/* ── Stats (social proof numbers) ─── */}
      <StatsSection />

      {/* ── Interactive Live Trading Terminal & Simulation ── */}
      <LiveTradingSimulationTerminal />

      {/* ── Behavioral Leak & Edge Recovery Calculator ── */}
      <TradingLeakCalculator />

      {/* ── Real-Time Finnhub News & Economic Calendar Section ── */}
      <LandingNewsIntelligenceSection />

      {/* ── Features Section ──────────────── */}
      <FeaturesSection />

      {/* ── Competitor Head-to-Head Comparison ── */}
      <CompetitorComparisonSection />

      {/* ── How It Works ──────────────────── */}
      <HowItWorksSection />

      {/* ── Brokers Section ──────────────── */}
      <BrokersSection />

      {/* ── Pricing Section (Client Island) ── */}
      <PricingSection />

      {/* ── Testimonials Section (Client Island) ── */}
      <TestimonialsSection />

      {/* ── FAQ Section (Semantic HTML Accordion) ── */}
      <section id="faq" className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(99,102,241,0.06),transparent_70%)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 font-display">
              Frequently Asked{' '}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
            <p className="text-slate-400">Everything you need to know about TradeMind.</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 hover:border-white/10 transition-all open:border-violet-500/20 open:bg-violet-500/[0.03]"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform duration-200" />
                </summary>
                <p className="mt-4 text-sm text-slate-400 leading-relaxed border-t border-white/[0.06] pt-4">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────── */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-violet-950/10 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(124,58,237,0.12),transparent_70%)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-6">
            Get Started Today
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 font-display">
            Ready to trade with{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              data, not emotions?
            </span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of active traders and prop firm candidates worldwide who use TradeMind to master their edge, eliminate emotional tilt, and compound consistently across Stocks, F&amp;O, Crypto, and Forex.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              id="hero-cta-bottom"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-base shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5 hover:shadow-violet-500/35"
            >
              Start Free — No Card Required
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/calculators"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/[0.1] text-slate-300 hover:text-white hover:border-white/20 hover:bg-white/[0.04] font-medium text-base transition-all"
            >
              Try Free Calculators
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-4">
            Free plan includes 50 trades/month · No credit card required
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────── */}
      <Footer />
    </div>
  );
}
