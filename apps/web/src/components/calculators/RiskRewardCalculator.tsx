// ──────────────────────────────────────────────
// TradeMind — Risk / Reward & Multi-Target Scale-Out Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useId } from 'react';
import {
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Percent,
} from 'lucide-react';
import type { Currency } from './types';

interface RiskRewardCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function RiskRewardCalculator({ currency, onCopySummary }: RiskRewardCalculatorProps) {
  const sym = currency === 'INR' ? '₹' : '$';
  const entryPriceId = useId();
  const stopLossPriceId = useId();
  const quantityId = useId();

  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(currency === 'INR' ? 500 : 150);
  const [stopLoss, setStopLoss] = useState<number>(currency === 'INR' ? 485 : 144);
  const [totalQuantity, setTotalQuantity] = useState<number>(100);

  // Targets: multiples and allocation percentages
  const [t1Ratio, setT1Ratio] = useState<number>(1.5);
  const [t1Percent, setT1Percent] = useState<number>(50);

  const [t2Ratio, setT2Ratio] = useState<number>(2.5);
  const [t2Percent, setT2Percent] = useState<number>(30);

  const [t3Ratio, setT3Ratio] = useState<number>(4.0);
  const [t3Percent, setT3Percent] = useState<number>(20);

  const [copied, setCopied] = useState<boolean>(false);

  // Calculations
  const riskPerUnit = direction === 'LONG'
    ? Math.max(0.01, entryPrice - stopLoss)
    : Math.max(0.01, stopLoss - entryPrice);

  const totalMaxRisk = riskPerUnit * totalQuantity;

  const t1Price = direction === 'LONG' ? entryPrice + riskPerUnit * t1Ratio : entryPrice - riskPerUnit * t1Ratio;
  const t1Qty = Math.round((totalQuantity * t1Percent) / 100);
  const t1Profit = t1Qty * (riskPerUnit * t1Ratio);

  const t2Price = direction === 'LONG' ? entryPrice + riskPerUnit * t2Ratio : entryPrice - riskPerUnit * t2Ratio;
  const t2Qty = Math.round((totalQuantity * t2Percent) / 100);
  const t2Profit = t2Qty * (riskPerUnit * t2Ratio);

  const t3Price = direction === 'LONG' ? entryPrice + riskPerUnit * t3Ratio : entryPrice - riskPerUnit * t3Ratio;
  const t3Qty = totalQuantity - t1Qty - t2Qty;
  const t3Profit = t3Qty * (riskPerUnit * t3Ratio);

  const totalBlendedProfit = t1Profit + t2Profit + t3Profit;
  const blendedRR = totalMaxRisk > 0 ? Number((totalBlendedProfit / totalMaxRisk).toFixed(2)) : 0;

