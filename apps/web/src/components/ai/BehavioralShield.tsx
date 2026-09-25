// ──────────────────────────────────────────────
// TradeMind — Behavioral Shield Widget
//
// Real-time trading behavior monitor.
// Color-coded risk indicator with flag details.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldX,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';

type ShieldLevel = 'none' | 'caution' | 'warning' | 'danger';

interface ShieldFlag {
  type: string;
  severity: ShieldLevel;
  title: string;
  description: string;
  recommendation: string;
}

interface ShieldData {
  level: ShieldLevel;
  flags: ShieldFlag[];
  tradesAnalyzed: number;
  dailyPnl: number;
  todayTradeCount: number;
  alertMessage: string;
}

const LEVEL_CONFIG: Record<ShieldLevel, {
  icon: React.ComponentType<any>;
  label: string;
  bg: string;
  border: string;
  iconColor: string;
  badge: string;
  pulse: boolean;
}> = {
  none: {
    icon: ShieldCheck,
    label: 'Protected',
    bg: 'from-emerald-500/10 to-transparent',
    border: 'border-emerald-500/25',
    iconColor: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400',
    pulse: false,
  },
  caution: {
    icon: Shield,
    label: 'Caution',
    bg: 'from-amber-500/10 to-transparent',
    border: 'border-amber-500/25',
    iconColor: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-400',
    pulse: false,
  },
  warning: {
    icon: ShieldAlert,
    label: 'Warning',
    bg: 'from-orange-500/15 to-transparent',
    border: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    badge: 'bg-orange-500/15 text-orange-400',
    pulse: true,
  },
  danger: {
    icon: ShieldX,
    label: 'DANGER',
    bg: 'from-red-500/20 to-transparent',
    border: 'border-red-500/40',
    iconColor: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400',
    pulse: true,
  },
};

const SEVERITY_COLORS: Record<ShieldLevel, string> = {
  none: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  caution: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  warning: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  danger: 'text-red-400 bg-red-500/10 border-red-500/20',
};

interface BehavioralShieldProps {
  className?: string;
  /** Auto-refresh interval in ms. Default 5 minutes. */
  refreshInterval?: number;
}

export function BehavioralShield({ className, refreshInterval = 5 * 60 * 1000 }: BehavioralShieldProps) {
  const { format } = useCurrency();
  const [data, setData] = useState<ShieldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getBehavioralShield();
      if (res.success) {
        setData(res.data as ShieldData);
        setLastUpdated(new Date());
        // Auto-expand if warning or danger
        const level = (res.data as ShieldData)?.level;
        if (level === 'warning' || level === 'danger') {
          setExpanded(true);
        }
      }
    } catch {
      // Silently fail — shield is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(() => fetch(true), refreshInterval);
    return () => clearInterval(interval);
  }, [fetch, refreshInterval]);

  if (loading) {
    return (
      <div className={cn('glass-card rounded-2xl p-5 animate-pulse', className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted/50" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted/50 rounded w-32" />
            <div className="h-3 bg-muted/30 rounded w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const config = LEVEL_CONFIG[data.level];
  const ShieldIcon = config.icon;

  return (
    <div
      className={cn(
        'rounded-2xl border bg-gradient-to-br glass-card transition-all duration-300',
        config.bg,
        config.border,
        className,
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center relative', config.iconColor)}>
            {config.pulse && (
              <span className="absolute inset-0 rounded-xl animate-ping opacity-20 bg-current" />
            )}
            <ShieldIcon className="w-5 h-5 relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Behavioral Shield</span>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide', config.badge)}>
                {config.label}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{data.alertMessage}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <button
              onClick={(e) => { e.stopPropagation(); fetch(true); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="px-5 pb-4 flex items-center gap-4 text-xs text-muted-foreground border-t border-border/20 pt-3">
        <span>
          <span className="font-semibold text-foreground">{data.todayTradeCount}</span> trades today
        </span>
        <span className="w-px h-3 bg-border/50" />
        <span>
          P&L:{' '}
          <span className={cn('font-semibold', data.dailyPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {data.dailyPnl > 0 ? '+' : ''}{format(data.dailyPnl)}
          </span>
        </span>
        <span className="w-px h-3 bg-border/50" />
        <span>{data.tradesAnalyzed} analyzed</span>
        {data.flags.length > 0 && (
          <>
            <span className="w-px h-3 bg-border/50" />
            <span className="text-amber-400 font-medium">{data.flags.length} flag{data.flags.length !== 1 ? 's' : ''}</span>
          </>
        )}
      </div>

      {/* Expanded flag details */}
      {expanded && data.flags.length > 0 && (
        <div className="px-5 pb-5 space-y-3 animate-fade-in">
          {data.flags.map((flag, i) => (
            <div
              key={i}
              className={cn(
                'p-3.5 rounded-xl border text-sm',
                SEVERITY_COLORS[flag.severity],
              )}
            >
              <div className="flex items-center gap-2 font-semibold mb-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {flag.title}
              </div>
              <p className="text-foreground/80 text-xs leading-relaxed mb-2">{flag.description}</p>
              <div className="flex items-start gap-1.5 text-xs opacity-80">
                <span className="font-medium flex-shrink-0">💡 Fix:</span>
                <span>{flag.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded: no flags state */}
      {expanded && data.flags.length === 0 && (
        <div className="px-5 pb-5 text-center animate-fade-in">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">All clear</p>
          <p className="text-xs text-muted-foreground mt-1">No behavioral red flags detected in the last 48 hours.</p>
        </div>
      )}
    </div>
  );
}
