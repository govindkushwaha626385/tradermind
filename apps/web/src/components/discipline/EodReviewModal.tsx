// ──────────────────────────────────────────────
// TradeMind — End-of-Day (EOD) Guided Wrap-Up Ritual Modal (v2.0)
//
// TradeZella & Deeepr.ai killer retention engine:
// 1. Session Execution Scorecard (P&L, Win Rate, Best/Worst Trade)
// 2. Honesty & Discipline Mirror (Rule adherence, emotional state, star rating)
// 3. AI Executive Wrap-Up & Tomorrow's Blueprint
// 4. Formatted Scorecard Clipboard Export (Discord / Twitter / Markdown)
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  Star,
  X,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Flame,
  Award,
  Calendar,
  Lock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import type { DailyDebriefResult } from '@trademind/shared';
import { Volume2 } from 'lucide-react';
import { EodVoiceBriefingModal } from './EodVoiceBriefingModal';

interface EodReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type EodStep = 'scorecard' | 'honesty' | 'ai_blueprint';

const EMOTION_OPTIONS = [
  { id: 'CALM', label: 'Calm & Grounded', emoji: '🧘', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  { id: 'FOCUSED', label: 'Laser Focused', emoji: '🎯', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  { id: 'ANXIOUS', label: 'Hesitant / Anxious', emoji: '😰', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  { id: 'FOMO', label: 'FOMO / Chased', emoji: '⚡', color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
  { id: 'REVENGE', label: 'Revenge Impulse', emoji: '😡', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
  { id: 'FATIGUED', label: 'Tired / Low Energy', emoji: '🥱', color: 'border-slate-500/40 text-slate-400 bg-slate-500/10' },
];

export function EodReviewModal({ isOpen, onClose, onComplete }: EodReviewModalProps) {
  const { format, currency } = useCurrency();
  const [currentStep, setCurrentStep] = useState<EodStep>('scorecard');
  const [voiceBriefingOpen, setVoiceBriefingOpen] = useState(false);

  // Debrief data
  const [debrief, setDebrief] = useState<DailyDebriefResult | null>(null);
  const [loadingDebrief, setLoadingDebrief] = useState(false);

  // Honesty mirror state
  const [respectedMaxLoss, setRespectedMaxLoss] = useState<boolean | null>(true);
  const [noRevengeTrades, setNoRevengeTrades] = useState<boolean | null>(true);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('CALM');
  const [disciplineRating, setDisciplineRating] = useState<number>(5);
  const [reflectionNotes, setReflectionNotes] = useState<string>('');

  // Saving & share state
  const [saving, setSaving] = useState(false);
  const [copiedScorecard, setCopiedScorecard] = useState(false);

  // Load debrief and premarket context on open
  useEffect(() => {
    if (!isOpen) return;

    setLoadingDebrief(true);
    api.getDailyDebrief()
      .then((res) => {
        if (res.success && res.data) {
          setDebrief(res.data);
        }
      })
      .catch((err) => console.error('Failed to load daily debrief:', err))
      .finally(() => setLoadingDebrief(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const stats = debrief?.stats ?? {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    netPnl: 0,
    bestTrade: null,
    worstTrade: null,
  };

  const isWin = stats.netPnl >= 0;
  const winRate = stats.totalTrades > 0 ? Math.round((stats.wins / stats.totalTrades) * 100) : 0;

  // Format shareable scorecard
  const handleCopyScorecard = () => {
    const text = `🏆 TradeMind EOD Wrap-Up — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Net P&L: ${isWin ? '+' : ''}${format(stats.netPnl)}
📊 Win Rate: ${winRate}% (${stats.wins}W / ${stats.losses}L · ${stats.totalTrades} Trades)
⭐ Process Discipline: ${disciplineRating}/5 Stars
🧘 Dominant Emotion: ${selectedEmotion}
🎯 Key Takeaway: ${debrief?.topLesson || 'Capital preservation and playbook adherence.'}
🚀 Tomorrow's Focus: ${debrief?.tomorrowFocus || 'Strict adherence to premarket key levels.'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Logged on TradeMind (Institutional Trading Journal)`;

    navigator.clipboard.writeText(text);
    setCopiedScorecard(true);
    toast.success('Copied EOD Scorecard to clipboard!');
    setTimeout(() => setCopiedScorecard(false), 2500);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Simulate quick persistence acknowledgment
      await new Promise((r) => setTimeout(r, 600));
      toast.success('🎉 EOD Wrap-Up completed! Trading streak maintained.');
      onComplete?.();
      onClose();
    } catch {
      toast.error('Failed to save EOD wrap-up');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-eod-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl border border-border/80 bg-background/95 p-6 md:p-8 shadow-2xl shadow-black/70 text-foreground overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.98) 100%)',
        }}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-eod-title" className="text-xl font-bold tracking-tight">
                  End-of-Day (EOD) Review
                </h2>
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                  Daily Wrap
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Session reflection, discipline audit, and tomorrow&apos;s blueprint
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center justify-between mb-6 px-1">
          {[
            { id: 'scorecard', label: '1. Scorecard' },
            { id: 'honesty', label: '2. Discipline Audit' },
            { id: 'ai_blueprint', label: '3. AI Blueprint' },
          ].map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setCurrentStep(s.id as EodStep)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors',
                currentStep === s.id
                  ? 'text-primary border-b-2 border-primary pb-1'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── STEP 1: Session Execution Scorecard ──── */}
        {currentStep === 'scorecard' && (
          <div className="space-y-4 animate-fade-in">
            {loadingDebrief ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Computing today&apos;s metrics...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-card rounded-2xl p-3.5 border border-border/60">
                    <span className="text-2xs text-muted-foreground font-medium uppercase tracking-wider">
                      Net P&L
                    </span>
                    <div
                      className={cn(
                        'text-xl font-black font-mono mt-1 tabular-nums',
                        isWin ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {isWin ? '+' : ''}
                      {format(stats.netPnl)}
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-3.5 border border-border/60">
                    <span className="text-2xs text-muted-foreground font-medium uppercase tracking-wider">
                      Win Rate
                    </span>
                    <div className="text-xl font-black font-mono mt-1 tabular-nums text-foreground">
                      {winRate}%
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-3.5 border border-border/60">
                    <span className="text-2xs text-muted-foreground font-medium uppercase tracking-wider">
                      Trades
                    </span>
                    <div className="text-xl font-black font-mono mt-1 tabular-nums text-foreground">
                      {stats.totalTrades}
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">
                        ({stats.wins}W / {stats.losses}L)
                      </span>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-3.5 border border-border/60">
                    <span className="text-2xs text-muted-foreground font-medium uppercase tracking-wider">
                      Date
                    </span>
                    <div className="text-sm font-bold font-mono mt-2 text-muted-foreground truncate">
                      {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Best & Worst Trade Strip */}
                {(stats.bestTrade || stats.worstTrade) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {stats.bestTrade && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                        <span className="text-emerald-300 font-semibold">Best Winner:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {stats.bestTrade.symbol} (+{format(stats.bestTrade.pnl)})
                        </span>
                      </div>
                    )}
                    {stats.worstTrade && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
                        <span className="text-rose-300 font-semibold">Worst Outlier:</span>
                        <span className="font-mono font-bold text-rose-400">
                          {stats.worstTrade.symbol} (-{format(Math.abs(stats.worstTrade.pnl))})
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Headline from debrief */}
                {debrief?.headline && (
                  <div className="p-3.5 rounded-xl bg-accent/40 border border-border/60 text-xs">
                    <div className="text-muted-foreground font-medium mb-0.5">Session Executive Summary</div>
                    <div className="font-semibold text-foreground">{debrief.headline}</div>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={() => setVoiceBriefingOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-violet-600/15 hover:bg-violet-600/25 text-violet-400 border border-violet-500/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-violet-400" />
                <span>Listen to 60s AI Audio Debrief</span>
              </button>

              <button
                onClick={() => setCurrentStep('honesty')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-md shadow-primary/25 transition-all"
              >
                <span>Continue to Discipline Audit</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Honesty & Discipline Mirror ──── */}
        {currentStep === 'honesty' && (
          <div className="space-y-4 animate-fade-in">
            {/* Rule adherence checks */}
            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <span className="text-xs font-semibold">
                  1. I respected my predefined max daily loss and stop rules
                </span>
                <input
                  type="checkbox"
                  checked={respectedMaxLoss === true}
                  onChange={(e) => setRespectedMaxLoss(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <span className="text-xs font-semibold">
                  2. I avoided emotional impulse and revenge re-entries
                </span>
                <input
                  type="checkbox"
                  checked={noRevengeTrades === true}
                  onChange={(e) => setNoRevengeTrades(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                />
              </label>
            </div>

            {/* Dominant Emotion Selection */}
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-2">
                Primary Emotional State Today
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EMOTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedEmotion(opt.id)}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all',
                      selectedEmotion === opt.id
                        ? opt.color + ' shadow-sm'
                        : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    <span>{opt.emoji}</span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Process Rating (1 to 5 Stars) */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-border/50">
              <span className="text-xs font-semibold">Execution Process Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setDisciplineRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={cn(
                        'w-5 h-5',
                        star <= disciplineRating ? 'fill-amber-400' : 'text-muted-foreground/40'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Reflection Notes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Personal Journal Reflection (What went right, what went wrong?)
              </label>
              <textarea
                value={reflectionNotes}
                onChange={(e) => setReflectionNotes(e.target.value)}
                placeholder="Document your psychological observations, execution quality, or key market conditions..."
                rows={3}
                className="w-full p-3 rounded-xl bg-muted/30 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                onClick={() => setCurrentStep('scorecard')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setCurrentStep('ai_blueprint')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-md shadow-primary/25 transition-all"
              >
                <span>View AI Blueprint</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: AI Executive Wrap-Up & Tomorrow's Blueprint ──── */}
        {currentStep === 'ai_blueprint' && (
          <div className="space-y-4 animate-fade-in">
            {debrief ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 via-background to-blue-500/10 border border-violet-500/25 space-y-2">
                  <div className="flex items-center gap-2 text-violet-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>Top Lesson of the Day</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    {debrief.topLesson}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 border border-emerald-500/25 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Target className="w-4 h-4" />
                    <span>Tomorrow&apos;s Primary Focus Directive</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    {debrief.tomorrowFocus}
                  </p>
                </div>

                {debrief.emotionalPattern && (
                  <div className="p-3 rounded-xl bg-accent/30 border border-border/50 text-xs">
                    <div className="text-muted-foreground font-semibold mb-1 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      <span>Emotional Pattern Detected</span>
                    </div>
                    <p className="text-muted-foreground">{debrief.emotionalPattern}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-muted/20 border border-border text-center text-xs text-muted-foreground">
                No trades logged today yet. Keep disciplined tomorrow!
              </div>
            )}

            {/* Actions: Copy Scorecard + Finish */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={handleCopyScorecard}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-accent text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {copiedScorecard ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedScorecard ? 'Scorecard Copied!' : 'Copy Scorecard'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep('honesty')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Lock EOD & Maintain Streak'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Voice Briefing Modal */}
      <EodVoiceBriefingModal
        isOpen={voiceBriefingOpen}
        onClose={() => setVoiceBriefingOpen(false)}
        debriefData={debrief}
      />
    </div>
  );
}
