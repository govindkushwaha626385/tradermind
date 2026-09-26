// ──────────────────────────────────────────────
// TradeMind — Discipline Dashboard
//
// The central hub for the Discipline Engine.
// Shows:
//   - Checklist compliance %
//   - Plan adherence %
//   - Mistake costs ranked by ₹
//   - Emotion → P&L correlation
//   - Plan comparison (followed vs broken)
//   - Self-rating averages
//   - Win/loss streaks
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Brain,
  Star,
  Zap,
  Flame,
  Gauge,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { EMOTION_EMOJIS, MISTAKE_LABELS } from '@trademind/shared';
import type { DisciplineStatsResponse, StreakResponse } from '@trademind/shared';
import { SkeletonStatRow, SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { PremarketRoutineModal } from '@/components/discipline/PremarketRoutineModal';
import { RiskKillSwitchWidget } from '@/components/dashboard/RiskKillSwitchWidget';

export default function DisciplinePage() {
  const { format } = useCurrency();
  const [stats, setStats] = useState<DisciplineStatsResponse | null>(null);
  const [streaks, setStreaks] = useState<StreakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [premarketOpen, setPremarketOpen] = useState(false);

  useEffect(() => {
    document.title = 'Discipline Dashboard — TradeMind';
    fetchDisciplineData();
  }, []);

  async function fetchDisciplineData() {
    setLoading(true);
    try {
      const [statsRes, streaksRes] = await Promise.all([
        api.getDisciplineStats(),
        api.getStreaks(),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (streaksRes.success) setStreaks(streaksRes.data);
    } catch (err) {
      console.error('Failed to fetch discipline data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in max-w-6xl">
        <div className="space-y-2">
          <div className="skeleton h-8 w-60 rounded-xl" />
          <div className="skeleton h-4 w-96 rounded-lg" />
        </div>
        <SkeletonStatRow count={4} />
        <div className="grid lg:grid-cols-2 gap-6 pt-2">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
        </div>
      </div>
    );
  }

  const c = stats?.compliance;
  const pa = stats?.planAdherence;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <PageHeader
        title="Discipline Dashboard"
        description="Track rule compliance, mistake costs, emotional control, and behavioral execution"
        icon={ShieldCheck}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-seven-rules-protocol'))}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all shadow-sm group cursor-pointer"
              title="Launch The 7 Golden Rules Execution Protocol"
            >
              <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>7 Golden Rules</span>
            </button>
            <button
              onClick={() => setPremarketOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold transition-all shadow-sm group"
              title="Open Pre-Market Routine"
            >
              <Sun className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              <span>Pre-Market Routine</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-eod-review'))}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold transition-all shadow-sm group"
              title="Open Post-Market End of Day Review"
            >
              <Moon className="w-4 h-4" />
              <span>EOD Review</span>
            </button>
            <button
              onClick={fetchDisciplineData}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <PremarketRoutineModal
        isOpen={premarketOpen}
        onClose={() => setPremarketOpen(false)}
      />

      {/* ── Daily Risk Kill Switch & Limits Panel ── */}
      <RiskKillSwitchWidget />

      {/* ── The 7 Golden Rules Operating System Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-purple-500/10 p-5 sm:p-6 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider font-mono">
                Viral Institutional Blueprint
              </span>
              <span className="text-xs text-muted-foreground">• Top 1% Discipline Standard</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              The 7 Golden Rules Execution Protocol
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Lock in your non-negotiables before opening your trading terminal: Pre-defined stop-loss, 1-2% risk cap, setup fidelity, 1:2.5+ R:R, armed kill-switch, daily journal autopsy, and profit compounding.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-seven-rules-protocol'))}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 group cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Launch 7-Rule Gate</span>
            </button>
            <Link
              href="/dashboard/checklists"
              className="px-3.5 py-2.5 rounded-xl border border-border/70 hover:bg-accent text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <ClipboardCheck className="w-4 h-4 text-primary" />
              <span>Checklist Studio</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Score Cards ────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          icon={ClipboardCheck}
          label="Checklist Compliance"
          value={`${(c?.avgCompliance ?? 0).toFixed(0)}%`}
          subtitle={`${c?.totalChecked ?? 0} trades evaluated`}
          color={getScoreColor(c?.avgCompliance ?? 0)}
          gradient="from-blue-500 to-indigo-500"
        />
        <ScoreCard
          icon={Target}
          label="Plan Adherence"
          value={`${(pa?.avgAdherence ?? 0).toFixed(0)}%`}
          subtitle={`${pa?.totalPlanned ?? 0} trade plans recorded`}
          color={getScoreColor(pa?.avgAdherence ?? 0)}
          gradient="from-emerald-500 to-teal-500"
        />
        <ScoreCard
          icon={Flame}
          label="Current Streak"
          value={
            streaks ? (
              streaks.currentWinStreak > 0
                ? `${streaks.currentWinStreak}W`
                : streaks.currentLossStreak > 0
                  ? `${streaks.currentLossStreak}L`
                  : '—'
            ) : '—'
          }
          subtitle={`Best: ${streaks?.maxWinStreak ?? 0}W · Worst: ${streaks?.maxLossStreak ?? 0}L`}
          color={streaks && streaks.currentWinStreak > 0 ? 'text-success' : 'text-destructive'}
          gradient={streaks && streaks.currentWinStreak > 0 ? 'from-amber-500 to-orange-500' : 'from-rose-500 to-red-600'}
        />
        <ScoreCard
          icon={Star}
          label="Avg Self-Rating"
          value={
            stats?.avgRatings ? (
              `${((Number(stats.avgRatings.execution) + Number(stats.avgRatings.plan) + Number(stats.avgRatings.psychology)) / 3).toFixed(1)} / 5`
            ) : '—'
          }
          subtitle={`Exec ${stats?.avgRatings.execution ?? '—'} · Plan ${stats?.avgRatings.plan ?? '—'} · Psy ${stats?.avgRatings.psychology ?? '—'}`}
          color="text-primary"
          gradient="from-purple-500 to-pink-500"
        />
      </div>

      {/* ── Main Grid ──────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Mistake Costs ────────────────── */}
        <div className="glass-card rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Cost of Mistakes</h2>
              <p className="text-xs text-muted-foreground">Quantified financial impact of trading errors</p>
            </div>
          </div>
          {!stats?.mistakeCosts || stats.mistakeCosts.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                icon={AlertCircle}
                compact
                title="No mistakes tagged"
                description="Tag recurring errors (e.g. Early Exit, Revenge Sizing, Chasing Candles) during post-trade analysis to quantify their financial drain."
                action={{
                  label: 'Tag Errors in Trade Journal',
                  href: '/dashboard/journal',
                }}
              />
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-muted-foreground flex items-center gap-2.5">
                <span className="text-amber-400 font-bold shrink-0">💡 Institutional Insight:</span>
                <span>Traders who routinely tag mistakes recover an average of ₹14,200 ($170) per month in preventable tilt losses.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.mistakeCosts.map((m) => (
                <div
                  key={m.mistake}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-accent/30 border border-border/40 hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {MISTAKE_LABELS[m.mistake] ?? m.mistake}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{m.tradeCount} trades tagged</div>
                  </div>
                  <div
                    className={cn(
                      'text-sm font-bold font-mono',
                      m.totalCost < 0 ? 'text-destructive' : 'text-success',
                    )}
                  >
                    {format(m.totalCost)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Emotion → P&L ────────────────── */}
        <div className="glass-card rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Emotion → Average P&amp;L</h2>
              <p className="text-xs text-muted-foreground">How emotional state correlates with profit &amp; loss</p>
            </div>
          </div>
          {!stats?.emotionPnl || stats.emotionPnl.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                icon={Brain}
                compact
                title="No emotions logged"
                description="Select your emotional state (Calm, Focused, Eager, Anxious, FOMO) when opening or closing trades to uncover your psychological edge."
                action={{
                  label: 'Open Pre-Flight Checklist',
                  href: '/dashboard/checklists',
                }}
              />
              <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs text-muted-foreground flex items-center gap-2.5">
                <span className="text-purple-400 font-bold shrink-0">🧠 Psychological Edge:</span>
                <span>Top prop-firm traders maintain a 2.4x higher win-rate during 'CALM & OBJECTIVE' states compared to 'EAGER' sessions.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.emotionPnl.map((e) => (
                <div
                  key={e.emotion}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-accent/30 border border-border/40 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-1.5 rounded-xl bg-accent/60">
                      {EMOTION_EMOJIS[e.emotion] ?? '🧠'}
                    </span>
                    <div>
                      <div className="text-sm font-semibold capitalize text-foreground">{e.emotion.toLowerCase()}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{e.tradeCount} trades</div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'text-sm font-bold font-mono',
                      e.avgPnl < 0 ? 'text-destructive' : 'text-success',
                    )}
                  >
                    {format(e.avgPnl)} avg
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Plan Comparison ──────────────── */}
        <div className="glass-card rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Plan Adherence Impact</h2>
              <p className="text-xs text-muted-foreground">Comparing returns when following vs breaking plans</p>
            </div>
          </div>
          {!stats?.planComparison || stats.planComparison.length === 0 ? (
            <EmptyState
              icon={Target}
              compact
              title="No trade plans compared"
              description="Record trade entry, stop loss, and target plans to measure the edge of discipline."
            />
          ) : (
            <div className="space-y-3">
              {stats.planComparison.map((p) => (
                <div
                  key={String(p.followedPlan)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-accent/30 border border-border/40"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        p.followedPlan ? 'bg-success shadow-sm' : p.followedPlan === false ? 'bg-destructive shadow-sm' : 'bg-muted-foreground',
                      )}
                    />
                    <span className="text-sm font-semibold text-foreground">
                      {p.followedPlan === true
                        ? 'Followed Plan Strictly'
                        : p.followedPlan === false
                          ? 'Deviated From Plan'
                          : 'Not Recorded'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground font-mono">{p.tradeCount} trades</span>
                    <span
                      className={cn(
                        'text-sm font-bold font-mono',
                        p.avgPnl >= 0 ? 'text-success' : 'text-destructive',
                      )}
                    >
                      {format(p.avgPnl)} avg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Self-Ratings ─────────────────── */}
        <div className="glass-card rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Self-Rating Breakdown</h2>
              <p className="text-xs text-muted-foreground">Trader self-evaluation scores out of 5.0</p>
            </div>
          </div>
          {!stats?.avgRatings ? (
            <EmptyState
              icon={Star}
              compact
              title="No self-ratings recorded"
              description="Rate your execution, planning, and psychology on closed trades to calibrate awareness."
            />
          ) : (
            <div className="space-y-5 pt-2">
              <RatingBar label="Execution Quality" value={Number(stats.avgRatings.execution)} />
              <RatingBar label="Plan Quality" value={Number(stats.avgRatings.plan)} />
              <RatingBar label="Psychological Balance" value={Number(stats.avgRatings.psychology)} />
              <p className="text-xs text-muted-foreground text-center pt-2">
                Scale: 1.0 (poor / undisciplined) → 5.0 (flawless execution)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Streak Details ─────────────────── */}
      {streaks && (
        <div className="glass-card rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Streak History</h2>
              <p className="text-xs text-muted-foreground">Historical winning and losing momentum cycles</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StreakBlock label="Current Wins" value={streaks.currentWinStreak} color="text-success" />
            <StreakBlock label="Current Losses" value={streaks.currentLossStreak} color="text-destructive" />
            <StreakBlock label="Best Win Streak" value={streaks.maxWinStreak} color="text-success" />
            <StreakBlock label="Worst Loss Streak" value={streaks.maxLossStreak} color="text-destructive" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────

function ScoreCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  gradient,
}: {
  icon: any;
  label: string;
  value: string;
  subtitle: string;
  color: string;
  gradient: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 hover:shadow-card-hover transition-all duration-300 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {label}
          </p>
          <div className={cn('text-2xl font-bold font-mono', color)}>{value}</div>
          <div className="text-xs text-muted-foreground mt-1.5">{subtitle}</div>
        </div>
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-300',
            gradient,
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 5) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="font-mono font-bold">{value.toFixed(1)} / 5.0</span>
      </div>
      <div className="h-2.5 rounded-full bg-accent/60 overflow-hidden p-0.5 border border-border/30">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct >= 70 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : pct >= 40 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-rose-500 to-red-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StreakBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center p-4 rounded-xl bg-accent/30 border border-border/40">
      <div className={cn('text-3xl font-extrabold font-mono', color)}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1 font-medium">{label}</div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}
