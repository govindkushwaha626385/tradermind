// ──────────────────────────────────────────────
// TradeMind — Pre-Market Routine & Guardrails Component
//
// Morning preparation tool for disciplined trading.
// Configures daily risk budget, trade limits, market bias,
// and pre-flight checklist. Synchronized with Behavioral Shield.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  Sun,
  Shield,
  ShieldCheck,
  Lock,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Zap,
  TrendingUp,
  TrendingDown,
  Scale,
  Activity,
  X,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import type { DailyPremarketPlan, PremarketChecklistItem, PremarketWatchlistItem } from '@trademind/shared';

interface PremarketRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanSaved?: (plan: DailyPremarketPlan) => void;
}

const DEFAULT_CHECKLIST: PremarketChecklistItem[] = [
  { id: '1', label: 'Mentally rested, calm, and zero revenge mindset from yesterday', checked: false },
  { id: '2', label: 'Checked macroeconomic calendar, RBI/Fed events & earnings news', checked: false },
  { id: '3', label: 'Identified major support / resistance zones on higher timeframes', checked: false },
  { id: '4', label: 'Fixed stop-loss and position size calculated before entering any trade', checked: false },
  { id: '5', label: 'Committed to walk away from terminal if 2 consecutive stop-losses are hit', checked: false },
];

