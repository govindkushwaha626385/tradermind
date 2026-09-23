// ──────────────────────────────────────────────
// TradeMind — Compounding & Account Growth Simulator
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo, useId } from 'react';
import {
  TrendingUp,
  RotateCcw,
  Copy,
  Check,
  Calendar,
  Sparkles,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { simulateCompounding } from './engine/financialMath';
import type { Currency } from './types';

interface CompoundingSimulatorProps {
  currency: Currency;
  onCopySummary?: (text: string) => void;
}

export function CompoundingSimulator({ currency, onCopySummary }: CompoundingSimulatorProps) {
  const sym = currency === 'INR' ? '₹' : '$';
  const initialCapId = useId();
  const rateId = useId();
  const periodsId = useId();
  const addId = useId();

  const [initialCapital, setInitialCapital] = useState<number>(currency === 'INR' ? 100000 : 10000);
  const [returnRate, setReturnRate] = useState<number>(3.0); // 3% per period
  const [periodType, setPeriodType] = useState<'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'>('MONTHS');
  const [totalPeriods, setTotalPeriods] = useState<number>(12); // 12 periods
  const [periodicAddition, setPeriodicAddition] = useState<number>(currency === 'INR' ? 10000 : 500);
  const [copied, setCopied] = useState<boolean>(false);

  const result = useMemo(() => {
    return simulateCompounding({
      initialCapital,
      returnRatePercent: returnRate,
      periodType,
      totalPeriods,
      periodicAddition,
    });
  }, [initialCapital, returnRate, periodType, totalPeriods, periodicAddition]);

  // SVG Chart dimensions
  const svgWidth = 600;
  const svgHeight = 200;
  const padding = { top: 20, right: 30, bottom: 25, left: 60 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const maxVal = Math.max(result.finalBalance, initialCapital * 1.2, 100);
  const minVal = initialCapital * 0.9;

  const points = result.schedule.map((item, idx) => {
    const x = padding.left + (idx / Math.max(1, result.schedule.length - 1)) * plotWidth;
    const y = padding.top + ((maxVal - item.endBalance) / (maxVal - minVal || 1)) * plotHeight;
    return `${x},${y}`;
  });

  const polylineStr = points.join(' ');

  const handleCopy = () => {
    const summary = `📈 TradeMind Wealth Compounding Projection:
• Initial Capital: ${sym}${initialCapital.toLocaleString()}
• Return: ${returnRate}% per ${periodType.toLowerCase().slice(0, -1)} across ${totalPeriods} periods
• Periodic Addition: ${sym}${periodicAddition.toLocaleString()}
• Total Deposited: ${sym}${result.totalDeposited.toLocaleString()}
• Total Profit Generated: +${sym}${result.totalProfit.toLocaleString()} (${result.overallRoiPercent}% ROI)
• Projected Final Balance: ${sym}${result.finalBalance.toLocaleString()}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopySummary?.(summary);
  };

  const handleReset = () => {
    setInitialCapital(currency === 'INR' ? 100000 : 10000);
    setReturnRate(3.0);
    setPeriodType('MONTHS');
    setTotalPeriods(12);
    setPeriodicAddition(currency === 'INR' ? 10000 : 500);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Inputs Column ── */}
        <div className="lg:col-span-5 space-y-4 bg-card/60 backdrop-blur-sm p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Compounding Parameters
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

          {/* Initial Capital */}
          <div>
            <label htmlFor={initialCapId} className="text-xs font-medium text-muted-foreground block mb-1">
              Starting Capital ({sym})
            </label>
            <input
              id={initialCapId}
              type="number"
              min={1}
              value={initialCapital}
              onChange={(e) => setInitialCapital(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>

          {/* Period Frequency Toggle */}
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1">Frequency</span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'DAYS', label: 'Daily' },
                { id: 'WEEKS', label: 'Weekly' },
                { id: 'MONTHS', label: 'Monthly' },
                { id: 'YEARS', label: 'Annual' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodType(p.id as any)}
                  className={`py-1.5 text-xs font-semibold rounded-md border transition-all ${
                    periodType === p.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Return Rate % */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={rateId} className="text-xs font-medium text-muted-foreground">
                Return Rate per Period (%)
              </label>
              <span className="text-xs font-bold text-foreground">{returnRate}%</span>
            </div>
            <div className="flex gap-2 mb-2">
              {[1, 2, 3, 5, 10].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReturnRate(r)}
                  className={`flex-1 py-1 text-xs rounded border transition-colors ${
                    returnRate === r
                      ? 'bg-primary text-primary-foreground font-semibold border-primary'
                      : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
            <input
              id={rateId}
              type="number"
              step="0.1"
              value={returnRate}
              onChange={(e) => setReturnRate(Math.max(0.1, Number(e.target.value)))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>

          {/* Number of Periods */}
          <div>
            <label htmlFor={periodsId} className="text-xs font-medium text-muted-foreground block mb-1">
              Number of {periodType.toLowerCase()}
            </label>
            <input
              id={periodsId}
              type="number"
              min={1}
              max={120}
              value={totalPeriods}
              onChange={(e) => setTotalPeriods(Math.max(1, Math.min(120, Number(e.target.value))))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>

          {/* Periodic Cash Addition */}
          <div>
            <label htmlFor={addId} className="text-xs font-medium text-muted-foreground block mb-1">
              Additional Deposit per {periodType.toLowerCase().slice(0, -1)} ({sym})
            </label>
            <input
              id={addId}
              type="number"
              min={0}
              value={periodicAddition}
              onChange={(e) => setPeriodicAddition(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-input"
            />
          </div>
        </div>

        {/* ── Outputs Column ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Hero Card */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-600/10 via-card to-blue-600/10 border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-500">
                Future Projected Balance
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
                {sym}{result.finalBalance.toLocaleString()}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                +{result.overallRoiPercent}% ROI
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-card/60 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Total Profits Generated</span>
                <span className="text-base font-bold text-emerald-500">
                  +{sym}{result.totalProfit.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card/60 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Total Capital Deposited</span>
                <span className="text-base font-bold text-foreground">
                  {sym}{result.totalDeposited.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Growth Projection Chart */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Compounding Trajectory Curve
            </span>

            <div className="w-full overflow-hidden bg-background/50 rounded-lg p-2 border border-border/40">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto text-muted-foreground">
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  points={polylineStr}
                />
                <text x={padding.left} y={svgHeight - 8} fontSize="10" fill="currentColor">
                  Period 1
                </text>
                <text x={svgWidth - padding.right} y={svgHeight - 8} fontSize="10" textAnchor="end" fill="currentColor">
                  Period {totalPeriods}
                </text>
                <text x={padding.left - 5} y={padding.top + 8} fontSize="10" textAnchor="end" fill="currentColor">
                  {sym}{Math.round(maxVal).toLocaleString()}
                </text>
              </svg>
            </div>
          </div>

          {/* Mini Amortization Table */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-2 max-h-56 overflow-y-auto">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Period Milestones
            </span>
            <div className="space-y-1 text-xs">
              {result.schedule.slice(0, 12).map((item) => (
                <div key={item.period} className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Period {item.period}:</span>
                  <span className="font-mono font-semibold text-foreground">{sym}{item.endBalance.toLocaleString()}</span>
                  <span className="text-emerald-500 font-mono text-[11px]">(+{sym}{item.interestEarned.toLocaleString()})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
