// ──────────────────────────────────────────────
// TradeMind — Goals Page (/dashboard/goals)
//
// Set and track performance & discipline targets.
// Supports P&L, win-rate, profit factor, trade count,
// and streak goals with progress visualization.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  BarChart3,
  Trophy,
  Flame,
  Percent,
  Activity,
  CheckCircle2,
  Clock,
  X,
  Pencil,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { Badge } from '@/components/ui/Badge';

// ── Goal Types Config ─────────────────────────
const GOAL_TYPES = [
  { value: 'pnl',              label: 'Net P&L',         icon: TrendingUp,  unit: '₹',  desc: 'Total net profit/loss target' },
  { value: 'win_rate',         label: 'Win Rate',        icon: Percent,     unit: '%',  desc: 'Percentage of winning trades' },
  { value: 'profit_factor',    label: 'Profit Factor',   icon: BarChart3,   unit: 'x',  desc: 'Gross win / gross loss ratio' },
  { value: 'trade_count',      label: 'Trade Count',     icon: Activity,    unit: '',   desc: 'Number of trades executed' },
  { value: 'avg_rr',           label: 'Avg R:R',         icon: Target,      unit: ':1', desc: 'Average risk/reward ratio' },
  { value: 'streak',           label: 'Win Streak',      icon: Flame,       unit: '',   desc: 'Consecutive winning trades' },
] as const;

const PERIODS = [
  { value: 'DAILY',     label: 'Today' },
  { value: 'WEEKLY',    label: 'This Week' },
  { value: 'MONTHLY',   label: 'This Month' },
  { value: 'QUARTERLY', label: 'This Quarter' },
  { value: 'YEARLY',    label: 'This Year' },
  { value: 'ALL_TIME',  label: 'All Time' },
];

