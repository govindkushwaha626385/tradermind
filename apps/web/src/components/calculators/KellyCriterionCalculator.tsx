// ──────────────────────────────────────────────
// TradeMind — Kelly Criterion Position Sizing Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo, useId } from 'react';
import {
  Percent,
  RotateCcw,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Info,
  DollarSign,
} from 'lucide-react';
import { calculateKelly } from './engine/financialMath';
import { getCalculatorCurrencySymbol, type Currency } from './types';

interface KellyCriterionCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function KellyCriterionCalculator({ currency, onCopySummary }: KellyCriterionCalculatorProps) {
  const sym = getCalculatorCurrencySymbol(currency);
  const winRateId = useId();
  const winLossId = useId();
  const balanceId = useId();

  const [winRatePercent, setWinRatePercent] = useState<number>(55);
  const [winLossRatio, setWinLossRatio] = useState<number>(1.8);
  const [accountBalance, setAccountBalance] = useState<number>(currency === 'INR' ? 200000 : 25000);
  const [copied, setCopied] = useState<boolean>(false);

  const result = useMemo(() => {
    return calculateKelly({
      winRatePercent,
      winLossRatio,
      accountBalance,
    });
  }, [winRatePercent, winLossRatio, accountBalance]);

  const handleCopy = () => {
    const summary = `⚖️ TradeMind Kelly Criterion Analysis:
• Historical Win Rate: ${winRatePercent}%
• Win/Loss Payoff Ratio: ${winLossRatio}:1
• Account Balance: ${sym}${accountBalance.toLocaleString()}
• Full Kelly (Max Theoretical): ${result.fullKellyPercent}% (${sym}${result.fullKellyCapital.toLocaleString()})
• Half Kelly (Recommended Practical): ${result.halfKellyPercent}% (${sym}${result.halfKellyCapital.toLocaleString()})
• Quarter Kelly (Ultra Safe): ${result.quarterKellyPercent}% (${sym}${result.quarterKellyCapital.toLocaleString()})
• Expected Log Growth Rate: ${result.expectedGrowthRate}%
• Risk Status: ${result.riskCategory}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setWinRatePercent(55);
    setWinLossRatio(1.8);
    setAccountBalance(currency === 'INR' ? 200000 : 25000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              Strategy Edge Parameters
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
              <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                <label htmlFor={winRateId}>Historical Win Rate</label>
                <span className="text-foreground font-semibold">{winRatePercent}%</span>
              </div>
              <input
                id={winRateId}
                type="range"
                min="10"
                max="90"
                step="1"
                value={winRatePercent}
                onChange={(e) => setWinRatePercent(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>10% (Trend)</span>
                <span>50% (Balanced)</span>
                <span>90% (High Prob)</span>
              </div>
            </div>

            <div>
              <label htmlFor={winLossId} className="text-xs font-medium text-muted-foreground block mb-1">
                Win/Loss Ratio (Avg Win ÷ Avg Loss)
              </label>
              <input
                id={winLossId}
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={winLossRatio}
                onChange={(e) => setWinLossRatio(Math.max(0.1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                e.g. 1.8 means your winners are 1.8x larger than your losers
              </span>
            </div>

            <div>
              <label htmlFor={balanceId} className="text-xs font-medium text-muted-foreground block mb-1">
                Trading Account Size ({sym})
              </label>
              <input
                id={balanceId}
                type="number"
                min="1000"
                step="5000"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="p-3 bg-card rounded-lg border border-border/80 text-[11px] text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-primary" />
                Why Half Kelly?
              </div>
              <p>
                Full Kelly maximizes logarithmic account growth, but suffers from extreme drawdowns (often 50%+). Professional traders and quantitative hedge funds typically use <strong>Half Kelly (0.5x)</strong> or <strong>Quarter Kelly (0.25x)</strong> for 75% of the growth with a fraction of the variance.
              </p>
            </div>
          </div>
        </div>

        {/* ── Results Column ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Status Alert Banner */}
          {result.riskCategory === 'NEGATIVE_EDGE' ? (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-rose-500">Negative Expected Value (No Edge)</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  With a {winRatePercent}% win rate and {winLossRatio}:1 payoff ratio, the Kelly formula gives 0% capital allocation. Taking trades under these parameters has negative expectancy.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-emerald-500">Positive Edge Detected</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Your strategy has a mathematically positive expectancy. Expected compounding velocity: ~{result.expectedGrowthRate}% per trade cycle.
                </div>
              </div>
            </div>
          )}

          {/* Three Tier Cards: Half Kelly (Hero), Quarter Kelly, Full Kelly */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Half Kelly (Recommended Hero) */}
            <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 backdrop-blur-sm relative">
              <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider">
                Recommended
              </span>
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Half Kelly (50%)
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {result.halfKellyPercent}%
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {sym}{result.halfKellyCapital.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Optimal risk/growth balance
              </div>
            </div>

            {/* Quarter Kelly */}
            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                Quarter Kelly (25%)
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {result.quarterKellyPercent}%
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {sym}{result.quarterKellyCapital.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Conservative capital shield
              </div>
            </div>

            {/* Full Kelly */}
            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                Full Kelly (100%)
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {result.fullKellyPercent}%
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {sym}{result.fullKellyCapital.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Max theoretical variance
              </div>
            </div>
          </div>

          {/* Sizing Comparison & Copy */}
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Practical Position Sizing Guide</span>
              <button
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border hover:border-primary/50 transition-all bg-background/50"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Analysis'}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Probability of Win (P):</span>
                <span className="font-mono font-semibold text-foreground">{(winRatePercent / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Probability of Loss (Q = 1 - P):</span>
                <span className="font-mono font-semibold text-foreground">{((100 - winRatePercent) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Kelly Edge (b × P - Q):</span>
                <span className={`font-mono font-semibold ${winLossRatio * (winRatePercent / 100) - (1 - winRatePercent / 100) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {(winLossRatio * (winRatePercent / 100) - (1 - winRatePercent / 100)).toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
