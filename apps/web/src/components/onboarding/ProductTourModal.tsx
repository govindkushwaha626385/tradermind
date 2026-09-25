// ──────────────────────────────────────────────
// TradeMind — Institutional Interactive Product Tour
// Guided onboarding spotlight walking users through
// core institutional capabilities and AI superpowers.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  TrendingUp,
  ShieldAlert,
  BarChart2,
  CheckCircle2,
  ArrowRight,
  Zap,
  RefreshCw,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  title: string;
  badge: string;
  tagline: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
  ctaHref?: string;
  previewGradient: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Automated Multi-Broker Sync',
    badge: 'Step 1 of 5 · Data Ingestion',
    tagline: 'Zero manual entry. Institutional multi-broker fidelity.',
    icon: RefreshCw,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    description:
      'Connect Groww, Zerodha, Dhan, Angel One, Binance, or upload CSVs. TradeMind automatically reconciles trade executions, normalizes timestamps to IST, and eliminates duplicate fills with deterministic deduplication.',
    highlights: [
      '1-Click automated broker credential and API key sync',
      'Dual-layer idempotency prevents duplicate trade creation',
      'Auto-calculation of STT, brokerage, exchange turnover, and GST fees',
    ],
    ctaLabel: 'Manage Broker Connections',
    ctaHref: '/dashboard/settings',
    previewGradient: 'from-emerald-500/20 via-emerald-600/5 to-transparent',
  },
  {
    title: 'Dual-Mode Trade & Positions Ledger',
    badge: 'Step 2 of 5 · Execution Audit',
    tagline: 'Switch seamlessly between completed positions and raw fills.',
    icon: Layers,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    description:
      'Audit your trading with surgical precision. Completed Trades clusters Buy and Sell legs into unified positions with true net P&L and hold durations, while Raw Broker Fills lets you inspect fill-by-fill executions.',
    highlights: [
      'Round-trip position clustering with realized gross & net P&L',
      'Interactive expandable drawer showing constituent order fills',
      'Direct candlestick chart overlays and verified branded social share cards',
    ],
    ctaLabel: 'View Trades Ledger',
    ctaHref: '/dashboard/trades',
    previewGradient: 'from-blue-500/20 via-blue-600/5 to-transparent',
  },
  {
    title: 'Continuous Institutional Equity Curve',
    badge: 'Step 3 of 5 · Performance Curve',
    tagline: 'Trade-by-trade high-resolution cumulative trajectory.',
    icon: TrendingUp,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10 border-violet-500/20',
    description:
      'Experience zero flat lines or stale points. The institutional equity curve plots every trade-by-trade execution starting at baseline (0.00) through your portfolio peak to current realized equity with dual-mode underwater drawdown tracking.',
    highlights: [
      'Trade-by-trade cumulative net P&L resolution with visible markers',
      'Dual-mode toggle between Cumulative P&L and Underwater Drawdown %',
      'Zero baseline reference line with peak milestone metrics',
    ],
    ctaLabel: 'Inspect Analytics & Curve',
    ctaHref: '/dashboard/analytics',
    previewGradient: 'from-violet-500/20 via-purple-600/5 to-transparent',
  },
  {
    title: '1-Click AI Trade Autopsy & Copilot',
    badge: 'Step 4 of 5 · AI Superpowers',
    tagline: 'Executive root-cause diagnosis of slippage, emotion, and strategy.',
    icon: Sparkles,
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-500/10 border-pink-500/20',
    description:
      'Stop wondering why trades failed. 1-Click AI Autopsy grades your execution from A to F, identifies execution leaks (FOMO, late exits, oversized risk), and provides actionable institutional coaching for your next session.',
    highlights: [
      'Multi-dimensional scoring: Risk Management, Execution, and Emotional Discipline',
      'Concrete leak identification with behavioral suggestions',
      'AI Journal autofill saves hours of manual note-taking',
    ],
    ctaLabel: 'Explore AI Copilot',
    ctaHref: '/dashboard/ai-assistant',
    previewGradient: 'from-pink-500/20 via-rose-600/5 to-transparent',
  },
  {
    title: 'Autonomous Behavioral Shield & Kill Switch',
    badge: 'Step 5 of 5 · Capital Defense',
    tagline: 'Protect your account balance against emotional tilt and spiral.',
    icon: ShieldAlert,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    description:
      'TradeMind acts as your personal risk manager. The behavioral shield detects rapid consecutive losses, revenge trading patterns, and maximum daily drawdown limits, locking order entry before catastrophic blowups.',
    highlights: [
      'Real-time tilt and revenge trading pattern alerts',
      'Configurable daily loss ceilings and drawdown circuit breakers',
      'Daily automated debrief notifications sent directly to your screen',
    ],
    ctaLabel: 'Configure Risk Parameters',
    ctaHref: '/dashboard/discipline',
    previewGradient: 'from-amber-500/20 via-yellow-600/5 to-transparent',
  },
];

export function ProductTourModal({ isOpen, onClose }: ProductTourModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleDismiss();
      } else if (e.key === 'ArrowRight') {
        if (currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep((s) => s + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          setCurrentStep((s) => s - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleDismiss = () => {
    try {
      localStorage.setItem('trademind_tour_completed', 'true');
    } catch (_) {}
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleDismiss();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleAction = (href?: string) => {
    handleDismiss();
    if (href) {
      router.push(href);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-scale-in">
        {/* Glow Header Accent */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-40 bg-gradient-to-b opacity-40 pointer-events-none transition-all duration-500',
            step.previewGradient
          )}
        />

        {/* Modal Top Bar */}
        <div className="relative flex items-center justify-between px-5 sm:px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/60">
              {step.badge}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded-lg hover:bg-muted/60 transition-colors"
            >
              Skip Tour
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              aria-label="Close tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="relative px-5 sm:px-6 py-4 space-y-5">
          {/* Step Icon & Title */}
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 shadow-inner',
                step.iconBg
              )}
            >
              <Icon className={cn('w-6 h-6', step.iconColor)} />
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-display">
                {step.title}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-primary/90">
                {step.tagline}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>

          {/* Highlights Bullets */}
          <div className="space-y-2.5 bg-muted/20 border border-border/50 rounded-xl sm:rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" /> Key Capabilities
            </div>
            <ul className="space-y-2">
              {step.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Link for current step */}
          {step.ctaHref && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleAction(step.ctaHref)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs sm:text-sm transition-colors group"
              >
                <span>{step.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="relative flex items-center justify-between px-5 sm:px-6 py-4 border-t border-border/60 bg-muted/30">
          {/* Step Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  idx === currentStep
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                )}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isLast ? 'Complete Tour' : 'Next'}</span>
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
