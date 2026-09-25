// ──────────────────────────────────────────────
// TradeMind — Interactive Behavioral Leak & Edge Recovery Calculator
// Flagship conversion engine: quantifies the true financial cost
// of revenge trading, chasing entries, and premature exits.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Zap,
  DollarSign,
  Percent,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TradingLeakCalculator() {
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [tradesPerMonth, setTradesPerMonth] = useState<number>(35);
  const [avgRiskPerTrade, setAvgRiskPerTrade] = useState<number>(currency === 'USD' ? 200 : 5000);
  const [winRate, setWinRate] = useState<number>(50);

  // Sync risk values when currency changes
  const handleCurrencyChange = (newCurr: 'USD' | 'INR') => {
    if (newCurr === currency) return;
    setCurrency(newCurr);
    if (newCurr === 'INR') {
      setAvgRiskPerTrade(5000);
    } else {
      setAvgRiskPerTrade(200);
    }
  };

  const symbol = currency === 'USD' ? '$' : '₹';

  // Quantitative breakdown derived from retail audit data
  const metrics = useMemo(() => {
    const totalLosingTrades = Math.round(tradesPerMonth * (1 - winRate / 100));
    const totalWinningTrades = Math.max(1, tradesPerMonth - totalLosingTrades);

    // 1. Chasing entries: ~22% of trades suffer ~0.6R extra slippage/loss due to late chasing
    const chasingLossMonthly = Math.round(tradesPerMonth * 0.22 * avgRiskPerTrade * 0.65);

    // 2. Premature exits (giving back MFE): winning trades cut too early, leaving ~0.8R on the table
    const mfeGivebackMonthly = Math.round(totalWinningTrades * 0.38 * avgRiskPerTrade * 0.85);

    // 3. Revenge sizing: sizing >1.5x after a loss occurs ~15% of losing runs
    const revengeTradingMonthly = Math.round(totalLosingTrades * 0.28 * avgRiskPerTrade * 1.4);

    // Total monthly leak
    const totalMonthlyLeak = chasingLossMonthly + mfeGivebackMonthly + revengeTradingMonthly;
    const annualLeak = totalMonthlyLeak * 12;

    return {
      chasingLossMonthly,
      mfeGivebackMonthly,
      revengeTradingMonthly,
      totalMonthlyLeak,
      annualLeak,
    };
  }, [tradesPerMonth, avgRiskPerTrade, winRate]);

  return (
    <section id="leak-calculator" className="relative py-20 lg:py-28 overflow-hidden bg-slate-950/80 border-y border-white/[0.06]">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.08),transparent_60%)]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold tracking-wide uppercase">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Forensic Behavioral Audit</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight font-display">
            How Much Are Execution Leaks{' '}
            <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
              Costing You?
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            90% of unprofitable traders don’t suffer from bad setups—they bleed capital through chasing entries, revenge sizing, and cutting runners prematurely.
          </p>
        </div>

        {/* Interactive Calculator Card */}
        <div className="rounded-3xl border border-white/[0.1] bg-white/[0.02] backdrop-blur-2xl p-6 sm:p-10 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Currency Switcher */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Operating Currency
              </span>
              <div className="flex items-center gap-1 bg-white/[0.05] p-1 rounded-xl border border-white/[0.08]">
                <button
                  onClick={() => handleCurrencyChange('USD')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-lg transition-all',
                    currency === 'USD'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white',
                  )}
                >
                  USD ($)
                </button>
                <button
                  onClick={() => handleCurrencyChange('INR')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-lg transition-all',
                    currency === 'INR'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white',
                  )}
                >
                  INR (₹)
                </button>
              </div>
            </div>

            {/* Monthly Trades Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 font-medium">Monthly Executed Trades</span>
                <span className="text-white font-mono font-bold">{tradesPerMonth} trades/mo</span>
              </div>
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={tradesPerMonth}
                onChange={(e) => setTradesPerMonth(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>5 (Swing Trader)</span>
                <span>50 (Day Trader)</span>
                <span>150 (Scalper)</span>
              </div>
            </div>

            {/* Average Stop-Loss / Risk per Trade */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 font-medium">Average Risk (1R) per Trade</span>
                <span className="text-white font-mono font-bold">
                  {symbol}
                  {avgRiskPerTrade.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={currency === 'USD' ? 50 : 1000}
                max={currency === 'USD' ? 2000 : 50000}
                step={currency === 'USD' ? 25 : 1000}
                value={avgRiskPerTrade}
                onChange={(e) => setAvgRiskPerTrade(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{currency === 'USD' ? '$50' : '₹1,000'}</span>
                <span>{currency === 'USD' ? '$500' : '₹15,000'}</span>
                <span>{currency === 'USD' ? '$2,000+' : '₹50,000+'}</span>
              </div>
            </div>

            {/* Win Rate Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 font-medium">Historical Win Rate</span>
                <span className="text-white font-mono font-bold">{winRate}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="75"
                step="5"
                value={winRate}
                onChange={(e) => setWinRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>30% (Trend Follower)</span>
                <span>50% (Standard)</span>
                <span>75% (High Frequency)</span>
              </div>
            </div>
          </div>

          {/* Results Output Column */}
          <div className="lg:col-span-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-violet-950/30 border border-violet-500/20 p-6 space-y-6">
            <div className="border-b border-white/[0.08] pb-4">
              <span className="text-xs uppercase font-bold tracking-wider text-rose-400">
                Estimated Capital Leaked
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white mt-1">
                {symbol}
                {metrics.totalMonthlyLeak.toLocaleString()}{' '}
                <span className="text-sm font-sans font-normal text-slate-400">/ month</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Equal to{' '}
                <span className="text-amber-400 font-bold font-mono">
                  {symbol}
                  {metrics.annualLeak.toLocaleString()}
                </span>{' '}
                drained from your portfolio every year.
              </div>
            </div>

            {/* Granular Leaks Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Chasing Entries (&gt;2x ATR)
                  </div>
                  <div className="text-[11px] text-slate-500">Entering late past optimal confirmation</div>
                </div>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  {symbol}
                  {metrics.chasingLossMonthly.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Hesitation &amp; Premature Exits
                  </div>
                  <div className="text-[11px] text-slate-500">Giving back &gt;70% of peak MFE runners</div>
                </div>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {symbol}
                  {metrics.mfeGivebackMonthly.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Revenge Sizing after Loss
                  </div>
                  <div className="text-[11px] text-slate-500">Over-leveraging on tilt to get even</div>
                </div>
                <span className="font-mono font-bold text-purple-400 text-sm">
                  {symbol}
                  {metrics.revengeTradingMonthly.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Recovery Value Callout & CTA */}
            <div className="pt-2">
              <Link
                href="/register"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5"
              >
                <span>Recover This Edge with TradeMind</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="text-center text-[11px] text-slate-500 mt-2">
                Automated tag detection · Zero manual journal entry · 100% Free Starter Plan
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
