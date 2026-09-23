// ──────────────────────────────────────────────
// TradeMind — What-If Behavioral Simulator
// Eliminate emotions/mistakes and see how
// your P&L and win rate would have changed.
// ──────────────────────────────────────────────

'use client';

import { useState } from 'react';
import {
  Zap,
  Brain,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

const EMOTION_PRESETS = [
  'FOMO', 'FEAR', 'GREED', 'REVENGE', 'OVERCONFIDENCE',
  'ANXIETY', 'BOREDOM', 'FRUSTRATION', 'EXCITEMENT', 'HESITATION',
];

const MISTAKE_PRESETS = [
  'EARLY_EXIT', 'LATE_ENTRY', 'OVERSIZE', 'NO_STOP_LOSS',
  'MOVED_STOP', 'CHASED_TRADE', 'BROKE_RULES', 'AVERAGED_DOWN',
  'FOMO_ENTRY', 'EMOTIONAL_EXIT',
];

interface WhatIfResult {
  original: {
    totalTrades: number;
    netPnl: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
  };
  adjusted: {
    totalTrades: number;
    netPnl: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    capitalSaved: number;
    eliminatedTradesCount: number;
  };
  eliminatedEmotions: string[];
  eliminatedMistakes: string[];
  curveComparison: Array<{
    tradeIndex: number;
    date: string;
    actualCumulativePnl: number;
    adjustedCumulativePnl: number;
  }>;
}

function MiniLineChart({ data, colorClass }: {
  data: number[];
  colorClass: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 200;
  const H = 60;
  const points = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - min) / range) * H,
  ]);
  const pathD = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
      <path d={pathD} fill="none" className={colorClass} strokeWidth={2} />
    </svg>
  );
}

