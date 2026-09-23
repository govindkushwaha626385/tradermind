// ──────────────────────────────────────────────
// TradeMind — Position Size & Risk Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useId } from 'react';
import {
  Scale,
  Copy,
  Check,
  RotateCcw,
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from 'lucide-react';
import { calculatePositionSize } from './engine/financialMath';
import { INSTRUMENT_PRESETS, type Currency } from './types';

interface PositionSizeCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function PositionSizeCalculator({ currency, onCopySummary }: PositionSizeCalculatorProps) {
  const sym = currency === 'INR' ? '₹' : '$';
  const balanceId = useId();
  const entryPriceId = useId();
  const stopLossPriceId = useId();
  const lotSizeId = useId();

  // State
  const [balance, setBalance] = useState<number>(currency === 'INR' ? 200000 : 25000);
  const [riskMode, setRiskMode] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [fixedRisk, setFixedRisk] = useState<number>(currency === 'INR' ? 3000 : 375);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(currency === 'INR' ? 25400 : 250);
  const [stopLoss, setStopLoss] = useState<number>(currency === 'INR' ? 25320 : 245);
  const [lotSize, setLotSize] = useState<number>(50); // Default Nifty lot
  const [copied, setCopied] = useState<boolean>(false);

  // Apply preset
  const handleApplyPreset = (key: keyof typeof INSTRUMENT_PRESETS) => {
    const p = INSTRUMENT_PRESETS[key];
    setLotSize(p.lotSize);
    setEntryPrice(p.defaultPrice);
    if (direction === 'LONG') {
      setStopLoss(Math.round(p.defaultPrice * 0.995 * 100) / 100);
    } else {
      setStopLoss(Math.round(p.defaultPrice * 1.005 * 100) / 100);
    }
  };

  const output = calculatePositionSize({
    accountBalance: balance,
    riskMode,
    riskPercent,
    riskAmount: fixedRisk,
    entryPrice,
    stopLossPrice: stopLoss,
    lotSize,
    direction,
  });

  const handleCopy = () => {
    const summary = `📊 TradeMind Position Plan (${direction}):
• Entry: ${sym}${entryPrice.toLocaleString()} | SL: ${sym}${stopLoss.toLocaleString()}
• Risk: ${sym}${output.monetaryRisk.toLocaleString()} (${output.riskPercentOfCapital}% of capital)
• Sizing: ${output.effectiveUnits.toLocaleString()} units ${lotSize > 1 ? `(${output.maxLots} lots of ${lotSize})` : ''}
• Position Value: ${sym}${output.totalPositionValue.toLocaleString()}
• Target 1 (1:2 R:R): ${sym}${output.targets[1]?.targetPrice.toLocaleString()} (Profit: ${sym}${output.targets[1]?.projectedProfit.toLocaleString()})`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setBalance(currency === 'INR' ? 200000 : 25000);
    setRiskMode('PERCENT');
    setRiskPercent(1.5);
    setDirection('LONG');
    setEntryPrice(currency === 'INR' ? 25400 : 250);
    setStopLoss(currency === 'INR' ? 25320 : 245);
    setLotSize(50);
  };

  const isInvalidStop = direction === 'LONG' ? stopLoss >= entryPrice : stopLoss <= entryPrice;

  return (
    <div className="space-y-6">
      {/* ── Instrument Quick Presets ── */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
          Quick Asset Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(INSTRUMENT_PRESETS).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleApplyPreset(key as any)}
              className="px-2.5 py-1 text-xs rounded-md bg-secondary/70 hover:bg-primary/20 hover:text-primary border border-border transition-colors flex items-center gap-1"
            >
              <span>{item.name}</span>
              {item.lotSize > 1 && (
                <span className="text-[10px] text-muted-foreground">({item.lotSize})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-6 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-500" />
              Risk Parameters
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

          {/* Account Balance */}
          <div>
            <label htmlFor={balanceId} className="text-xs font-medium text-muted-foreground block mb-1">
              Account Balance ({sym})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">{sym}</span>
              <input
                id={balanceId}
                type="number"
                min={1}
                value={balance}
                onChange={(e) => setBalance(Math.max(0, Number(e.target.value)))}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-background border border-input focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Risk Sizing Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Risk Mode</span>
              <div className="flex rounded-lg bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setRiskMode('PERCENT')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    riskMode === 'PERCENT' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  % of Capital
                </button>
                <button
                  type="button"
                  onClick={() => setRiskMode('FIXED')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    riskMode === 'FIXED' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Fixed Cash ({sym})
                </button>
              </div>
            </div>

            {riskMode === 'PERCENT' ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {[0.5, 1.0, 1.5, 2.0, 3.0].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setRiskPercent(pct)}
                      className={`flex-1 py-1 text-xs rounded-md border transition-all ${
                        riskPercent === pct
                          ? 'bg-primary text-primary-foreground border-primary font-medium shadow-sm'
                          : 'bg-secondary/40 border-border hover:bg-secondary text-muted-foreground'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value)))}
                    className="w-full pr-8 pl-3 py-2 text-sm rounded-lg bg-background border border-input"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">{sym}</span>
                <input
                  type="number"
                  min={1}
                  value={fixedRisk}
                  onChange={(e) => setFixedRisk(Math.max(1, Number(e.target.value)))}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-background border border-input"
                />
              </div>
            )}
          </div>

          {/* Direction (Long / Short) */}
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1">Trade Direction</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('LONG')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all ${
                  direction === 'LONG'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Long (Buy)
              </button>
              <button
                type="button"
                onClick={() => setDirection('SHORT')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all ${
                  direction === 'SHORT'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-500 shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                Short (Sell)
              </button>
            </div>
          </div>

          {/* Entry & Stop Loss */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={entryPriceId} className="text-xs font-medium text-muted-foreground block mb-1">
                Entry Price ({sym})
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
                className={`w-full px-3 py-2 text-sm rounded-lg bg-background border ${
                  isInvalidStop ? 'border-rose-500 ring-1 ring-rose-500' : 'border-input'
                }`}
              />
            </div>
          </div>

          {isInvalidStop && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                {direction === 'LONG'
                  ? 'For Long trades, Stop Loss must be strictly below Entry Price.'
                  : 'For Short trades, Stop Loss must be strictly above Entry Price.'}
              </span>
            </div>
          )}

          {/* Lot Size */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={lotSizeId} className="text-xs font-medium text-muted-foreground">
                Lot / Contract Multiplier
              </label>
              <span className="text-[11px] text-muted-foreground">1 = Equity / Stock</span>
            </div>
            <input
              id={lotSizeId}
              type="number"
              min={1}
              value={lotSize}
              onChange={(e) => setLotSize(Math.max(1, Math.round(Number(e.target.value))))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>
        </div>

        {/* ── Outputs Column ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Sizing Hero Card */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-blue-600/10 via-card to-violet-600/10 border border-blue-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-500">
                Recommended Position Size
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Plan'}</span>
              </button>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold tracking-tight">
                {output.effectiveUnits.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-sm font-medium">
                units / shares
              </span>
            </div>

            {lotSize > 1 && (
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center justify-between">
                <span>Equivalent in Lots:</span>
                <span className="font-bold text-sm">{output.maxLots} Lots ({lotSize} per lot)</span>
              </div>
            )}

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-card/60 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Max Cash Risk</span>
                <span className="text-base font-bold text-rose-500">
                  {sym}{output.monetaryRisk.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  ({output.riskPercentOfCapital}% capital)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-card/60 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Risk per Unit</span>
                <span className="text-base font-bold">
                  {sym}{output.riskPerUnit.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground block">SL distance</span>
              </div>

              <div className="p-3 rounded-lg bg-card/60 border border-border/50 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-muted-foreground block">Total Exposure</span>
                <span className="text-base font-bold">
                  {sym}{output.totalPositionValue.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {output.marginLeverageRatio}x Account
                </span>
              </div>
            </div>
          </div>

          {/* Profit Target Projections */}
          <div className="p-5 rounded-xl bg-card/60 backdrop-blur-sm border border-border space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              Target Exits & R:R Projections
            </h4>

            <div className="space-y-2">
              {output.targets.map((t) => (
                <div
                  key={t.ratio}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/60 border border-border/50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {t.ratio}
                    </span>
                    <span className="text-muted-foreground">Exit at:</span>
                    <span className="font-bold text-foreground">{sym}{t.targetPrice.toLocaleString()}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-emerald-500">
                      +{sym}{t.projectedProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Educational Note */}
          <div className="text-[11px] text-muted-foreground flex items-start gap-2 bg-muted/30 p-3 rounded-lg border border-border/50">
            <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
            <span>
              <strong>Golden Rule of Survival:</strong> Professional traders strictly keep single-trade risk below 1% to 2% of total capital. This mathematical buffer ensures even an unexpected 10-trade losing streak leaves over 80% of your capital intact.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
