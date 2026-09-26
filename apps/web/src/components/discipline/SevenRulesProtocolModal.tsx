// ──────────────────────────────────────────────
// TradeMind — The 7 Non-Negotiable Rules of Profitable Traders
// Interactive Institutional Operating System & Daily Execution Gate
//
// Inspired by the viral trading discipline philosophy:
// 1. Mandatory Pre-Defined Stop-Loss (Capital Defense)
// 2. Strict 1-2% Account Risk Per Trade (Position Sizing)
// 3. Playbook Setup Fidelity (Zero Random Gambling)
// 4. Asymmetric 1:2+ Risk:Reward (Mathematical Expectancy)
// 5. Kill Switch & Tilt Lockdown (Revenge Trading Ban)
// 6. Forensic Journaling & MFE/MAE Autopsy (Continuous Evolution)
// 7. Profit Extraction & Capital Compounding (Wealth Management)
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  Calculator,
  Flame,
  Scale,
  Brain,
  Award,
  Share2,
  TrendingUp,
  X,
  ExternalLink,
  Lock,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/Toast';

export interface RuleItem {
  id: number;
  title: string;
  subtitle: string;
  category: 'Risk' | 'Psychology' | 'Math' | 'Execution' | 'Wealth';
  ruleDetail: string;
  actionHref?: string;
  actionLabel?: string;
  icon: any;
}

export const SEVEN_RULES: RuleItem[] = [
  {
    id: 1,
    title: 'Never Trade Without a Pre-Defined Stop-Loss',
    subtitle: 'Capital Defense & Invalidation Gate',
    category: 'Risk',
    ruleDetail:
      'Enter only when an invalidation price level is pegged to technical structure. Never move a stop-loss further away once entered.',
    actionHref: '/dashboard/replay',
    actionLabel: 'Check Chart Structure',
    icon: Shield,
  },
  {
    id: 2,
    title: 'Cap Risk at 1% to 2% of Total Equity',
    subtitle: 'Mathematical Position Sizing',
    category: 'Math',
    ruleDetail:
      'Calculate position sizing strictly from the distance between your entry and stop-loss. Survive the inevitable 6+ trade losing clusters.',
    actionHref: '/dashboard/calculators',
    actionLabel: 'Calculate Lot Size',
    icon: Calculator,
  },
  {
    id: 3,
    title: 'Execute Only Verified Setup Playbooks',
    subtitle: 'Zero Random Gambling',
    category: 'Execution',
    ruleDetail:
      'Trade verified ICT Silver Bullet, ORB, Fair Value Gap (FVG), or Price Action setups. If the setup criteria are not 100% met, do nothing.',
    actionHref: '/dashboard/strategies',
    actionLabel: 'View Setup Playbooks',
    icon: Target,
  },
  {
    id: 4,
    title: 'Maintain Minimum 1:2 to 1:2.5 Risk-to-Reward',
    subtitle: 'Asymmetric Payoff Expectancy',
    category: 'Math',
    ruleDetail:
      'Ensure potential target rewards at least double the risk unit (R). A 45% win rate generates immense wealth when winners average 2.5R.',
    actionHref: '/dashboard/backtesting',
    actionLabel: 'Verify Strategy R:R',
    icon: Scale,
  },
  {
    id: 5,
    title: 'Enforce Kill Switch After 2 Consecutive Losses',
    subtitle: 'Emotional Tilt & Revenge Lockdown',
    category: 'Psychology',
    ruleDetail:
      'When down 2 trades or at the daily loss limit, walk away immediately. Mandatory 4-hour cooling-off period before touching the screens again.',
    actionHref: '/dashboard/discipline',
    actionLabel: 'Activate Kill Switch',
    icon: ShieldAlert,
  },
  {
    id: 6,
    title: 'Autopsy & Journal Every Single Execution',
    subtitle: 'Continuous Evolution & Leak Elimination',
    category: 'Execution',
    ruleDetail:
      'Record entry timestamps, MFE/MAE excursions, execution tags, and emotional state. Track what you did right and where capital leaked.',
    actionHref: '/dashboard/journal',
    actionLabel: 'Open Trade Journal',
    icon: Brain,
  },
  {
    id: 7,
    title: 'Lock In Profits & Treat Capital as a Compound Asset',
    subtitle: 'Wealth Management & Greed Control',
    category: 'Wealth',
    ruleDetail:
      'Scale partials at liquidity targets, trail stops to breakeven, and withdraw profits regularly. You are managing an institutional business.',
    actionHref: '/dashboard/taxes',
    actionLabel: 'View Wealth Ledger',
    icon: TrendingUp,
  },
];

