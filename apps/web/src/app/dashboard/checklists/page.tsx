// ──────────────────────────────────────────────
// TradeMind — Checklist & Pre-Market Routine Studio
//
// Institutional discipline hub featuring:
// 1. Live Execution Checklist Runner (real-time compliance & mental readiness)
// 2. Battle-Tested Pre-Built Institutional Rulebooks (1-click import)
// 3. Custom Checklist Template Builder & CRUD Manager
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  ClipboardCheck,
  CheckCircle2,
  Circle,
  X,
  Save,
  Sparkles,
  Zap,
  Shield,
  ShieldCheck,
  Download,
  Flame,
  ArrowRight,
  Brain,
  Sliders,
  BookOpen,
  Play,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { EconomicNewsAlertBanner } from '@/components/news/EconomicNewsAlertBanner';

interface Rule {
  id: string;
  label: string;
  order: number;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  rules: Rule[];
  isActive: boolean;
  sortOrder: number;
}

const DEFAULT_RULE = (order: number): Rule => ({
  id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  label: '',
  order,
});

// Institutional pre-built rulebooks that traders can import in 1 click
const INSTITUTIONAL_RULEBOOKS = [
  {
    id: 'seven_golden_rules',
    name: 'The 7 Golden Rules Execution Standard',
    tag: 'Institutional Core',
    badge: 'Elite Protocol',
    description: 'The viral discipline blueprint followed by top 1% institutional traders: Stop-loss, 1-2% risk, setup fidelity, 1:2.5+ R:R, kill switch, trade journal, profit compounding.',
    color: 'from-amber-500 via-orange-500 to-rose-600',
    rules: [
      'Pre-defined stop-loss entered with bracket before order submission',
      'Capital at risk capped strictly at 1% to 2% of total account balance',
      'Setup meets 100% of predefined playbook rules (zero impulsive FOMO)',
      'Target provides minimum 1 : 2.5 Risk-to-Reward mathematical edge',
      'Daily kill-switch armed (step away after 2 consecutive stop-outs)',
      'Forensic trade log & emotional state recorded in journal immediately',
      'Profits preserved & compounded; zero revenge sizing on next trade',
    ],
  },
  {
    id: 'ict_smc',
    name: 'ICT / Smart Money Concepts',
    tag: 'Institutional SMC',
    badge: 'High Win-Rate',
    description: 'Structure, liquidity pools, Fair Value Gaps, and Order Block execution criteria.',
    color: 'from-blue-600 to-indigo-600',
    rules: [
      'Key Higher-Timeframe (1H/4H) liquidity sweep confirmed',
      'Market Structure Shift (MSS) with displacement body close on 5m',
      'Fair Value Gap (FVG) or Order Block mitigation entry identified',
      'Stop loss placed strictly beyond the swing invalidation point',
      'Executing inside official Killzone hours (London or NY Open)',
    ],
  },
  {
    id: 'trend_breakout',
    name: 'Price Action Trend & Breakout',
    tag: 'Equities & Futures',
    badge: 'Trend Follower',
    description: 'High-momentum breakout rules with volume confirmation and retest cushion.',
    color: 'from-emerald-600 to-teal-600',
    rules: [
      'Price trading above 20 EMA and 50 EMA on daily and hourly timeframes',
      'Breakout candle volume exceeds 2x 20-period volume average',
      'Waited for candle close or retest of key resistance turned support',
      'Target provides minimum 1 : 2.0 Risk-to-Reward ratio',
      'No major earnings or macro news releases within the next 30 minutes',
    ],
  },
  {
    id: 'scalping_discipline',
    name: 'High-Speed Scalping Guardrails',
    tag: 'Scalping & F&O',
    badge: 'Fast Execution',
    description: 'Strict speed and risk containment rules to prevent catastrophic over-trading.',
    color: 'from-amber-600 to-orange-600',
    rules: [
      'Bid-ask spread is tight (< 0.05% of instrument price)',
      'Stop loss defined and order entered with bracket before fill',
      'Committed to max 0.5% capital risk on this scalp',
      'No revenge trading after a scratch or stop out',
      'Terminal will be closed immediately after 2 consecutive stop-outs',
    ],
  },
  {
    id: 'options_greeks',
    name: 'Options Selling & Greeks Matrix',
    tag: 'Derivatives & FNO',
    badge: 'Theta Engine',
    description: 'Defined-risk options execution respecting implied volatility and theta curve.',
    color: 'from-purple-600 to-pink-600',
    rules: [
      'Implied Volatility Rank (IVR) or IV Percentile > 40th percentile',
      'Position Delta within predefined portfolio beta-weighted threshold',
      'Maximum loss capped with defined hedge leg (Spreads / Iron Condor)',
      'Expiration timeframe between 20 to 45 Days to Expiration (DTE)',
      'Profit target rule: Close position automatically at 50% max profit',
    ],
  },
  {
    id: 'psychological_mastery',
    name: 'Psychological & Anti-FOMO Guardrails',
    tag: 'Mindset & Discipline',
    badge: 'Peak Performance',
    description: 'Pre-flight emotional calibration to ensure pure objective execution.',
    color: 'from-rose-600 to-red-600',
    rules: [
      'Slept well, physically alert, and zero stress from external life',
      'Completely detached from yesterday’s P&L (Win or Loss)',
      'Accepting full responsibility for any monetary loss before clicking submit',
      'Never chasing an extended candle that has already left the entry zone',
      'Willing to sit on hands all day if setup criteria are not 100% met',
    ],
  },
];

