// ──────────────────────────────────────────────
// TradeMind — AI Automated Daily Briefing (Flagship Engine)
//
// Outperforms Deeepr.ai & TradeBB.ai:
// - Dual-Mode Intelligence:
//   1. 🌅 Pre-Market Morning Preparation & Bias Note (Pre-market / No trades yet)
//   2. 🌙 Post-Market Executive Performance Debrief (Session completed)
// - 🔊 1-Click Audio Voice Briefing (Browser-native SpeechSynthesis — 100% Free)
// - Pre-Market Discipline & Risk Guardrail Checklist
// - Yesterday's Behavioral Psychological Warning
// - Multi-Currency ($ / € / £ / ₹ / ₮) Support
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Brain,
  Lightbulb,
  Target,
  RefreshCw,
  Calendar,
  Volume2,
  VolumeX,
  CheckCircle2,
  Circle,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Moon,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import type { DailyDebriefResult } from '@trademind/shared';

interface DailyBriefingProps {
  className?: string;
}

export function DailyDebrief({ className }: DailyBriefingProps) {
  const { currency, format } = useCurrency();
  const [data, setData] = useState<DailyDebriefResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Pre-market checklist states
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    bias: false,
    levels: false,
    calendar: false,
    risk: false,
  });

  const toggleCheck = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchDebrief = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.getDailyDebrief();
      if (res.success) {
        if (res.data) {
          setData(res.data);
          setEmptyMessage(null);
        } else {
          setData(null);
          setEmptyMessage(
            (res as any).message ?? 'No closed trades recorded today yet. Prepare your session with the morning briefing.',
          );
        }
      }
    } catch (err) {
      console.error('Failed to load daily debrief:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDebrief();
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Voice narration handler
  const handleToggleAudio = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Pick best English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) utterance.voice = preferredVoice;

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return (
      <div className={cn('glass-card rounded-2xl p-6 border border-border/50 animate-pulse', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-48 bg-accent rounded-lg" />
          <div className="h-5 w-24 bg-accent rounded-full" />
        </div>
        <div className="h-10 w-3/4 bg-accent/70 rounded-xl mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-accent/50 rounded-xl" />
          ))}
        </div>
        <div className="h-20 bg-accent/40 rounded-xl" />
      </div>
    );
  }

  // ── Mode 1: Pre-Market Morning Intelligence & Preparation (No trades logged yet) ──
  if (!data || emptyMessage) {
    const morningSpeech = `Good morning. Welcome to your TradeMind Pre-Market Briefing. Today, maintain strict risk discipline. Verify your key support and resistance levels, avoid chasing breakouts without confirmation, and honor your maximum loss limit. Have a profitable, disciplined session.`;

    const allChecked = Object.values(checklist).every(Boolean);

    return (
      <div
        className={cn(
          'glass-card rounded-2xl p-5 sm:p-6 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background relative overflow-hidden transition-all duration-300 shadow-lg shadow-amber-500/5',
          className,
        )}
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-bl from-amber-500/15 via-transparent to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Pre-Market Morning Briefing</h3>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Market Prep
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pre-session mental readiness, daily risk limits &amp; execution rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Voice Narration Button */}
            <button
              onClick={() => handleToggleAudio(morningSpeech)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm',
                isSpeaking
                  ? 'bg-amber-500 text-black animate-pulse'
                  : 'bg-accent/80 hover:bg-accent text-zinc-300 border border-border/60'
              )}
              title={isSpeaking ? 'Mute voice briefing' : 'Play AI Voice Morning Briefing'}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isSpeaking ? 'Mute Briefing' : 'Listen Briefing'}</span>
            </button>

            <button
              onClick={() => fetchDebrief(true)}
              disabled={refreshing}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/40"
              title="Refresh Briefing"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Motivational / Psychological Guardrail */}
        <div className="p-4 rounded-xl bg-background/80 border border-amber-500/20 mb-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                Session Mindset &amp; Tilt Defense
              </div>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                &ldquo;Protect your capital first. Profits are a byproduct of flawless risk execution. Never turn a day trade into an emotional swing trade, and respect your stop loss before entering.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* 4-Step Gamified Pre-Market Readiness Checklist */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-300 mb-2.5">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              Pre-Market Readiness Routine
            </span>
            <span className={cn('font-mono text-2xs px-2 py-0.5 rounded-full', allChecked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground')}>
              {Object.values(checklist).filter(Boolean).length}/4 Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { key: 'bias', label: '1. Higher Timeframe Trend & Bias Defined' },
              { key: 'levels', label: '2. Major Support & Resistance Zones Marked' },
              { key: 'calendar', label: '3. Economic Calendar & High-Impact Events Reviewed' },
              { key: 'risk', label: '4. Maximum Daily Loss Limit Budget Locked' },
            ].map((item) => {
              const checked = checklist[item.key] ?? false;
              return (
                <button
                  key={item.key}
                  onClick={() => toggleCheck(item.key)}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs font-medium transition-all',
                    checked
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-background/60 border-border/40 hover:bg-accent/50 text-zinc-400'
                  )}
                >
                  {checked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt to start journaling once market opens */}
        <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Markets open · Executions will auto-generate your Post-Market Debrief</span>
          <span className="flex items-center gap-1 text-emerald-400 font-sans font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Ready
          </span>
        </div>
      </div>
    );
  }

  // ── Mode 2: Post-Market Executive Performance Debrief (Session Trades Logged) ──
  const isProfitable = (data.stats?.netPnl ?? 0) >= 0;
  const postMarketSpeech = `Session Debrief for ${data.date}. Headline: ${data.headline}. Net P and L: ${data.pnlSummary}. Win rate: ${data.winRate}. Key lesson: ${data.topLesson}. Emotional pattern: ${data.emotionalPattern}. Tomorrow's focus: ${data.tomorrowFocus}.`;

  return (
    <div
      className={cn(
        'glass-card rounded-2xl p-5 sm:p-6 border relative overflow-hidden transition-all duration-300 shadow-xl',
        isProfitable
          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-background'
          : 'border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-background to-background',
        className,
      )}
    >
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm',
              isProfitable
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400',
            )}
          >
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Post-Market Executive Debrief</h3>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Synthesized
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 font-mono">
              <Calendar className="w-3.5 h-3.5" />
              <span>{data.date}</span>
              <span>•</span>
              <span className="capitalize">{data.cached ? 'cached today' : `via ${data.provider}`}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Voice Narration Button */}
          <button
            onClick={() => handleToggleAudio(postMarketSpeech)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm',
              isSpeaking
                ? 'bg-indigo-600 text-white animate-pulse'
                : 'bg-accent/80 hover:bg-accent text-zinc-300 border border-border/60'
            )}
            title={isSpeaking ? 'Mute voice briefing' : 'Play AI Voice Session Debrief'}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{isSpeaking ? 'Mute Debrief' : 'Listen Debrief'}</span>
          </button>

          <button
            onClick={() => fetchDebrief(true)}
            disabled={refreshing}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/40"
            title="Refresh Debrief"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Headline */}
      <div className="p-4 rounded-xl bg-background/80 border border-border/50 mb-4 backdrop-blur-sm">
        <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
          &ldquo;{data.headline}&rdquo;
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-5">
        <div className="p-3 rounded-xl bg-background/50 border border-border/30">
          <div className="text-[11px] text-muted-foreground mb-0.5">Today&apos;s P&L</div>
          <div
            className={cn(
              'text-base font-bold font-mono',
              isProfitable ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {isProfitable ? '+' : ''}{format(data.stats.netPnl, currency)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{data.pnlSummary}</div>
        </div>

        <div className="p-3 rounded-xl bg-background/50 border border-border/30">
          <div className="text-[11px] text-muted-foreground mb-0.5">Win Rate</div>
          <div className="text-base font-bold font-mono text-foreground">{data.winRate}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {data.stats.wins}W / {data.stats.losses}L ({data.stats.totalTrades} total)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/50 border border-border/30">
          <div className="text-[11px] text-muted-foreground mb-0.5">Best Performer</div>
          <div className="text-sm font-bold text-emerald-400 truncate font-mono">
            {data.stats.bestTrade?.symbol ?? 'None'}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {data.stats.bestTrade ? `+${format(data.stats.bestTrade.pnl, currency)}` : '—'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/50 border border-border/30">
          <div className="text-[11px] text-muted-foreground mb-0.5">Biggest Drag</div>
          <div className="text-sm font-bold text-rose-400 truncate font-mono">
            {data.stats.worstTrade?.symbol ?? 'None'}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {data.stats.worstTrade ? format(data.stats.worstTrade.pnl, currency) : '—'}
          </div>
        </div>
      </div>

      {/* Structured Insights: Lesson, Psychology, Tomorrow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Top Lesson */}
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Key Execution Lesson
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">{data.topLesson}</p>
          </div>
        </div>

        {/* Emotion Trend */}
        <div className="p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-400 mb-1.5">
              <Brain className="w-3.5 h-3.5" />
              Psychology &amp; Tilt Audit
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">{data.emotionalPattern}</p>
          </div>
        </div>

        {/* Tomorrow's Goal */}
        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 mb-1.5">
              <Target className="w-3.5 h-3.5" />
              Tomorrow&apos;s Focus
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">{data.tomorrowFocus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
