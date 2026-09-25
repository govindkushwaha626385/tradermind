// ──────────────────────────────────────────────
// TradeMind — Stage Mastery Quiz & Assessment Modal
//
// Interactive evaluation component for Trader Evolution Academy.
// Tests institutional knowledge across:
// 1. Capital Defense & Drawdown Math
// 2. Smart Money Concepts (SMC) & Liquidity Sweeps
// 3. Options Greeks & Volatility Dynamics
// 4. Prop Firm Compliance & Scaling Laws
// ──────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Shield,
  Layers,
  Zap,
  Award,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuizQuestion {
  id: string;
  stageNumber: number;
  question: string;
  scenario: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

const QUIZ_QUESTIONS: Record<number, QuizQuestion[]> = {
  1: [
    {
      id: 'q1-1',
      stageNumber: 1,
      question: 'What is the mathematically maximum loss allowed per single trade on a $50,000 account to avoid ruin?',
      scenario: 'You are trading high-volatility futures or crypto. Your total account balance is $50,000.',
      options: [
        {
          id: 'a',
          text: '5% ($2,500)',
          isCorrect: false,
          explanation: '5% risk per trade leads to severe drawdowns: a streak of 6 losses causes a 26.5% equity decline, requiring a 36% gain to break even.',
        },
        {
          id: 'b',
          text: '1.0% to 1.5% ($500 to $750)',
          isCorrect: true,
          explanation: 'Correct! Institutional risk defense dictates risking 1% max per trade. Even after a 10-loss streak, 90.4% of capital remains intact.',
        },
        {
          id: 'c',
          text: '10% ($5,000)',
          isCorrect: false,
          explanation: '10% risk guarantees catastrophic ruin within any statistical cluster of losing executions.',
        },
      ],
    },
    {
      id: 'q1-2',
      stageNumber: 1,
      question: 'If a trader experiences a 20% drawdown, what percentage gain is required just to break even?',
      scenario: 'An account dropped from $100,000 to $80,000.',
      options: [
        {
          id: 'a',
          text: '20.0%',
          isCorrect: false,
          explanation: 'A 20% gain on $80,000 only produces $16,000, bringing the balance to $96,000.',
        },
        {
          id: 'b',
          text: '25.0%',
          isCorrect: true,
          explanation: 'Spot on! Mathematically, Breakeven Gain = Drawdown / (1 - Drawdown) = 0.20 / 0.80 = 25.0%.',
        },
        {
          id: 'c',
          text: '30.0%',
          isCorrect: false,
          explanation: '30% is higher than required.',
        },
      ],
    },
  ],
  2: [
    {
      id: 'q2-1',
      stageNumber: 2,
      question: 'What constitutes an institutional Fair Value Gap (FVG)?',
      scenario: 'You are analyzing a 15-minute candlestick chart for an entry trigger.',
      options: [
        {
          id: 'a',
          text: 'Any green candle that breaks above the previous day high.',
          isCorrect: false,
          explanation: 'That is a simple high breakout, not a Fair Value Gap.',
        },
        {
          id: 'b',
          text: 'A 3-candle sequence where Candle 1 high and Candle 3 low do not overlap, leaving an imbalance void.',
          isCorrect: true,
          explanation: 'Exact definition. The price void between Candle 1 wick and Candle 3 wick represents one-sided aggressive liquidity delivery.',
        },
        {
          id: 'c',
          text: 'When moving average 20 crosses above moving average 50.',
          isCorrect: false,
          explanation: 'That is a moving average golden cross, not SMC price action.',
        },
      ],
    },
    {
      id: 'q2-2',
      stageNumber: 2,
      question: 'Why does an institutional trader prioritize MFE over static targets?',
      scenario: 'Reviewing trade journal execution logs.',
      options: [
        {
          id: 'a',
          text: 'Maximum Favorable Excursion measures how much potential profit was left on the table before exit.',
          isCorrect: true,
          explanation: 'Exactly. MFE tracking reveals if exits are prematurely choked or if runners are consistently harvested near peak impulse.',
        },
        {
          id: 'b',
          text: 'MFE tells you when to double your lot size.',
          isCorrect: false,
          explanation: 'MFE is a post-trade diagnostic, never a martingale sizing signal.',
        },
      ],
    },
  ],
  3: [
    {
      id: 'q3-1',
      stageNumber: 3,
      question: 'What happens to Option Premium when Implied Volatility (IV) collapses after earnings announcement?',
      scenario: 'Holding a Long Straddle through US tech earnings.',
      options: [
        {
          id: 'a',
          text: 'Premium increases because uncertainty is resolved.',
          isCorrect: false,
          explanation: 'Incorrect. Vega exposure rapidly loses value once uncertainty drops.',
        },
        {
          id: 'b',
          text: 'IV Crush causes both Call and Put premiums to plummet drastically.',
          isCorrect: true,
          explanation: 'Correct! Vega drop (IV collapse) easily overwhelms delta gains unless the underlying moves beyond the implied market move.',
        },
      ],
    },
  ],
  4: [
    {
      id: 'q4-1',
      stageNumber: 4,
      question: 'How does Trailing Maximum Drawdown differ from Static Drawdown in Prop Firm evaluations?',
      scenario: 'You are taking a $100k funded evaluation with a 5% trailing drawdown rule.',
      options: [
        {
          id: 'a',
          text: 'Trailing drawdown locks to your peak high-water mark, reducing breathing room as account balance grows.',
          isCorrect: true,
          explanation: 'Correct! Trailing drawdown ratchets up with unrealized or realized highs, meaning giving back open profits can fail your challenge.',
        },
        {
          id: 'b',
          text: 'Trailing drawdown resets back to starting capital at midnight every day.',
          isCorrect: false,
          explanation: 'That describes daily pause limits, not high-water mark trailing loss thresholds.',
        },
      ],
    },
  ],
};

interface StageMasteryQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStage?: number;
}

