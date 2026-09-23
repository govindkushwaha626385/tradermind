// ──────────────────────────────────────────────
// TradeMind — ATR Stop Loss & Target Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo, useId } from 'react';
import {
  Gauge,
  RotateCcw,
  Copy,
  Check,
  Shield,
  Target,
  TrendingUp,
  Info,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { calculateAtrStopLoss } from './engine/financialMath';
import type { Currency } from './types';

interface AtrStopLossCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function AtrStopLossCalculator({ currency, onCopySummary }: AtrStopLossCalculatorProps) {
  const sym = currency === 'INR' ? '₹' : '$';
  const entryId = useId();
  const atrId = useId();
  const riskId = useId();

  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(currency === 'INR' ? 500 : 75);
  const [atr, setAtr] = useState<number>(currency === 'INR' ? 12 : 2.5);
  const [multiplier, setMultiplier] = useState<number>(2.0);
  const [riskCapital, setRiskCapital] = useState<number>(currency === 'INR' ? 5000 : 250);
  const [copied, setCopied] = useState<boolean>(false);

  const result = useMemo(() => {
    return calculateAtrStopLoss({
      entryPrice,
      atr,
      multiplier,
      direction,
      riskCapital,
    });
  }, [entryPrice, atr, multiplier, direction, riskCapital]);

  const handleCopy = () => {
    const summary = `🛡️ TradeMind ATR Volatility Stop Loss:
• Direction: ${direction} | Entry: ${sym}${entryPrice}
• 14-period ATR: ${atr} | Multiplier: ${multiplier}x (${(atr * multiplier).toFixed(2)} pts)
• Exact Stop Loss Price: ${sym}${result.stopLossPrice} (${result.stopDistancePercent}% distance)
• Capital Risked: ${sym}${riskCapital.toLocaleString()}
• Risk-Sized Quantity: ${result.suggestedShares} Units (Total Value: ${sym}${result.totalPositionValue.toLocaleString()})
• Profit Targets: 1R = ${sym}${result.targets[0].price} | 2R = ${sym}${result.targets[2].price} | 3R = ${sym}${result.targets[3].price}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setDirection('LONG');
    setEntryPrice(currency === 'INR' ? 500 : 75);
    setAtr(currency === 'INR' ? 12 : 2.5);
    setMultiplier(2.0);
    setRiskCapital(currency === 'INR' ? 5000 : 250);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" />
              ATR & Risk Settings
            </h3>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Trade Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('LONG')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    direction === 'LONG'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  LONG (Buy)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SHORT')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    direction === 'SHORT'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-500'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  SHORT (Sell)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={entryId} className="text-xs font-medium text-muted-foreground block mb-1">
                  Entry Price ({sym})
                </label>
                <input
                  id={entryId}
                  type="number"
                  min="0.01"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Math.max(0.01, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor={atrId} className="text-xs font-medium text-muted-foreground block mb-1">
                  14-Period ATR ({sym})
                </label>
                <input
                  id={atrId}
                  type="number"
                  min="0.01"
                  step="any"
                  value={atr}
                  onChange={(e) => setAtr(Math.max(0.01, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1.5">
                <span>ATR Multiplier Buffer</span>
                <span className="text-foreground font-semibold">{multiplier}x ATR</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1.5, 2.0, 2.5, 3.0].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMultiplier(m)}
                    className={`py-1.5 rounded-md border text-xs font-medium transition-all ${
                      multiplier === m
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'border-border bg-background/50 text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Scalp (1.5x)</span>
                <span>Day Trade (2.0x)</span>
                <span>Swing (2.5x)</span>
                <span>Wide (3.0x)</span>
              </div>
            </div>

            <div>
              <label htmlFor={riskId} className="text-xs font-medium text-muted-foreground block mb-1">
                Maximum Capital to Risk ({sym})
              </label>
              <input
                id={riskId}
                type="number"
                min="100"
                step="500"
                value={riskCapital}
                onChange={(e) => setRiskCapital(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* ── Results Column ── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                <Shield className="w-3.5 h-3.5" />
                Stop Loss Price
              </div>
              <div className="text-2xl font-bold mt-1 text-rose-500">
                {sym}{result.stopLossPrice}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {result.stopDistance} pts ({result.stopDistancePercent}%)
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                Suggested Position
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {result.suggestedShares} Units
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Risk = exactly {sym}{riskCapital}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                Position Value
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {sym}{result.totalPositionValue.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Capital deployed
              </div>
            </div>
          </div>

          {/* Profit Target Multiples */}
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Multi-R Profit Targets</span>
              <button
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border hover:border-primary/50 transition-all bg-background/50"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Plan'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {result.targets.map((tgt) => (
                <div key={tgt.rMultiple} className="p-3 rounded-lg border border-border/70 bg-background/50">
                  <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>{tgt.rMultiple}R Target</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-base font-bold text-foreground mt-1">
                    {sym}{tgt.price}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    +{sym}{tgt.projectedProfit.toLocaleString()} profit
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Bar: Stop -> Entry -> 2R */}
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Trade Risk vs Reward Geometry</div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-rose-500 font-semibold">Stop: {sym}{result.stopLossPrice}</span>
              <span className="text-foreground font-semibold">Entry: {sym}{entryPrice}</span>
              <span className="text-emerald-500 font-semibold">2R Target: {sym}{result.targets[2].price}</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted">
              <div className="h-full bg-rose-500/80 w-1/3 flex items-center justify-center text-[9px] text-white font-bold">
                1R Risk
              </div>
              <div className="h-full bg-emerald-500/80 w-2/3 flex items-center justify-center text-[9px] text-white font-bold">
                2R Reward
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
