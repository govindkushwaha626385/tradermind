// ──────────────────────────────────────────────
// TradeMind — Break-Even Price Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo, useId } from 'react';
import {
  Crosshair,
  RotateCcw,
  Copy,
  Check,
  TrendingUp,
  Percent,
  Receipt,
  ArrowRight,
  Info,
} from 'lucide-react';
import { calculateBreakEven } from './engine/financialMath';
import type { Currency } from './types';

interface BreakEvenCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function BreakEvenCalculator({ currency, onCopySummary }: BreakEvenCalculatorProps) {
  const sym = currency === 'INR' ? '₹' : '$';
  const entryPriceId = useId();
  const quantityId = useId();
  const flatBrokerageId = useId();
  const desiredProfitId = useId();

  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(currency === 'INR' ? 1000 : 150);
  const [quantity, setQuantity] = useState<number>(100);
  const [flatBrokeragePerOrder, setFlatBrokeragePerOrder] = useState<number>(currency === 'INR' ? 20 : 1.0);
  const [sttPercent, setSttPercent] = useState<number>(currency === 'INR' ? 0.025 : 0);
  const [exchangeFeePercent, setExchangeFeePercent] = useState<number>(currency === 'INR' ? 0.00345 : 0.001);
  const [gstPercent, setGstPercent] = useState<number>(currency === 'INR' ? 18 : 0);
  const [stampDutyPercent, setStampDutyPercent] = useState<number>(currency === 'INR' ? 0.003 : 0);
  const [desiredNetProfit, setDesiredNetProfit] = useState<number>(currency === 'INR' ? 2000 : 200);
  const [copied, setCopied] = useState<boolean>(false);

  const result = useMemo(() => {
    return calculateBreakEven({
      entryPrice,
      quantity,
      flatBrokeragePerOrder,
      sttPercent,
      exchangeFeePercent,
      gstPercent,
      stampDutyPercent,
      direction,
    });
  }, [
    entryPrice,
    quantity,
    flatBrokeragePerOrder,
    sttPercent,
    exchangeFeePercent,
    gstPercent,
    stampDutyPercent,
    direction,
  ]);

  // Target price for desired net profit
  const pointsForDesiredProfit = quantity > 0 ? (result.estimatedTotalCharges + desiredNetProfit) / quantity : 0;
  const targetPriceForProfit = direction === 'LONG'
    ? entryPrice + pointsForDesiredProfit
    : entryPrice - pointsForDesiredProfit;

  const handleCopy = () => {
    const summary = `🎯 TradeMind Break-Even Trade Analysis:
• Direction: ${direction} | Entry: ${sym}${entryPrice} | Qty: ${quantity}
• Total Regulatory & Brokerage Charges: ${sym}${result.estimatedTotalCharges}
• Exact Break-Even Exit Price: ${sym}${result.breakEvenPrice}
• Required Price Move: ${result.pointsRequired >= 0 ? '+' : ''}${result.pointsRequired} pts (${result.percentMoveRequired}%)
• Target Price for +${sym}${desiredNetProfit} Net Profit: ${sym}${targetPriceForProfit.toFixed(2)}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setDirection('LONG');
    setEntryPrice(currency === 'INR' ? 1000 : 150);
    setQuantity(100);
    setFlatBrokeragePerOrder(currency === 'INR' ? 20 : 1.0);
    setDesiredNetProfit(currency === 'INR' ? 2000 : 200);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-primary" />
              Trade & Fee Settings
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
                  LONG (Buy First)
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
                  SHORT (Sell First)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={entryPriceId} className="text-xs font-medium text-muted-foreground block mb-1">
                  Entry Price ({sym})
                </label>
                <input
                  id={entryPriceId}
                  type="number"
                  min="0.01"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Math.max(0.01, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor={quantityId} className="text-xs font-medium text-muted-foreground block mb-1">
                  Quantity / Units
                </label>
                <input
                  id={quantityId}
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value))))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor={flatBrokerageId} className="text-xs font-medium text-muted-foreground block mb-1">
                Flat Brokerage per Order ({sym})
              </label>
              <input
                id={flatBrokerageId}
                type="number"
                min="0"
                step="any"
                value={flatBrokeragePerOrder}
                onChange={(e) => setFlatBrokeragePerOrder(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Standard ₹20/order (Zerodha, Groww, AngelOne) or $1/trade (US)
              </span>
            </div>

            <div>
              <label htmlFor={desiredProfitId} className="text-xs font-medium text-muted-foreground block mb-1">
                Desired Net Profit Target ({sym})
              </label>
              <input
                id={desiredProfitId}
                type="number"
                min="0"
                step="100"
                value={desiredNetProfit}
                onChange={(e) => setDesiredNetProfit(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* ── Results Column ── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                <Crosshair className="w-3.5 h-3.5" />
                Break-Even Price
              </div>
              <div className="text-2xl font-bold mt-1 text-primary">
                {sym}{result.breakEvenPrice}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Exact zero-loss exit price
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Required Price Move
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {result.pointsRequired} pts
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {result.percentMoveRequired}% from entry
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-500" />
                Total Charges
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {sym}{result.estimatedTotalCharges}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {sym}{(result.estimatedTotalCharges / Math.max(1, quantity)).toFixed(2)} / unit
              </div>
            </div>
          </div>

          {/* Desired Profit Projection Banner */}
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Target Exit Price for +{sym}{desiredNetProfit.toLocaleString()} Net Profit
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Takes into account entry price, quantity, and all round-trip fees
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-foreground">
                {sym}{targetPriceForProfit.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                {direction === 'LONG' ? '+' : '-'}{pointsForDesiredProfit.toFixed(2)} pts ({((pointsForDesiredProfit / entryPrice) * 100).toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Breakdown & Copy Button */}
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Charge Breakdown (Round Trip)</span>
              <button
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border hover:border-primary/50 transition-all bg-background/50"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Analysis'}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                <span>Brokerage (Buy + Sell):</span>
                <span className="font-semibold text-foreground">{sym}{(flatBrokeragePerOrder * 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                <span>Taxes & Regulatory Levies (STT, GST, Stamp, Exchange):</span>
                <span className="font-semibold text-foreground">
                  {sym}{(result.estimatedTotalCharges - flatBrokeragePerOrder * 2).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                <span>Cost Per Unit:</span>
                <span className="font-semibold text-foreground">
                  {sym}{(result.estimatedTotalCharges / quantity).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
