'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plug,
  BookOpen,
  LineChart,
  ShieldAlert,
  Calculator,
  Globe,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ClipboardCheck,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  keyFeatures: string[];
  ctaText: string;
  ctaHref: string;
  icon: React.ElementType;
  gradient: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'brokers',
    badge: 'Step 1 of 8 · Automated Imports',
    title: 'Multi-Broker Real-Time Sync',
    subtitle: 'Connect Zerodha, Dhan, Upstox, Angel One, Interactive Brokers, Binance & MetaTrader',
    description:
      'Seamlessly link your live brokerage accounts or import CSV statements. TradeMind automatically syncs your order fills, cash margins, and executes statutory tax & fee calculations.',
    keyFeatures: [
      'Live broker API & OAuth direct sync (Indian, US & Crypto)',
      'One-click Quick Sync from any screen in the dashboard',
      'Accurate statutory STT, GST, Stamp Duty & Exchange charges',
      'Universal CSV statement import for 50+ global brokers',
    ],
    ctaText: 'Open Broker Hub',
    ctaHref: '/dashboard/brokers',
    icon: Plug,
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'journal-ai',
    badge: 'Step 2 of 8 · AI Intelligence',
    title: 'Automated Journaling & AI Autopsy',
    subtitle: 'Turn raw trades into high-conviction learning loops',
    description:
      'Never manually enter spreadsheet rows again. Trades are clustered into FIFO round-trips. With one click, AI Auto-Journal tags setups, identifies emotional mistakes, and assigns an execution process grade (A to F).',
    keyFeatures: [
      'Batch AI Auto-Journaling with custom reflection notes',
      'AI Trade Autopsy diagnosing entry/exit execution leaks',
      'Voice-narrated Morning Briefing & Post-Market Debrief',
      'Behavioral tag correlation: FOMO, Revenge, Overconfidence',
    ],
    ctaText: 'Explore Trade Journal',
    ctaHref: '/dashboard/journal',
    icon: BookOpen,
    gradient: 'from-violet-600 to-purple-600',
  },
  {
    id: 'replay',
    badge: 'Step 3 of 8 · Charting Engine',
    title: 'TradingView Live Terminal & Replay',
    subtitle: 'Dual-engine live streaming chart & historical replay scrubber',
    description:
      'Inspect any trade with the zero-cost official TradingView live streaming widget with full vector drawing tools, technical indicators, and multi-market watchlist (NSE, Crypto, US Tech, Forex).',
    keyFeatures: [
      'Official TradingView widget with free live streaming & drawing suite',
      'Collapsible multi-market watchlist (Nifty, Crypto, US Tech, Forex)',
      'Dynamic VWAP & EMA 20/50 overlays with one-click toggles',
      'Interactive OHLC inspection ribbon on cursor crosshair move',
    ],
    ctaText: 'Launch Chart Terminal',
    ctaHref: '/dashboard/replay',
    icon: LineChart,
    gradient: 'from-cyan-600 to-blue-600',
  },
  {
    id: 'checklists',
    badge: 'Step 4 of 8 · Discipline Engine',
    title: 'Checklist & Rulebook Studio',
    subtitle: 'Live pre-trade checklist runner & institutional rulebooks',
    description:
      'Never enter an emotional trade again. Run your daily pre-market routine, check off setup rules, track compliance percentage (0-100%), and maintain your discipline streak.',
    keyFeatures: [
      'Live execution runner with real-time compliance progress',
      '5 pre-built institutional rulebooks (ICT, Breakouts, Scalping, Options)',
      'Pre-trade emotional mindset check (Calm, Focused, FOMO)',
      'Custom template builder for proprietary strategies',
    ],
    ctaText: 'Open Checklist Studio',
    ctaHref: '/dashboard/checklists',
    icon: ClipboardCheck,
    gradient: 'from-amber-600 to-orange-600',
  },
  {
    id: 'share-cards',
    badge: 'Step 5 of 8 · Social & Community',
    title: 'Verified Branded Share Cards',
    subtitle: 'Ultra-HD graphics for Twitter, Discord, and Mentors',
    description:
      'Share your verified executions with institutional credibility. Generate 1200x675 retina graphics with your net P&L, ROI%, R:R ratio, and trade setup.',
    keyFeatures: [
      'Verified Execution audit seal on every card',
      '4 sleek themes: Obsidian, Emerald Bull, Cyberpunk, Minimal',
      'Privacy Mode toggle to share ROI% without exposing dollar balance',
      '1-click copy image to clipboard and 1-click share to Twitter (X)',
    ],
    ctaText: 'View Trade Blotter',
    ctaHref: '/dashboard/trades',
    icon: Share2,
    gradient: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'discipline',
    badge: 'Step 6 of 8 · Risk Defense',
    title: 'Behavioral Shield & Tilt Lockout',
    subtitle: 'Protect your capital before emotional mistakes happen',
    description:
      'The Behavioral Shield analyzes trading velocity and drawdown in real-time. If it detects revenge trading or consecutive oversized losses, it triggers alert banners and tilt protection routines.',
    keyFeatures: [
      'Algorithmic revenge trading detection (<30m oversized reentry)',
      'Pre-market daily loss limit enforcement',
      'Pre-trade checklist & playbook execution compliance',
      'Daily rule audit with discipline score tracking',
    ],
    ctaText: 'Check Behavioral Shield',
    ctaHref: '/dashboard/discipline',
    icon: ShieldAlert,
    gradient: 'from-rose-600 to-amber-600',
  },
  {
    id: 'calculators',
    badge: 'Step 7 of 8 · Mathematical Edge',
    title: '18 Pro Financial Calculators',
    subtitle: 'Risk sizing, Forex & Crypto pips, and Black-Scholes Greeks',
    description:
      'Calculate precise share sizes, Forex/Crypto pip values, Black-Scholes theoretical options values, ATR trailing stop losses, and multi-asset position averaging before placing any market order.',
    keyFeatures: [
      'Forex & Crypto Pip Sizer with multi-currency conversion',
      'Position Size & Risk Calculator with contract lot multipliers',
      'Black-Scholes Options Pricing, Delta, Theta, Gamma, Vega',
      'Break-even, Margin, CAGR, and Drawdown Recovery calculators',
    ],
    ctaText: 'Open Calculators',
    ctaHref: '/dashboard/calculators',
    icon: Calculator,
    gradient: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'analytics',
    badge: 'Step 8 of 8 · Quantitative Insights',
    title: 'Global Analytics & Monte Carlo Simulation',
    subtitle: 'Comprehensive performance distributions and tax reports',
    description:
      'Gain institutional clarity on your statistical edge. Run 1,000-iteration Monte Carlo resamplings to forecast maximum expected drawdown and generate verified capital gains statements.',
    keyFeatures: [
      'Global multi-currency switcher: INR (₹), USD ($), EUR (€), USDT (₮)',
      'Monte Carlo stochastic simulation over 1,000 randomized runs',
      'Zero-crash institutional CSV and PDF trade exports',
      'Day-of-week, hour-of-day, and asset-class profitability heatmaps',
    ],
    ctaText: 'View Analytics',
    ctaHref: '/dashboard/analytics',
    icon: Globe,
    gradient: 'from-indigo-600 to-pink-600',
  },
];