  const handleCopy = () => {
    const summary = `🎯 TradeMind Multi-Target Trade Plan (${direction}):
• Entry: ${sym}${entryPrice} | Stop Loss: ${sym}${stopLoss} (Risk: ${sym}${riskPerUnit}/unit, Max Loss: ${sym}${totalMaxRisk.toLocaleString()})
• Target 1 (${t1Percent}% = ${t1Qty} qty @ 1:${t1Ratio}): ${sym}${t1Price.toFixed(2)} (+${sym}${t1Profit.toLocaleString()})
• Target 2 (${t2Percent}% = ${t2Qty} qty @ 1:${t2Ratio}): ${sym}${t2Price.toFixed(2)} (+${sym}${t2Profit.toLocaleString()})
• Target 3 (${t3Percent}% = ${t3Qty} qty @ 1:${t3Ratio}): ${sym}${t3Price.toFixed(2)} (+${sym}${t3Profit.toLocaleString()})
• Blended R:R: 1:${blendedRR} | Total Expected Profit: +${sym}${totalBlendedProfit.toLocaleString()}
• Management Rule: Move SL to Breakeven (${sym}${entryPrice}) immediately upon Target 1 execution.`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setDirection('LONG');
    setEntryPrice(currency === 'INR' ? 500 : 150);
    setStopLoss(currency === 'INR' ? 485 : 144);
    setTotalQuantity(100);
    setT1Ratio(1.5);
    setT1Percent(50);
    setT2Ratio(2.5);
    setT2Percent(30);
    setT3Ratio(4.0);
    setT3Percent(20);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-6 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              Trade Entry & Scale-Out Targets
            </h3>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('LONG')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
                direction === 'LONG'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500 shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              LONG POSITION
            </button>
            <button
              type="button"
              onClick={() => setDirection('SHORT')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
                direction === 'SHORT'
                  ? 'bg-rose-500/15 border-rose-500 text-rose-500 shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              SHORT POSITION
            </button>
          </div>

          {/* Entry, Stop Loss & Quantity */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor={entryPriceId} className="text-xs font-medium text-muted-foreground block mb-1">
                Entry ({sym})
              </label>
              <input
                id={entryPriceId}
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Math.max(0.01, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>

            <div>
              <label htmlFor={stopLossPriceId} className="text-xs font-medium text-muted-foreground block mb-1">
                Stop Loss ({sym})
              </label>
              <input
                id={stopLossPriceId}
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(Math.max(0.01, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>

            <div>
              <label htmlFor={quantityId} className="text-xs font-medium text-muted-foreground block mb-1">
                Total Qty
              </label>
              <input
                id={quantityId}
                type="number"
                min={1}
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>
          </div>

          {/* Scale-Out Targets */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Multi-Target Exits
            </span>

            {/* Target 1 */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Target 1 Multiple (R:R)</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-muted-foreground">1:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={t1Ratio}
                    onChange={(e) => setT1Ratio(Math.max(0.1, Number(e.target.value)))}
                    className="w-full px-2 py-1.5 rounded bg-background border border-input"
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Allocation %</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={t1Percent}
                  onChange={(e) => setT1Percent(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-full px-2 py-1.5 rounded bg-background border border-input"
                />
              </div>
            </div>

            {/* Target 2 */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Target 2 Multiple (R:R)</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-muted-foreground">1:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={t2Ratio}
                    onChange={(e) => setT2Ratio(Math.max(0.1, Number(e.target.value)))}
                    className="w-full px-2 py-1.5 rounded bg-background border border-input"
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Allocation %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={t2Percent}
                  onChange={(e) => setT2Percent(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-full px-2 py-1.5 rounded bg-background border border-input"
                />
              </div>
            </div>

            {/* Target 3 */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Target 3 Runner (R:R)</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-muted-foreground">1:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={t3Ratio}
                    onChange={(e) => setT3Ratio(Math.max(0.1, Number(e.target.value)))}
                    className="w-full px-2 py-1.5 rounded bg-background border border-input"
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Allocation % (Runner)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={t3Percent}
                  onChange={(e) => setT3Percent(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-full px-2 py-1.5 rounded bg-background border border-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Outputs Column ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Hero Card */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-600/10 via-card to-blue-600/10 border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-500">
                Blended Risk : Reward
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Plan'}</span>
              </button>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-foreground">
                1 : {blendedRR}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                {blendedRR >= 2 ? 'High Expectancy' : 'Standard'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-card/60 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Total Potential Profit</span>
                <span className="text-base font-bold text-emerald-500">
                  +{sym}{Math.round(totalBlendedProfit).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card/60 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Max Capital at Risk</span>
                <span className="text-base font-bold text-rose-500">
                  -{sym}{Math.round(totalMaxRisk).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Target Breakdown Table */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Scale-Out Execution Ladder
            </h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs">
                <div>
                  <span className="font-bold text-foreground">Target 1 ({t1Qty} qty)</span>
                  <span className="text-muted-foreground block text-[11px]">R:R 1:{t1Ratio}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-foreground">{sym}{t1Price.toFixed(2)}</span>
                  <span className="block text-[11px] text-emerald-500 font-semibold">+{sym}{Math.round(t1Profit).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs">
                <div>
                  <span className="font-bold text-foreground">Target 2 ({t2Qty} qty)</span>
                  <span className="text-muted-foreground block text-[11px]">R:R 1:{t2Ratio}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-foreground">{sym}{t2Price.toFixed(2)}</span>
                  <span className="block text-[11px] text-emerald-500 font-semibold">+{sym}{Math.round(t2Profit).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs">
                <div>
                  <span className="font-bold text-foreground">Target 3 Runner ({t3Qty} qty)</span>
                  <span className="text-muted-foreground block text-[11px]">R:R 1:{t3Ratio}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-foreground">{sym}{t3Price.toFixed(2)}</span>
                  <span className="block text-[11px] text-emerald-500 font-semibold">+{sym}{Math.round(t3Profit).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Management Playbook Card */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-foreground flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-blue-400">Trade Management Rule</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Once Target 1 ({sym}{t1Price.toFixed(2)}) is hit, immediately adjust your stop loss to <strong>Breakeven ({sym}{entryPrice})</strong>. This locks in +{sym}{Math.round(t1Profit).toLocaleString()} and completely eliminates risk for the remaining position!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
