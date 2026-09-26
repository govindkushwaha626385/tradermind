// ──────────────────────────────────────────────
// TradeMind — Interactive Guided Product Tour (PlatformTourModal.tsx)
//
// An institutional onboarding spotlight tour highlighting:
// 1. Navigation Sidebar & Command Studio
// 2. Prop Firm Evaluation Matrix & News Safeguards
// 3. TradingView Candlestick Replay & AI Voice Autopsy
// 4. Real-Time Finnhub News Stream & Economic Calendar
// 5. Behavioral Shield, Tilt Lockout & AI Copilot
// 6. Multi-Period Reports, Tax Ledgers & CSV Exports
//
// Features interactive feature mockups, keyboard navigation,
// direct live jump links, and persistent onboarding memory.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Award,
  Play,
  Newspaper,
  ShieldAlert,
  FileText,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Zap,
  Radio,
  Clock,
  TrendingUp,
  Volume2,
  Command,
  Target,
  Layers,
  Activity,
  Sliders,
  DollarSign,
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
  mockupType: 'sidebar' | 'prop_firm' | 'replay' | 'news' | 'discipline' | 'reports';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'sidebar',
    badge: 'Step 1 of 6 · Navigation Architecture',
    title: 'Grouped Navigation & Command Studio',
    subtitle: 'Lightning-fast workflow with global shortcuts and portfolio switching',
    description:
      'Organized into five logical domains: Main, Trading, Analysis, Tools, and Account. Switch between personal broker accounts and prop firm portfolios in 1 click, or press Cmd+K to launch commands from anywhere.',
    keyFeatures: [
      'Collapsible mini-mode (64px) for maximum screen real estate',
      'Instant Command Palette (Cmd+K) to search trades, tools & settings',
      'Global Multi-Account & Prop Firm portfolio selector in topbar',
      'One-click Quick Trade Capture (Hotkey: C) and Live Broker Sync',
    ],
    ctaText: 'Open Main Dashboard',
    ctaHref: '/dashboard',
    icon: LayoutDashboard,
    gradient: 'from-blue-600 to-indigo-600',
    mockupType: 'sidebar',
  },
  {
    id: 'prop-firm',
    badge: 'Step 2 of 6 · Capital Scaling',
    title: 'Prop Firm Evaluation Matrix',
    subtitle: 'Multi-account challenge defense for FTMO, Topstep, Apex & The5ers',
    description:
      'Track multiple evaluation phases and funded accounts simultaneously. Real-time drawdown meters guard your static and trailing daily loss thresholds, with automatic red-folder economic blackout countdowns.',
    keyFeatures: [
      'Multi-Account Grid: FTMO, Topstep, Apex, FundedNext, Funding Pips',
      'Real-time Daily Loss Limit and Maximum Drawdown gauge monitors',
      'Red-Folder News Blackout Safeguard (2-minute buffer notifications)',
      'Verified Pass Milestone Certificates with cryptographic seals',
    ],
    ctaText: 'Open Prop Firm Matrix',
    ctaHref: '/dashboard/prop-firm',
    icon: Award,
    gradient: 'from-amber-600 to-yellow-600',
    mockupType: 'prop_firm',
  },
  {
    id: 'replay',
    badge: 'Step 3 of 6 · Execution Forensics',
    title: 'TradingView Candlestick Replay & Voice Autopsy',
    subtitle: 'Step through trades bar-by-bar with AI audio debriefing',
    description:
      'Relive your trade executions bar-by-bar on institutional TradingView charts. Hear an AI forensic autopsy debrief via the native Web Speech API while inspecting peak favorable excursion (MFE) and exit efficiency.',
    keyFeatures: [
      'Official TradingView Candlestick charts with custom drawing tools',
      'Interactive bar-by-bar playback scrubber with variable speed (1x-10x)',
      'Execution fills markers: Entry, Stop Loss, Target & Exit annotations',
      'Voice Debrief button narrating execution mistakes & psychological leaks',
    ],
    ctaText: 'Launch Trade Replay',
    ctaHref: '/dashboard/replay',
    icon: Play,
    gradient: 'from-cyan-600 to-blue-600',
    mockupType: 'replay',
  },
  {
    id: 'news',
    badge: 'Step 4 of 6 · Real-Time Market Intelligence',
    title: 'Finnhub Real-Time WebSocket & Macro Calendar',
    subtitle: 'Sub-millisecond trade ticks and breaking news push streaming',
    description:
      'Connected directly to wss://ws.finnhub.io for zero-latency market feeds. Algorithmic sentiment analysis categorizes news as Bullish, Bearish, or Neutral with optional harmonic audio chimes and prop-firm alerts.',
    keyFeatures: [
      'Direct Finnhub WebSocket streaming (<20ms transmission latency)',
      'Live trade tick pulsers across Stocks, F&O, Crypto, and Forex',
      'Institutional economic calendar with red-folder impact tagging',
      'Web Audio melodic chimes and native browser push notifications',
    ],
    ctaText: 'Explore News Stream',
    ctaHref: '/dashboard/news',
    icon: Newspaper,
    gradient: 'from-emerald-600 to-teal-600',
    mockupType: 'news',
  },
  {
    id: 'discipline',
    badge: 'Step 5 of 6 · Psychological Armor',
    title: 'Behavioral Shield & Tilt Lockout',
    subtitle: 'Algorithmic prevention of FOMO, revenge trading, and oversized bets',
    description:
      'TradeMind monitors trading velocity and drawdown velocity in real-time. If it detects emotional spiral tendencies, it triggers interactive tilt protection rituals and halts oversized trade entries.',
    keyFeatures: [
      'Revenge Trading Detector (<30m oversized re-entries after losses)',
      'Pre-Market Checklist compliance runner with discipline streak tracking',
      'Psychological mindset audit: Calm, Anxious, Revenge, FOMO',
      'Automated End-of-Day (EOD) Wrap-Up ritual and audio reflection',
    ],
    ctaText: 'View Discipline Shield',
    ctaHref: '/dashboard/discipline',
    icon: ShieldAlert,
    gradient: 'from-rose-600 to-amber-600',
    mockupType: 'discipline',
  },
  {
    id: 'reports',
    badge: 'Step 6 of 6 · Auditing & Tax Ledgers',
    title: 'Institutional Multi-Period Reports',
    subtitle: 'Daily, Weekly, Monthly, Yearly & Custom Range audit statements',
    description:
      'Generate audit statements for personal review, tax filing, or investor pitches. Includes Van Tharp System Quality Number (SQN), Indian F&O turnover (Section 44AD), and US IRS Form 8949 capital gains.',
    keyFeatures: [
      'Multi-range filtering: Daily, Weekly, Monthly, Yearly & Custom Dates',
      'Van Tharp SQN statistical expectancy score calculation',
      'Statutory STT, GST, SEBI charges, and Stamp Duty ledger breakdowns',
      'One-click RFC-4180 CSV and printable PDF audit statements',
    ],
    ctaText: 'Generate Audit Reports',
    ctaHref: '/dashboard/reports',
    icon: FileText,
    gradient: 'from-purple-600 to-indigo-600',
    mockupType: 'reports',
  },
];