export function StageMasteryQuizModal({
  isOpen,
  onClose,
  defaultStage = 1,
}: StageMasteryQuizModalProps) {
  const [selectedStage, setSelectedStage] = useState<number>(defaultStage);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  if (!isOpen) return null;

  const questions = QUIZ_QUESTIONS[selectedStage] || QUIZ_QUESTIONS[1];
  const currentQ = questions[currentQuestionIdx];

  const handleSelectOption = (optId: string) => {
    if (hasSubmitted) return;
    setSelectedOptionId(optId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId) return;
    const chosen = currentQ.options.find((o) => o.id === selectedOptionId);
    if (chosen?.isCorrect) {
      setScore((s) => s + 1);
    }
    setHasSubmitted(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((i) => i + 1);
      setSelectedOptionId(null);
      setHasSubmitted(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = (stageNum: number) => {
    setSelectedStage(stageNum);
    setCurrentQuestionIdx(0);
    setSelectedOptionId(null);
    setHasSubmitted(false);
    setScore(0);
    setIsFinished(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Stage {selectedStage} Mastery Assessment</h3>
              <p className="text-[11px] text-slate-400">Institutional Trader Certification Evaluation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stage Selector Tabs */}
        <div className="p-3 border-b border-white/[0.06] bg-white/[0.01] flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4].map((stg) => (
            <button
              key={stg}
              onClick={() => handleRestart(stg)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
                selectedStage === stg
                  ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-600/30'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.05]',
              )}
            >
              <span>Stage {stg}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!isFinished ? (
            <div className="space-y-5">
              {/* Progress ribbon */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>
                  Question {currentQuestionIdx + 1} of {questions.length}
                </span>
                <span>Score: {score} Correct</span>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-violet-400">
                  Scenario Context
                </span>
                <p className="text-xs text-slate-400 italic bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                  {currentQ.scenario}
                </p>
                <h4 className="text-base font-bold text-white leading-snug">
                  {currentQ.question}
                </h4>
              </div>

              {/* Options list */}
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  let styleClass = 'border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]';

                  if (hasSubmitted) {
                    if (opt.isCorrect) {
                      styleClass = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
                    } else if (isSelected && !opt.isCorrect) {
                      styleClass = 'border-rose-500/40 bg-rose-500/10 text-rose-300';
                    }
                  } else if (isSelected) {
                    styleClass = 'border-violet-500 bg-violet-600/10 text-white';
                  }

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      className={cn(
                        'p-4 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-2',
                        styleClass,
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold leading-relaxed">
                          {opt.text}
                        </span>
                        {hasSubmitted && opt.isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {hasSubmitted && isSelected && !opt.isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                      </div>

                      {hasSubmitted && (opt.isCorrect || isSelected) && (
                        <p className="text-[11px] text-slate-400 pt-1 border-t border-white/[0.04] leading-relaxed">
                          {opt.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Finished Summary Card */
            <div className="text-center py-8 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400 shadow-xl">
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-black text-white">
                  Stage {selectedStage} Evaluation Complete
                </h4>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  You scored <span className="text-violet-400 font-bold">{score} / {questions.length}</span> on institutional trading mechanics.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] max-w-sm mx-auto text-xs text-slate-300 space-y-1">
                <div className="font-bold text-white">Recommended Next Step:</div>
                <div>Connect your broker or load your past CSV to track your real MFE/MAE excursion metrics live.</div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleRestart(selectedStage)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/[0.05] text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Quiz</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition-all"
                >
                  Return to Academy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isFinished && (
          <div className="p-4 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              Institutional Standard · No guesswork
            </span>

            {!hasSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedOptionId}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white font-bold text-xs shadow-md shadow-violet-600/25 transition-all"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5"
              >
                <span>{currentQuestionIdx < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