export function WhatIfSimulator() {
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [customEmotion, setCustomEmotion] = useState('');
  const [customMistake, setCustomMistake] = useState('');
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleEmotion = (e: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  };

  const toggleMistake = (m: string) => {
    setSelectedMistakes((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const addCustom = (type: 'emotion' | 'mistake') => {
    if (type === 'emotion' && customEmotion.trim()) {
      const val = customEmotion.trim().toUpperCase().replace(/\s+/g, '_');
      if (!selectedEmotions.includes(val)) setSelectedEmotions((prev) => [...prev, val]);
      setCustomEmotion('');
    }
    if (type === 'mistake' && customMistake.trim()) {
      const val = customMistake.trim().toUpperCase().replace(/\s+/g, '_');
      if (!selectedMistakes.includes(val)) setSelectedMistakes((prev) => [...prev, val]);
      setCustomMistake('');
    }
  };

  const runSimulation = async () => {
    if (selectedEmotions.length === 0 && selectedMistakes.length === 0) {
      toast.error('Select at least one emotion or mistake to eliminate');
      return;
    }
    setLoading(true);
    try {
      const res = await api.getWhatIfSimulation({
        emotions: selectedEmotions.join(','),
        mistakes: selectedMistakes.join(','),
      });
      if (res.success) {
        setResult(res.data as WhatIfResult);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedEmotions([]);
    setSelectedMistakes([]);
    setResult(null);
  };

  const actualCurve = result?.curveComparison.map((p) => p.actualCumulativePnl) ?? [];
  const adjustedCurve = result?.curveComparison.map((p) => p.adjustedCumulativePnl) ?? [];

  const pnlImprovement = result
    ? result.adjusted.netPnl - result.original.netPnl
    : 0;
  const winRateImprovement = result
    ? result.adjusted.winRate - result.original.winRate
    : 0;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="font-bold">What-If Simulator</h2>
            <p className="text-xs text-muted-foreground">
              Eliminate behavioral mistakes and see your true potential
            </p>
          </div>
        </div>
        {result && (
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {!result ? (
        <>
          {/* Emotion Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Emotions to Eliminate
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EMOTION_PRESETS.map((e) => (
                <button
                  key={e}
                  onClick={() => toggleEmotion(e)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    selectedEmotions.includes(e)
                      ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/30'
                      : 'bg-accent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            {/* Custom Emotion */}
            <div className="flex gap-2">
              <input
                value={customEmotion}
                onChange={(e) => setCustomEmotion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom('emotion')}
                placeholder="Custom emotion..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-accent border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => addCustom('emotion')}
                className="p-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-600 dark:text-violet-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mistake Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mistakes to Eliminate
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MISTAKE_PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMistake(m)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    selectedMistakes.includes(m)
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                      : 'bg-accent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            {/* Custom Mistake */}
            <div className="flex gap-2">
              <input
                value={customMistake}
                onChange={(e) => setCustomMistake(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom('mistake')}
                placeholder="Custom mistake..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-accent border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => addCustom('mistake')}
                className="p-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-600 dark:text-orange-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Selected Summary */}
          {(selectedEmotions.length > 0 || selectedMistakes.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {selectedEmotions.map((e) => (
                <span key={e} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  {e}
                  <button onClick={() => toggleEmotion(e)}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
              {selectedMistakes.map((m) => (
                <span key={m} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  {m.replace(/_/g, ' ')}
                  <button onClick={() => toggleMistake(m)}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          )}

          {/* Run Button */}
          <button
            onClick={runSimulation}
            disabled={loading || (selectedEmotions.length === 0 && selectedMistakes.length === 0)}
            className={cn(
              'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
              'bg-gradient-to-r from-violet-600 to-purple-600 text-white',
              'hover:from-violet-500 hover:to-purple-500 shadow-sm shadow-violet-500/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              loading && 'animate-pulse',
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Simulating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Run Simulation
              </span>
            )}
          </button>
        </>
      ) : (
        /* Results Panel */
        <div className="space-y-4">
          {/* Eliminated Tags */}
          <div className="flex flex-wrap gap-1.5">
            {result.eliminatedEmotions.map((e) => (
              <span key={e} className="px-2 py-0.5 rounded-full text-[11px] bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                {e}
              </span>
            ))}
            {result.eliminatedMistakes.map((m) => (
              <span key={m} className="px-2 py-0.5 rounded-full text-[11px] bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                {m.replace(/_/g, ' ')}
              </span>
            ))}
          </div>

          {/* Key Impact Banner */}
          <div className={cn(
            'rounded-xl p-3.5 flex items-center gap-3 border',
            pnlImprovement > 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300',
          )}>
            {pnlImprovement > 0
              ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <div>
              <div className="font-bold text-sm">
                {pnlImprovement > 0
                  ? `You would have saved ${formatCurrency(result.adjusted.capitalSaved)}`
                  : `These trades were not clearly hurting P&L`}
              </div>
              <div className="text-xs opacity-80">
                {result.adjusted.eliminatedTradesCount} trades eliminated •{' '}
                {result.adjusted.totalTrades} trades analyzed
              </div>
            </div>
          </div>

          {/* Comparison Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: 'Net P&L',
                actual: formatCurrency(result.original.netPnl),
                adjusted: formatCurrency(result.adjusted.netPnl),
                positive: result.adjusted.netPnl > result.original.netPnl,
                icon: TrendingUp,
              },
              {
                label: 'Win Rate',
                actual: `${(result.original.winRate * 100).toFixed(1)}%`,
                adjusted: `${(result.adjusted.winRate * 100).toFixed(1)}%`,
                positive: result.adjusted.winRate > result.original.winRate,
                icon: TrendingDown,
              },
              {
                label: 'Profit Factor',
                actual: result.original.profitFactor.toFixed(2),
                adjusted: result.adjusted.profitFactor.toFixed(2),
                positive: result.adjusted.profitFactor > result.original.profitFactor,
                icon: Zap,
              },
              {
                label: 'Max Drawdown',
                actual: `${result.original.maxDrawdown.toFixed(1)}%`,
                adjusted: `${result.adjusted.maxDrawdown.toFixed(1)}%`,
                positive: result.adjusted.maxDrawdown < result.original.maxDrawdown,
                icon: Brain,
              },
            ].map((row) => (
              <div key={row.label} className="bg-accent/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <row.icon className="w-3 h-3" />
                  {row.label}
                </div>
                <div className="flex items-end gap-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Actual</div>
                    <div className="font-bold text-sm text-foreground">{row.actual}</div>
                  </div>
                  <div className="text-muted-foreground text-xs">→</div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Adjusted</div>
                    <div className={cn('font-bold text-sm', row.positive ? 'text-emerald-500' : 'text-red-500')}>
                      {row.adjusted}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mini Equity Curves */}
          {actualCurve.length > 1 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">Equity Curve Comparison</div>
              <div className="relative bg-accent/30 rounded-xl p-3 overflow-hidden">
                <div className="absolute inset-x-3 top-3 bottom-3">
                  <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map((pct) => (
                      <line key={pct} x1={0} y1={pct * 60} x2={200} y2={pct * 60}
                        stroke="currentColor" className="text-border" strokeWidth={0.5} strokeDasharray="4 4" />
                    ))}
                    {/* Actual line */}
                    {(() => {
                      const all = [...actualCurve, ...adjustedCurve];
                      const min = Math.min(...all);
                      const max = Math.max(...all);
                      const range = max - min || 1;
                      const toY = (v: number) => 60 - ((v - min) / range) * 60;
                      const toX = (i: number, total: number) => (i / (total - 1)) * 200;
                      const actualPath = actualCurve.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i, actualCurve.length)},${toY(v)}`).join(' ');
                      const adjPath = adjustedCurve.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i, adjustedCurve.length)},${toY(v)}`).join(' ');
                      return (
                        <>
                          <path d={actualPath} fill="none" stroke="#ef4444" strokeWidth={1.5} opacity={0.7} />
                          <path d={adjPath} fill="none" stroke="#22c55e" strokeWidth={2} />
                        </>
                      );
                    })()}
                  </svg>
                </div>
                {/* invisible spacer */}
                <div className="h-16" />
                <div className="flex items-center gap-4 mt-1 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block" />Actual</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" />Adjusted</span>
                </div>
              </div>
            </div>
          )}

          <button onClick={reset} className="w-full py-2 rounded-xl text-xs font-medium border border-border hover:bg-accent transition-colors text-muted-foreground">
            Run New Simulation
          </button>
        </div>
      )}
    </div>
  );
}