const TOUR_STORAGE_KEY = 'trademind_product_tour_completed_v2';

interface PlatformTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlatformTourModal({ isOpen, onClose }: PlatformTourModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Keyboard navigation (Arrow keys & Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight' && stepIndex < TOUR_STEPS.length - 1) {
        setStepIndex((s) => s + 1);
      }
      if (e.key === 'ArrowLeft' && stepIndex > 0) {
        setStepIndex((s) => s - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stepIndex]);

  const handleClose = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }
    onClose();
  };

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  const current = TOUR_STEPS[stepIndex]!;
  const Icon = current.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const progressPercent = ((stepIndex + 1) / TOUR_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[92vh]">
        {/* Top Progress Bar */}
        <div className="w-full h-1.5 bg-muted/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm', current.gradient)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                {current.badge}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] font-mono text-muted-foreground">
              Tip: Use Left/Right keys to step
            </span>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto scrollbar-thin">
          {/* Header & Subtitle */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-display">
              {current.title}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-primary mt-1">
              {current.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2.5">
              {current.description}
            </p>
          </div>

          {/* Interactive Feature Visual Mockup */}
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 sm:p-5 relative overflow-hidden">
            {current.mockupType === 'sidebar' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <Command className="w-3.5 h-3.5 text-primary" />
                    <span>Quick Command Palette (Cmd + K)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[10px]">MAIN</span>
                    <span className="font-bold text-foreground">Dashboard · AI</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[10px]">TRADING</span>
                    <span className="font-bold text-foreground">Journal · Prop Firm</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[10px]">ANALYSIS</span>
                    <span className="font-bold text-foreground">Reports · News</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[10px]">TOOLS</span>
                    <span className="font-bold text-foreground">Brokers · Calcs</span>
                  </div>
                </div>
              </div>
            )}

            {current.mockupType === 'prop_firm' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>FTMO $200K Challenge (Phase 1)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Target: $16,000 (8%)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Max Drawdown Cushion</span>
                    <span className="text-emerald-400 font-bold text-sm">+$17,450.00</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Daily Loss Buffer (5%)</span>
                    <span className="text-foreground font-bold text-sm">-$1,240 / $10,000</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border/60 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-muted-foreground block">News Lockout Buffer</span>
                    <span className="text-amber-400 font-bold text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      2m Red-Folder Safe
                    </span>
                  </div>
                </div>
              </div>
            )}

            {current.mockupType === 'replay' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <Play className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Bar-by-Bar Candlestick Simulator</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                    <Volume2 className="w-3 h-3" />
                    Voice Debrief Ready
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-emerald-400 font-bold">LONG AAPL @ $228.45</span>
                    <span className="text-muted-foreground block text-[10px]">Peak MFE: +3.2R · Exit captured 84%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-1 rounded bg-secondary text-foreground text-[10px] font-bold">Speed: 2x</span>
                    <span className="px-2 py-1 rounded bg-primary/20 text-primary text-[10px] font-bold">Step: 14/24</span>
                  </div>
                </div>
              </div>
            )}

            {current.mockupType === 'news' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Finnhub WebSocket wss://ws.finnhub.io</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    Latency: 14ms
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                    <span>BTCUSDT</span>
                    <span className="text-emerald-400 font-bold">$68,420.50</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                    <span>NVDA</span>
                    <span className="text-emerald-400 font-bold">$129.80</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60 flex items-center justify-between col-span-2 sm:col-span-1">
                    <span>SPY</span>
                    <span className="text-emerald-400 font-bold">$574.90</span>
                  </div>
                </div>
              </div>
            )}

            {current.mockupType === 'discipline' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Behavioral Tilt Shield &amp; Streak</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Discipline Score: 94/100
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[10px]">FOMO RATE</span>
                    <span className="text-emerald-400 font-bold">0.0% (Clean)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[10px]">REVENGE CHECK</span>
                    <span className="text-emerald-400 font-bold">Passed</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground block text-[10px]">CHECKLISTS</span>
                    <span className="text-primary font-bold">100% Compliant</span>
                  </div>
                </div>
              </div>
            )}

            {current.mockupType === 'reports' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Institutional Multi-Period Audit</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Van Tharp SQN: 2.84
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[10px]">WIN RATE</span>
                    <span className="text-emerald-400 font-bold">68.4%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[10px]">PROFIT FACTOR</span>
                    <span className="text-emerald-400 font-bold">2.41</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[10px]">TAX AUDIT</span>
                    <span className="text-foreground font-bold">Sec 44AD / 8949</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[10px]">EXPORTS</span>
                    <span className="text-primary font-bold">RFC-4180 CSV</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Key Features Bullet Points */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Core Capabilities & Edge</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground/90">
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
        <div className="px-5 sm:px-7 py-3.5 border-t border-border/80 bg-muted/30 flex flex-wrap items-center justify-between gap-3">
          {/* Step Pill Indicators & Checkbox */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => setStepIndex(idx)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200 cursor-pointer',
                    idx === stepIndex
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-muted hover:bg-muted-foreground/40',
                  )}
                  title={step.title}
                />
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3 h-3 rounded border-border text-primary focus:ring-primary/20"
              />
              <span>Don&apos;t show again on startup</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setStepIndex((s) => s - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 hover:bg-secondary text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
            )}

            <Link
              href={current.ctaHref}
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-colors"
            >
              <span>{current.ctaText}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </Link>

            <button
              onClick={() => {
                if (isLast) {
                  handleComplete();
                } else {
                  setStepIndex((s) => s + 1);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-primary-foreground shadow-sm transition-all cursor-pointer"
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
