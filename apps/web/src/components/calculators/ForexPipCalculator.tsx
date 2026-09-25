// ──────────────────────────────────────────────
// TradeMind — Forex & Crypto Pip & Lot Size Calculator
// Institutional-grade pip valuation, stop-loss cash risk,
// and multi-currency lot sizing for FX, Crypto & Global Derivatives.
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo } from 'react';
import {
  Globe2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  ShieldAlert,
  ArrowRight,
  Info,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateForexPip, type ForexPipInputs } from './engine/financialMath';
import { useCurrency } from '@/hooks/useCurrency';

const POPULAR_PAIRS = [
  { pair: 'EUR/USD', type: 'Forex Major', pip: '0.0001', defaultPrice: 1.0850 },
  { pair: 'GBP/USD', type: 'Forex Major', pip: '0.0001', defaultPrice: 1.2950 },
  { pair: 'USD/JPY', type: 'Forex Major', pip: '0.01',   defaultPrice: 152.20 },
  { pair: 'AUD/USD', type: 'Forex Major', pip: '0.0001', defaultPrice: 0.6550 },
  { pair: 'USD/CAD', type: 'Forex Major', pip: '0.0001', defaultPrice: 1.3900 },
  { pair: 'USD/INR', type: 'INR FX',      pip: '0.0025', defaultPrice: 84.10 },
  { pair: 'BTC/USD', type: 'Crypto',      pip: '1.00',   defaultPrice: 66000 },
  { pair: 'ETH/USD', type: 'Crypto',      pip: '0.10',   defaultPrice: 3450 },
  { pair: 'SOL/USD', type: 'Crypto',      pip: '0.01',   defaultPrice: 175 },
];

const LOT_TIERS = [
  { id: 'STANDARD', label: 'Standard (1.00)', units: 100000, desc: '100,000 units' },
  { id: 'MINI',     label: 'Mini (0.10)',     units: 10000,  desc: '10,000 units' },
  { id: 'MICRO',    label: 'Micro (0.01)',    units: 1000,   desc: '1,000 units' },
  { id: 'NANO',     label: 'Nano (0.001)',    units: 100,    desc: '100 units' },
] as const;

