// ──────────────────────────────────────────────
// TradeMind — Insights Page
//
// Behavioral analytics measuring emotion impact on P&L,
// position sizing, and win rates with AI recommendations.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import { api } from '@/lib/api';
import { EMOTION_EMOJIS } from '@trademind/shared';
import type { BehavioralInsight } from '@trademind/shared';
import { SkeletonStatRow, SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { DailyDebrief } from '@/components/ai/DailyDebrief';

const SEVERITY_CONFIG = {
  critical: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30', icon: AlertTriangle },
  high: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30', icon: AlertTriangle },
  medium: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', icon: Lightbulb },
  low: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', icon: Lightbulb },
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<BehavioralInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Behavioral Insights — TradeMind';
    fetchInsights();
  }, []);

  async function fetchInsights() {
    setLoading(true);
    try {
      const res = await api.getBehavioralInsights();
      if (res.success) setInsights((res.data as BehavioralInsight[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
    } finally {
      setLoading(false);
    }
  }

  const negativeInsights = insights.filter((i) => i.totalPnlImpact < 0);
  const positiveInsights = insights.filter((i) => i.totalPnlImpact > 0);
  const totalEmotionalPnl = insights.reduce((s, i) => s + i.totalPnlImpact, 0);
  const criticalCount = insights.filter((i) => i.severity === 'critical').length;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in max-w-6xl">
        <div className="space-y-2">
          <div className="skeleton h-8 w-60 rounded-xl" />
          <div className="skeleton h-4 w-96 rounded-lg" />
        </div>
        <SkeletonStatRow count={4} />
        <div className="space-y-4 pt-2">
          <SkeletonCard className="h-44" />
          <SkeletonCard className="h-44" />
          <SkeletonCard className="h-44" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <PageHeader
        title="Behavioral Insights"
        description="Data-driven psychological analysis measuring how emotions impact your trading performance"
        icon={Brain}
        actions={
          <button
            onClick={fetchInsights}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
            title="Refresh insights"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Post-Market AI Debrief Card */}
      <DailyDebrief />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Emotional P&L',
            value: (totalEmotionalPnl >= 0 ? '+' : '') + formatCurrency(totalEmotionalPnl),
            icon: totalEmotionalPnl >= 0 ? TrendingUp : TrendingDown,
            gradient: totalEmotionalPnl >= 0 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-600',
            textColor: totalEmotionalPnl >= 0 ? 'text-success' : 'text-destructive',
          },
          {
            label: 'Negative Triggers',
            value: negativeInsights.length,
            icon: AlertTriangle,
            gradient: 'from-amber-500 to-orange-500',
            textColor: 'text-warning',
          },
          {
            label: 'Positive Catalysts',
            value: positiveInsights.length,
            icon: Sparkles,
            gradient: 'from-blue-500 to-indigo-500',
            textColor: 'text-primary',
          },
          {
            label: 'Critical Risk Alerts',
            value: criticalCount,
            icon: ShieldAlert,
            gradient: 'from-rose-500 to-red-600',
            textColor: criticalCount > 0 ? 'text-destructive' : 'text-muted-foreground',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-2xl p-5 hover:shadow-card-hover transition-all duration-300 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {stat.label}
                </p>
                <div className={cn('text-2xl font-bold font-mono', stat.textColor)}>
                  {stat.value}
                </div>
              </div>
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-300',
                  stat.gradient,
                )}
              >
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content area: EmptyState or List */}
      {insights.length === 0 ? (
        <div className="glass-card rounded-2xl p-10">
          <EmptyState
            icon={Brain}
            title="No emotional data recorded yet"
            description="Tag your emotions (e.g., Fear, FOMO, Confidence) in the Trade Journal to unlock psychological pattern detection and personalized recommendations."
            action={{
              label: 'Go to Trade Journal',
              href: '/dashboard/journal',
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            Detected Emotional Patterns ({insights.length})
          </h2>

          <div className="space-y-4">
            {insights.map((insight) => {
              const config = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.medium;
              const Icon = config.icon;

              return (
                <div
                  key={insight.id}
                  className={cn(
                    'glass-card rounded-2xl p-6 border-l-4 transition-all duration-300 hover:shadow-card-hover',
                    config.border,
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <span className="text-3xl p-2 rounded-2xl bg-accent/60 shadow-inner">
                        {EMOTION_EMOJIS[insight.emotion] ?? '🧠'}
                      </span>
                      <div>
                        <div className="font-bold text-lg text-foreground">{insight.emotion}</div>
                        <div className={cn('text-xs font-bold tracking-wider uppercase inline-flex items-center gap-1 mt-0.5', config.text)}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {insight.severity} Impact Level
                        </div>
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <div
                        className={cn(
                          'text-xl font-extrabold font-mono',
                          insight.totalPnlImpact >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {insight.totalPnlImpact >= 0 ? '+' : ''}
                        {formatCurrency(insight.totalPnlImpact)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {insight.sampleSize} trades analyzed
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-accent/40 border border-border/40 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Avg Size Multiplier</div>
                      <div className="font-mono font-bold text-foreground">
                        {insight.avgPositionSizeMultiplier.toFixed(1)}x
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-accent/40 border border-border/40 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                      <div className="font-mono font-bold text-foreground">
                        {formatPercent(insight.avgWinRate)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-accent/40 border border-border/40 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Performance vs Normal</div>
                      <div
                        className={cn(
                          'font-bold text-xs font-mono inline-flex items-center gap-1',
                          insight.avgWinRate >= 0.5 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {insight.avgWinRate >= 0.5 ? 'Outperforming' : 'Underperforming'}
                      </div>
                    </div>
                  </div>

                  {insight.recommendation && (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/10">
                      <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="text-xs leading-relaxed text-foreground">
                        <span className="font-semibold text-primary block mb-0.5">Actionable Coaching Tip:</span>
                        {insight.recommendation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