interface PlatformTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlatformTourModal({ isOpen, onClose }: PlatformTourModalProps) {
  const [stepIndex, setStepIndex] = useState(0);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && stepIndex < TOUR_STEPS.length - 1) {
        setStepIndex((s) => s + 1);
      }
      if (e.key === 'ArrowLeft' && stepIndex > 0) {
        setStepIndex((s) => s - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stepIndex, onClose]);

  if (!isOpen) return null;

  const current = TOUR_STEPS[stepIndex]!;
  const Icon = current.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const progressPercent = ((stepIndex + 1) / TOUR_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Top Progress Bar */}
        <div className="w-full h-1 bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm', current.gradient)}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
              {current.badge}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              {current.title}
            </h2>
            <p className="text-sm font-medium text-indigo-400 mt-1">
              {current.subtitle}
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed mt-3">
              {current.description}
            </p>
          </div>

          {/* Key Features Bullet Points */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Core Capabilities
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
              {current.keyFeatures.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer / Navigation Controls */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3">
          {/* Step Pill Indicators */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setStepIndex(idx)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  idx === stepIndex
                    ? 'w-6 bg-indigo-500'
                    : 'w-2 bg-zinc-700 hover:bg-zinc-500',
                )}
                title={step.title}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setStepIndex((s) => s - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
            )}

            <Link
              href={current.ctaHref}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
            >
              <span>{current.ctaText}</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </Link>

            <button
              onClick={() => {
                if (isLast) {
                  onClose();
                } else {
                  setStepIndex((s) => s + 1);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
            >
              <span>{isLast ? 'Complete Tour' : 'Next Step'}</span>
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
