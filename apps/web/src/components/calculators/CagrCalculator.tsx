// ──────────────────────────────────────────────
// TradeMind — CAGR (Compound Annual Growth Rate) Calculator
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo, useId } from 'react';
import {
  BarChart2,
  TrendingUp,
  RotateCcw,
  Copy,
  Check,
  Calendar,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { calculateCagr } from './engine/financialMath';
import { getCalculatorCurrencySymbol, type Currency } from './types';

interface CagrCalculatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function CagrCalculator({ currency, onCopySummary }: CagrCalculatorProps) {
  const sym = getCalculatorCurrencySymbol(currency);
  const initialValId = useId();
  const finalValId = useId();
  const yearsId = useId();

  const [initialValue, setInitialValue] = useState<number>(currency === 'INR' ? 100000 : 10000);
  const [finalValue, setFinalValue] = useState<number>(currency === 'INR' ? 250000 : 25000);
  const [durationYears, setDurationYears] = useState<number>(5);
  const [copied, setCopied] = useState<boolean>(false);

  const result = useMemo(() => {
    return calculateCagr({
      initialValue,
      finalValue,
      durationYears,
    });
  }, [initialValue, finalValue, durationYears]);

  const handleCopy = () => {
    const summary = `📈 TradeMind CAGR Growth Analysis:
• Initial Investment: ${sym}${initialValue.toLocaleString()}
• Final Portfolio Value: ${sym}${finalValue.toLocaleString()}
• Duration: ${durationYears} Years
• CAGR (Annual Compounded Growth): ${result.cagrPercent}%
• Absolute Return: ${result.absoluteReturnPercent}% (+${sym}${result.totalGain.toLocaleString()})
• Gain Multiplier: ${(finalValue / Math.max(1, initialValue)).toFixed(2)}x`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setInitialValue(currency === 'INR' ? 100000 : 10000);
    setFinalValue(currency === 'INR' ? 250000 : 25000);
    setDurationYears(5);
  };

  // SVG Chart points
  const svgWidth = 500;
  const svgHeight = 160;
  const padding = { top: 15, right: 25, bottom: 25, left: 50 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const points = result.yearlyProgression.map((item, idx) => {
    const x = padding.left + (idx / Math.max(1, result.yearlyProgression.length - 1)) * plotWidth;
    const maxVal = Math.max(finalValue, initialValue * 1.2, 1);
    const minVal = Math.min(initialValue, finalValue) * 0.9;
    const y = padding.top + ((maxVal - item.value) / (maxVal - minVal || 1)) * plotHeight;
    return `${x},${y}`;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-500" />
              CAGR Parameters
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
              <label htmlFor={initialValId} className="text-xs font-medium text-muted-foreground block mb-1">
                Beginning Value ({sym})
              </label>
              <input
                id={initialValId}
                type="number"
                min="1"
                step="1000"
                value={initialValue}
                onChange={(e) => setInitialValue(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor={finalValId} className="text-xs font-medium text-muted-foreground block mb-1">
                Ending Value ({sym})
              </label>
              <input
                id={finalValId}
                type="number"
                min="1"
                step="1000"
                value={finalValue}
                onChange={(e) => setFinalValue(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                <label htmlFor={yearsId}>Investment Horizon</label>
                <span className="text-foreground font-semibold">{durationYears} {durationYears === 1 ? 'Year' : 'Years'}</span>
              </div>
              <input
                id={yearsId}
                type="range"
                min="1"
                max="25"
                step="1"
                value={durationYears}
                onChange={(e) => setDurationYears(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>1 Year</span>
                <span>5 Yrs</span>
                <span>10 Yrs</span>
                <span>25 Yrs</span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="pt-2 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground block mb-1.5 font-medium">Quick Presets</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '2x in 5Y', init: 100000, fin: 200000, y: 5 },
                  { label: '3x in 7Y', init: 100000, fin: 300000, y: 7 },
                  { label: '10x in 10Y', init: 100000, fin: 1000000, y: 10 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setInitialValue(currency === 'INR' ? preset.init : preset.init / 10);
                      setFinalValue(currency === 'INR' ? preset.fin : preset.fin / 10);
                      setDurationYears(preset.y);
                    }}
                    className="px-2 py-1.5 rounded-md border border-border/70 hover:border-primary/50 text-[11px] bg-background/50 text-muted-foreground hover:text-foreground transition-all text-center"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Results Column ── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                CAGR (Annualized)
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {result.cagrPercent}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Per year geometric mean
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                Absolute Return
              </div>
              <div className={`text-2xl font-bold mt-1 ${result.absoluteReturnPercent >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                {result.absoluteReturnPercent}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {result.totalGain >= 0 ? `+${sym}${result.totalGain.toLocaleString()}` : `-${sym}${Math.abs(result.totalGain).toLocaleString()}`}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                Capital Multiplier
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {(finalValue / Math.max(1, initialValue)).toFixed(2)}x
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                From beginning principal
              </div>
            </div>
          </div>

          {/* SVG Trajectory Chart */}
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Portfolio Trajectory Curve</span>
              <button
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border hover:border-primary/50 transition-all bg-background/50"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Analysis'}
              </button>
            </div>

            <div className="w-full overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-36">
                <defs>
                  <linearGradient id="cagrGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal Grid lines */}
                {[0.2, 0.5, 0.8].map((ratio, i) => (
                  <line
                    key={i}
                    x1={padding.left}
                    y1={padding.top + plotHeight * ratio}
                    x2={svgWidth - padding.right}
                    y2={padding.top + plotHeight * ratio}
                    stroke="currentColor"
                    strokeOpacity="0.08"
                    strokeDasharray="4 4"
                  />
                ))}
                {/* Area fill */}
                {points.length > 1 && (
                  <polygon
                    points={`${padding.left},${svgHeight - padding.bottom} ${points.join(' ')} ${svgWidth - padding.right},${svgHeight - padding.bottom}`}
                    fill="url(#cagrGradient)"
                  />
                )}
                {/* Line */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points.join(' ')}
                />
                {/* Dots */}
                {points.map((pt, i) => {
                  const [px, py] = pt.split(',').map(Number);
                  return (
                    <circle
                      key={i}
                      cx={px}
                      cy={py}
                      r="3.5"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Year-by-Year Schedule Table */}
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm max-h-48 overflow-y-auto">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Annual Progression Breakdown
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="pb-1.5 font-medium">Year</th>
                    <th className="pb-1.5 font-medium">Portfolio Value</th>
                    <th className="pb-1.5 font-medium">Total Profit</th>
                    <th className="pb-1.5 font-medium">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {result.yearlyProgression.map((row) => (
                    <tr key={row.year} className="hover:bg-muted/30 transition-colors">
                      <td className="py-1.5 text-muted-foreground font-mono">
                        {row.year === 0 ? 'Start' : `Year ${row.year}`}
                      </td>
                      <td className="py-1.5 font-semibold text-foreground">
                        {sym}{row.value.toLocaleString()}
                      </td>
                      <td className="py-1.5 text-emerald-600 dark:text-emerald-400">
                        +{sym}{row.gain.toLocaleString()}
                      </td>
                      <td className="py-1.5 text-muted-foreground">
                        {row.year === 0 ? '-' : `+${(((row.value - initialValue) / initialValue) * 100).toFixed(1)}%`}
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
