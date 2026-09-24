// ──────────────────────────────────────────────
// TradeMind — Institutional Setup Playbooks Matrix (v2.0)
//
// Features:
// 1. Top KPI Summary Strip (Active Setups, Win Rate, Best Setup, Net PnL)
// 2. 1-Click Pro Setup Template Adoptor (ORB, SMC/FVG, VWAP Fade, Key Level)
// 3. TradeZella-Grade Setup Cards with live trade metrics (Win Rate, Expectancy, Profit Factor)
// 4. Entry, Exit, and Invalidation Risk criteria with visual tags
// 5. Multi-currency format with 0 mock data
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  X,
  BookMarked,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';

export interface PlaybookMetrics {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  netPnl: number;
  profitFactor: number;
  avgRMultiple: number;
}

export interface PlaybookRiskRules {
  marketCondition?: string;
  timeframe?: string;
  targetRR?: string;
  invalidationRule?: string;
}

export interface Playbook {
  id: string;
  name: string;
  description?: string;
  entryCriteria?: string;
  exitCriteria?: string;
  riskRules?: PlaybookRiskRules | any;
  isActive: boolean;
  metrics?: PlaybookMetrics;
}

const PRO_PRESETS = [
  {
    name: 'Opening Range Breakout (ORB 15m)',
    description: 'High-momentum breakout capturing the institutional impulse immediately after market opening.',
    entryCriteria: 'Price breaks and closes beyond the high/low of the first 15-minute candle on at least 1.5x relative volume (RVOL).',
    exitCriteria: 'Target 1: 1.5R partial. Target 2: Trailing stop along 9 EMA on 5m chart or session VWAP breach.',
    riskRules: {
      marketCondition: 'Breakout',
      timeframe: '5m / 15m',
      targetRR: '1:2.0',
      invalidationRule: 'Immediate 5m close back inside the 15-minute opening range boundary.',
    },
  },
  {
    name: 'ICT Liquidity Sweep & Fair Value Gap (FVG)',
    description: 'Smart Money Concepts (SMC) reversal taking out key session liquidity before retesting institutional imbalances.',
    entryCriteria: 'Price sweeps previous session high/low, aggressively reclaims level with a Market Structure Shift (MSS) leaving a clean FVG, enters on tap.',
    exitCriteria: 'Opposing liquidity pool (equal lows / highs) or 50% discount of high-timeframe range.',
    riskRules: {
      marketCondition: 'Reversal',
      timeframe: '1m / 5m',
      targetRR: '1:3.0',
      invalidationRule: 'Candle close beyond the sweep swing extreme point.',
    },
  },
  {
    name: 'VWAP Mean Reversion Scalp',
    description: 'Counter-trend fade on overextended price action stretching > 2 standard deviation bands away from volume-weighted average price.',
    entryCriteria: 'Price extends beyond +2.0 SD VWAP band with RSI divergence. Rejection wick followed by opposite directional candle.',
    exitCriteria: 'Exit 50% at VWAP +1.0 SD band, remaining position flat at primary VWAP centerline.',
    riskRules: {
      marketCondition: 'Mean Reversion',
      timeframe: '3m / 5m',
      targetRR: '1:1.8',
      invalidationRule: 'Expansion candle closing aggressively beyond 2.5 SD with surge in volume.',
    },
  },
  {
    name: 'Key Support / Resistance Retest with Volume',
    description: 'Trend continuation retest of broken daily/weekly horizontal levels with order flow volume absorption.',
    entryCriteria: 'Broken horizontal resistance cleanly tested as new support on declining pullback volume with bullish delta absorption.',
    exitCriteria: 'Next major daily swing liquidity level or 2.5R target.',
    riskRules: {
      marketCondition: 'Trend Continuation',
      timeframe: '15m / 1h',
      targetRR: '1:2.5',
      invalidationRule: 'Hourly close back below the retested support level.',
    },
  },
];

