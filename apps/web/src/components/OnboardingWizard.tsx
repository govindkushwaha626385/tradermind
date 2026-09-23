// ──────────────────────────────────────────────
// TradeMind — Onboarding Wizard
//
// A step-by-step setup guide shown on the first visit.
// Guides the user through:
//   1. Welcome & intro
//   2. Connect a broker
//   3. Sync trades
//   4. Journal first trade
//   5. View insights
// ──────────────────────────────────────────────

'use client';

import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Plug,
  RefreshCw,
  BookOpen,
  Brain,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@trademind/shared';
import { api } from '@/lib/api';

interface OnboardingWizardProps {
  /** Called when onboarding is complete. */
  onComplete?: () => void;
  /** If true, the wizard is shown. */
  isOpen: boolean;
}

const STEPS = [
  {
    id: 'welcome',
    icon: TrendingUp,
    title: 'Welcome to TradeMind',
    description: 'Your automated trading journal. We\'ll help you track every trade, analyze your performance, and discover your behavioral patterns.',
    action: 'Get Started',
  },
  {
    id: 'connectBroker',
    icon: Plug,
    title: 'Connect Your Broker',
    description: 'Link your trading account to auto-import trades. Supports Zerodha, Dhan, Angel One, Upstox, and Delta Exchange.',
    action: 'Connect Broker',
  },
  {
    id: 'importTrades',
    icon: RefreshCw,
    title: 'Sync Your Trades',
    description: 'Your trades will be automatically synced and clustered into complete journal entries with fees and P&L calculated.',
    action: 'Sync Now',
  },
  {
    id: 'journalFirstTrade',
    icon: BookOpen,
    title: 'Journal Your Mindset',
    description: 'Add emotions, notes, and rule compliance to your trades. This helps our AI find your behavioral patterns.',
    action: 'Journal a Trade',
  },
  {
    id: 'viewInsights',
    icon: Brain,
    title: 'Discover Your Insights',
    description: 'View your behavioral analytics to see how emotions impact your trading performance.',
    action: 'View Insights',
  },
];

export function OnboardingWizard({ isOpen, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const step = STEPS[currentStep]!;
  const Icon = step.icon;
  const isLastStep = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    const newCompleted = new Set(completedSteps).add(step.id);
    setCompletedSteps(newCompleted);

    // Persist step completion to backend
    api.updateOnboardingStep(step.id, true).catch((err) => {
      console.error('Failed to persist onboarding step:', err);
    });

    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-8 w-full max-w-lg space-y-6 animate-slide-up">
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-accent overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step counter */}
        <div className="text-xs text-muted-foreground font-medium">
          Step {currentStep + 1} of {STEPS.length}
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
          <Icon className="w-8 h-8 text-white" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{step.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Completed steps */}
        {completedSteps.size > 0 && (
          <div className="flex flex-wrap gap-2">
            {STEPS.filter((s) => completedSteps.has(s.id)).map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
                <CheckCircle2 className="w-3 h-3" />
                {s.title}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleNext}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            {isLastStep ? 'Done!' : step.action}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleSkip}
            className="px-5 py-3 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
