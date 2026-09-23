// ──────────────────────────────────────────────
// TradeMind — How It Works Section (Landing Page)
// 3-step visual flow with animated connectors
// ──────────────────────────────────────────────

'use client';

import { useEffect, useRef, useState } from 'react';
import { Plug, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  {
    step: '01',
    icon: Plug,
    color: 'from-blue-500 to-cyan-500',
    title: 'Connect Your Broker',
    desc: 'One-click OAuth with Zerodha, Dhan, Angel One, Upstox, and more. Your API keys are encrypted and never shared.',
    detail: [
      'OAuth 2.0 secure login',
      'Tokens stored encrypted (AES-256)',
      'Read-only access — no trade execution',
    ],
  },
  {
    step: '02',
    icon: BookOpen,
    color: 'from-violet-500 to-purple-600',
    title: 'Trades Log Automatically',
    desc: 'Every buy/sell syncs instantly. TradeMind groups executions into trades, calculates STT/charges, and logs them.',
    detail: [
      'Real-time or scheduled sync',
      'Accurate Indian brokerage charges',
      'Supports EQ, F&O, MCX & CDS',
    ],
  },
  {
    step: '03',
    icon: Sparkles,
    color: 'from-emerald-500 to-teal-500',
    title: 'Get AI Insights',
    desc: 'Behavioral AI analyzes your patterns — emotion impact, best/worst times, mistake costs — and tells you exactly what to fix.',
    detail: [
      'Emotion × P&L correlation',
      'Session & weekday performance',
      'Personalized improvement plan',
    ],
  },
];

function useInView(threshold = 0.15) {
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

export function HowItWorksSection() {
  const { ref, visible } = useInView();

  return (
    <section id="how-it-works" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-950/95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.1),transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Simple Setup
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 font-display">
            Up and running in{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              under 2 minutes
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            No spreadsheets. No manual entry. Connect once and let TradeMind do the rest.
          </p>
        </div>

        {/* Steps */}
        <div ref={ref} className="relative">
          {/* Connector line — desktop only */}
          <div className="hidden lg:block absolute top-16 left-[calc(16.67%+2.5rem)] right-[calc(16.67%+2.5rem)] h-px bg-gradient-to-r from-blue-500/30 via-violet-500/40 to-emerald-500/30" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-8">
            {STEPS.map((step, i) => (
              <div
                key={step.step}
                className="relative flex flex-col items-center text-center lg:items-start lg:text-left"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(32px)',
                  transition: `opacity 0.6s ease ${i * 0.15}s, transform 0.6s ease ${i * 0.15}s`,
                }}
              >
                {/* Step badge + icon */}
                <div className="relative mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-2xl`}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-300">{step.step}</span>
                  </div>
                </div>

                <h3 className="text-white font-bold text-xl mb-3">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">{step.desc}</p>

                <ul className="space-y-2 w-full">
                  {step.detail.map((d) => (
                    <li key={d} className="flex items-center gap-2.5 text-sm text-slate-400 justify-center lg:justify-start">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${step.color} flex-shrink-0`} />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className="mt-16 text-center"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.6s ease 0.5s',
          }}
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-base shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/30 hover:-translate-y-0.5"
          >
            Start for Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-slate-500 text-sm mt-3">No credit card required · Free plan forever</p>
        </div>
      </div>
    </section>
  );
}
