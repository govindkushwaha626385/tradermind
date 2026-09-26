// ──────────────────────────────────────────────
// TradeMind — Landing Page: Live Market Intelligence & Macro News
//
// Demonstrates institutional news streaming, real-time sentiment
// classification, and prop-firm high-impact economic calendar lockout.
// ──────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Newspaper,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Radio,
  Clock,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MockHeadline {
  id: string;
  category: 'Macro' | 'Crypto' | 'Forex' | 'Tech';
  headline: string;
  source: string;
  timeAgo: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: 'HIGH' | 'MEDIUM';
}

const SAMPLE_HEADLINES: MockHeadline[] = [
  {
    id: '1',
    category: 'Macro',
    headline: 'US Core CPI Inflation Cools to 3.1% YoY, Cementing Expectations for Fed Rate Cuts',
    source: 'Bloomberg Terminal',
    timeAgo: '4m ago',
    sentiment: 'BULLISH',
    impact: 'HIGH',
  },
  {
    id: '2',
    category: 'Tech',
    headline: 'NVIDIA Expands AI Infrastructure with Next-Gen Blackwell Ultra GPU Architecture',
    source: 'Reuters Financial',
    timeAgo: '12m ago',
    sentiment: 'BULLISH',
    impact: 'HIGH',
  },
  {
    id: '3',
    category: 'Crypto',
    headline: 'Bitcoin Spot ETFs Record $420M Inflows as Futures Open Interest Surges Across Exchanges',
    source: 'CoinDesk',
    timeAgo: '19m ago',
    sentiment: 'BULLISH',
    impact: 'MEDIUM',
  },
  {
    id: '4',
    category: 'Forex',
    headline: 'European Central Bank Holds Rates Steady While Signaling Cautious Stance Amid Slow Growth',
    source: 'Financial Times',
    timeAgo: '28m ago',
    sentiment: 'BEARISH',
    impact: 'HIGH',
  },
];

const UPCOMING_EVENTS = [
  {
    event: 'US Non-Farm Payrolls (NFP)',
    currency: 'USD',
    time: 'Friday 18:00 IST',
    forecast: '175K',
    prior: '142K',
    impact: 'HIGH',
  },
  {
    event: 'FOMC Federal Funds Rate Decision',
    currency: 'USD',
    time: 'Next Wed 23:30 IST',
    forecast: '4.75%',
    prior: '5.00%',
    impact: 'HIGH',
  },
  {
    event: 'RBI Monetary Policy Committee Repo Rate',
    currency: 'INR',
    time: 'Thursday 10:00 IST',
    forecast: '6.50%',
    prior: '6.50%',
    impact: 'HIGH',
  },
];

export function LandingNewsIntelligenceSection() {
  const [activeTab, setActiveTab] = useState<'news' | 'calendar'>('news');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredNews = SAMPLE_HEADLINES.filter(
    (item) => selectedCategory === 'All' || item.category === selectedCategory,
  );

  return (
    <section className="relative py-20 lg:py-28 overflow-hidden bg-slate-950 border-t border-white/[0.06]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>Finnhub Real-Time Intelligence</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight font-display">
            Never Get Blown Up by{' '}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Red-Folder News
            </span>
          </h2>

          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            TradeMind integrates real-time institutional financial news with an automated prop-firm economic calendar guard. Get warned before high-volatility CPI, FOMC, and NFP releases.
          </p>
        </div>

        {/* Interactive Preview Terminal */}
        <div className="rounded-3xl border border-white/[0.08] bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden max-w-5xl mx-auto">
          {/* Terminal Window Header Bar */}
          <div className="px-6 py-4 border-b border-white/[0.06] bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-xs font-mono text-slate-400 ml-2">trademind-market-news.terminal</span>
            </div>

            {/* Tab switchers */}
            <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] text-xs">
              <button
                onClick={() => setActiveTab('news')}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'news'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>Live News Stream</span>
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'calendar'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Economic Calendar</span>
              </button>
            </div>
          </div>

          {/* Prop Firm Safeguard Ribbon Banner */}
          <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
              <span>Prop Firm News Safeguard Active: Trading Lockout triggers ±5 min around high-impact USD events</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] shrink-0">
              FTMO & Apex Compliant
            </span>
          </div>

          {/* Main Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {activeTab === 'news' ? (
              <div className="space-y-4">
                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {['All', 'Macro', 'Tech', 'Crypto', 'Forex'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                        selectedCategory === cat
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]',
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* News Feed Items */}
                <div className="space-y-3">
                  {filteredNews.map((news) => (
                    <div
                      key={news.id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.12] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 font-bold">
                            {news.category}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{news.source}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {news.timeAgo}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-semibold text-white group-hover:text-violet-300 transition-colors">
                          {news.headline}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1',
                            news.sentiment === 'BULLISH'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
                          )}
                        >
                          {news.sentiment === 'BULLISH' ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          <span>{news.sentiment}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Economic Calendar View */
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/[0.03] text-xs font-semibold text-slate-400 border-b border-white/[0.06]">
                    <div className="col-span-5">Macro Release Event</div>
                    <div className="col-span-2 text-center">Currency</div>
                    <div className="col-span-3 text-center">Release Time</div>
                    <div className="col-span-2 text-right">Risk Impact</div>
                  </div>

                  <div className="divide-y divide-white/[0.04]">
                    {UPCOMING_EVENTS.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center text-xs hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="col-span-5 font-semibold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>{item.event}</span>
                        </div>
                        <div className="col-span-2 text-center font-mono font-bold text-violet-300">
                          {item.currency}
                        </div>
                        <div className="col-span-3 text-center text-slate-400 font-mono">
                          {item.time}
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                            RED FOLDER
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Terminal Footer Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Globe className="w-4 h-4 text-violet-400" />
                <span>Powered by Finnhub Institutional Market Wire & RSS aggregation</span>
              </div>

              <Link
                href="/dashboard/news"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-md shadow-violet-500/20"
              >
                <span>Launch Full News Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
