// ──────────────────────────────────────────────
// TradeMind — Interactive Roadmap Scenario Challenge Modal
// Presents real-market trade dilemmas to test execution discipline
// before marking a milestone complete and awarding XP.
// ──────────────────────────────────────────────

'use client';

import { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Trophy,
  RotateCcw,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoadmapMilestone } from '@/lib/roadmap-data';

interface RoadmapScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: RoadmapMilestone | null;
  onPass: (milestoneId: string, xpEarned: number) => void;
}

export function RoadmapScenarioModal({
  isOpen,
  onClose,
  milestone,
  onPass,
}: RoadmapScenarioModalProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !milestone || !milestone.scenario) return null;

  const { scenario } = milestone;
  const isCorrect = selectedOption === scenario.correctIndex;

  const handleSelect = (idx: number) => {
    if (submitted) return;
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setSubmitted(true);
    if (selectedOption === scenario.correctIndex) {
      onPass(milestone.id, milestone.xpPoints);
    }
  };

  const handleReset = () => {
    setSelectedOption(null);
    setSubmitted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl border border-border/80 bg-card shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider font-mono">
                Scenario Challenge
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                +{milestone.xpPoints} XP
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              {milestone.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question Prompt */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary font-mono">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Market Simulation Dilemma</span>
          </div>
          <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed">
            {scenario.question}
          </p>
        </div>

        {/* Options List */}
        <div className="space-y-2.5">
          {scenario.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            let stateStyle = 'border-border/60 hover:border-primary/40 hover:bg-accent/40';

            if (submitted) {
              if (idx === scenario.correctIndex) {
                stateStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold';
              } else if (isSelected) {
                stateStyle = 'border-rose-500 bg-rose-500/10 text-rose-400';
              } else {
                stateStyle = 'opacity-50 border-border/40';
              }
            } else if (isSelected) {
              stateStyle = 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/40';
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(idx)}
                disabled={submitted}
                className={cn(
                  'w-full text-left p-3.5 rounded-2xl border text-sm transition-all flex items-start gap-3',
                  stateStyle
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/80 bg-background text-muted-foreground'
                  )}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="flex-1 leading-snug">{option}</span>
                {submitted && idx === scenario.correctIndex && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {submitted && isSelected && idx !== scenario.correctIndex && (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Section if Submitted */}
        {submitted && (
          <div
            className={cn(
              'p-4 rounded-2xl border space-y-2 text-xs sm:text-sm animate-fade-in',
              isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            )}
          >
            <div className="flex items-center gap-2 font-bold">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Correct! Institutional Protocol Verified (+{milestone.xpPoints} XP)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Incorrect Execution Response</span>
                </>
              )}
            </div>
            <p className="text-foreground/90 leading-relaxed text-xs">
              {scenario.explanation}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div>
            {submitted && !isCorrect && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={selectedOption === null}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg transition-all',
                  selectedOption !== null
                    ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                <span>Verify Answer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold shadow-lg shadow-primary/20 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Continue Roadmap</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