const EMOJIS = ['🎯', '💰', '🏆', '🔥', '📈', '⚡', '🚀', '💎', '🌟', '🏅'];

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500', glow: 'shadow-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
  violet:  { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', bar: 'bg-violet-500', glow: 'shadow-violet-500/20' },
  amber:   { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', bar: 'bg-amber-500', glow: 'shadow-amber-500/20' },
  rose:    { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', bar: 'bg-rose-500', glow: 'shadow-rose-500/20' },
} as const;

type GoalColor = keyof typeof COLOR_MAP;

interface Goal {
  id: string;
  title: string;
  description?: string;
  type: string;
  targetValue: string;
  currentValue: string;
  progressPct: string;
  period: string;
  emoji: string;
  color: GoalColor;
  isCompleted: boolean;
  isActive: boolean;
  completedAt?: string;
  createdAt: string;
}

// ── Create/Edit Modal ─────────────────────────
function GoalModal({
  onClose,
  onSave,
  editGoal,
}: {
  onClose: () => void;
  onSave: (goal: Goal) => void;
  editGoal?: Goal;
}) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(editGoal?.title ?? '');
  const [description, setDescription] = useState(editGoal?.description ?? '');
  const [type, setType] = useState(editGoal?.type ?? 'pnl');
  const [targetValue, setTargetValue] = useState(editGoal ? Number(editGoal.targetValue) : 0);
  const [period, setPeriod] = useState(editGoal?.period ?? 'MONTHLY');
  const [emoji, setEmoji] = useState(editGoal?.emoji ?? '🎯');
  const { currencySymbol } = useCurrency();
  const [color, setColor] = useState<GoalColor>((editGoal?.color as GoalColor) ?? 'blue');

  const selectedType = GOAL_TYPES.find((t) => t.value === type);

  async function handleSave() {
    if (!title.trim()) { toast.error('Please enter a goal title'); return; }
    if (targetValue <= 0) { toast.error('Target value must be greater than 0'); return; }

    setSaving(true);
    try {
      let res;
      if (editGoal) {
        res = await api.updateGoal(editGoal.id, { title, description, targetValue, period, emoji, color });
      } else {
        res = await api.createGoal({ title, description, type, targetValue, period, emoji, color });
      }
      if (res.success) {
        toast.success(editGoal ? 'Goal updated!' : 'Goal created!');
        onSave(res.data as Goal);
      } else {
        toast.error('Failed to save goal');
      }
    } catch {
      toast.error('Failed to save goal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-lg">{editGoal ? 'Edit Goal' : 'New Goal'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Emoji + Color picker */}
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn('w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all', emoji === e ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-accent')}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="flex items-center gap-2">
            {(Object.keys(COLOR_MAP) as GoalColor[]).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn('w-6 h-6 rounded-full transition-all', COLOR_MAP[c].bar, color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : 'opacity-60 hover:opacity-100')}
              />
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Goal Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. Hit ${currencySymbol}50K profit this month`}
              className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          {/* Type (only on create) */}
          {!editGoal && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Goal Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_TYPES.map((gt) => (
                  <button
                    key={gt.value}
                    onClick={() => setType(gt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all',
                      type === gt.value
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-accent/30 border-border text-muted-foreground hover:text-foreground hover:border-border/60',
                    )}
                  >
                    <gt.icon className="w-3.5 h-3.5" />
                    {gt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Target + Period row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Target {selectedType?.value === 'pnl' ? currencySymbol : selectedType?.unit}
              </label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Why this goal matters to you..."
              className="w-full px-3 py-2 rounded-xl bg-accent/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {editGoal ? 'Update Goal' : 'Create Goal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Goal Card ─────────────────────────────────
function GoalCard({
  goal,
  onRefresh,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onRefresh: (g: Goal) => void;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const colors = COLOR_MAP[goal.color] ?? COLOR_MAP.blue;
  const progress = Math.min(Math.max(Number(goal.progressPct), 0), 100);
  const current = Number(goal.currentValue);
  const target = Number(goal.targetValue);
  const typeInfo = GOAL_TYPES.find((t) => t.value === goal.type);
  const periodInfo = PERIODS.find((p) => p.value === goal.period);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await api.refreshGoal(goal.id);
      if (res.success) {
        onRefresh(res.data as Goal);
        if ((res as any).justCompleted) toast.success(`🎯 Goal "${goal.title}" completed!`);
      }
    } catch {
      toast.error('Failed to refresh goal');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await api.deleteGoal(goal.id);
      if (res.success) {
        toast.success('Goal deleted');
        onDelete(goal.id);
      }
    } catch {
      toast.error('Failed to delete goal');
    } finally {
      setDeleting(false);
    }
  }

  const { format } = useCurrency();

  function formatValue(v: number, type: string): string {
    if (type === 'pnl') return format(v);
    if (type === 'win_rate') return `${v.toFixed(1)}%`;
    if (type === 'profit_factor') return `${v.toFixed(2)}x`;
    if (type === 'avg_rr') return `${v.toFixed(2)}:1`;
    return v.toFixed(0);
  }

  return (
    <div className={cn(
      'group relative p-5 rounded-2xl border transition-all duration-200 hover:shadow-md',
      colors.bg,
      colors.border,
      goal.isCompleted && 'opacity-80',
    )}>
      {/* Completed badge */}
      {goal.isCompleted && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0', colors.bg, `shadow-lg ${colors.glow}`)}>
          {goal.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold leading-tight truncate">{goal.title}</h3>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {typeInfo && (
              <span className={cn('text-[10px] font-medium', colors.text)}>
                {typeInfo.label}
              </span>
            )}
            {periodInfo && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {periodInfo.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className={cn('text-2xl font-bold font-display', colors.text)}>
              {formatValue(current, goal.type)}
            </div>
            <div className="text-xs text-muted-foreground">
              of {formatValue(target, goal.type)} target
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold">{progress.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">progress</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', colors.bar)}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          Created {new Date(goal.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
            title="Refresh progress"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          </button>
          {!goal.isCompleted && (
            <button
              onClick={() => onEdit(goal)}
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
              title="Edit goal"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-all"
            title="Delete goal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────
export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | undefined>(undefined);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    document.title = 'Goals — TradeMind';
    fetchGoals();
  }, []);

  async function fetchGoals() {
    setLoading(true);
    try {
      const res = await api.getGoals();
      if (res.success) setGoals(res.data as Goal[]);
    } catch {
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  }

  function handleGoalSaved(goal: Goal) {
    setGoals((prev) => {
      const idx = prev.findIndex((g) => g.id === goal.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = goal;
        return updated;
      }
      return [goal, ...prev];
    });
    setShowModal(false);
    setEditGoal(undefined);
  }

  function handleGoalRefreshed(goal: Goal) {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
  }

  function handleGoalDeleted(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const filteredGoals = goals.filter((g) => {
    if (filter === 'active') return g.isActive && !g.isCompleted;
    if (filter === 'completed') return g.isCompleted;
    return true;
  });

  const activeCount = goals.filter((g) => g.isActive && !g.isCompleted).length;
  const completedCount = goals.filter((g) => g.isCompleted).length;
  const avgProgress = goals.length > 0
    ? goals.reduce((s, g) => s + Number(g.progressPct), 0) / goals.length
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Goals"
        description="Set performance targets and track your progress"
        icon={Target}
        actions={
          <button
            onClick={() => { setEditGoal(undefined); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        }
      />

      {/* Stats Strip */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <SectionCard className="text-center">
            <div className="text-2xl font-bold text-foreground font-display">{activeCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Active Goals</div>
          </SectionCard>
          <SectionCard className="text-center">
            <div className="text-2xl font-bold text-emerald-500 font-display">{completedCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Completed</div>
          </SectionCard>
          <SectionCard className="text-center">
            <div className="text-2xl font-bold text-primary font-display">{avgProgress.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">Avg Progress</div>
          </SectionCard>
        </div>
      )}

      {/* Filter tabs */}
      {goals.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-accent/50 rounded-xl w-fit">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f}
              {f === 'active' && activeCount > 0 && (
                <span className="ml-1.5 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          icon={Target}
          title={filter === 'completed' ? 'No completed goals yet' : filter === 'active' ? 'No active goals' : 'No goals yet'}
          description={
            filter === 'all'
              ? 'Set your first performance target. Track P&L, win rate, discipline score and more.'
              : `No ${filter} goals to show.`
          }
          action={
            filter === 'all'
              ? { label: 'Create Your First Goal', onClick: () => setShowModal(true) }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onRefresh={handleGoalRefreshed}
              onEdit={(g) => { setEditGoal(g); setShowModal(true); }}
              onDelete={handleGoalDeleted}
            />
          ))}

          {/* Add more goal CTA card */}
          <button
            onClick={() => { setEditGoal(undefined); setShowModal(true); }}
            className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all group min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-border group-hover:border-primary/40 flex items-center justify-center transition-all">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Add Another Goal</span>
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <GoalModal
          onClose={() => { setShowModal(false); setEditGoal(undefined); }}
          onSave={handleGoalSaved}
          editGoal={editGoal}
        />
      )}
    </div>
  );
}
