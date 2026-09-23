// ──────────────────────────────────────────────
// TradeMind — Brokers Section (Landing Page)
// Shows supported broker logos in an animated ticker
// ──────────────────────────────────────────────

'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';

const BROKERS = [
  { name: 'Zerodha', color: '#387ED1', abbr: 'Z' },
  { name: 'Dhan', color: '#00A86B', abbr: 'D' },
  { name: 'Angel One', color: '#DC2626', abbr: 'A' },
  { name: 'Upstox', color: '#6366F1', abbr: 'U' },
  { name: 'Delta Exchange', color: '#F59E0B', abbr: 'Δ' },
  { name: 'Groww', color: '#00C853', abbr: 'G' },
  { name: 'Sahi', color: '#EC4899', abbr: 'S' },
  { name: 'Lemonn', color: '#FBBF24', abbr: 'L' },
];

const STATS = [
  { value: '9', label: 'Indian Brokers' },
  { value: '₹0', label: 'Extra Setup Cost' },
  { value: '< 2m', label: 'Avg Setup Time' },
  { value: '100%', label: 'Read-Only API' },
];

function useInView(threshold = 0.1) {
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

export function BrokersSection() {
  const { ref, visible } = useInView();

  // Duplicate brokers for seamless ticker loop
  const tickerBrokers = [...BROKERS, ...BROKERS];

  return (
    <section id="brokers" className="relative py-20 lg:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={ref} className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s' }}
          >
            <Zap className="w-3.5 h-3.5" />
            Broker Integrations
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 font-display"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.5s 0.1s, transform 0.5s 0.1s' }}
          >
            Works with your broker,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              right now
            </span>
          </h2>
          <p
            className="text-slate-400 text-lg max-w-xl mx-auto"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s 0.2s' }}
          >
            All 9 integrations use secure, read-only API access. We sync your trades — we never place orders.
          </p>
        </div>

        {/* Animated Ticker */}
        <div className="relative mb-14 overflow-hidden">
          {/* Fade masks */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

          <div
            className="flex gap-4"
            style={{
              animation: 'broker-ticker 20s linear infinite',
              width: 'max-content',
            }}
          >
            {tickerBrokers.map((broker, i) => (
              <div
                key={`${broker.name}-${i}`}
                className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-200 shrink-0 cursor-default select-none"
              >
                {/* Broker avatar */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg"
                  style={{ background: broker.color }}
                >
                  {broker.abbr}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{broker.name}</div>
                  <div className="text-slate-500 text-[10px]">Connected</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 ml-1 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s ease ${0.3 + i * 0.1}s, transform 0.5s ease ${0.3 + i * 0.1}s`,
              }}
            >
              <div className="text-3xl font-bold text-white font-display mb-1">{stat.value}</div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes broker-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
