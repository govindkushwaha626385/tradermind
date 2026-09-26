// ──────────────────────────────────────────────
// TradeMind — Technical Trading Blog & Research Hub
// SEO-optimized organic traffic engine for algorithmic traders,
// SMC price action specialists, options traders, and prop firm candidates.
// ──────────────────────────────────────────────

import { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Shield,
  Activity,
  Layers,
  Zap,
} from 'lucide-react';
import { BLOG_POSTS } from '@/lib/blog-data';
import { BlogIndexClient } from '@/components/blog/BlogIndexClient';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'Trading Intelligence & Research Blog — TradeMind',
  description:
    'Institutional trading guides, Smart Money Concepts (SMC), algorithmic risk management, options Greeks, and behavioral psychology from quantitative traders.',
  openGraph: {
    title: 'TradeMind Trading Intelligence & Research Blog',
    description:
      'Institutional trading guides, Smart Money Concepts (SMC), algorithmic risk management, and trading psychology.',
    type: 'website',
    url: 'https://trademind.app/blog',
  },
  alternates: {
    canonical: 'https://trademind.app/blog',
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-fade-in flex flex-col justify-between">
      <LandingNavbar />

      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-12 flex-1 w-full">
        {/* Header */}
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Institutional Research & Guides</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-foreground">
            Trading Intelligence & Edge
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Quantitative research, Smart Money Concepts (SMC), options Greeks, and the neuroscience of behavioral discipline.
          </p>
        </div>

        {/* Interactive Filterable Client Body */}
        <BlogIndexClient posts={BLOG_POSTS} />

        {/* CTA Banner: TradeMind Terminal */}
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl font-black text-foreground">
              Put Theory into Live Execution
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Connect your broker, run pre-market checklists, simulate options payoff curves, and analyze trade autopsies with the #1 institutional journal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              <span>Start Free Journal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/calculators"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/80 bg-background hover:bg-accent text-foreground font-semibold text-xs transition-colors"
            >
              <span>Free Calculators</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
