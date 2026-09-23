// ──────────────────────────────────────────────
// TradeMind — Equity Curve Chart
//
// Renders a cumulative P&L equity curve using Recharts.
// Shows the growth of trading capital over time.
// ──────────────────────────────────────────────

'use client';

import { memo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

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
  /** Height of the chart in pixels (default: 260). Responsive override via className. */
  height?: number;
  /** Extra wrapper className for height control */
  className?: string;
}

/**
 * Custom tooltip for the equity curve.
 */
function EquityTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as EquityPoint;
  const isPositive = point.cumulativePnl >= 0;

  return (
    <div className="glass-card rounded-xl px-4 py-3 text-sm space-y-1">
      <div className="text-muted-foreground">{point.date}</div>
      <div className={isPositive ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
        {isPositive ? '+' : ''}{formatCurrency(point.cumulativePnl)}
      </div>
      <div className="text-xs text-muted-foreground">{point.trades} trades</div>
    </div>
  );
}

/**
 * Equity curve area chart showing cumulative P&L over time.
 * Memoized to prevent re-renders when parent updates.
 */
export const EquityCurve = memo(function EquityCurve({ data, height = 260, className }: EquityCurveProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No trade data yet. Connect a broker to see your equity curve.
      </div>
    );
  }

  const isOverallPositive = data[data.length - 1]!.cumulativePnl >= 0;

  return (
    <div style={{ width: '100%', height }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isOverallPositive ? '#22c55e' : '#ef4444'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isOverallPositive ? '#22c55e' : '#ef4444'}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => formatCurrency(value).replace('.00', '')}
            width={80}
          />
          <Tooltip content={<EquityTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulativePnl"
            stroke={isOverallPositive ? '#22c55e' : '#ef4444'}
            strokeWidth={2}
            fill="url(#equityGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});