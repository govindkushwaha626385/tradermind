// ──────────────────────────────────────────────
// TradeMind — StatCard Component v2
//
// Premium metric card with:
// - Gradient icon background with hover scale
// - Main value with animated count-up + display font
// - Label + sub-text
// - Optional trend badge (up/down/flat)
// - Optional inline sparkline (7-pt SVG, no deps)
// - Loading skeleton state
// ──────────────────────────────────────────────

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SparklinePoint {
  value: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  /** Tailwind gradient classes e.g. 'from-blue-500 to-violet-500' */
  gradient: string;
  trend?: {
    value: number;      // percentage change
    positive?: boolean; // if undefined, inferred from value sign
    label?: string;     // e.g. 'vs last month'
  };
  /** 7-point sparkline data */
  sparkline?: SparklinePoint[];
  loading?: boolean;
  className?: string;
  valueClassName?: string;
}

// ── Mini inline SVG sparkline (zero dependencies) ──
function Sparkline({ points, positive }: { points: SparklinePoint[]; positive: boolean }) {
  if (!points || points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 64;
  const H = 28;
  const pad = 2;

  const xs = values.map((_, i) => pad + (i / (values.length - 1)) * (W - pad * 2));
  const ys = values.map((v) => H - pad - ((v - min) / range) * (H - pad * 2));

  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const fillD = `${pathD} L ${xs[xs.length - 1].toFixed(1)} ${H} L ${xs[0].toFixed(1)} ${H} Z`;

  const color = positive ? 'hsl(var(--profit))' : 'hsl(var(--loss))';
  const fillColor = positive ? 'hsl(var(--profit) / 0.12)' : 'hsl(var(--loss) / 0.12)';

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      {/* Fill area */}
      <path d={fillD} fill={fillColor} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle
        cx={xs[xs.length - 1].toFixed(1)}
        cy={ys[ys.length - 1].toFixed(1)}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  gradient,
  trend,
  sparkline,
  loading = false,
  className,
  valueClassName,
}: StatCardProps) {
  const isPositive = trend
    ? (trend.positive !== undefined ? trend.positive : trend.value >= 0)
    : null;

  const TrendIcon =
    isPositive === null ? null : trend?.value === 0 ? Minus : isPositive ? TrendingUp : TrendingDown;

  if (loading) {
    return (
      <div className={cn('glass-card rounded-2xl p-5', className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-7 w-32 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'glass-card rounded-2xl p-5 hover:shadow-card-hover transition-all duration-300 group relative overflow-hidden',
        className,
      )}
    >
      {/* Subtle radial bg glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.04),transparent_70%)]" />

      <div className="flex items-start justify-between gap-3 relative">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 leading-none">
            {label}
          </p>
          <p
            className={cn(
              'text-2xl font-bold text-foreground leading-none animate-count-up font-display',
              valueClassName,
            )}
          >
            {value}
          </p>

          {(trend || subValue) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {trend && TrendIcon && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                    isPositive
                      ? 'text-profit bg-profit-subtle border border-profit-border'
                      : trend?.value === 0
                      ? 'text-muted-foreground bg-muted border border-border'
                      : 'text-loss bg-loss-subtle border border-loss-border',
                  )}
                >
                  <TrendIcon className="w-3 h-3" />
                  {trend.value === 0 ? '0%' : `${Math.abs(trend.value).toFixed(1)}%`}
                </span>
              )}
              {(trend?.label || subValue) && (
                <span className="text-xs text-muted-foreground leading-tight">
                  {trend?.label ?? subValue}
                </span>
              )}
            </div>
          )}

          {!trend && subValue && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{subValue}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Gradient icon */}
          <div
            className={cn(
              'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center',
              'shadow-sm group-hover:scale-110 transition-transform duration-300',
              gradient,
            )}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>

          {/* Sparkline */}
          {sparkline && sparkline.length >= 2 && (
            <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <Sparkline points={sparkline} positive={isPositive ?? true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
