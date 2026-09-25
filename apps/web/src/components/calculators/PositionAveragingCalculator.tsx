// ──────────────────────────────────────────────
// TradeMind — Position Averaging & Scale-In Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useId } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { calculateAveraging, type AverageTranche } from './engine/financialMath';
import { getCalculatorCurrencySymbol, type Currency } from './types';

interface PositionAveragingCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function PositionAveragingCalculator({ currency, onCopySummary }: PositionAveragingCalculatorProps) {
  const sym = getCalculatorCurrencySymbol(currency);
  const targetProfitPctId = useId();
  const cmpId = useId();

  const [tranches, setTranches] = useState<AverageTranche[]>([
    { price: currency === 'INR' ? 1000 : 150, quantity: 50 },
    { price: currency === 'INR' ? 950 : 140, quantity: 50 },
    { price: currency === 'INR' ? 920 : 135, quantity: 100 },
  ]);

  const [targetProfitPct, setTargetProfitPct] = useState<number>(8.0); // 8% profit
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(currency === 'INR' ? 960 : 145);
  const [copied, setCopied] = useState<boolean>(false);

  const { averagePrice, totalQuantity, totalInvested } = calculateAveraging(tranches);
  const targetExitPrice = averagePrice * (1 + targetProfitPct / 100);
  const targetCashProfit = (targetExitPrice - averagePrice) * totalQuantity;
  const currentUnrealizedPnl = (currentMarketPrice - averagePrice) * totalQuantity;

  const handleAddTranche = () => {
    if (tranches.length < 6) {
      setTranches([...tranches, { price: averagePrice || (currency === 'INR' ? 900 : 130), quantity: 50 }]);
    }
  };

  const handleRemoveTranche = (idx: number) => {
    if (tranches.length > 1) {
      setTranches(tranches.filter((_, i) => i !== idx));
    }
  };

  const handleUpdateTranche = (idx: number, updates: Partial<AverageTranche>) => {
    setTranches(tranches.map((t, i) => (i === idx ? { ...t, ...updates } : t)));
  };

  const handleCopy = () => {
    const summary = `📊 TradeMind Scale-In Averaging Summary:
• Total Accumulated: ${totalQuantity.toLocaleString()} units
• Total Invested: ${sym}${totalInvested.toLocaleString()}
• Blended Average Price: ${sym}${averagePrice.toFixed(2)}
• Current Market: ${sym}${currentMarketPrice} (P&L: ${currentUnrealizedPnl >= 0 ? `+${sym}${currentUnrealizedPnl.toFixed(2)}` : `-${sym}${Math.abs(currentUnrealizedPnl).toFixed(2)}`})
• Target Exit (${targetProfitPct}%): ${sym}${targetExitPrice.toFixed(2)} (+${sym}${targetCashProfit.toFixed(2)})`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setTranches([
      { price: currency === 'INR' ? 1000 : 150, quantity: 50 },
      { price: currency === 'INR' ? 950 : 140, quantity: 50 },
    ]);
    setTargetProfitPct(8.0);
    setCurrentMarketPrice(currency === 'INR' ? 960 : 145);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-6 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              Scale-In Tranches ({tranches.length})
            </h3>
            <div className="flex items-center gap-2">
              {tranches.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddTranche}
                  className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 flex items-center gap-1 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Tranche
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Tranches list */}
          <div className="space-y-2.5">
            {tranches.map((tranche, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-secondary/30 border border-border/50 grid grid-cols-12 gap-2 items-center text-xs"
              >
                <span className="col-span-2 font-bold text-muted-foreground">#{idx + 1}</span>
                <div className="col-span-5">
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Price ({sym})</span>
                  <input
                    type="number"
                    step="any"
                    value={tranche.price}
                    onChange={(e) => handleUpdateTranche(idx, { price: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded bg-background border border-input"
                  />
                </div>
                <div className="col-span-4">
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Quantity</span>
                  <input
                    type="number"
                    min={1}
                    value={tranche.quantity}
                    onChange={(e) => handleUpdateTranche(idx, { quantity: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded bg-background border border-input"
                  />
                </div>
                <div className="col-span-1 text-right pt-3">
                  {tranches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTranche(idx)}
                      className="text-muted-foreground hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Target and CMP */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label htmlFor={targetProfitPctId} className="text-xs font-medium text-muted-foreground block mb-1">
                Target Profit Goal (%)
              </label>
              <input
                id={targetProfitPctId}
                type="number"
                step="0.5"
                value={targetProfitPct}
                onChange={(e) => setTargetProfitPct(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>

            <div>
              <label htmlFor={cmpId} className="text-xs font-medium text-muted-foreground block mb-1">
                Current Market Price ({sym})
              </label>
              <input
                id={cmpId}
                type="number"
                step="any"
                value={currentMarketPrice}
                onChange={(e) => setCurrentMarketPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
              />
            </div>
          </div>
        </div>

        {/* ── Outputs Column ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Average Price Card */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-card to-blue-600/10 border border-primary/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                Blended Average Price
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-foreground">
                {sym}{averagePrice.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                across {totalQuantity.toLocaleString()} shares
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-card/60 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Total Invested Capital</span>
                <span className="text-base font-bold text-foreground">
                  {sym}{totalInvested.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card/60 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Current Position P&L</span>
                <span className={`text-base font-bold ${currentUnrealizedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {currentUnrealizedPnl >= 0 ? `+${sym}${currentUnrealizedPnl.toFixed(2)}` : `-${sym}${Math.abs(currentUnrealizedPnl).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Target Exit Price Card */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              Target Exit for +{targetProfitPct}% Profit
            </h4>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <div>
                <span className="text-muted-foreground block">Required Exit Price:</span>
                <span className="text-lg font-mono font-extrabold text-foreground">{sym}{targetExitPrice.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block">Expected Net Gain:</span>
                <span className="text-base font-mono font-bold text-emerald-500">+{sym}{targetCashProfit.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
