// ──────────────────────────────────────────────
// TradeMind — Public Trader Progression Roadmap
// High-authority curriculum and interactive career tracker.
// ──────────────────────────────────────────────

import { Metadata } from 'next';
import Link from 'next/link';
import {
  Compass,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Target,
  Brain,
  Award,
  BookOpen,
  Calculator,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { TRADER_ROADMAP, TRACK_META, type RoadmapStage, type RoadmapTrack } from '@/lib/roadmap-data';
import { EducationHeaderActions } from '@/components/education/EducationHeaderActions';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'Institutional Trader Career Progression Roadmap — TradeMind',
  description:
    'From novice to institutional funded trader: 4-stage progression roadmap covering capital defense, setup edge, volatility math, and multi-broker scaling.',
  openGraph: {
    title: 'TradeMind Trader Career Progression Roadmap',
    description:
      'The complete institutional career path: capital defense, edge validation, options greeks, and prop firm multi-account scaling.',
    type: 'website',
    url: 'https://trademind.app/roadmap',
  },
  alternates: {
    canonical: 'https://trademind.app/roadmap',
  },
};

export default function PublicRoadmapPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'Institutional Trader Career Progression Roadmap',
    description:
      'A structured 4-stage curriculum and milestone roadmap for day traders, swing traders, and prop firm challenge candidates.',
    provider: {
      '@type': 'Organization',
      name: 'TradeMind',
      sameAs: 'https://trademind.app',
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground animate-fade-in flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNavbar />

      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-12 flex-1 w-full">
        {/* Header */}
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide uppercase">
            <Compass className="w-4 h-4" />
            <span>Institutional Trader Career Blueprint</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-foreground">
            The Trader Evolution Roadmap
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            The systematic 4-stage journey followed by institutional quant desks and funded traders. Master capital defense, edge validation, volatility math, and multi-broker portfolio scaling.
          </p>

          <EducationHeaderActions />
        </div>

        {/* Specialization Tracks Overview */}
        <div className="rounded-3xl border border-border/80 bg-card/60 p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                6 Multi-Market Progression Tracks
              </h2>
              <p className="text-xs text-muted-foreground">
                Tailored curriculums designed specifically for your trading style and asset classes.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-primary">
              Stocks · Options · Crypto · Forex
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {(Object.keys(TRACK_META) as RoadmapTrack[]).map((trackKey) => {
              const track = TRACK_META[trackKey];
              return (
                <div
                  key={trackKey}
                  className="p-3.5 rounded-2xl border border-border/60 bg-background/60 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <span>{track.icon}</span>
                    <span className="truncate">{track.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {track.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4-Stage Progressive Curriculum */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              The 4 Stages of Trader Evolution
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Each stage establishes the mathematical and psychological foundation required to survive drawdowns and unlock institutional allocation.
            </p>
          </div>

          <div className="grid gap-6">
            {TRADER_ROADMAP.map((stage: RoadmapStage, idx: number) => {
              return (
                <div
                  key={stage.id}
                  className="rounded-3xl border border-border/80 bg-card/70 p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono font-bold text-lg">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{stage.title}</h3>
                        <p className="text-xs text-muted-foreground">{stage.summary}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                        {stage.milestones.length} Milestones
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stage.milestones.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl border border-border/50 bg-background/50 space-y-2 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-foreground leading-snug">
                            {m.title}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                            +{m.xpPoints} XP
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                          {m.shortDesc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to Action */}
        <div className="p-8 sm:p-12 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent text-center space-y-4">
          <Sparkles className="w-8 h-8 text-primary mx-auto" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            Track Your Progress Live in the Dashboard
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Interactive milestone checkboxes, verified cryptographic certificates, and AI scenario training are available directly in your TradeMind account.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/register"
              className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/demo"
              className="px-6 py-3 rounded-2xl bg-card border border-border hover:bg-accent font-bold text-sm text-foreground transition-all"
            >
              Explore Live Demo
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
