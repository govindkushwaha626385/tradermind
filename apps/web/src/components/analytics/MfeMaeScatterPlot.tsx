// ──────────────────────────────────────────────
// TradeMind — MFE / MAE Excursion Scatter Matrix & Hourly Edge (v2.0)
//
// TradesViz & TraderVue flagship institutional feature:
// - Maximum Favorable Excursion (MFE) vs Maximum Adverse Excursion (MAE)
// - Execution Quadrant Analysis (Elite Execution vs Bagholder Traps)
// - Exit Efficiency Score (% of runup captured)
// - Hourly Edge Distribution (Golden Trading Hours vs Chop Bleed)
// ──────────────────────────────────────────────

'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  BarChart,
  Bar,
  Line,
  ComposedChart,
  CartesianGrid,
} from 'recharts';
import {
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  Zap,
  Info,
  Layers,
  Flame,
  Award,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

export interface ExcursionTradePoint {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  realizedPnl: number;
  entryPrice: number;
  exitPrice?: number;
  mfe: number; // Peak favorable runup (price points or currency)
  mae: number; // Max drawdown experienced (price points or currency)
  openedAt: string;
  tradeDurationMin?: number;
}

interface MfeMaeScatterPlotProps {
  trades: ExcursionTradePoint[];
  currency?: string;
}

export function MfeMaeScatterPlot({ trades, currency: currencyProp }: MfeMaeScatterPlotProps) {
  const { currency: globalCurrency, format } = useCurrency();
  const currency = currencyProp || globalCurrency;

  const [filter, setFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');
  const [metricUnit, setMetricUnit] = useState<'amount' | 'pct'>('amount');

  // Filtered scatter points
  const scatterData = useMemo(() => {
    return trades
      .filter((t) => {
        if (filter === 'WINS') return t.realizedPnl > 0;
        if (filter === 'LOSSES') return t.realizedPnl <= 0;
        return true;
      })
      .map((t) => {
        const isWin = t.realizedPnl > 0;
        const entry = t.entryPrice || 100;
        const mfeVal = metricUnit === 'pct' ? (t.mfe / entry) * 100 : t.mfe;
        const maeVal = metricUnit === 'pct' ? (t.mae / entry) * 100 : t.mae;

        // Exit efficiency = realized profit / peak potential profit (MFE)
        const exitEfficiency =
          t.mfe > 0 && isWin ? Math.min(100, Math.max(0, (t.realizedPnl / (t.mfe * (t.entryPrice > 0 ? 1 : 1))) * 100)) : 0;

        return {
          id: t.id,
          symbol: t.symbol,
          direction: t.direction,
          realizedPnl: t.realizedPnl,
          mfe: Number(mfeVal.toFixed(2)),
          mae: Number(maeVal.toFixed(2)),
          isWin,
          exitEfficiency: Math.round(exitEfficiency),
          openedAt: t.openedAt,
        };
      });
  }, [trades, filter, metricUnit]);

  // Hourly edge distribution (09:00 to 16:00)
  const hourlyData = useMemo(() => {
    const hoursMap: Record<number, { trades: number; wins: number; totalPnl: number }> = {};
    for (let h = 9; h <= 15; h++) {
      hoursMap[h] = { trades: 0, wins: 0, totalPnl: 0 };
    }

    trades.forEach((t) => {
      const d = new Date(t.openedAt);
      const h = d.getHours();
      if (hoursMap[h]) {
        hoursMap[h].trades += 1;
        if (t.realizedPnl > 0) hoursMap[h].wins += 1;
        hoursMap[h].totalPnl += t.realizedPnl;
      }
    });

    return Object.entries(hoursMap).map(([hStr, data]) => {
      const h = Number(hStr);
      const label = `${h.toString().padStart(2, '0')}:00`;
      const winRate = data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0;
      return {
        hour: label,
        trades: data.trades,
        winRate,
        pnl: Math.round(data.totalPnl),
      };
    });
  }, [trades]);

  // Calculate highest edge hour
  const bestHour = useMemo(() => {
    const valid = hourlyData.filter((h) => h.trades >= 2);
    if (valid.length === 0) return null;
    return [...valid].sort((a, b) => b.pnl - a.pnl)[0];
  }, [hourlyData]);

  // Max axis bounds for symmetry
  const maxMfe = Math.max(...scatterData.map((d) => d.mfe), 10);
  const maxMae = Math.max(...scatterData.map((d) => d.mae), 10);
  const axisMax = Math.max(maxMfe, maxMae) * 1.15;

  return (
    <div className="space-y-6">
      {/* ── MFE vs MAE Scatter Section ──── */}
      <div className="glass-card rounded-2xl p-5 border border-border/70 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground tracking-tight">
                  MFE vs. MAE Excursion Matrix
                </h3>
                <p className="text-xs text-muted-foreground">
                  Diagnose whether you take too much heat (MAE) or leave peak profit on the table (MFE)
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-muted/50 p-1 border border-border/60 text-2xs font-semibold">
              {(['ALL', 'WINS', 'LOSSES'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    filter === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center rounded-xl bg-muted/50 p-1 border border-border/60 text-2xs font-semibold">
              <button
                onClick={() => setMetricUnit('amount')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  metricUnit === 'amount'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                P&L
              </button>
              <button
                onClick={() => setMetricUnit('pct')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  metricUnit === 'pct'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                %
              </button>
            </div>
          </div>
        </div>

        {/* Quadrant Legend & Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4 text-xs">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-400">
              <Award className="w-3.5 h-3.5" />
              <span>Elite Execution</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-0.5">
              High MFE, Low MAE. Minimal heat taken before reaching target.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
            <div className="font-bold flex items-center gap-1.5 text-xs text-blue-400">
              <Activity className="w-3.5 h-3.5" />
              <span>Rollercoaster</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-0.5">
              High MFE, High MAE. Endured large drawdowns before recovering.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <div className="font-bold flex items-center gap-1.5 text-xs text-amber-400">
              <Zap className="w-3.5 h-3.5" />
              <span>Left On Table</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-0.5">
              High MFE but small realized gain. Exited too prematurely.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
            <div className="font-bold flex items-center gap-1.5 text-xs text-rose-400">
              <Flame className="w-3.5 h-3.5" />
              <span>Bagholder Trap</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-0.5">
              High MAE, Low MFE. Trade never worked; held into deep loss.
            </p>
          </div>
        </div>

        {/* 2D Scatter Chart Viewport */}
        <div className="h-[380px] w-full pt-2">
          {scatterData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Target className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm font-semibold">No excursion trade points</p>
              <p className="text-xs">Log or import closed trades to visualize price excursions.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  dataKey="mae"
                  name="MAE (Adverse Heat)"
                  domain={[0, axisMax]}
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(val) => (metricUnit === 'pct' ? `${val}%` : format(val))}
                  label={{
                    value: 'Max Adverse Excursion (Drawdown Heat) →',
                    position: 'insideBottomRight',
                    offset: -10,
                    fill: '#888',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="mfe"
                  name="MFE (Favorable Runup)"
                  domain={[0, axisMax]}
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(val) => (metricUnit === 'pct' ? `${val}%` : format(val))}
                  label={{
                    value: '↑ Max Favorable Excursion (Runup)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#888',
                    fontSize: 11,
                  }}
                />
                <ZAxis range={[70, 70]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }}
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="glass-card rounded-xl p-3 border border-border shadow-xl backdrop-blur-xl text-xs space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between font-bold">
                          <span>{d.symbol}</span>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-2xs',
                              d.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            )}
                          >
                            {d.direction}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <span className="text-muted-foreground">Realized P&L:</span>
                          <span className={cn('font-bold font-mono', d.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                            {d.realizedPnl >= 0 ? '+' : ''}{format(d.realizedPnl)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Peak Runup (MFE):</span>
                          <span className="font-mono text-emerald-400 font-semibold">
                            +{metricUnit === 'pct' ? `${d.mfe}%` : format(d.mfe)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Deepest Heat (MAE):</span>
                          <span className="font-mono text-rose-400 font-semibold">
                            -{metricUnit === 'pct' ? `${d.mae}%` : format(d.mae)}
                          </span>
                        </div>
                        {d.isWin && d.exitEfficiency > 0 && (
                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-2xs">
                            <span className="text-muted-foreground">Runup Captured:</span>
                            <span className="font-bold text-primary">{d.exitEfficiency}%</span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: axisMax, y: axisMax }]}
                  stroke="rgba(255,255,255,0.2)"
                  strokeDasharray="4 4"
                  label={{ value: '1:1 Ratio', fill: 'rgba(255,255,255,0.4)', fontSize: 10, position: 'insideTopLeft' }}
                />
                <Scatter name="Trades" data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isWin ? '#10b981' : '#f43f5e'}
                      fillOpacity={0.8}
                      stroke={entry.isWin ? '#059669' : '#e11d48'}
                      strokeWidth={1.5}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Hourly Edge & Performance Breakdown ──── */}
      <div className="glass-card rounded-2xl p-5 border border-border/70 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground tracking-tight">
                Hourly Edge Distribution (Market Session Breakdown)
              </h3>
              <p className="text-xs text-muted-foreground">
                Pinpoint your highest edge execution hours vs. low-conviction chop hours
              </p>
            </div>
          </div>

          {bestHour && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-muted-foreground">Peak Edge Window:</span>
              <span className="font-bold text-emerald-300">
                {bestHour.hour} ({bestHour.winRate}% Win Rate, +{format(bestHour.pnl)})
              </span>
            </div>
          )}
        </div>

        {/* Hourly Chart Viewport */}
        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hourlyData} margin={{ top: 15, right: 30, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="hour" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis
                yAxisId="pnl"
                tick={{ fill: '#888', fontSize: 11 }}
                tickFormatter={(val) => format(val)}
                label={{ value: 'Net P&L', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 10 }}
              />
              <YAxis
                yAxisId="rate"
                orientation="right"
                domain={[0, 100]}
                tick={{ fill: '#888', fontSize: 11 }}
                tickFormatter={(val) => `${val}%`}
                label={{ value: 'Win Rate %', angle: 90, position: 'insideRight', fill: '#888', fontSize: 10 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={({ payload, label }) => {
                  if (!payload || !payload[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="glass-card rounded-xl p-3 border border-border shadow-xl backdrop-blur-xl text-xs space-y-1 min-w-[170px]">
                      <div className="font-bold text-foreground">{label} Session Hour</div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Trades Executed:</span>
                        <span className="font-bold text-foreground font-mono">{d.trades}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Win Rate:</span>
                        <span className={cn('font-bold font-mono', d.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400')}>
                          {d.winRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <span className="text-muted-foreground">Net P&L:</span>
                        <span className={cn('font-bold font-mono', d.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {d.pnl >= 0 ? '+' : ''}{format(d.pnl)}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar yAxisId="pnl" dataKey="pnl" radius={[6, 6, 0, 0]}>
                {hourlyData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="winRate"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#6366f1' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