export function ForexPipCalculator() {
  const { currencySymbol } = useCurrency();

  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [accountCurrency, setAccountCurrency] = useState('USD');
  const [lotType, setLotType] = useState<'STANDARD' | 'MINI' | 'MICRO' | 'NANO' | 'CUSTOM'>('STANDARD');
  const [lots, setLots] = useState(1);
  const [entryPrice, setEntryPrice] = useState(1.0850);
  const [stopLoss, setStopLoss] = useState(1.0810);
  const [takeProfit, setTakeProfit] = useState(1.0970);
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1.5);
  const [rateToAccount, setRateToAccount] = useState(1.0);

  // When pair changes, auto-populate sensible prices
  const handlePairChange = (p: string) => {
    setSelectedPair(p);
    const match = POPULAR_PAIRS.find((item) => item.pair === p);
    if (match) {
      setEntryPrice(match.defaultPrice);
      if (p.includes('JPY')) {
        setStopLoss(Number((match.defaultPrice - 0.40).toFixed(2)));
        setTakeProfit(Number((match.defaultPrice + 0.80).toFixed(2)));
      } else if (p.includes('BTC')) {
        setStopLoss(Math.round(match.defaultPrice - 1200));
        setTakeProfit(Math.round(match.defaultPrice + 2500));
      } else if (p.includes('INR')) {
        setStopLoss(Number((match.defaultPrice - 0.15).toFixed(4)));
        setTakeProfit(Number((match.defaultPrice + 0.30).toFixed(4)));
      } else {
        setStopLoss(Number((match.defaultPrice - 0.0035).toFixed(4)));
        setTakeProfit(Number((match.defaultPrice + 0.0080).toFixed(4)));
      }
    }
  };

  const results = useMemo(() => {
    return calculateForexPip({
      pair: selectedPair,
      accountCurrency,
      lotType,
      lots: Math.max(0.001, Number(lots) || 1),
      entryPrice: Number(entryPrice) || 0,
      stopLossPrice: Number(stopLoss) || 0,
      takeProfitPrice: Number(takeProfit) || 0,
      accountBalance: Number(accountBalance) || 10000,
      riskPercent: Number(riskPercent) || 1,
      exchangeRateToAccount: Number(rateToAccount) || 1.0,
    });
  }, [
    selectedPair,
    accountCurrency,
    lotType,
    lots,
    entryPrice,
    stopLoss,
    takeProfit,
    accountBalance,
    riskPercent,
    rateToAccount,
  ]);

  const currencySign = accountCurrency === 'INR' ? '₹' : accountCurrency === 'EUR' ? '€' : accountCurrency === 'GBP' ? '£' : accountCurrency === 'USDT' ? '₮' : '$';

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Forex & Crypto Pip Calculator</h2>
            <p className="text-xs text-muted-foreground">
              Institutional pip valuation, capital risk guardrails, and optimal lot sizing across global markets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            FX • Crypto • INR
          </span>
        </div>
      </div>

      {/* Main Grid: Inputs vs Analytics */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Pair Preset Selector */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              1. Select Currency / Crypto Pair
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {POPULAR_PAIRS.map((p) => (
                <button
                  key={p.pair}
                  type="button"
                  onClick={() => handlePairChange(p.pair)}
                  className={cn(
                    'px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center gap-0.5',
                    selectedPair === p.pair
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-muted/40 hover:bg-muted border-border/50 text-foreground'
                  )}
                >
                  <span>{p.pair}</span>
                  <span className={cn(
                    'text-[10px]',
                    selectedPair === p.pair ? 'text-blue-100' : 'text-muted-foreground'
                  )}>
                    {p.type}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Account Currency
                </label>
                <select
                  value={accountCurrency}
                  onChange={(e) => setAccountCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="USD">USD ($) — United States Dollar</option>
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="USDT">USDT (₮) — Tether Crypto</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Exchange Rate to {accountCurrency}
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={rateToAccount}
                  onChange={(e) => setRateToAccount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="1.0"
                />
              </div>
            </div>
          </div>

          {/* Lot Size & Contract Type */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Position Lot Size
              </label>
              <span className="text-xs text-muted-foreground font-mono">
                {results.unitsTraded.toLocaleString()} units
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LOT_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setLotType(tier.id)}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs text-center transition-all',
                    lotType === tier.id
                      ? 'bg-blue-600/10 border-blue-500 text-blue-400 font-bold'
                      : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div>{tier.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{tier.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Number of Lots
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={lots}
                  onChange={(e) => setLots(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Total Capital / Balance ({currencySign})
                </label>
                <input
                  type="number"
                  step="100"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Entry, Stop Loss, Take Profit */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              3. Execution Pricing & Targets
            </label>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Entry Price
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-destructive block mb-1">
                  Stop Loss (SL)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-destructive"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-success block mb-1">
                  Take Profit (TP)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-success/30 bg-success/5 text-success text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-success"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-accent/30 border border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Desired Max Risk per Trade:</span>
              <div className="flex items-center gap-1.5">
                {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setRiskPercent(pct)}
                    className={cn(
                      'px-2 py-0.5 rounded-md text-xs font-semibold transition-all',
                      riskPercent === pct
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Key Metrics & P&L Projection (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Pip Value Card */}
          <div className="glass-card rounded-2xl p-5 border-blue-500/30 bg-gradient-to-b from-blue-500/10 via-background to-background space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Live Pip Valuation
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Pip Size: {results.pipSize}
              </span>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Value of 1 Pip ({accountCurrency}):</div>
              <div className="text-3xl font-extrabold font-mono text-foreground mt-1">
                {currencySign}{results.pipValuePerPip.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                for {lots} lot{lots > 1 ? 's' : ''} ({results.unitsTraded.toLocaleString()} units)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Risk to SL
                </div>
                <div className="text-lg font-bold font-mono text-destructive mt-1">
                  -{currencySign}{results.monetaryRisk.toLocaleString()}
                </div>
                <div className="text-[10px] text-destructive/80 mt-0.5">
                  {results.riskPips} pips
                </div>
              </div>

              <div className="p-3 rounded-xl bg-success/10 border border-success/20">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-success">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Reward to TP
                </div>
                <div className="text-lg font-bold font-mono text-success mt-1">
                  +{currencySign}{results.monetaryReward.toLocaleString()}
                </div>
                <div className="text-[10px] text-success/80 mt-0.5">
                  {results.rewardPips} pips
                </div>
              </div>
            </div>

            {/* Risk-to-Reward Banner */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Risk : Reward Ratio</span>
              <span className={cn(
                'font-mono font-bold px-2 py-0.5 rounded-md',
                results.riskRewardRatio >= 2
                  ? 'bg-success/20 text-success'
                  : results.riskRewardRatio >= 1.5
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-amber-500/20 text-amber-400'
              )}>
                1 : {results.riskRewardRatio}
              </span>
            </div>

            {/* Recommended Lots for Risk Rule */}
            {results.suggestedLotsForRisk !== undefined && (
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Zap className="w-4 h-4" />
                  Max Sizing Rule ({riskPercent}% Risk)
                </div>
                <div className="text-xs text-muted-foreground">
                  To risk exactly {currencySign}{((accountBalance * riskPercent) / 100).toLocaleString()} on a {results.riskPips} pip stop loss:
                </div>
                <div className="text-base font-bold font-mono text-foreground">
                  Trade {results.suggestedLotsForRisk} lots maximum
                </div>
              </div>
            )}
          </div>

          {/* Quick Pip Scalp Matrix */}
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Profit / Loss Matrix by Pip Distance
            </h3>

            <div className="space-y-2 text-xs font-mono">
              {[10, 20, 30, 50, 100].map((pips) => {
                const profit = Number((pips * results.pipValuePerPip).toFixed(2));
                return (
                  <div
                    key={pips}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-muted-foreground">{pips} Pips Move</span>
                    <span className="text-foreground font-semibold">
                      ±{currencySign}{profit.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
