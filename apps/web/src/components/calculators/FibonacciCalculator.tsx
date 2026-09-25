// ──────────────────────────────────────────────
// TradeMind — Fibonacci Retracement & Extension Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useId } from 'react';
import {
  Layers,
  RotateCcw,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { calculateFibonacciLevels } from './engine/financialMath';
import { getCalculatorCurrencySymbol, type Currency } from './types';

interface FibonacciCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function FibonacciCalculator({ currency, onCopySummary }: FibonacciCalculatorProps) {
  const sym = getCalculatorCurrencySymbol(currency);
  const highId = useId();
  const lowId = useId();

  const [swingHigh, setSwingHigh] = useState<number>(currency === 'INR' ? 25600 : 560);
  const [swingLow, setSwingLow] = useState<number>(currency === 'INR' ? 25200 : 540);
  const [direction, setDirection] = useState<'UPTREND' | 'DOWNTREND'>('UPTREND');
  const [copied, setCopied] = useState<boolean>(false);

  const { retracements, extensions } = calculateFibonacciLevels(swingHigh, swingLow, direction);

  const handleCopy = () => {
    const rets = retracements.map((r) => `${r.label}: ${sym}${r.price}`).join(' | ');
    const exts = extensions.map((e) => `${e.label}: ${sym}${e.price}`).join(' | ');

    const summary = `📐 TradeMind Fibonacci Levels (${direction}):
• Swing High: ${sym}${swingHigh} | Swing Low: ${sym}${swingLow}
• Retracements: ${rets}
• Extensions: ${exts}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setSwingHigh(currency === 'INR' ? 25600 : 560);
    setSwingLow(currency === 'INR' ? 25200 : 540);
    setDirection('UPTREND');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Swing Price Levels
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
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1">Market Trend</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('UPTREND')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  direction === 'UPTREND'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500 shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Uptrend (Pullback)
              </button>
              <button
                type="button"
                onClick={() => setDirection('DOWNTREND')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  direction === 'DOWNTREND'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-500 shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                Downtrend (Bounce)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor={highId} className="text-xs font-medium text-muted-foreground block mb-1">
                Swing High Price ({sym})
              </label>
              <input
                id={highId}
                type="number"
                step="any"
                value={swingHigh}
                onChange={(e) => setSwingHigh(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>

            <div>
              <label htmlFor={lowId} className="text-xs font-medium text-muted-foreground block mb-1">
                Swing Low Price ({sym})
              </label>
              <input
                id={lowId}
                type="number"
                step="any"
                value={swingLow}
                onChange={(e) => setSwingLow(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>
          </div>
        </div>

        {/* ── Outputs Column ── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h4 className="font-bold text-sm text-foreground">Retracement Levels</h4>
                <p className="text-[11px] text-muted-foreground">Support & reversal zones for continuation</p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Levels'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {retracements.map((r) => (
                <div
                  key={r.ratio}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                    r.isGoldenRatio
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 font-bold'
                      : 'bg-secondary/30 border-border/50 hover:bg-secondary/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {r.isGoldenRatio && <Sparkles className="w-3.5 h-3.5" />}
                    <span>{r.label}</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">{sym}{r.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <h4 className="font-bold text-sm text-foreground mb-1">Extension Targets</h4>
              <div className="space-y-2">
                {extensions.map((e) => (
                  <div
                    key={e.ratio}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                      e.isGoldenRatio
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500 font-bold'
                        : 'bg-secondary/30 border-border/50 hover:bg-secondary/60'
                    }`}
                  >
                    <span>{e.label}</span>
                    <span className="font-mono font-bold text-foreground">{sym}{e.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
