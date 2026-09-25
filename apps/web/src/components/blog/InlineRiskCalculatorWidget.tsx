// ──────────────────────────────────────────────
// TradeMind — Inline Institutional Risk & Reward Calculator Widget
//
// Embedded widget for research blog posts & education guides.
// Calculates position sizes, R-multiples, and required breakeven win rate
// with zero reload and real-time inputs.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  ArrowRight,
  Shield,
  Zap,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function InlineRiskCalculatorWidget() {
  const [accountBalance, setAccountBalance] = useState<number>(25000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<number>(150);
  const [stopLossPrice, setStopLossPrice] = useState<number>(145);
  const [targetPrice, setTargetPrice] = useState<number>(165);
  const [currency, setCurrency] = useState<'$' | '₹' | '€'>('$');

  const calculations = useMemo(() => {
    const riskAmount = (accountBalance * riskPercent) / 100;
    const perShareRisk = Math.abs(entryPrice - stopLossPrice);
    const perShareReward = Math.abs(targetPrice - entryPrice);

    const sharesOrUnits =
      perShareRisk > 0 ? Math.floor(riskAmount / perShareRisk) : 0;
    const potentialGain = sharesOrUnits * perShareReward;
    const rMultiple = perShareRisk > 0 ? perShareReward / perShareRisk : 0;
    const breakevenWinRate = rMultiple > 0 ? (1 / (1 + rMultiple)) * 100 : 0;

    return {
      riskAmount,
      perShareRisk,
      sharesOrUnits,
      potentialGain,
      rMultiple,
      breakevenWinRate,
    };
  }, [accountBalance, riskPercent, entryPrice, stopLossPrice, targetPrice]);

  return (
    <div className="rounded-3xl border border-violet-500/30 bg-slate-900/90 p-5 sm:p-7 shadow-xl space-y-5 my-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Interactive Position Sizing &amp; R:R Calculator</h4>
            <p className="text-[11px] text-slate-400">Apply the article&apos;s risk formula directly to your capital</p>
          </div>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/[0.08] p-0.5">
          {(['$', '₹', '€'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={cn(
                'px-2.5 py-0.5 text-xs font-bold rounded-lg transition-colors',
                currency === c
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-slate-400">Account Size</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">{currency}</span>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Number(e.target.value))}
              className="w-full pl-6 pr-2 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-mono font-bold focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-slate-400">Risk %</label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              className="w-full px-2.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-mono font-bold focus:border-violet-500 focus:outline-none"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">%</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-slate-400">Entry Price</label>
          <input
            type="number"
            step="0.01"
            value={entryPrice}
            onChange={(e) => setEntryPrice(Number(e.target.value))}
            className="w-full px-2.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-mono font-bold focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-slate-400">Stop Loss</label>
          <input
            type="number"
            step="0.01"
            value={stopLossPrice}
            onChange={(e) => setStopLossPrice(Number(e.target.value))}
            className="w-full px-2.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-rose-300 font-mono font-bold focus:border-rose-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="text-[10px] font-mono uppercase text-slate-400">Target (TP)</label>
          <input
            type="number"
            step="0.01"
            value={targetPrice}
            onChange={(e) => setTargetPrice(Number(e.target.value))}
            className="w-full px-2.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-emerald-300 font-mono font-bold focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Output Results Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-400">Max Dollar Risk</div>
          <div className="text-base font-bold text-rose-400 font-mono">
            {currency}{calculations.riskAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">{riskPercent}% of account</div>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-400">Position Size</div>
          <div className="text-base font-bold text-cyan-400 font-mono">
            {calculations.sharesOrUnits.toLocaleString()} units
          </div>
          <div className="text-[10px] text-slate-500">Risk/unit: {currency}{calculations.perShareRisk.toFixed(2)}</div>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-400">Reward-to-Risk (R:R)</div>
          <div className="text-base font-bold text-emerald-400 font-mono">
            1 : {calculations.rMultiple.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">+{currency}{calculations.potentialGain.toLocaleString(undefined, { maximumFractionDigits: 2 })} gain</div>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-400">Breakeven Win Rate</div>
          <div className="text-base font-bold text-amber-400 font-mono">
            {calculations.breakevenWinRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500">Required win rate</div>
        </div>
      </div>
    </div>
  );
}
