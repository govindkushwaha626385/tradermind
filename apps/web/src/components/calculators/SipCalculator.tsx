// ──────────────────────────────────────────────
// TradeMind — SIP & Step-Up Wealth Investor Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useId } from 'react';
import {
  Coins,
  RotateCcw,
  Copy,
  Check,
  TrendingUp,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { calculateSip } from './engine/financialMath';
import { getCalculatorCurrencySymbol, type Currency } from './types';

interface SipCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function SipCalculator({ currency, onCopySummary }: SipCalculatorProps) {
  const sym = getCalculatorCurrencySymbol(currency);
  const monthlyId = useId();
  const stepUpId = useId();
  const cagrId = useId();
  const durationId = useId();
  const inflationId = useId();

  const [monthlyInvestment, setMonthlyInvestment] = useState<number>(currency === 'INR' ? 15000 : 500);
  const [stepUpPercent, setStepUpPercent] = useState<number>(10); // 10% step-up per year
  const [expectedCagr, setExpectedCagr] = useState<number>(14.0); // 14% equity return
  const [durationYears, setDurationYears] = useState<number>(15);  // 15 years
  const [inflationRate, setInflationRate] = useState<number>(6.0); // 6% inflation
  const [copied, setCopied] = useState<boolean>(false);

  const result = calculateSip({
    monthlyInvestment,
    stepUpPercentPerYear: stepUpPercent,
    expectedAnnualReturnPercent: expectedCagr,
    durationYears,
    inflationRatePercent: inflationRate,
  });

  const handleCopy = () => {
    const summary = `💰 TradeMind SIP Wealth Creation Plan:
• Monthly SIP: ${sym}${monthlyInvestment.toLocaleString()} (Step-Up: ${stepUpPercent}%/yr)
• Duration: ${durationYears} Years | Expected Return: ${expectedCagr}% CAGR
• Total Invested: ${sym}${result.totalInvested.toLocaleString()}
• Estimated Future Wealth: ${sym}${result.estimatedWealth.toLocaleString()} (${result.gainMultiplier}x multiplier)
• Wealth Gained: +${sym}${result.wealthGained.toLocaleString()}
• Inflation Adjusted Real Value: ${sym}${result.inflationAdjustedWealth.toLocaleString()}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setMonthlyInvestment(currency === 'INR' ? 15000 : 500);
    setStepUpPercent(10);
    setExpectedCagr(14.0);
    setDurationYears(15);
    setInflationRate(6.0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              Investment Strategy
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

          {/* Monthly SIP Amount */}
          <div>
            <label htmlFor={monthlyId} className="text-xs font-medium text-muted-foreground block mb-1">
              Monthly Investment ({sym})
            </label>
            <input
              id={monthlyId}
              type="number"
              min={100}
              value={monthlyInvestment}
              onChange={(e) => setMonthlyInvestment(Math.max(100, Number(e.target.value)))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>

          {/* Annual Step-Up % */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={stepUpId} className="text-xs font-medium text-muted-foreground">
                Annual Step-Up (%)
              </label>
              <span className="text-xs font-bold text-foreground">{stepUpPercent}% / yr</span>
            </div>
            <div className="flex gap-2 mb-2">
              {[0, 5, 10, 15, 20].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStepUpPercent(s)}
                  className={`flex-1 py-1 text-xs rounded border transition-colors ${
                    stepUpPercent === s
                      ? 'bg-primary text-primary-foreground font-semibold border-primary'
                      : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
            <input
              id={stepUpId}
              type="range"
              min="0"
              max="30"
              step="1"
              value={stepUpPercent}
              onChange={(e) => setStepUpPercent(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Expected Return Rate (CAGR %) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={cagrId} className="text-xs font-medium text-muted-foreground">
                Expected Annual Return (%)
              </label>
              <span className="text-xs font-bold text-emerald-500">{expectedCagr}%</span>
            </div>
            <input
              id={cagrId}
              type="number"
              step="0.5"
              value={expectedCagr}
              onChange={(e) => setExpectedCagr(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>

          {/* Duration in Years */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={durationId} className="text-xs font-medium text-muted-foreground">
                Investment Horizon
              </label>
              <span className="text-xs font-bold text-foreground">{durationYears} Years</span>
            </div>
            <div className="flex gap-2 mb-2">
              {[5, 10, 15, 20, 25, 30].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setDurationYears(y)}
                  className={`flex-1 py-1 text-xs rounded border transition-colors ${
                    durationYears === y
                      ? 'bg-primary text-primary-foreground font-semibold border-primary'
                      : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {y}y
                </button>
              ))}
            </div>
            <input
              id={durationId}
              type="range"
              min="1"
              max="40"
              step="1"
              value={durationYears}
              onChange={(e) => setDurationYears(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Inflation Rate */}
          <div>
            <label htmlFor={inflationId} className="text-xs font-medium text-muted-foreground block mb-1">
              Estimated Inflation Rate (%)
            </label>
            <input
              id={inflationId}
              type="number"
              step="0.5"
              value={inflationRate}
              onChange={(e) => setInflationRate(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>
        </div>

        {/* ── Outputs Column ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Hero Card */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-amber-600/10 via-card to-emerald-600/10 border border-amber-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-500">
                Estimated Maturity Wealth
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
                {sym}{result.estimatedWealth.toLocaleString()}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                {result.gainMultiplier}x Multiplier
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-card/60 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Wealth Gain (Interest)</span>
                <span className="text-base font-bold text-emerald-500">
                  +{sym}{result.wealthGained.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card/60 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Total Out-of-Pocket Invested</span>
                <span className="text-base font-bold text-foreground">
                  {sym}{result.totalInvested.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Inflation Adjusted Card */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Inflation-Adjusted Purchasing Power</span>
              <span className="text-[11px] text-primary">Inflation: {inflationRate}% / yr</span>
            </h4>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Real Value in Today&apos;s Money:</span>
                <span className="text-xl font-mono font-extrabold text-foreground">
                  {sym}{result.inflationAdjustedWealth.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[11px]">Real Purchasing Gain:</span>
                <span className="font-mono font-bold text-emerald-500">
                  +{sym}{Math.max(0, result.inflationAdjustedWealth - result.totalInvested).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
