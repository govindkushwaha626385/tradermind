// ──────────────────────────────────────────────
// TradeMind — Monte Carlo Statistical Simulator
//
// 1,000-run stochastic simulation engine projecting
// equity envelopes, risk of ruin, and drawdown probabilities
// based on the trader's actual win rate and payoff ratio.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useId } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  Sliders,
  RefreshCw,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import type { MonteCarloSimulationResult } from '@trademind/shared';

interface MonteCarloSimulatorProps {
  className?: string;
}

export function MonteCarloSimulator({ className }: MonteCarloSimulatorProps) {
  const [data, setData] = useState<MonteCarloSimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [tradeHorizon, setTradeHorizon] = useState<number>(100);
  const [riskPerTrade, setRiskPerTrade] = useState<number>(1.0);
  const chartGradientId = useId();

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await api.getMonteCarloSimulation({
        tradeHorizon,
        riskPerTradePercent: riskPerTrade,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to run Monte Carlo simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [tradeHorizon, riskPerTrade]);

  if (loading && !data) {
    return (
      <div className={cn('glass-card rounded-2xl p-6 border border-border/50 animate-pulse', className)}>
        <div className="h-6 w-56 bg-accent rounded-lg mb-2" />
        <div className="h-4 w-96 bg-accent/60 rounded-md mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-accent/40 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-accent/30 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const startingCap = data.startingCapital;
  const p5Final = data.percentiles.p5[data.percentiles.p5.length - 1] ?? startingCap;
  const p50Final = data.percentiles.p50[data.percentiles.p50.length - 1] ?? startingCap;
  const p95Final = data.percentiles.p95[data.percentiles.p95.length - 1] ?? startingCap;

  // Build SVG path for percentiles
  const maxVal = Math.max(...data.percentiles.p95, startingCap * 1.2);
  const minVal = Math.max(0, Math.min(...data.percentiles.p5, startingCap * 0.5));
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 220;
  const paddingX = 15;
  const paddingY = 20;

  const getX = (index: number) =>
    paddingX + (index / data.tradeHorizon) * (width - 2 * paddingX);
  const getY = (val: number) =>
    height - paddingY - ((val - minVal) / range) * (height - 2 * paddingY);

  const makePath = (points: number[]) =>
    points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt).toFixed(1)}`)
      .join(' ');

  // Fan envelope: polygon between p95 and p5
  const fanPolygonPoints = [
    ...data.percentiles.p95.map((pt, i) => `${getX(i).toFixed(1)},${getY(pt).toFixed(1)}`),
    ...data.percentiles.p5
      .slice()
      .reverse()
      .map((pt, i) => {
        const revIdx = data.percentiles.p5.length - 1 - i;
        return `${getX(revIdx).toFixed(1)},${getY(pt).toFixed(1)}`;
      }),
  ].join(' ');

  const baselineY = getY(startingCap);

  return (
    <div className={cn('glass-card rounded-2xl p-5 sm:p-6 border border-border/50 space-y-6', className)}>
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              Monte Carlo Statistical Simulator
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              1,000 Stochastic Runs
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simulates 1,000 probable future equity paths using your actual win rate ({Math.round(data.baseline.winRate * 100)}%) and payoff ratio.
          </p>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Horizon Selector */}
          <div className="flex items-center gap-1 bg-accent/40 p-1 rounded-xl border border-border/40 text-xs">
            <span className="text-[11px] text-muted-foreground px-2 font-medium">Trades:</span>
            {[50, 100, 200].map((h) => (
              <button
                key={h}
                onClick={() => setTradeHorizon(h)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-colors',
                  tradeHorizon === h
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {h}
              </button>
            ))}
          </div>

          {/* Risk Per Trade Selector */}
          <div className="flex items-center gap-1 bg-accent/40 p-1 rounded-xl border border-border/40 text-xs">
            <span className="text-[11px] text-muted-foreground px-2 font-medium">Risk/Trade:</span>
            {[0.5, 1.0, 2.0].map((r) => (
              <button
                key={r}
                onClick={() => setRiskPerTrade(r)}
                className={cn(
                  'px-2 py-1 rounded-lg font-semibold transition-colors',
                  riskPerTrade === r
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r}%
              </button>
            ))}
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground border border-border/40 transition-colors"
            title="Re-run 1,000 iterations"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-primary')} />
          </button>
        </div>
      </div>

      {/* Key Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Risk of Ruin */}
        <div
          className={cn(
            'p-3.5 rounded-xl border flex flex-col justify-between',
            data.riskOfRuin > 5
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30',
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Risk of Ruin</span>
            <ShieldAlert
              className={cn(
                'w-4 h-4',
                data.riskOfRuin > 5 ? 'text-rose-400' : 'text-emerald-400',
              )}
            />
          </div>
          <div
            className={cn(
              'text-xl font-bold',
              data.riskOfRuin > 5 ? 'text-rose-400' : 'text-emerald-400',
            )}
          >
            {data.riskOfRuin}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {data.riskOfRuin === 0
              ? 'Near zero probability of 50% drawdown'
              : 'Probability of losing ≥50% capital'}
          </div>
        </div>

        {/* Median Expected Equity */}
        <div className="p-3.5 rounded-xl bg-background/60 border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Median Outcome (50th)</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {formatCurrency(p50Final)}
          </div>
          <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
            {p50Final >= startingCap ? '+' : ''}
            {(((p50Final - startingCap) / startingCap) * 100).toFixed(1)}% expected return
          </div>
        </div>

        {/* Conservative Outcome */}
        <div className="p-3.5 rounded-xl bg-background/60 border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Worst-Case (5th %ile)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">
            {formatCurrency(p55Final(p5Final))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            95% chance equity stays above this
          </div>
        </div>

        {/* Expected Losing Streak */}
        <div className="p-3.5 rounded-xl bg-background/60 border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Max Losing Streak</span>
            <Activity className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {data.maxConsecutiveLosses.worstCase95th}{' '}
            <span className="text-xs font-normal text-muted-foreground">trades</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Median: {data.maxConsecutiveLosses.median} losses in a row
          </div>
        </div>
      </div>

      {/* Main Simulation Fan Chart */}
      <div className="p-4 rounded-xl bg-background/70 border border-border/50 backdrop-blur-sm space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span className="font-semibold text-foreground">
            Projected Equity Envelopes ({tradeHorizon} Trades Ahead)
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> 95th %ile
            </span>
            <span className="flex items-center gap-1 text-primary">
              <span className="w-2.5 h-0.5 bg-primary inline-block" /> 50th Median
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-0.5 bg-rose-400 inline-block" /> 5th %ile
            </span>
          </div>
        </div>

        {/* SVG Visualization */}
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-48 sm:h-56 select-none"
          >
            <defs>
              <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Baseline Capital Line */}
            <line
              x1={paddingX}
              y1={baselineY}
              x2={width - paddingX}
              y2={baselineY}
              stroke="currentColor"
              strokeDasharray="4 4"
              strokeOpacity="0.2"
              strokeWidth="1.5"
            />
            <text
              x={paddingX + 4}
              y={baselineY - 4}
              fontSize="9"
              fill="currentColor"
              opacity="0.4"
            >
              Initial: {formatCurrency(startingCap)}
            </text>

            {/* Shaded confidence fan */}
            <polygon points={fanPolygonPoints} fill={`url(#${chartGradientId})`} />

            {/* 95th Percentile Line */}
            <path
              d={makePath(data.percentiles.p95)}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />

            {/* 75th Percentile Line */}
            <path
              d={makePath(data.percentiles.p75)}
              fill="none"
              stroke="#34d399"
              strokeWidth="1"
              strokeDasharray="2 2"
              strokeOpacity="0.4"
            />

            {/* 50th Percentile (Median) Line */}
            <path
              d={makePath(data.percentiles.p50)}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
            />

            {/* 25th Percentile Line */}
            <path
              d={makePath(data.percentiles.p25)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="2 2"
              strokeOpacity="0.4"
            />

            {/* 5th Percentile Line */}
            <path
              d={makePath(data.percentiles.p5)}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
          </svg>
        </div>
      </div>

      {/* Drawdown Probability Distribution Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Drawdown Probabilities */}
        <div className="p-4 rounded-xl bg-accent/20 border border-border/30 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-primary" />
              Drawdown Exceedance Probabilities
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <DrawdownBar label="> 10% Drawdown" value={data.drawdownProbabilities.gt10Percent} color="bg-amber-400" />
            <DrawdownBar label="> 20% Drawdown" value={data.drawdownProbabilities.gt20Percent} color="bg-orange-400" />
            <DrawdownBar label="> 30% Drawdown" value={data.drawdownProbabilities.gt30Percent} color="bg-rose-400" />
            <DrawdownBar label="> 40% Drawdown" value={data.drawdownProbabilities.gt40Percent} color="bg-red-500" />
          </div>
        </div>

        {/* Statistical Takeaway & Advice */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Info className="w-3.5 h-3.5" />
              Discipline Takeaway
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">
              At {riskPerTrade}% risk per trade, you have a 95% statistical confidence that your maximum losing streak will not exceed{' '}
              <strong className="text-foreground">{data.maxConsecutiveLosses.worstCase95th} trades</strong> over the next {tradeHorizon} executions.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Never size up during a losing streak. Sticking to your {riskPerTrade}% stop limit guarantees account survival even during adverse market regimes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Sampled {data.historicalTradesSampled > 0 ? `${data.historicalTradesSampled} historical closed trades` : 'standard discipline baseline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function p55Final(val: number) {
  return val;
}

function DrawdownBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-accent overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
