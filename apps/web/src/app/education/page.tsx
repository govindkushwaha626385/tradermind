// ──────────────────────────────────────────────
// TradeMind — Public Trader Education & Academy
// The 4-Stage Institutional Progression Framework
// Accessible without login for organic learning and onboarding.
// ──────────────────────────────────────────────

import { Metadata } from 'next';
import Link from 'next/link';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Target,
  Brain,
  Award,
  BookOpen,
  Calculator,
  Compass,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { TRADER_ROADMAP, TRACK_META, type RoadmapStage, type RoadmapTrack } from '@/lib/roadmap-data';

export const metadata: Metadata = {
  title: 'Trader Evolution Academy & Roadmap — TradeMind',
  description:
    'A 4-stage institutional curriculum for traders: from capital defense and risk mathematics to Smart Money Concepts, options Greeks, and prop firm funding.',
  openGraph: {
    title: 'TradeMind Trader Evolution Academy & Roadmap',
    description:
      'A 4-stage institutional curriculum for traders: risk defense, setup edge, derivatives math, and prop firm funding.',
    type: 'website',
    url: 'https://trademind.app/education',
  },
  alternates: {
    canonical: 'https://trademind.app/education',
  },
};

export default function EducationPage() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-fade-in">
      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide uppercase">
            <GraduationCap className="w-4 h-4" />
            <span>Institutional Trader Academy</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-foreground">
            The Trader Evolution Roadmap
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            The definitive 4-stage progression framework followed by institutional prop firm traders. Master capital defense, setup edge, volatility math, and multi-broker portfolio scaling.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard/roadmap"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 shadow-md shadow-primary/20 transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Open Interactive Dashboard Tracker</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-border/80 bg-background hover:bg-accent text-foreground font-semibold text-xs transition-colors"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
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
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    {track.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Roadmap Stages Pipeline */}
        <div className="space-y-12">
          {TRADER_ROADMAP.map((stage) => (
            <section
              key={stage.id}
              className="rounded-3xl border border-border/80 bg-card/70 p-6 sm:p-10 space-y-8 shadow-xl hover:shadow-2xl transition-all"
            >
              {/* Stage Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border/60">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-sm">
                      Stage {stage.stageNumber}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground font-semibold">
                      {stage.levelBadge}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      Expected Timeline: {stage.duration}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {stage.title}
                  </h2>
                  <p className="text-sm font-semibold text-primary">
                    {stage.tagline}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                    {stage.summary}
                  </p>
                </div>

                {/* Core Philosophy Card */}
                <div className="lg:max-w-xs p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs space-y-1.5 shrink-0">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                    Core Philosophy Law
                  </div>
                  <p className="text-foreground italic leading-relaxed">
                    “{stage.corePhilosophy}”
                  </p>
                </div>
              </div>

              {/* Milestones Grid (5 milestones per stage) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Stage {stage.stageNumber} Execution Milestones
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    {stage.milestones.length} Milestones
                  </span>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stage.milestones.map((m, mIdx) => (
                    <div
                      key={m.id}
                      className="p-5 rounded-2xl border border-border/60 bg-background/80 hover:bg-background hover:border-primary/40 transition-all flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">
                            #{stage.stageNumber}.{mIdx + 1}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground border border-border/50">
                            {m.category}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {m.title}
                        </h4>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {m.shortDesc}
                        </p>

                        <div className="text-[11px] text-foreground/80 bg-muted/30 p-2.5 rounded-xl border border-border/40">
                          {m.detailedAction}
                        </div>

                        {/* Formula if available */}
                        {m.formula && (
                          <div className="p-2 rounded-xl bg-card border border-border/60 text-[10px] font-mono text-primary space-y-0.5">
                            <div className="text-[9px] uppercase font-bold text-muted-foreground">
                              Math Formula:
                            </div>
                            <div className="truncate">{m.formula}</div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                        <Link
                          href={m.toolHref}
                          className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline group-hover:translate-x-0.5 transition-transform"
                        >
                          <span>{m.toolLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                          +{m.xpPoints} XP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-background to-background p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl font-black text-foreground">
              Ready to Track Your Progress Live?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Create your free TradeMind account to track your completed milestones, unlock discipline badges, test your execution in real scenario simulations, and export verified credentials.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/80 bg-background hover:bg-accent text-foreground font-semibold text-xs transition-colors"
            >
              <span>Read Strategy Blog</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
