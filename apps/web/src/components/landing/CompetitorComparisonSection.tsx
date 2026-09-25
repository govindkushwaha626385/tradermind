// ──────────────────────────────────────────────
// TradeMind — Competitor Comparison Section
// Head-to-head architectural comparison against TradeZella,
// Tradervue, UltraTrader, TradesViz & JournalPlus.
// ──────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  X,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonFeature {
  feature: string;
  category: string;
  trademind: string | boolean;
  tradezella: string | boolean;
  tradervue: string | boolean;
  ultratrader: string | boolean;
  importance: string;
}

const COMPARISON_DATA: ComparisonFeature[] = [
  {
    feature: 'Multi-Broker Real-Time Sync',
    category: 'Ingestion',
    trademind: 'Groww, Zerodha, Dhan, Angel One, Binance, Upstox, CSV',
    tradezella: 'US Brokers primarily',
    tradervue: 'Delayed CSV / Manual',
    ultratrader: 'API Keys',
    importance: 'Zero manual trade entry across global and Indian markets',
  },
  {
    feature: 'Deterministic Fill Deduplication',
    category: 'Ingestion',
    trademind: true,
    tradezella: false,
    tradervue: false,
    ultratrader: false,
    importance: 'SHA-256 fingerprinting prevents duplicate trades on re-sync',
  },
  {
    feature: 'Continuous Trade-by-Trade Equity Curve',
    category: 'Analytics',
    trademind: true,
    tradezella: false,
    tradervue: false,
    ultratrader: 'Daily balances',
    importance: 'View exact intraday trajectory, baseline (0.00), and peak equity',
  },
  {
    feature: 'Dual-Mode Underwater Drawdown Tracking',
    category: 'Analytics',
    trademind: true,
    tradezella: false,
    tradervue: false,
    ultratrader: false,
    importance: 'Measures continuous distance from high-water mark peak',
  },
  {
    feature: '1-Click AI Trade Autopsy',
    category: 'AI Intelligence',
    trademind: 'Multi-dimensional (Risk, Psychology, Speed)',
    tradezella: 'Basic Zella AI',
    tradervue: false,
    ultratrader: false,
    importance: 'Instant forensic analysis of execution leaks and emotional bias',
  },
  {
    feature: 'Autonomous Behavioral Shield & Kill Switch',
    category: 'Risk',
    trademind: true,
    tradezella: false,
    tradervue: false,
    ultratrader: false,
    importance: 'Locks order entry and halts tilt during rapid losing streaks',
  },
  {
    feature: 'TradingView Candlestick Replay',
    category: 'Tools',
    trademind: 'lightweight-charts v5.2.1',
    tradezella: 'Built-in',
    tradervue: false,
    ultratrader: 'Static charts',
    importance: 'Bar-by-bar playback with technical indicators (VWAP, EMA, RSI)',
  },
  {
    feature: 'Prop Firm Challenge Tracker',
    category: 'Tools',
    trademind: 'FTMO, FundedNext, Apex, Topstep presets',
    tradezella: false,
    tradervue: false,
    ultratrader: false,
    importance: 'Live daily loss buffer and simulated breach calculator',
  },
  {
    feature: 'Discord & Telegram EOD Webhook Alerts',
    category: 'Automation',
    trademind: true,
    tradezella: false,
    tradervue: false,
    ultratrader: false,
    importance: 'Automated market close recap delivered straight to private chat',
  },
  {
    feature: 'Algorithmic Execution Tag Auto-Generator',
    category: 'AI Intelligence',
    trademind: 'Auto-detects Chasing, Late Exits & Revenge Sizing',
    tradezella: 'Manual tagging only',
    tradervue: false,
    ultratrader: false,
    importance: 'Zero manual work: scans tick data for ATR chase & MFE giveback',
  },
  {
    feature: 'Pre-Market Broker Health & Token Alerts',
    category: 'Automation',
    trademind: '8:45 AM daily health check & push alert',
    tradezella: false,
    tradervue: false,
    ultratrader: false,
    importance: 'Never miss an execution due to expired broker session tokens',
  },
  {
    feature: 'Free Tier Available',
    category: 'Experience',
    trademind: 'Free Forever (50 trades/mo)',
    tradezella: '$29/mo (no free tier)',
    tradervue: '$29-$49/mo',
    ultratrader: 'Trial only',
    importance: 'Start journaling immediately without credit card requirement',
  },
  {
    feature: 'Native PWA Mobile Installation',
    category: 'Experience',
    trademind: 'Standalone PWA (iOS & Android)',
    tradezella: 'Web wrapper',
    tradervue: false,
    ultratrader: 'Mobile App',
    importance: 'App store quality experience on phone, tablet, and desktop',
  },
];

export function CompetitorComparisonSection() {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Ingestion', 'Analytics', 'AI Intelligence', 'Risk', 'Tools', 'Automation'];

  const filteredFeatures = activeCategory === 'All'
    ? COMPARISON_DATA
    : COMPARISON_DATA.filter((item) => item.category === activeCategory);

  const renderValue = (val: string | boolean, isTradeMind = false) => {
    if (val === true) {
      return (
        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Check className="w-4 h-4" />
        </div>
      );
    }
    if (val === false) {
      return (
        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <X className="w-4 h-4" />
        </div>
      );
    }
    return (
      <span
        className={cn(
          'text-xs font-semibold',
          isTradeMind ? 'text-primary font-bold' : 'text-muted-foreground'
        )}
      >
        {val}
      </span>
    );
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Competitive Benchmark</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-foreground">
          Why Traders Choose TradeMind
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          See how TradeMind compares against legacy spreadsheets and conventional journals like TradeZella, Tradervue, and UltraTrader.
        </p>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all',
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="p-4 sm:p-5 text-xs font-bold uppercase tracking-wider text-muted-foreground w-1/3">
                  Capability / Architecture
                </th>
                <th className="p-4 sm:p-5 text-center bg-primary/10 border-x border-primary/20 w-1/4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-black text-primary font-display">
                      TradeMind
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80 bg-primary/20 px-2 py-0.5 rounded-full">
                      Next-Gen AI
                    </span>
                  </div>
                </th>
                <th className="p-4 sm:p-5 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  TradeZella
                </th>
                <th className="p-4 sm:p-5 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Tradervue
                </th>
                <th className="p-4 sm:p-5 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  UltraTrader
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-sm">
              {filteredFeatures.map((row, idx) => (
                <tr key={idx} className="hover:bg-accent/20 transition-colors">
                  <td className="p-4 sm:p-5">
                    <div className="font-semibold text-foreground text-xs sm:text-sm">
                      {row.feature}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {row.importance}
                    </div>
                  </td>
                  <td className="p-4 sm:p-5 text-center bg-primary/5 border-x border-primary/20">
                    {renderValue(row.trademind, true)}
                  </td>
                  <td className="p-4 sm:p-5 text-center">
                    {renderValue(row.tradezella)}
                  </td>
                  <td className="p-4 sm:p-5 text-center">
                    {renderValue(row.tradervue)}
                  </td>
                  <td className="p-4 sm:p-5 text-center">
                    {renderValue(row.ultratrader)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Callout */}
        <div className="p-6 bg-gradient-to-r from-primary/10 via-background to-background border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-bold text-foreground">
              Ready to Upgrade from Manual Logs?
            </h4>
            <p className="text-xs text-muted-foreground">
              Experience zero duplicate fills, continuous equity curves, and automated AI autopsies.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 shadow-md shadow-primary/20 transition-all shrink-0"
          >
            <span>Start Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
