// ──────────────────────────────────────────────
// TradeMind — Institutional Pricing & Plans Page
//
// Optimized for SEO, transparent pricing, currency conversion,
// competitor comparison, and conversion rate optimization.
// ──────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Sparkles, CheckCircle2, ArrowRight, Zap, HelpCircle } from 'lucide-react';
import { APP_NAME } from '@trademind/shared';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { PricingSection } from '@/components/landing/PricingSection';
import { CompetitorComparisonSection } from '@/components/landing/CompetitorComparisonSection';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: `Pricing & Plans — ${APP_NAME} | Institutional Trading Journal & AI Analytics`,
  description:
    'Simple, transparent pricing for active traders and prop firm candidates. Get real-time broker sync, bar-by-bar TradingView replay, AI trade autopsy, 7 Golden Rules OS, and multi-currency performance analytics.',
  alternates: {
    canonical: 'https://trademind.app/pricing',
  },
  openGraph: {
    title: `Pricing & Plans — ${APP_NAME}`,
    description:
      'Start free forever. Upgrade to Pro or Elite for unlimited broker sync, AI trade autopsy, and bar-by-bar candlestick replay.',
    type: 'website',
    url: 'https://trademind.app/pricing',
  },
};

const PRICING_FAQS = [
  {
    q: 'Can I start for free without a credit card?',
    a: 'Yes, absolutely. Our Starter plan is free forever and includes 50 trades per month, 1 broker connection, and full access to manual logging and core performance analytics.',
  },
  {
    q: 'Are The 7 Golden Rules OS included in all plans?',
    a: 'Yes! The 7 Golden Rules Execution Standard and pre-trade checklist rules are included across all tiers, ensuring disciplined risk management for every trader from day one.',
  },
  {
    q: 'Can I cancel or switch plans anytime?',
    a: 'Yes, you can upgrade, downgrade, or cancel your subscription at any time directly from your billing portal. When you cancel, you retain access until the end of your billing cycle.',
  },
  {
    q: 'Do you offer refunds if I am not satisfied?',
    a: 'We offer a 14-day money-back guarantee on all paid plans. If TradeMind does not elevate your trading discipline, simply reach out to our team for a prompt refund.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit/debit cards (Visa, MasterCard, Amex), UPI, Net Banking, and international payment gateways via Razorpay and Stripe with bank-grade 256-bit encryption.',
  },
];

export default function PricingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'TradeMind Trading Journal',
    description: 'Automated trading journal and AI analytics for stocks, options, crypto, and forex.',
    brand: {
      '@type': 'Brand',
      name: APP_NAME,
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Starter Plan',
        price: '0',
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Pro Plan',
        price: '499',
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Elite Plan',
        price: '999',
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
      },
    ],
  };

  return (
    <div className="relative bg-slate-950 min-h-screen text-slate-100 selection:bg-violet-500/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation */}
      <LandingNavbar />

      {/* Hero Header */}
      <div className="pt-28 pb-12 sm:pt-36 sm:pb-16 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          Institutional Transparency
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 font-display">
          Invest in your edge,{' '}
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
            not expensive tools.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Zero hidden fees. Transparent monthly and annual plans designed to pay for themselves by catching a single emotional mistake.
        </p>

        {/* Feature Trust Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>14-Day Money-Back Guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>7 Golden Rules OS Included</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Cancel Anytime in 1-Click</span>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="relative">
        <PricingSection />
      </div>

      {/* Competitor Comparison Matrix */}
      <div className="relative border-t border-white/[0.06]">
        <CompetitorComparisonSection />
      </div>

      {/* Billing & Plan FAQs */}
      <section className="relative py-20 lg:py-24 border-t border-white/[0.06] bg-slate-900/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-semibold mb-3">
              <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
              Got Questions?
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Pricing &amp; Membership FAQs</h2>
          </div>

          <div className="space-y-3">
            {PRICING_FAQS.map((faq, idx) => (
              <details
                key={idx}
                className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 hover:border-white/10 transition-all open:border-violet-500/20 open:bg-violet-500/[0.02]"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-semibold text-white">
                  <span>{faq.q}</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/[0.06] pt-3">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="relative py-20 border-t border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Master your discipline starting today
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto text-sm sm:text-base">
            Join thousands of traders leveling up their performance with automated analytics and the 7 Golden Rules framework.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5"
            >
              Start Free Trial — No Card Needed
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 hover:bg-white/[0.04] text-sm font-medium transition-all"
            >
              Explore Live Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