interface SevenRulesProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SevenRulesProtocolModal({
  isOpen,
  onClose,
}: SevenRulesProtocolModalProps) {
  // Checkbox state for today's 7 rules
  const [checkedRules, setCheckedRules] = useState<Record<number, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const saved = localStorage.getItem(`trademind_7rules_${today}`);
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return { 1: true, 2: true, 3: true, 4: true, 5: true, 6: false, 7: false };
  });

  const [streakDays, setStreakDays] = useState(14);

  // Save checks
  const toggleRule = (id: number) => {
    setCheckedRules((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof window !== 'undefined') {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`trademind_7rules_${today}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const completedCount = Object.values(checkedRules).filter(Boolean).length;
  const compliancePct = Math.round((completedCount / 7) * 100);

  const handleShareStreak = () => {
    const text =
      `🛡️ 7 Non-Negotiable Rules of Profitable Traders\n` +
      `🔥 My Discipline Score Today: ${completedCount}/7 Rules Adhered (${compliancePct}%)\n` +
      `⚡ Streak: ${streakDays} Consecutive Days Following the TradeMind Operating System\n\n` +
      `Discipline > Luck. #TradeMind #DayTrading #TradingRules #TradingJournal`;

    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl bg-card border border-amber-500/30 shadow-2xl p-6 sm:p-8 space-y-6 animate-bounce-in max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-start justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-600 to-amber-700 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20">
              <Award className="w-6 h-6 text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                  The 7 Golden Rules of Profitable Traders
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Operating System
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                The institutional discipline framework that separates the top 1% from the 99% who blow accounts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Scorecard Banner */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-500/10 via-card to-background border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Today's Discipline Execution Grade</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black font-mono text-foreground">
                {completedCount} / 7
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                ({compliancePct}% Compliance)
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {completedCount === 7
                ? '🏆 Flawless Institutional Execution. Capital strictly protected.'
                : completedCount >= 5
                ? '⚡ Strong discipline maintained. Review uncompleted rules.'
                : '⚠️ Warning: Discipline breaches increase risk of capital ruin.'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-zinc-950/80 border border-amber-500/30 text-center">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Streak</div>
              <div className="text-lg font-black font-mono text-amber-400 flex items-center gap-1 justify-center">
                <span>{streakDays}</span>
                <span className="text-xs">DAYS</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShareStreak}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02]"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Badge</span>
            </button>
          </div>
        </div>

        {/* The 7 Interactive Rules List */}
        <div className="space-y-3">
          {SEVEN_RULES.map((rule) => {
            const isChecked = !!checkedRules[rule.id];
            const Icon = rule.icon;

            return (
              <div
                key={rule.id}
                onClick={() => toggleRule(rule.id)}
                className={cn(
                  'cursor-pointer group rounded-2xl p-4 border transition-all duration-200 flex items-start gap-4',
                  isChecked
                    ? 'bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-card/50 border-border/70 hover:border-border hover:bg-card'
                )}
              >
                {/* Checkbox circle */}
                <div className="pt-0.5">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center border transition-all',
                      isChecked
                        ? 'bg-amber-500 border-amber-500 text-zinc-950 shadow-sm shadow-amber-500/30'
                        : 'border-muted-foreground/40 group-hover:border-foreground/60'
                    )}
                  >
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-[11px] font-bold text-muted-foreground font-mono">
                        {rule.id}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground group-hover:text-amber-300 transition-colors flex items-center gap-2">
                      <span>{rule.title}</span>
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold uppercase bg-secondary text-muted-foreground border border-border">
                      {rule.category}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rule.ruleDetail}
                  </p>

                  {rule.actionHref && (
                    <div className="pt-1.5" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={rule.actionHref}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                      >
                        <span>{rule.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Deep Dive Link */}
        <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <Link
            href="/blog/7-rules-profitable-traders-follow-institutional-discipline-blueprint"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 font-bold text-foreground hover:text-amber-400 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Read the 7 Rules Institutional Masterclass & Scientific Research</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-colors"
          >
            Close Gate
          </button>
        </div>
      </div>
    </div>
  );
}
