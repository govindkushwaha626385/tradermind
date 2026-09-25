// ──────────────────────────────────────────────
// TradeMind — Hero Section (Premium Redesign)
//
// Features:
// - Animated broker ticker strip
// - Large headline with gradient text
// - Trust signals row
// - Floating UI preview cards (mock dashboard glimpse)
// - Staggered entrance animations (CSS, no Framer dep)
// ──────────────────────────────────────────────

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Zap,
  TrendingUp,
  Shield,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { APP_NAME } from '@trademind/shared';

const BROKERS = [
  'Zerodha', 'Dhan', 'Angel One', 'Upstox', 'Delta Exchange',
  'Groww', 'Interactive Brokers', 'Binance', 'Bybit', 'MetaTrader 4/5', 'Sahi', 'Lemonn',
];

const TRUST_SIGNALS = [
  { icon: Shield, text: 'AES-256 Encrypted' },
  { icon: CheckCircle2, text: 'Read-only API access' },
  { icon: Star, text: '4.9 / 5 avg rating' },
  { icon: TrendingUp, text: '50+ analytics metrics' },
];

const FLOATERS = [
  {
    label: 'Today\'s P&L',
    value: '+₹4,832',
    sub: '↑ 2.4% vs yesterday',
    color: '#10b981',
    delay: '0.3s',
    position: { top: '12%', right: '-4%' },
  },
  {
    label: 'Win Rate',
    value: '68.4%',
    sub: '↑ 3.1% this month',
    color: '#7c3aed',
    delay: '0.5s',
    position: { bottom: '28%', right: '-6%' },
  },
  {
    label: 'Discipline Score',
    value: '92 / 100',
    sub: '🔥 14-day streak',
    color: '#f59e0b',
    delay: '0.7s',
    position: { bottom: '10%', left: '-4%' },
  },
];

// Broker ticker (infinite scroll)
function BrokerTicker() {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative overflow-hidden w-full py-3" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
      <div
        ref={trackRef}
        className="flex gap-6 items-center"
        style={{ animation: 'ticker-scroll 20s linear infinite', width: 'max-content' }}
      >
        {[...BROKERS, ...BROKERS].map((broker, i) => (
          <div
            key={`${broker}-${i}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: '#10b981' }}
            />
            {broker}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ paddingTop: '80px' }}
    >
      {/* Layered background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,58,237,0.15), transparent),
            radial-gradient(ellipse 60% 50% at 80% 50%, rgba(37,99,235,0.10), transparent),
            radial-gradient(ellipse 40% 40% at 20% 70%, rgba(16,185,129,0.07), transparent),
            linear-gradient(180deg, #050510 0%, #0a0a1a 100%)
          `,
        }}
      />

      {/* Animated grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-[1fr,480px] gap-16 items-center">

          {/* Left — headline + CTAs */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            {/* Pill badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-7"
              style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.25)',
                color: '#a78bfa',
              }}
            >
              <Zap className="w-3 h-3" />
              Auto-Sync Global &amp; Indian Brokers · Stocks, F&amp;O, Crypto &amp; Forex
            </div>

            {/* Main headline */}
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6"
              style={{ color: '#fff' }}
            >
              Stop guessing.{' '}
              <br className="hidden sm:block" />
              <span
                style={{
                  backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #60a5fa 50%, #34d399 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Know your edge.
              </span>
            </h1>

            <p
              className="text-lg sm:text-xl leading-relaxed mb-10 max-w-xl"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {APP_NAME} auto-syncs every trade across global and Indian markets, tracks real-time execution metrics with TradingView candlestick replay, and reveals the behavioral psychological leaks costing you money.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-10 flex-wrap">
              <Link
                href="/register"
                id="hero-cta-primary"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-base font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                  boxShadow: '0 6px 24px rgba(124,58,237,0.35), 0 1px 0 rgba(255,255,255,0.1) inset',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow =
                    '0 10px 32px rgba(124,58,237,0.5), 0 1px 0 rgba(255,255,255,0.1) inset')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow =
                    '0 6px 24px rgba(124,58,237,0.35), 0 1px 0 rgba(255,255,255,0.1) inset')
                }
              >
                Start Free — No Card Needed
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/demo"
                id="hero-cta-sandbox"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-base font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(167,139,250,0.35)',
                  boxShadow: '0 4px 18px rgba(124,58,237,0.18)',
                }}
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Try Live Sandbox</span>
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-base font-medium transition-all"
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.7)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                See How It Works
              </a>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-4">
              {TRUST_SIGNALS.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating dashboard preview */}
          <div
            className="relative hidden lg:block"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.9s ease 0.2s, transform 0.9s ease 0.2s',
            }}
          >
            {/* Main card */}
            <div
              className="relative rounded-3xl overflow-hidden p-6"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Mini chart bars */}
              <div className="mb-5">
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  30-Day Equity Curve
                </div>
                <div className="flex items-end gap-1.5 h-24">
                  {[40, 55, 45, 65, 50, 75, 60, 80, 70, 85, 72, 90, 78, 95, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all duration-500"
                      style={{
                        height: mounted ? `${h}%` : '10%',
                        transitionDelay: `${i * 50}ms`,
                        background: i > 10
                          ? 'linear-gradient(180deg, #7c3aed, rgba(124,58,237,0.3))'
                          : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Metric row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Net P&L', value: '+₹18.2K', color: '#10b981' },
                  { label: 'Win Rate', value: '68.4%', color: '#7c3aed' },
                  { label: 'Trades', value: '142', color: '#60a5fa' },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="text-lg font-bold" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating stat badges */}
            {FLOATERS.map((f) => (
              <div
                key={f.label}
                className="absolute rounded-2xl px-4 py-3 min-w-[140px]"
                style={{
                  ...f.position,
                  background: 'rgba(10,10,25,0.85)',
                  border: `1px solid ${f.color}30`,
                  backdropFilter: 'blur(16px)',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
                  transition: `opacity 0.6s ease ${f.delay}, transform 0.6s ease ${f.delay}`,
                  boxShadow: `0 4px 20px ${f.color}20`,
                }}
              >
                <div className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.label}</div>
                <div className="text-base font-bold" style={{ color: f.color }}>{f.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{f.sub}</div>
              </div>
            ))}

            {/* Subtle ring glow behind the card */}
            <div
              className="absolute inset-0 rounded-3xl -z-10"
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.12), transparent 70%)',
                transform: 'scale(1.1)',
              }}
            />
          </div>
        </div>

        {/* Broker ticker strip */}
        <div className="mt-16">
          <p className="text-center text-xs mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
            SYNCS WITH YOUR BROKER
          </p>
          <BrokerTicker />
        </div>
      </div>

      {/* Ticker keyframe */}
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