export function PremarketRoutineModal({ isOpen, onClose, onPlanSaved }: PremarketRoutineModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marketBias, setMarketBias] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE'>('NEUTRAL');
  const [keyLevels, setKeyLevels] = useState('');
  const [maxDailyLoss, setMaxDailyLoss] = useState<string>('3000');
  const [maxDailyTrades, setMaxDailyTrades] = useState<string>('4');
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState<string>('1000');
  const [checklist, setChecklist] = useState<PremarketChecklistItem[]>(DEFAULT_CHECKLIST);
  const [watchlist, setWatchlist] = useState<PremarketWatchlistItem[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newDirection, setNewDirection] = useState<'LONG' | 'SHORT' | 'WATCH'>('LONG');
  const [newNotes, setNewNotes] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadPlan = async () => {
      setLoading(true);
      try {
        const res = await api.getTodayPremarketPlan();
        if (res.success && res.data) {
          const plan = res.data;
          setMarketBias(plan.marketBias ?? 'NEUTRAL');
          setKeyLevels(plan.keyLevels ?? '');
          setMaxDailyLoss(plan.maxDailyLoss ? String(plan.maxDailyLoss) : '3000');
          setMaxDailyTrades(plan.maxDailyTrades ? String(plan.maxDailyTrades) : '4');
          setMaxRiskPerTrade(plan.maxRiskPerTrade ? String(plan.maxRiskPerTrade) : '1000');
          if (plan.checklistItems && plan.checklistItems.length > 0) {
            setChecklist(plan.checklistItems);
          }
          if (plan.watchlist) {
            setWatchlist(plan.watchlist);
          }
          setIsLocked(plan.isLocked ?? false);
        }
      } catch (err) {
        console.error('Failed to load premarket plan:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  };

  const addWatchlistItem = () => {
    if (!newSymbol.trim()) return;
    setWatchlist((prev) => [
      ...prev,
      {
        symbol: newSymbol.trim().toUpperCase(),
        direction: newDirection,
        notes: newNotes.trim() || undefined,
      },
    ]);
    setNewSymbol('');
    setNewNotes('');
  };

  const removeWatchlistItem = (index: number) => {
    setWatchlist((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (lockNow = false) => {
    setSaving(true);
    try {
      const payload: Partial<DailyPremarketPlan> = {
        marketBias,
        keyLevels: keyLevels.trim() || undefined,
        maxDailyLoss: maxDailyLoss ? parseFloat(maxDailyLoss) : undefined,
        maxDailyTrades: maxDailyTrades ? parseInt(maxDailyTrades, 10) : undefined,
        maxRiskPerTrade: maxRiskPerTrade ? parseFloat(maxRiskPerTrade) : undefined,
        checklistItems: checklist,
        watchlist,
        isLocked: lockNow ? true : isLocked,
      };

      const res = await api.savePremarketPlan(payload);
      if (res.success && res.data) {
        if (lockNow) {
          await api.lockPremarketSession();
          setIsLocked(true);
          toast.success('Session locked in! Behavioral Shield guardrails are now active.');
        } else {
          toast.success('Pre-market preparation saved.');
        }
        if (onPlanSaved) onPlanSaved(res.data);
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save pre-market plan');
    } finally {
      setSaving(false);
    }
  };

  const checkedCount = checklist.filter((i) => i.checked).length;
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card rounded-2xl border border-border/80 shadow-2xl p-5 sm:p-6 space-y-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">Pre-Market Preparation Routine</h2>
                {isLocked ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Session Locked
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Prep Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{todayStr} • Define rules &amp; budget before entering any position</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Market Bias Selector */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
            1. Market Bias &amp; Structure
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'BULLISH', label: 'Bullish', icon: TrendingUp, color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
              { id: 'BEARISH', label: 'Bearish', icon: TrendingDown, color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
              { id: 'NEUTRAL', label: 'Rangebound', icon: Scale, color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
              { id: 'VOLATILE', label: 'High Volatility', icon: Zap, color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
            ].map((bias) => (
              <button
                key={bias.id}
                type="button"
                onClick={() => setMarketBias(bias.id as any)}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all',
                  marketBias === bias.id
                    ? cn(bias.color, 'ring-1 ring-primary/40 shadow-sm')
                    : 'bg-background/50 border-border/50 text-muted-foreground hover:bg-accent',
                )}
              >
                <bias.icon className="w-4 h-4 shrink-0" />
                <span>{bias.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Key Levels & Macro Context */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">
            2. Key Levels &amp; Support/Resistance
          </label>
          <input
            type="text"
            value={keyLevels}
            onChange={(e) => setKeyLevels(e.target.value)}
            placeholder="e.g., Nifty 25,200 Support / 25,500 Major Resistance, US Fed rate decision today"
            className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* 3. Session Risk Budget (Shield Sync) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              3. Session Risk Budget &amp; Trade Cap
            </label>
            <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
              <Shield className="w-3 h-3" /> Syncs with Behavioral Shield
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Max Daily Loss (₹ Stop)</label>
              <input
                type="number"
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(e.target.value)}
                placeholder="3000"
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Halt trading if reached</span>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Max Trades Cap</label>
              <input
                type="number"
                value={maxDailyTrades}
                onChange={(e) => setMaxDailyTrades(e.target.value)}
                placeholder="4"
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Overtrading protection</span>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Risk Per Trade (₹)</label>
              <input
                type="number"
                value={maxRiskPerTrade}
                onChange={(e) => setMaxRiskPerTrade(e.target.value)}
                placeholder="1000"
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Max risk on single entry</span>
            </div>
          </div>
        </div>

        {/* 4. Pre-Flight Discipline Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              4. Pre-Flight Discipline Checklist ({checkedCount}/{checklist.length})
            </label>
          </div>

          <div className="space-y-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                  item.checked
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground'
                    : 'bg-background/40 border-border/40 text-muted-foreground hover:bg-accent/40',
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                    item.checked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-border/60',
                  )}
                >
                  {item.checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className={cn('text-xs font-medium leading-tight', item.checked && 'text-foreground')}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Watchlist & Game Plan */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
            5. Today&apos;s Focus Watchlist ({watchlist.length})
          </label>

          {/* List of planned setups */}
          {watchlist.length > 0 && (
            <div className="space-y-2 mb-3">
              {watchlist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-background/60 border border-border/40 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md font-bold text-[10px]',
                        item.direction === 'LONG'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : item.direction === 'SHORT'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-blue-500/15 text-blue-400',
                      )}
                    >
                      {item.direction}
                    </span>
                    <span className="font-bold text-foreground">{item.symbol}</span>
                    {item.notes && <span className="text-muted-foreground text-[11px]">— {item.notes}</span>}
                  </div>
                  <button
                    onClick={() => removeWatchlistItem(idx)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Watchlist Item Builder */}
          <div className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl bg-accent/20 border border-border/40">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="Symbol (e.g. RELIANCE)"
              className="w-full sm:w-36 px-3 py-1.5 rounded-lg border border-input bg-background text-xs font-semibold uppercase focus:outline-none"
            />
            <select
              value={newDirection}
              onChange={(e) => setNewDirection(e.target.value as any)}
              className="w-full sm:w-28 px-3 py-1.5 rounded-lg border border-input bg-background text-xs font-semibold focus:outline-none"
            >
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
              <option value="WATCH">WATCH</option>
            </select>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Trigger (e.g. Breakout above 3020)"
              className="w-full flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={addWatchlistItem}
              className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Locking will enforce these parameters in your real-time Behavioral Shield</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-input text-xs font-semibold hover:bg-accent transition-colors"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Session &amp; Trade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