export default function PlaybooksPage() {
  const { format, currency } = useCurrency();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [editing, setEditing] = useState<Playbook | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    entryCriteria: '',
    exitCriteria: '',
    marketCondition: 'Breakout',
    timeframe: '5m',
    targetRR: '1:2.0',
    invalidationRule: '',
    isActive: true,
  });

  // ConfirmDialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    document.title = 'Setup Playbooks — TradeMind';
    fetchPlaybooks();
  }, []);

  async function fetchPlaybooks() {
    setLoading(true);
    try {
      const res = await api.getPlaybooks();
      if (res.success) setPlaybooks((res.data as Playbook[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch playbooks:', err);
      toast.error('Failed to load playbooks');
    } finally {
      setLoading(false);
    }
  }

  // Aggregate KPI stats across all playbooks
  const kpis = useMemo(() => {
    const totalPlaybooks = playbooks.length;
    const activePlaybooks = playbooks.filter((p) => p.isActive).length;
    let totalTrades = 0;
    let totalWins = 0;
    let totalNetPnl = 0;
    let bestPlaybook: { name: string; winRate: number; netPnl: number } | null = null;

    for (const p of playbooks) {
      const m = p.metrics;
      if (m && m.totalTrades > 0) {
        totalTrades += m.totalTrades;
        totalWins += m.winTrades;
        totalNetPnl += m.netPnl;
        if (!bestPlaybook || m.netPnl > bestPlaybook.netPnl) {
          bestPlaybook = { name: p.name, winRate: m.winRate, netPnl: m.netPnl };
        }
      }
    }

    const overallWinRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0;

    return {
      totalPlaybooks,
      activePlaybooks,
      totalTrades,
      overallWinRate,
      totalNetPnl,
      bestPlaybook,
    };
  }, [playbooks]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Playbook name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        entryCriteria: form.entryCriteria.trim(),
        exitCriteria: form.exitCriteria.trim(),
        riskRules: {
          marketCondition: form.marketCondition,
          timeframe: form.timeframe,
          targetRR: form.targetRR,
          invalidationRule: form.invalidationRule,
        },
        isActive: form.isActive,
      };

      if (editing) {
        await api.updatePlaybook(editing.id, payload);
        toast.success(`Updated "${form.name}" playbook`);
      } else {
        await api.createPlaybook(payload);
        toast.success(`Created "${form.name}" playbook`);
      }
      resetForm();
      setShowForm(false);
      await fetchPlaybooks();
    } catch (err: any) {
      console.error('Failed to save playbook:', err);
      toast.error(err?.message ?? 'Failed to save playbook');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      entryCriteria: '',
      exitCriteria: '',
      marketCondition: 'Breakout',
      timeframe: '5m',
      targetRR: '1:2.0',
      invalidationRule: '',
      isActive: true,
    });
    setEditing(null);
  };

  const handleEdit = (playbook: Playbook) => {
    const rules = playbook.riskRules || {};
    setForm({
      name: playbook.name,
      description: playbook.description ?? '',
      entryCriteria: playbook.entryCriteria ?? '',
      exitCriteria: playbook.exitCriteria ?? '',
      marketCondition: rules.marketCondition || 'Breakout',
      timeframe: rules.timeframe || '5m',
      targetRR: rules.targetRR || '1:2.0',
      invalidationRule: rules.invalidationRule || '',
      isActive: playbook.isActive ?? true,
    });
    setEditing(playbook);
    setShowForm(true);
  };

  const adoptPreset = (preset: typeof PRO_PRESETS[number]) => {
    setForm({
      name: preset.name,
      description: preset.description,
      entryCriteria: preset.entryCriteria,
      exitCriteria: preset.exitCriteria,
      marketCondition: preset.riskRules.marketCondition,
      timeframe: preset.riskRules.timeframe,
      targetRR: preset.riskRules.targetRR,
      invalidationRule: preset.riskRules.invalidationRule,
      isActive: true,
    });
    setEditing(null);
    setShowForm(true);
    setShowPresets(false);
  };

  const requestDelete = (id: string) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmId) return;
    setConfirmLoading(true);
    try {
      await api.deletePlaybook(confirmId);
      toast.success('Playbook deleted');
      await fetchPlaybooks();
    } catch (err: any) {
      console.error('Failed to delete playbook:', err);
      toast.error(err?.message ?? 'Failed to delete playbook');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Setup Playbooks Matrix"
        description="Define institutional execution rules, entry/exit criteria, and track setup-by-setup profitability."
        icon={BookMarked}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent/80 border border-border text-sm font-semibold transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{showPresets ? 'Hide Presets' : 'Pro Presets'}</span>
              {showPresets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              New Playbook
            </button>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Active Setups"
          value={`${kpis.activePlaybooks} / ${kpis.totalPlaybooks}`}
          subValue="Playbook catalog"
          icon={Layers}
          gradient="from-blue-500 to-indigo-500"
        />
        <StatCard
          label="Playbook Win Rate"
          value={kpis.totalTrades > 0 ? `${kpis.overallWinRate}%` : 'N/A'}
          subValue={`${kpis.totalTrades} tagged trades`}
          icon={Target}
          gradient="from-emerald-500 to-teal-500"
          trend={kpis.totalTrades > 0 ? { value: kpis.overallWinRate, positive: kpis.overallWinRate >= 50, label: 'Win rate' } : undefined}
        />
        <StatCard
          label="Net P&L (All Playbooks)"
          value={format(kpis.totalNetPnl)}
          subValue={kpis.totalNetPnl >= 0 ? 'Net Profitable' : 'Drawdown'}
          icon={kpis.totalNetPnl >= 0 ? TrendingUp : TrendingDown}
          gradient="from-violet-500 to-purple-500"
          trend={kpis.totalTrades > 0 ? { value: Math.abs(kpis.totalNetPnl), positive: kpis.totalNetPnl >= 0, label: 'Total P&L' } : undefined}
        />
        <StatCard
          label="Top Setup"
          value={kpis.bestPlaybook ? kpis.bestPlaybook.name.slice(0, 18) + (kpis.bestPlaybook.name.length > 18 ? '…' : '') : 'None'}
          subValue={kpis.bestPlaybook ? `${kpis.bestPlaybook.winRate}% WR · ${format(kpis.bestPlaybook.netPnl)}` : 'Tag trades in Journal'}
          icon={Flame}
          gradient="from-amber-500 to-rose-500"
        />
      </div>

      {/* Pro Strategy Presets Drawer */}
      {showPresets && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Institutional Setup Presets
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adopt proven institutional playbooks used by top prop firm traders and fund managers.
              </p>
            </div>
            <button
              onClick={() => setShowPresets(false)}
              className="p-1 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRO_PRESETS.map((preset) => (
              <div
                key={preset.name}
                className="glass-card rounded-xl p-3.5 flex flex-col justify-between border border-border/80 hover:border-primary/40 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {preset.riskRules.marketCondition}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {preset.riskRules.timeframe}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {preset.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {preset.description}
                  </p>
                </div>

                <button
                  onClick={() => adoptPreset(preset)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-semibold transition-all"
                >
                  <Copy className="w-3 h-3" />
                  Adopt Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playbook List */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} rows={6} showHeader />
          ))}
        </div>
      ) : playbooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No setup playbooks defined yet"
          description="Create your first strategy playbook or adopt one from our institutional presets to track your edge."
          action={{
            label: 'Adopt Pro Setup',
            onClick: () => setShowPresets(true),
          }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map((playbook) => {
            const m = playbook.metrics;
            const rules = playbook.riskRules || {};
            const hasTrades = m && m.totalTrades > 0;

            return (
              <div
                key={playbook.id}
                className={cn(
                  'glass-card rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-card-hover border border-border/70',
                  !playbook.isActive && 'opacity-65',
                )}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-foreground truncate" title={playbook.name}>
                          {playbook.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {rules.marketCondition && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/50">
                              {rules.marketCondition}
                            </span>
                          )}
                          {rules.targetRR && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-muted text-primary border border-border/50">
                              RR {rules.targetRR}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                        playbook.isActive
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border border-border',
                      )}
                    >
                      {playbook.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  {playbook.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {playbook.description}
                    </p>
                  )}

                  {/* Real Institutional Performance Strip */}
                  <div className="p-3 rounded-xl bg-background/80 border border-border/60 mb-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Win Rate
                      </span>
                      <span
                        className={cn(
                          'text-xs font-bold font-mono',
                          hasTrades
                            ? m!.winRate >= 50
                              ? 'text-emerald-500'
                              : 'text-rose-500'
                            : 'text-muted-foreground',
                        )}
                      >
                        {hasTrades ? `${m!.winRate}%` : '—'}
                      </span>
                      {hasTrades && (
                        <span className="text-[9px] text-muted-foreground block">
                          {m!.winTrades}W / {m!.lossTrades}L
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Net P&L
                      </span>
                      <span
                        className={cn(
                          'text-xs font-bold font-mono',
                          hasTrades
                            ? m!.netPnl >= 0
                              ? 'text-emerald-500'
                              : 'text-rose-500'
                            : 'text-muted-foreground',
                        )}
                      >
                        {hasTrades ? format(m!.netPnl) : '—'}
                      </span>
                      {hasTrades && (
                        <span className="text-[9px] text-muted-foreground block">
                          {m!.totalTrades} trades
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Profit Factor
                      </span>
                      <span
                        className={cn(
                          'text-xs font-bold font-mono',
                          hasTrades && m!.profitFactor >= 1.5
                            ? 'text-emerald-500'
                            : 'text-foreground',
                        )}
                      >
                        {hasTrades ? `${m!.profitFactor.toFixed(2)}` : '—'}
                      </span>
                      {hasTrades && m!.avgRMultiple > 0 && (
                        <span className="text-[9px] text-muted-foreground block">
                          {m!.avgRMultiple}R avg
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rules & Criteria Accordion */}
                  <div className="space-y-2 text-xs">
                    {playbook.entryCriteria && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Entry Trigger Checklist</span>
                        </div>
                        <p className="text-[11px] text-foreground/90 leading-relaxed">
                          {playbook.entryCriteria}
                        </p>
                      </div>
                    )}

                    {playbook.exitCriteria && (
                      <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/15">
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold mb-1">
                          <Target className="w-3.5 h-3.5" />
                          <span>Profit Target & Scale-out</span>
                        </div>
                        <p className="text-[11px] text-foreground/90 leading-relaxed">
                          {playbook.exitCriteria}
                        </p>
                      </div>
                    )}

                    {rules.invalidationRule && (
                      <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold mb-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Stop Loss & Invalidation Rule</span>
                        </div>
                        <p className="text-[11px] text-foreground/90 leading-relaxed">
                          {rules.invalidationRule}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  <Link
                    href={`/dashboard/journal?search=${encodeURIComponent(playbook.name)}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 border border-border text-xs font-semibold text-foreground transition-colors"
                  >
                    <BarChart3 className="w-3 h-3 text-primary" />
                    Review Trades
                  </Link>
                  <button
                    onClick={() => handleEdit(playbook)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors"
                    aria-label={`Edit ${playbook.name}`}
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => requestDelete(playbook.id)}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label={`Delete ${playbook.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Playbook Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 animate-bounce-in shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  {editing ? 'Edit Setup Playbook' : 'Create Setup Playbook'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                aria-label="Close playbook form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Setup Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. 15m Opening Range Breakout"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Market Condition
                  </label>
                  <select
                    value={form.marketCondition}
                    onChange={(e) => setForm({ ...form, marketCondition: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Breakout">Breakout</option>
                    <option value="Trend Continuation">Trend Following</option>
                    <option value="Reversal">Reversal / Fade</option>
                    <option value="Mean Reversion">Mean Reversion</option>
                    <option value="Range Bound">Range Bound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Primary Timeframe
                  </label>
                  <input
                    type="text"
                    value={form.timeframe}
                    onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. 5m / 15m"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Target R:R
                  </label>
                  <input
                    type="text"
                    value={form.targetRR}
                    onChange={(e) => setForm({ ...form, targetRR: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. 1:2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Strategy Overview & Logic
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                  placeholder="Explain why this setup works, market participants involved, and edge..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-500 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Entry Criteria (Confirmation Checklist)
                </label>
                <textarea
                  value={form.entryCriteria}
                  onChange={(e) => setForm({ ...form, entryCriteria: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                  placeholder="1. Clean break of level on high volume\n2. 5m candle close outside range\n3. Orderflow delta positive..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-500 mb-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Exit & Profit Taking Rules
                </label>
                <textarea
                  value={form.exitCriteria}
                  onChange={(e) => setForm({ ...form, exitCriteria: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-rose-500/30 bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                  placeholder="Exit 50% at 1.5R, trail stop with 9 EMA or session VWAP breach..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-500 mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Stop Loss & Setup Invalidation Rule
                </label>
                <textarea
                  value={form.invalidationRule}
                  onChange={(e) => setForm({ ...form, invalidationRule: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                  placeholder="When does this trade thesis fail? e.g. Candle close below swing low..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-semibold text-foreground cursor-pointer">
                  Active Playbook (Eligible for trade tagging in Journal)
                </label>
              </div>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-border">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-brand"
              >
                {saving ? 'Saving Playbook…' : editing ? 'Update Playbook' : 'Save Playbook'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Playbook"
        description="This will permanently delete the playbook and its criteria. This action cannot be undone."
        confirmLabel="Delete Playbook"
        danger
        loading={confirmLoading}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmId(null);
        }}
      />
    </div>
  );
}
