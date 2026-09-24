// ──────────────────────────────────────────────
// TradeMind — Instant In-Journal Position Sizing & Risk Modal (v2.0)
//
// Institutional risk engine:
// - Multi-market: Equity, Indian F&O (Nifty/BankNifty), Crypto, US Stocks & Forex
// - Dynamic account balance & currency resolution ($ / € / £ / ₹)
// - Real-time Risk-to-Reward ratio & Capital Allocation check
// - Tilt prevention warning when risk > 2.5%
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  X,
  Copy,
  Check,
  Target,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';

export interface PositionSizeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string;
  initialEntryPrice?: number;
  initialStopLoss?: number;
  initialTarget?: number;
  initialDirection?: 'LONG' | 'SHORT';
  onApply?: (result: {
    quantity: number;
    riskAmount: number;
    rewardAmount: number;
    rrRatio: number;
  }) => void;
}

const MARKET_PRESETS = [
  { name: 'NIFTY 50', lotSize: 25, defaultPrice: 25400, assetClass: 'FNO' },
  { name: 'BANKNIFTY', lotSize: 15, defaultPrice: 53200, assetClass: 'FNO' },
  { name: 'SENSEX', lotSize: 10, defaultPrice: 83500, assetClass: 'FNO' },
  { name: 'US Tech (NVDA/AAPL)', lotSize: 1, defaultPrice: 150, assetClass: 'US_EQUITY' },
  { name: 'BTC / USDT', lotSize: 0.001, defaultPrice: 65000, assetClass: 'CRYPTO' },
  { name: 'EUR / USD (Standard Lot)', lotSize: 100000, defaultPrice: 1.085, assetClass: 'FOREX' },
];

