// ──────────────────────────────────────────────
// TradeMind — Daily Debrief Component
//
// Renders the AI-powered post-market executive summary.
// Displays: Daily PnL summary, win rate, best/worst trade,
//           top lesson, emotional pattern, tomorrow's focus.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Brain,
  Lightbulb,
  Target,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import type { DailyDebriefResult } from '@trademind/shared';

interface DailyDebriefProps {
  className?: string;
}

export function DailyDebrief({ className }: DailyDebriefProps) {
  const [data, setData] = useState<DailyDebriefResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);

  const fetchDebrief = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.getDailyDebrief();
      if (res.success) {
        if (res.data) {
          setData(res.data);
          setEmptyMessage(null);
        } else {
          setData(null);
          setEmptyMessage(
            (res as any).message ?? 'No closed trades recorded today. Start journaling to unlock your daily debrief.',
          );
        }
      }
    } catch (err) {
      console.error('Failed to load daily debrief:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDebrief();
  }, []);

  if (loading) {
    return (
      <div className={cn('glass-card rounded-2xl p-6 border border-border/50 animate-pulse', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-48 bg-accent rounded-lg" />
          <div className="h-5 w-24 bg-accent rounded-full" />
        </div>
        <div className="h-10 w-3/4 bg-accent/70 rounded-xl mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-accent/50 rounded-xl" />
          ))}
        </div>
        <div className="h-20 bg-accent/40 rounded-xl" />
      </div>
    );
  }

  if (emptyMessage && !data) {
    return (
      <div
        className={cn(
          'glass-card rounded-2xl p-6 border border-border/40 bg-gradient-to-br from-violet-500/5 via-background to-background',
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Post-Market AI Debrief</h3>
              <p className="text-xs text-muted-foreground">Synthesizes today&apos;s trades, psychology, and lessons</p>
            </div>
          </div>
          <button
            onClick={() => fetchDebrief(true)}
            disabled={refreshing}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors"
            title="Refresh Debrief"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </div>
        <div className="mt-4 p-4 rounded-xl bg-accent/30 border border-border/30 text-center">
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isProfitable = (data.stats?.netPnl ?? 0) >= 0;

  return (
    <div
      className={cn(
        'glass-card rounded-2xl p-5 sm:p-6 border relative overflow-hidden transition-all duration-300',
        isProfitable
          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-background'
          : 'border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-background to-background',
        className,
      )}
    >
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center border',
              isProfitable
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400',
            )}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Daily Post-Market Debrief</h3>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
                AI Executive Summary
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{data.date}</span>
              <span>•</span>
              <span className="capitalize">{data.cached ? 'cached for today' : `via ${data.provider}`}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchDebrief(true)}
          disabled={refreshing}
          className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/40"
          title="Refresh Debrief"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Headline */}
      <div className="p-4 rounded-xl bg-background/70 border border-border/50 mb-4 backdrop-blur-sm">
        <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
          &ldquo;{data.headline}&rdquo;
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-5">
        <div className="p-3 rounded-xl bg-background/50 border border-border/30">
          <div className="text-[11px] text-muted-foreground mb-0.5">Today&apos;s P&L</div>
          <div
            className={cn(
              'text-base font-bold',
              isProfitable ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {isProfitable ? '+' : ''}{formatCurrency(data.stats.netPnl)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{data.pnlSummary}</div>
        </div>

        <div className="p-3 rounded-xl bg-background/50 border border-border/30">
          <div className="text-[11px] text-muted-foreground mb-0.5">Win Rate</div>
          <div className="text-base font-bold text-foreground">{data.winRate}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {data.stats.wins}W / {data.stats.losses}L ({data.stats.totalTrades} total)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/50 border border-border/30">
          <div className="text-[11px] text-muted-foreground mb-0.5">Best Performer</div>
          <div className="text-sm font-bold text-emerald-400 truncate">
            {data.stats.bestTrade?.symbol ?? 'None'}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {data.stats.bestTrade ? `+${formatCurrency(data.stats.bestTrade.pnl)}` : '—'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/50 border border-border/30">
          <div className="text-[11px] text-muted-foreground mb-0.5">Biggest Drag</div>
          <div className="text-sm font-bold text-rose-400 truncate">
            {data.stats.worstTrade?.symbol ?? 'None'}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {data.stats.worstTrade ? formatCurrency(data.stats.worstTrade.pnl) : '—'}
          </div>
        </div>
      </div>

      {/* Structured Insights: Lesson, Psychology, Tomorrow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Top Lesson */}
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Key Lesson
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">{data.topLesson}</p>
          </div>
        </div>

        {/* Emotion Trend */}
        <div className="p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-400 mb-1.5">
              <Brain className="w-3.5 h-3.5" />
              Psychology &amp; Bias
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">{data.emotionalPattern}</p>
          </div>
        </div>

        {/* Tomorrow's Goal */}
        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 mb-1.5">
              <Target className="w-3.5 h-3.5" />
              Tomorrow&apos;s Focus
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">{data.tomorrowFocus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