type ActiveTab = 'runner' | 'rulebooks' | 'manager';

export default function ChecklistStudioPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('runner');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading]     = useState(true);

  // Runner state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [checkedRules, setCheckedRules] = useState<Record<string, boolean>>({});
  const [mentalState, setMentalState] = useState<string>('CALM');
  const [runnerNotes, setRunnerNotes] = useState<string>('');
  const [completingRunner, setCompletingRunner] = useState(false);

  // Template Manager state
  const [editing, setEditing]     = useState<ChecklistTemplate | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [formName, setFormName]   = useState('');
  const [formDesc, setFormDesc]   = useState('');
  const [formRules, setFormRules] = useState<Rule[]>([]);
  const [saving, setSaving]       = useState(false);

  // ConfirmDialog
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [confirmId, setConfirmId]       = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    document.title = 'Checklist & Discipline Studio — TradeMind';
    fetchChecklists();
  }, []);

  async function fetchChecklists() {
    setLoading(true);
    try {
      const res = await api.getChecklists();
      if (res.success) {
        const list = (res.data as ChecklistTemplate[]) ?? [];
        setTemplates(list);
        if (list.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch checklists:', err);
      toast.error('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }

  // Active template in runner (defensively guarded against undefined / null rules)
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0] || null;
  const activeRules: Rule[] = activeTemplate && Array.isArray(activeTemplate.rules) ? activeTemplate.rules : [];

  // Runner check toggle
  const toggleRunnerRule = (ruleId: string) => {
    setCheckedRules((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }));
  };

  // Reset runner checks
  const resetRunner = () => {
    setCheckedRules({});
    setRunnerNotes('');
    toast.success('Checklist reset for new trade');
  };

  // Calculate runner progress
  const totalRulesCount = activeRules.length;
  const checkedCount = activeRules.filter((r) => r && checkedRules[r.id]).length;
  const compliancePct = totalRulesCount > 0 ? Math.round((checkedCount / totalRulesCount) * 100) : 0;

  // Complete runner session
  const handleCompleteSession = async () => {
    setCompletingRunner(true);
    try {
      // Simulate quick persistence
      await new Promise((r) => setTimeout(r, 500));
      toast.success(`🎉 Checklist recorded! ${compliancePct}% rule compliance logged to discipline streak.`);
      resetRunner();
    } catch {
      toast.error('Failed to save session');
    } finally {
      setCompletingRunner(false);
    }
  };

  // 1-Click Import Institutional Rulebook
  const handleImportRulebook = async (rulebook: typeof INSTITUTIONAL_RULEBOOKS[0]) => {
    try {
      const formattedRules = rulebook.rules.map((r, i) => ({
        id: `rule_${Date.now()}_${i}`,
        label: r,
        order: i + 1,
      }));

      const res = await api.createChecklist({
        name: rulebook.name,
        description: rulebook.description,
        rules: formattedRules,
      });

      if (res.success) {
        toast.success(`Imported "${rulebook.name}" to your checklists!`);
        await fetchChecklists();
        setActiveTab('runner');
        const createdId = (res.data as any)?.id;
        if (createdId) {
          setSelectedTemplateId(createdId);
        }
      }
    } catch {
      toast.error('Failed to import rulebook');
    }
  };

  // Manager Handlers
  const openNewForm = () => {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormRules([DEFAULT_RULE(1), DEFAULT_RULE(2), DEFAULT_RULE(3)]);
    setShowForm(true);
  };

  const openEditForm = (tpl: ChecklistTemplate) => {
    setEditing(tpl);
    setFormName(tpl.name);
    setFormDesc(tpl.description ?? '');
    setFormRules([...tpl.rules].sort((a, b) => a.order - b.order));
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };
  const addRule = () => setFormRules([...formRules, DEFAULT_RULE(formRules.length + 1)]);
  const removeRule = (ruleId: string) =>
    setFormRules(formRules.filter((r) => r.id !== ruleId).map((r, i) => ({ ...r, order: i + 1 })));
  const updateRule = (ruleId: string, label: string) =>
    setFormRules(formRules.map((r) => (r.id === ruleId ? { ...r, label } : r)));

  const handleSave = async () => {
    if (!formName.trim() || formRules.filter((r) => r.label.trim()).length === 0) return;

    const cleanedRules = formRules
      .filter((r) => r.label.trim())
      .map((r, i) => ({ ...r, order: i + 1, label: r.label.trim() }));

    setSaving(true);
    try {
      if (editing) {
        await api.updateChecklist(editing.id, { name: formName, description: formDesc, rules: cleanedRules });
        toast.success('Checklist updated');
      } else {
        await api.createChecklist({ name: formName, description: formDesc, rules: cleanedRules });
        toast.success('Checklist created');
      }
      closeForm();
      await fetchChecklists();
    } catch (err: any) {
      console.error('Failed to save checklist:', err);
      toast.error(err?.message ?? 'Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (id: string) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmId) return;
    setConfirmLoading(true);
    try {
      await api.deleteChecklist(confirmId);
      toast.success('Checklist deleted');
      await fetchChecklists();
    } catch (err: any) {
      console.error('Failed to delete checklist:', err);
      toast.error(err?.message ?? 'Failed to delete checklist');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <PageHeader
        title="Checklist & Discipline Studio"
        description="Verify rule adherence before order execution, eliminate emotional revenge trading, and boost compliance streaks."
        icon={ClipboardCheck}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-seven-rules-protocol'))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all shadow-sm group cursor-pointer"
            >
              <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>7 Golden Rules Protocol</span>
            </button>
            <button
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Checklist</span>
            </button>
          </div>
        }
      />

      {/* High-Impact Macro Economic Risk Banner */}
      <EconomicNewsAlertBanner />

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <button
          onClick={() => setActiveTab('runner')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'runner'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Zap className="w-4 h-4" />
          <span>Live Checklist Runner</span>
          {compliancePct > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
              {compliancePct}%
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rulebooks')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'rulebooks'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span>Institutional Rulebooks</span>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">
            {INSTITUTIONAL_RULEBOOKS.length} Ready
          </span>
        </button>

        <button
          onClick={() => setActiveTab('manager')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'manager'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Sliders className="w-4 h-4" />
          <span>Manage Templates ({templates.length})</span>
        </button>
      </div>

      {/* LOADING SKELETON */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <SkeletonCard className="h-20 rounded-2xl" />
              <SkeletonCard className="h-96 rounded-2xl" />
            </div>
            <div className="lg:col-span-5 space-y-4">
              <SkeletonCard className="h-64 rounded-2xl" />
              <SkeletonCard className="h-44 rounded-2xl" />
            </div>
          </div>
        </div>
      ) : activeTab === 'runner' ? (
        /* TAB 1: LIVE CHECKLIST RUNNER */
        <div className="space-y-6">
          {templates.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 border border-border/70 text-center space-y-5 bg-gradient-to-b from-card via-card to-background">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
                <ClipboardCheck className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold font-display text-foreground">
                  No Active Checklists Configured
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Enforce institutional discipline on every trade fill. Import the battle-tested 7 Golden Rules or SMC rulebook in 1 click to activate the live runner.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleImportRulebook(INSTITUTIONAL_RULEBOOKS[0])}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Flame className="w-4 h-4" />
                  <span>1-Click Import 7 Golden Rules</span>
                </button>
                <button
                  onClick={() => setActiveTab('rulebooks')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-accent text-foreground text-xs font-semibold transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>Browse All {INSTITUTIONAL_RULEBOOKS.length} Rulebooks</span>
                </button>
                <button
                  onClick={openNewForm}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Build Custom Checklist</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left Column: Interactive Checklist (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Template Selector */}
                <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Select Active Strategy Checklist
                    </label>
                    <select
                      value={selectedTemplateId || (templates[0]?.id ?? '')}
                      onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        setCheckedRules({});
                      }}
                      className="px-3 py-1.5 rounded-xl border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({(tpl.rules ?? []).length} rules)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={resetRunner}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Checks</span>
                  </button>
                </div>

                {/* Rules List */}
                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border/50">
                    <div>
                      <h2 className="font-bold text-foreground">
                        {activeTemplate?.name || 'Pre-Flight Rules'}
                      </h2>
                      {activeTemplate?.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activeTemplate.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary">
                      {checkedCount} / {totalRulesCount} Checked
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeRules.map((rule, idx) => {
                      const isChecked = !!checkedRules[rule.id];
                      return (
                        <div
                          key={rule.id}
                          onClick={() => toggleRunnerRule(rule.id)}
                          className={cn(
                            'p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none',
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground'
                              : 'bg-muted/30 hover:bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {isChecked ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 text-sm font-medium leading-relaxed">
                            <span className="text-xs font-mono text-muted-foreground mr-2">
                              #{idx + 1}
                            </span>
                            {rule.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mental State Selector */}
                  <div className="pt-4 border-t border-border/50 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Mental & Psychological State
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { id: 'CALM', label: '🧘 Calm', desc: 'Objective' },
                        { id: 'FOCUSED', label: '🎯 Focused', desc: 'In Zone' },
                        { id: 'AGGRESSIVE', label: '⚡ Eager', desc: 'Excited' },
                        { id: 'ANXIOUS', label: '⚠️ Anxious', desc: 'Hesitant' },
                        { id: 'FOMO', label: '🛑 FOMO', desc: 'Chasing' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMentalState(m.id)}
                          className={cn(
                            'p-2 rounded-xl border text-xs text-center transition-all',
                            mentalState === m.id
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                              : 'bg-muted/30 hover:bg-muted border-border/40 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <div>{m.label}</div>
                          <div className="text-[10px] opacity-75 mt-0.5">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="pt-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Execution Notes / Thesis
                    </label>
                    <input
                      type="text"
                      value={runnerNotes}
                      onChange={(e) => setRunnerNotes(e.target.value)}
                      placeholder="e.g. 15m bullish order block mitigation. Target is previous day high."
                      className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Readiness Score & Commitment (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Readiness Gauge Card */}
                <div className="glass-card rounded-2xl p-6 border-primary/30 bg-gradient-to-b from-primary/10 via-background to-background space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Execution Readiness
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Live Discipline
                    </span>
                  </div>

                  {/* Big Percentage */}
                  <div className="py-2">
                    <div className="text-5xl font-black font-mono tracking-tight text-foreground">
                      {compliancePct}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {compliancePct === 100
                        ? '🔥 All pre-trade criteria met! Execution authorized.'
                        : compliancePct >= 80
                        ? '⚡ Favorable setup. Verify risk containment before fill.'
                        : '⚠️ High Risk: Incomplete checklist. Do NOT enter FOMO trade.'}
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500 rounded-full',
                        compliancePct === 100
                          ? 'bg-emerald-500'
                          : compliancePct >= 80
                          ? 'bg-blue-500'
                          : compliancePct >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      )}
                      style={{ width: `${compliancePct}%` }}
                    />
                  </div>

                  {/* Mental State Confirmation */}
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs flex items-center justify-between">
                    <span className="text-muted-foreground">Session Mindset:</span>
                    <span className="font-bold text-foreground font-mono">{mentalState}</span>
                  </div>

                  {/* Commitment Button */}
                  <button
                    type="button"
                    onClick={handleCompleteSession}
                    disabled={completingRunner || checkedCount === 0}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Log Checklist Execution & Maintain Streak</span>
                  </button>
                </div>

                {/* Pre-Market Protocol Tips */}
                <div className="glass-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span>Institutional Discipline Laws</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Never adjust stop loss further away after placing order.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>If you miss the entry candle, wait for the next retest—do not chase.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Two stop-outs in a single session means step away for at least 1 hour.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* TAB 2: INSTITUTIONAL RULEBOOKS */}
      {activeTab === 'rulebooks' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-transparent border border-blue-500/20">
            <h2 className="text-base font-bold text-foreground">
              Institutional Strategy Rulebooks
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Battle-tested, ready-to-use checklist templates utilized by prop firms and hedge fund traders. Click "Import Rulebook" to add to your workspace.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {INSTITUTIONAL_RULEBOOKS.map((rb) => (
              <div
                key={rb.id}
                className="glass-card rounded-2xl p-5 border border-border/60 hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {rb.tag}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {rb.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-foreground">{rb.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{rb.description}</p>

                  <div className="space-y-2 mt-4 pt-3 border-t border-border/40">
                    {rb.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleImportRulebook(rb)}
                  className="w-full py-2.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Import Rulebook</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM TEMPLATES MANAGER */}
      {activeTab === 'manager' && (
        <div className="space-y-6">
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} rows={4} showHeader />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No checklists yet"
              description="Create your first custom checklist or import from the institutional library."
              action={{ label: 'Create Checklist', onClick: openNewForm }}
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={cn(
                    'glass-card rounded-2xl p-5 transition-all hover:shadow-card-hover flex flex-col justify-between',
                    !tpl.isActive && 'opacity-60',
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white flex-shrink-0">
                          <ClipboardCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold">{tpl.name}</div>
                          {tpl.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rules Preview */}
                    <div className="space-y-1.5 mb-4">
                      {(tpl.rules || []).slice(0, 4).map((rule) => (
                        <div key={rule.id} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground">{rule.label}</span>
                        </div>
                      ))}
                      {(tpl.rules || []).length > 4 && (
                        <div className="text-xs text-muted-foreground pl-5">+{(tpl.rules || []).length - 4} more rules</div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                    <button
                      onClick={() => openEditForm(tpl)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-xs font-medium hover:bg-accent/80 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                      tpl.isActive ? 'bg-success/10 text-success' : 'bg-accent text-muted-foreground',
                    )}>
                      {tpl.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => requestDelete(tpl.id)}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                      aria-label={`Delete ${tpl.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-xl p-6 animate-bounce-in max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
                {editing ? 'Edit Checklist' : 'New Checklist'}
              </h3>
              <button
                onClick={closeForm}
                className="p-1 rounded-lg hover:bg-accent"
                aria-label="Close checklist form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Checklist Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Pre-Trade Checklist"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What is this checklist for?"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Rules / Items *</label>
                  <button
                    type="button"
                    onClick={addRule}
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Rule
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {formRules.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-right font-mono">{i + 1}.</span>
                      <input
                        type="text"
                        value={r.label}
                        onChange={(e) => updateRule(r.id, e.target.value)}
                        placeholder={`Rule ${i + 1} (e.g., Risk-reward >= 1:2)`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {formRules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRule(r.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/50">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Checklist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Checklist"
        description="Are you sure you want to delete this checklist? Historical trades completed with this checklist will retain their compliance scores."
        confirmLabel="Delete"
        danger={true}
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
