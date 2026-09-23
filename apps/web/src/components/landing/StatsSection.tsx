// ──────────────────────────────────────────────
// TradeMind — Stats Section (Social Proof Numbers)
//
// Animated counter + 4 key platform stats
// triggered by IntersectionObserver
// ──────────────────────────────────────────────

'use client';

import { useEffect, useRef, useState } from 'react';
import { Users, TrendingUp, BarChart3, Zap } from 'lucide-react';

const STATS = [
  {
    icon: Users,
    value: 12000,
    suffix: '+',
    label: 'Active Traders',
    sub: 'Across India',
    color: '#7c3aed',
    glow: 'rgba(124,58,237,0.15)',
  },
  {
    icon: TrendingUp,
    value: 8500000,
    suffix: '+',
    label: 'Trades Journaled',
    sub: 'And growing daily',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
  },
  {
    icon: BarChart3,
    value: 50,
    suffix: '+',
    label: 'Analytics Metrics',
    sub: 'MFE, MAE, R-multiple & more',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.15)',
  },
  {
    icon: Zap,
    value: 99.9,
    suffix: '%',
    label: 'Charge Accuracy',
    sub: 'STT, GST, SEBI charges',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
  },
];

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n % 1 !== 0 ? n.toFixed(1) : n);
}

function AnimatedCounter({ target, suffix, color }: { target: number; suffix: string; color: string }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || started.current) return;
        started.current = true;
        const duration = 1800;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setCount(target * ease);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    if (el.current) obs.observe(el.current);
    return () => obs.disconnect();
  }, [target]);

  return (
    <span ref={el} className="tabular-nums" style={{ color }}>
      {formatNumber(count)}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e?.isIntersecting) setVisible(true); },
      { threshold: 0.1 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="stats" className="relative py-20 lg:py-24 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(124,58,237,0.04) 0%, transparent 100%)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Label */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Platform Traction
          </p>
        </div>

        <div
          ref={ref}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="relative rounded-2xl p-6 text-center overflow-hidden group"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`,
              }}
            >
              {/* Glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(ellipse at 50% 100%, ${stat.glow}, transparent 70%)` }}
              />

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: `${stat.color}15`,
                  border: `1px solid ${stat.color}25`,
                }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>

              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-1">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} color={stat.color} />
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {stat.label}
              </div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