export function PositionSizeCalculatorModal({
  isOpen,
  onClose,
  initialSymbol = '',
  initialEntryPrice,
  initialStopLoss,
  initialTarget,
  initialDirection = 'LONG',
  onApply,
}: PositionSizeCalculatorModalProps) {
  const { currency, currencySymbol, format } = useCurrency();

  // Inputs
  const [accountBalance, setAccountBalance] = useState<number>(currency === 'INR' ? 250000 : 25000);
  const [riskMode, setRiskMode] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [fixedRiskAmount, setFixedRiskAmount] = useState<number>(currency === 'INR' ? 2500 : 250);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>(initialDirection);
  const [entryPrice, setEntryPrice] = useState<number>(initialEntryPrice ?? (currency === 'INR' ? 25400 : 150));
  const [stopLossPrice, setStopLossPrice] = useState<number>(
    initialStopLoss ?? (currency === 'INR' ? 25300 : 145)
  );
  const [targetPrice, setTargetPrice] = useState<number>(
    initialTarget ?? (currency === 'INR' ? 25650 : 162)
  );
  const [lotSize, setLotSize] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      if (initialEntryPrice) setEntryPrice(initialEntryPrice);
      if (initialStopLoss) setStopLossPrice(initialStopLoss);
      if (initialTarget) setTargetPrice(initialTarget);
      if (initialDirection) setDirection(initialDirection);

      // Attempt to load broker balance if available
      api.getBrokerFunds().then((res: any) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const avail = Number(res.data[0].availableCash || res.data[0].totalCollateral || res.data[0].availableMargin || 0);
          if (avail > 0) setAccountBalance(avail);
        }
      }).catch(() => {});
    }
  }, [isOpen, initialEntryPrice, initialStopLoss, initialTarget, initialDirection]);

  // Financial Computations
  const calculations = useMemo(() => {
    const isLong = direction === 'LONG';
    const entry = Number(entryPrice) || 0;
    const sl = Number(stopLossPrice) || 0;
    const tgt = Number(targetPrice) || 0;
    const bal = Number(accountBalance) || 0;

    // Per-unit risk
    const stopDistance = isLong ? Math.max(0, entry - sl) : Math.max(0, sl - entry);
    const rewardDistance = isLong ? Math.max(0, tgt - entry) : Math.max(0, entry - tgt);

    // Max cash to risk
    const maxRiskCash = riskMode === 'PERCENT' ? (bal * (Number(riskPercent) || 0)) / 100 : Number(fixedRiskAmount) || 0;

    let units = 0;
    let totalLots = 0;
    let actualRisk = 0;
    let actualReward = 0;
    let capitalRequired = 0;
    let rrRatio = 0;

    if (stopDistance > 0 && maxRiskCash > 0) {
      const rawUnits = maxRiskCash / stopDistance;
      const step = lotSize > 0 ? lotSize : 1;
      // Round down to closest valid lot size
      totalLots = Math.max(1, Math.floor(rawUnits / step));
      units = totalLots * step;

      actualRisk = units * stopDistance;
      actualReward = units * rewardDistance;
      capitalRequired = units * entry;
      rrRatio = stopDistance > 0 ? Math.round((rewardDistance / stopDistance) * 100) / 100 : 0;
    }

    const riskOfBalancePct = bal > 0 ? (actualRisk / bal) * 100 : 0;
    const isOverRisk = riskOfBalancePct > 2.5;

    return {
      stopDistance,
      rewardDistance,
      maxRiskCash,
      units,
      totalLots,
      actualRisk,
      actualReward,
      capitalRequired,
      rrRatio,
      riskOfBalancePct,
      isOverRisk,
    };
  }, [accountBalance, riskMode, riskPercent, fixedRiskAmount, direction, entryPrice, stopLossPrice, targetPrice, lotSize]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    const summary = [
      `🎯 TRADEMIND POSITION SIZING PLAN`,
      `Direction: ${direction}`,
      `Entry: ${currencySymbol}${entryPrice} | Stop Loss: ${currencySymbol}${stopLossPrice} | Target: ${currencySymbol}${targetPrice}`,
      `Position Size: ${calculations.units.toLocaleString()} units (${calculations.totalLots} lots)`,
      `Risk: ${format(calculations.actualRisk)} (${calculations.riskOfBalancePct.toFixed(2)}%)`,
      `Potential Reward: ${format(calculations.actualReward)} (R:R 1:${calculations.rrRatio})`,
      `Capital Required: ${format(calculations.capitalRequired)}`,
    ].join('\n');

    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Position sizing summary copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyClick = () => {
    onApply?.({
      quantity: calculations.units,
      riskAmount: calculations.actualRisk,
      rewardAmount: calculations.actualReward,
      rrRatio: calculations.rrRatio,
    });
    toast.success(`Applied sizing: ${calculations.units.toLocaleString()} units`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-bounce-in border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Position Sizing & Risk Calculator
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  {currency}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Mathematically size orders based on stop loss distance and maximum allowable risk.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close calculator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Instrument Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">
            Presets:
          </span>
          {MARKET_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setLotSize(p.lotSize);
                setEntryPrice(p.defaultPrice);
                if (direction === 'LONG') {
                  setStopLossPrice(Math.round(p.defaultPrice * 0.992 * 100) / 100);
                  setTargetPrice(Math.round(p.defaultPrice * 1.02 * 100) / 100);
                } else {
                  setStopLossPrice(Math.round(p.defaultPrice * 1.008 * 100) / 100);
                  setTargetPrice(Math.round(p.defaultPrice * 0.98 * 100) / 100);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-accent hover:bg-accent/80 border border-border/60 text-[11px] font-medium whitespace-nowrap transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Grid Inputs */}
        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          {/* Left Column: Account & Risk */}
          <div className="space-y-3 p-3.5 rounded-xl bg-background/50 border border-border/60">
            <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              Account Capital & Risk Budget
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Account Balance / Available Margin ({currencySymbol})
              </label>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Risk Allocation Mode
                </label>
                <div className="flex rounded-lg border border-border p-0.5 bg-muted">
                  <button
                    onClick={() => setRiskMode('PERCENT')}
                    className={cn(
                      'flex-1 py-1 text-[11px] font-bold rounded-md transition-colors',
                      riskMode === 'PERCENT' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Percent %
                  </button>
                  <button
                    onClick={() => setRiskMode('FIXED')}
                    className={cn(
                      'flex-1 py-1 text-[11px] font-bold rounded-md transition-colors',
                      riskMode === 'FIXED' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Fixed ({currencySymbol})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  {riskMode === 'PERCENT' ? 'Risk Percentage (%)' : `Fixed Risk (${currencySymbol})`}
                </label>
                {riskMode === 'PERCENT' ? (
                  <div className="flex items-center gap-1">
                    {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setRiskPercent(pct)}
                        className={cn(
                          'flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all',
                          riskPercent === pct
                            ? 'bg-primary/15 text-primary border-primary'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="number"
                    value={fixedRiskAmount}
                    onChange={(e) => setFixedRiskAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-input bg-background text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Order Direction
                </label>
                <div className="flex rounded-lg border border-border p-0.5 bg-muted">
                  <button
                    onClick={() => setDirection('LONG')}
                    className={cn(
                      'flex-1 py-1 text-[11px] font-bold rounded-md transition-colors flex items-center justify-center gap-1',
                      direction === 'LONG' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <TrendingUp className="w-3 h-3" />
                    Long / Buy
                  </button>
                  <button
                    onClick={() => setDirection('SHORT')}
                    className={cn(
                      'flex-1 py-1 text-[11px] font-bold rounded-md transition-colors flex items-center justify-center gap-1',
                      direction === 'SHORT' ? 'bg-rose-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <TrendingDown className="w-3 h-3" />
                    Short / Sell
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Lot Size Multiplier
                </label>
                <input
                  type="number"
                  value={lotSize}
                  onChange={(e) => setLotSize(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 rounded-xl border border-input bg-background text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Entry, Stop Loss, Target */}
          <div className="space-y-3 p-3.5 rounded-xl bg-background/50 border border-border/60">
            <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" />
              Execution Levels & Invalidation
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Planned Entry Price ({currencySymbol})
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-rose-500 mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Stop Loss Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-rose-500/30 bg-background text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Risk: {calculations.stopDistance.toFixed(2)} pts
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-emerald-500 mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Profit Target Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-background text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Reward: {calculations.rewardDistance.toFixed(2)} pts
                </span>
              </div>
            </div>

            {/* Over-risk Tilt Warning */}
            {calculations.isOverRisk && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span className="text-[11px] leading-tight">
                  <strong>Risk Alert:</strong> This trade risks {calculations.riskOfBalancePct.toFixed(1)}% of your account balance. Institutional risk limits advise keeping risk &le; 2.0%.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Calculation Output Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Optimal Execution Output
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/20 text-primary">
              R:R 1:{calculations.rrRatio}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Total Quantity
              </span>
              <span className="text-base font-bold font-mono text-foreground">
                {calculations.units.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {calculations.totalLots} {lotSize > 1 ? 'lots' : 'shares'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase font-bold text-rose-500 block">
                Total Max Risk
              </span>
              <span className="text-base font-bold font-mono text-rose-500">
                {format(calculations.actualRisk)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {calculations.riskOfBalancePct.toFixed(2)}% of balance
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase font-bold text-emerald-500 block">
                Expected Profit
              </span>
              <span className="text-base font-bold font-mono text-emerald-500">
                {format(calculations.actualReward)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                At full target
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Capital Required
              </span>
              <span className="text-base font-bold font-mono text-foreground truncate block">
                {format(calculations.capitalRequired)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Total notional
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-accent text-xs font-semibold text-foreground transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Plan'}
          </button>

          {onApply && (
            <button
              onClick={handleApplyClick}
              disabled={calculations.units <= 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-brand disabled:opacity-50"
            >
              Apply {calculations.units.toLocaleString()} Units to Trade Form
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-medium hover:bg-accent transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
