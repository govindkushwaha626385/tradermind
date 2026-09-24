// ──────────────────────────────────────────────
// TradeMind — Institutional Equity Curve & Drawdown Matrix (v2.0)
//
// Features:
// - Dual Mode: Cumulative P&L Curve vs Underwater Drawdown % View
// - High-Water Mark (Peak Capital) tracking line
// - Zero Breakeven Reference Line
// - Dynamic Multi-Currency ($ / € / £ / ₹ / ₮) formatting
// - Institutional Metrics Header: Current Equity, Peak P&L, Max Drawdown
// - Rich Multi-Data Tooltip with daily change delta (Δ)
// ──────────────────────────────────────────────

'use client';

import React, { memo, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Award,
  Activity,
  Layers,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

export interface EquityPoint {
  /** Date label (e.g. "2026-09-19") */
  date: string;
  /** Cumulative P&L at this point */
  cumulativePnl: number;
  /** Number of trades completed up to this point */
  trades: number;
}

interface EquityCurveProps {
  /** Array of equity curve data points, sorted by date ascending. */
  data: EquityPoint[];
  /** Height of the chart in pixels (default: 300). Responsive override via className. */
  height?: number;
  /** Extra wrapper className for height control */
  className?: string;
  /** Override currency if provided */
  currency?: string;
}

type ViewMode = 'cumulative' | 'drawdown';

/**
 * Custom tooltip for the equity curve.
 */
function EquityTooltip({
  active,
  payload,
  label,
  currency,
  mode,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  currency: string;
  mode: ViewMode;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload as EquityPoint & {
    highWaterMark: number;
    drawdownPct: number;
    drawdownAmount: number;
    dailyChange: number;
  };
  const isPositive = item.cumulativePnl >= 0;

  return (
    <div className="glass-card rounded-xl p-3.5 text-xs shadow-xl border border-border/80 bg-background/95 backdrop-blur-md min-w-[200px] space-y-2">
      <div className="flex items-center justify-between border-b border-border/50 pb-1.5 text-muted-foreground font-mono">
        <span className="flex items-center gap-1 font-sans font-medium text-foreground">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          {item.date}
        </span>
        <span>{item.trades} trades</span>
      </div>

      <div className="space-y-1 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-sans text-[11px]">Cumulative P&L:</span>
          <strong className={isPositive ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
            {isPositive ? '+' : ''}
            {formatCurrency(item.cumulativePnl, currency)}
          </strong>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-sans text-[11px]">Daily Change (Δ):</span>
          <span className={item.dailyChange >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {item.dailyChange >= 0 ? '+' : ''}
            {formatCurrency(item.dailyChange, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-sans text-[11px]">Peak Capital:</span>
          <span className="text-amber-400 font-semibold">
            {formatCurrency(item.highWaterMark, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-sans text-[11px]">Drawdown from Peak:</span>
          <span className={item.drawdownAmount < 0 ? 'text-rose-400 font-semibold' : 'text-muted-foreground'}>
            {item.drawdownAmount < 0
              ? `${item.drawdownPct.toFixed(1)}% (${formatCurrency(item.drawdownAmount, currency)})`
              : '0.0% (At Peak)'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Institutional Equity Curve with Cumulative PnL, Underwater Drawdown, and Peak High-Water Mark.
 */
export const EquityCurve = memo(function EquityCurve({
  data,
  height = 300,
  className,
  currency: currencyProp,
}: EquityCurveProps) {
  const { currency: globalCurrency } = useCurrency();
  const currency = currencyProp || globalCurrency;

  const [mode, setMode] = useState<ViewMode>('cumulative');
  const [showPeakLine, setShowPeakLine] = useState(true);

  // Compute High-Water Mark and Drawdowns
  const enrichedData = useMemo(() => {
    let peak = -Infinity;
    return data.map((pt, idx) => {
      if (pt.cumulativePnl > peak) peak = pt.cumulativePnl;
      const drawdownAmount = pt.cumulativePnl - peak;
      const drawdownPct = peak > 0 ? (drawdownAmount / peak) * 100 : (drawdownAmount < 0 ? -100 : 0);
      const prevPnl = idx > 0 ? data[idx - 1]!.cumulativePnl : 0;
      const dailyChange = pt.cumulativePnl - prevPnl;

      return {
        ...pt,
        highWaterMark: peak,
        drawdownAmount,
        drawdownPct: Number(drawdownPct.toFixed(2)),
        dailyChange,
      };
    });
  }, [data]);

  // Key Institutional Performance Metrics
  const summaryMetrics = useMemo(() => {
    if (enrichedData.length === 0) {
      return { currentPnl: 0, peakPnl: 0, maxDrawdownAmount: 0, maxDrawdownPct: 0 };
    }
    const currentPnl = enrichedData[enrichedData.length - 1]!.cumulativePnl;
    const peakPnl = Math.max(...enrichedData.map((d) => d.highWaterMark), 0);
    const maxDrawdownAmount = Math.min(...enrichedData.map((d) => d.drawdownAmount), 0);
    const maxDrawdownPct = Math.min(...enrichedData.map((d) => d.drawdownPct), 0);

    return {
      currentPnl,
      peakPnl,
      maxDrawdownAmount,
      maxDrawdownPct,
    };
  }, [enrichedData]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm space-y-2 border border-dashed border-border/60 rounded-2xl p-6 bg-muted/10">
        <Activity className="w-8 h-8 text-muted-foreground/50 animate-pulse" />
        <p className="font-medium text-foreground">No equity history available yet</p>
        <p className="text-xs text-muted-foreground">Log or sync your trades to begin tracking your institutional equity curve.</p>
      </div>
    );
  }

  const isOverallPositive = summaryMetrics.currentPnl >= 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Chart Header Bar: Quick Stats & View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        {/* Core Stats Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/60 text-xs">
            <span className="text-muted-foreground text-[11px]">Current:</span>
            <strong className={isOverallPositive ? 'text-emerald-500 font-mono font-bold' : 'text-rose-500 font-mono font-bold'}>
              {isOverallPositive ? '+' : ''}{formatCurrency(summaryMetrics.currentPnl, currency)}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/60 text-xs">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-muted-foreground text-[11px]">Peak:</span>
            <strong className="text-foreground font-mono font-bold">
              {formatCurrency(summaryMetrics.peakPnl, currency)}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/60 text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-muted-foreground text-[11px]">Max DD:</span>
            <strong className="text-rose-400 font-mono font-bold">
              {summaryMetrics.maxDrawdownPct.toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl p-0.5 bg-muted/60 border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setMode('cumulative')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all text-xs',
                mode === 'cumulative'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>Equity P&L</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('drawdown')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all text-xs',
                mode === 'drawdown'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <TrendingDown className="w-3 h-3 text-rose-500" />
              <span>Underwater DD%</span>
            </button>
          </div>

          {/* Peak line toggle */}
          {mode === 'cumulative' && (
            <button
              type="button"
              onClick={() => setShowPeakLine((v) => !v)}
              className={cn(
                'hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors',
                showPeakLine
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground',
              )}
              title="Toggle All-Time High Water Mark line"
            >
              <Layers className="w-3 h-3" />
              <span>Peak Line</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={enrichedData} margin={{ top: 12, right: 10, bottom: 0, left: 10 }}>
            <defs>
              {/* Cumulative PnL Gradient */}
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isOverallPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor={isOverallPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0.0}
                />
              </linearGradient>

              {/* Drawdown Underwater Gradient */}
              <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />

            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => {
                if (mode === 'drawdown') return `${value.toFixed(0)}%`;
                return formatCurrency(value, currency).replace('.00', '');
              }}
              width={75}
            />

            <Tooltip content={<EquityTooltip currency={currency} mode={mode} />} />

            {/* Zero Baseline Breakeven Line */}
            <ReferenceLine
              y={0}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            {mode === 'cumulative' ? (
              <>
                {/* High-Water Mark Peak Reference Line */}
                {showPeakLine && (
                  <Line
                    type="stepAfter"
                    dataKey="highWaterMark"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    name="Peak Capital"
                  />
                )}

                {/* Cumulative PnL Curve */}
                <Area
                  type="monotone"
                  dataKey="cumulativePnl"
                  stroke={isOverallPositive ? '#10b981' : '#ef4444'}
                  strokeWidth={2.5}
                  fill="url(#equityGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: isOverallPositive ? '#10b981' : '#ef4444', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </>
            ) : (
              /* Underwater Drawdown Area */
              <Area
                type="monotone"
                dataKey="drawdownPct"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#drawdownGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});