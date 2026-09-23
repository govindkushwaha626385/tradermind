// ──────────────────────────────────────────────
// TradeMind — Features Section (Landing Page)
// ──────────────────────────────────────────────

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  RefreshCw,
  Brain,
  Receipt,
  TrendingUp,
  Trophy,
  ShieldCheck,
  BarChart3,
  Zap,
  Target,
  Clock,
  Activity,
  Lock,
} from 'lucide-react';

const FEATURES = [
  {
    icon: RefreshCw,
    color: 'from-blue-500 to-cyan-500',
    glow: 'group-hover:shadow-blue-500/20',
    title: 'Auto-Sync from 9 Brokers',
    desc: 'Zerodha, Dhan, Angel One, Upstox, Delta Exchange, Groww, Sahi & Lemonn sync automatically — no CSV uploads needed.',
    badge: '9 Brokers',
  },
  {
    icon: Brain,
    color: 'from-violet-500 to-purple-600',
    glow: 'group-hover:shadow-violet-500/20',
    title: 'Behavioral AI Coach',
    desc: 'Detect FOMO, revenge trading, and tilt patterns. Get personalized recommendations to fix your worst habits.',
    badge: 'AI-Powered',
  },
  {
    icon: BarChart3,
    color: 'from-emerald-500 to-teal-500',
    glow: 'group-hover:shadow-emerald-500/20',
    title: 'MFE / MAE Analytics',
    desc: 'Know exactly how much you leave on the table. Max Favorable & Adverse Excursion metrics for every trade.',
    badge: 'Advanced',
  },
  {
    icon: Receipt,
    color: 'from-amber-500 to-orange-500',
    glow: 'group-hover:shadow-amber-500/20',
    title: 'Accurate Indian Tax Calc',
    desc: 'STT, GST, SEBI charges, stamp duty — all calculated per segment (EQ, F&O, MCX, CDS) with export for CA.',
    badge: 'India-First',
  },
  {
    icon: ShieldCheck,
    color: 'from-rose-500 to-red-600',
    glow: 'group-hover:shadow-rose-500/20',
    title: 'Risk Kill Switch',
    desc: 'Set daily loss limits that automatically flag you when you hit them. Trade with guardrails, not emotions.',
    badge: 'Risk Guard',
  },
  {
    icon: Trophy,
    color: 'from-yellow-400 to-amber-500',
    glow: 'group-hover:shadow-yellow-500/20',
    title: 'Anonymous Leaderboard',
    desc: 'Benchmark your win rate, discipline score, and profit factor against the community — privacy first, always opt-in.',
    badge: 'Community',
  },
  {
    icon: Zap,
    color: 'from-sky-500 to-blue-600',
    glow: 'group-hover:shadow-sky-500/20',
    title: 'AI Trade Autopsy',
    desc: 'Every closed trade gets an AI-powered post-mortem: what you did right, what to fix, and how to replicate winners.',
    badge: 'AI-Powered',
  },
  {
    icon: Target,
    color: 'from-pink-500 to-rose-500',
    glow: 'group-hover:shadow-pink-500/20',
    title: 'Discipline Engine',
    desc: 'Pre-market checklists, trade plans, compliance scoring, and mistake tagging to build unbreakable routines.',
    badge: 'Discipline',
  },
  {
    icon: Clock,
    color: 'from-indigo-500 to-violet-500',
    glow: 'group-hover:shadow-indigo-500/20',
    title: 'Trade Replay',
    desc: 'Replay any trade with entry, exit and emotion overlays. Understand your decisions with full hindsight clarity.',
    badge: 'Replay',
  },
];

function useIntersectionObserver(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setVisible(true);
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export function FeaturesSection() {
  const { ref, visible } = useIntersectionObserver(0.08);

  return (
    <section id="features" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(99,102,241,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(16,185,129,0.06),transparent_60%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Activity className="w-3.5 h-3.5" />
            Everything You Need
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 font-display">
            Built for{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Serious Indian Traders
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Every feature designed around how NSE/BSE markets actually work — not a copy-paste from US trading tools.
          </p>
        </div>

        {/* Feature Grid */}
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-300 cursor-default"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s, border-color 0.3s, background 0.3s`,
              }}
            >
              {/* Icon */}
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg ${f.glow} transition-shadow duration-300`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>

              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.06]">
                  {f.badge}
                </span>
              </div>

              <h3 className="text-white font-semibold text-base mb-2 leading-snug">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>

              {/* Hover glow line */}
              <div className={`absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r ${f.color} opacity-0 group-hover:opacity-40 transition-opacity duration-300`} />
            </div>
          ))}

          {/* Security badge card */}
          <div
            className="sm:col-span-2 lg:col-span-1 group relative p-6 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 hover:border-emerald-500/30 transition-all duration-300"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(24px)',
              transition: `opacity 0.5s ease ${FEATURES.length * 0.07}s, transform 0.5s ease ${FEATURES.length * 0.07}s`,
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-semibold text-base">Bank-Grade Security</div>
                <div className="text-emerald-400 text-xs">Your data, protected</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['AES-256 Encryption', 'Supabase RLS', 'HTTPS Only', 'No Data Selling'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
