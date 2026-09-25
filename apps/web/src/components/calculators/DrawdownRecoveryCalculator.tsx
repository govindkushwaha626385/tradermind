// ──────────────────────────────────────────────
// TradeMind — Drawdown Recovery & Ruin Risk Matrix
// ──────────────────────────────────────────────

'use client';

import { useState, useId } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  Copy,
  Check,
  Percent,
  AlertTriangle,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { calculateDrawdownRecovery, calculateConsecutiveLossProbability } from './engine/financialMath';
import { getCalculatorCurrencySymbol, type Currency } from './types';

interface DrawdownRecoveryCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function DrawdownRecoveryCalculator({ currency, onCopySummary }: DrawdownRecoveryCalculatorProps) {
  const sym = getCalculatorCurrencySymbol(currency);
  const drawdownId = useId();
  const winRateId = useId();

  const [drawdown, setDrawdown] = useState<number>(25); // 25% drawdown
  const [winRate, setWinRate] = useState<number>(50);   // 50% win rate
  const [copied, setCopied] = useState<boolean>(false);

  const recoveryNeeded = calculateDrawdownRecovery(drawdown);
  const consecutiveRisks = calculateConsecutiveLossProbability(winRate);

  const handleCopy = () => {
    const summary = `🛡️ TradeMind Capital Preservation & Drawdown Analysis:
• Account Drawdown: -${drawdown}%
• Gain Required to Break Even: +${recoveryNeeded}%
• Win Rate Baseline: ${winRate}%
• 5-Loss Streak Probability: ${consecutiveRisks.find(r => r.streak === 5)?.probabilityPercent}%
• 5 Losses @ 1% Risk: ${consecutiveRisks.find(r => r.streak === 5)?.rem1Pct}% capital intact
• 5 Losses @ 5% Risk: ${consecutiveRisks.find(r => r.streak === 5)?.rem5Pct}% capital intact (Severe drawdown!)`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setDrawdown(25);
    setWinRate(50);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Drawdown & Strategy Stats
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

          {/* Drawdown % Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={drawdownId} className="text-xs font-medium text-muted-foreground">
                Current Portfolio Loss / Drawdown (%)
              </label>
              <span className="text-xs font-bold text-rose-500">-{drawdown}%</span>
            </div>
            <div className="flex gap-2 mb-2">
              {[5, 10, 20, 30, 50, 75].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDrawdown(d)}
                  className={`flex-1 py-1 text-xs rounded border transition-colors ${
                    drawdown === d
                      ? 'bg-rose-500 text-white font-semibold border-rose-500'
                      : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  -{d}%
                </button>
              ))}
            </div>
            <input
              id={drawdownId}
              type="range"
              min="1"
              max="95"
              step="1"
              value={drawdown}
              onChange={(e) => setDrawdown(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          {/* Win Rate % Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={winRateId} className="text-xs font-medium text-muted-foreground">
                Strategy Win Rate (%)
              </label>
              <span className="text-xs font-bold text-foreground">{winRate}%</span>
            </div>
            <div className="flex gap-2 mb-2">
              {[35, 45, 50, 60, 70].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWinRate(w)}
                  className={`flex-1 py-1 text-xs rounded border transition-colors ${
                    winRate === w
                      ? 'bg-primary text-primary-foreground font-semibold border-primary'
                      : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {w}%
                </button>
              ))}
            </div>
            <input
              id={winRateId}
              type="range"
              min="10"
              max="90"
              step="1"
              value={winRate}
              onChange={(e) => setWinRate(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Warning Card */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-400">The Mathematics of Loss</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Losses compound geometrically against you. A 50% loss requires a 100% gain just to get back to zero. An 80% loss requires a 400% gain, which rarely happens without blowing up the rest of the account.
              </p>
            </div>
          </div>
        </div>

        {/* ── Outputs Column ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Recovery Needed Hero */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-rose-600/10 via-card to-amber-600/10 border border-rose-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-rose-500">
                Gain Required to Break Even
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
                +{recoveryNeeded}%
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-500/15 text-rose-500">
                After -{drawdown}% loss
              </span>
            </div>
          </div>

          {/* Consecutive Losses Risk Table */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Consecutive Loss Probabilities & Capital Preserved</span>
              <span className="text-[11px] text-primary">Win Rate: {winRate}%</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="py-2 px-2">Loss Streak</th>
                    <th className="py-2 px-2">Statistical Chance</th>
                    <th className="py-2 px-2">1% Risk/Trade</th>
                    <th className="py-2 px-2">2% Risk/Trade</th>
                    <th className="py-2 px-2">5% Risk/Trade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {consecutiveRisks.map((row) => (
                    <tr key={row.streak} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2 px-2 font-semibold">
                        {row.streak} Losses in a row
                      </td>
                      <td className="py-2 px-2 font-mono text-muted-foreground">
                        {row.probabilityPercent}%
                      </td>
                      <td className="py-2 px-2 font-mono text-emerald-500 font-semibold">
                        {row.rem1Pct}% intact
                      </td>
                      <td className="py-2 px-2 font-mono text-blue-400">
                        {row.rem2Pct}% intact
                      </td>
                      <td className={`py-2 px-2 font-mono font-semibold ${row.rem5Pct < 75 ? 'text-rose-500' : 'text-amber-500'}`}>
                        {row.rem5Pct}% intact
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
