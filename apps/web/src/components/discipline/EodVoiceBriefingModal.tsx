// ──────────────────────────────────────────────
// TradeMind — Automated End-of-Day (EOD) AI Audio/Voice Briefing
// Zero-cost client-side speech synthesis providing an institutional
// 60-second voice debrief of today's execution quality, P&L, and leaks.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Award,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  X,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';
import type { DailyDebriefResult } from '@trademind/shared';

interface EodVoiceBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  debriefData?: DailyDebriefResult | null;
}

export function EodVoiceBriefingModal({
  isOpen,
  onClose,
  debriefData: propDebrief,
}: EodVoiceBriefingModalProps) {
  const { format } = useCurrency();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [debrief, setDebrief] = useState<DailyDebriefResult | null>(propDebrief ?? null);
  const [loading, setLoading] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load debrief data if not passed in props
  useEffect(() => {
    if (!isOpen) return;
    if (propDebrief) {
      setDebrief(propDebrief);
      return;
    }

    setLoading(true);
    api.getDailyDebrief()
      .then((res) => {
        if (res.success && res.data) {
          setDebrief(res.data);
        }
      })
      .catch((err) => console.error('Failed to load voice debrief:', err))
      .finally(() => setLoading(false));
  }, [isOpen, propDebrief]);

  // Load browser TTS voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        // Prioritize natural English voices (Google, Daniel, Samantha, Karen, Siri)
        const preferredIdx = voices.findIndex(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel') ||
              v.name.includes('Premium')),
        );
        if (preferredIdx !== -1) {
          setSelectedVoiceIndex(preferredIdx);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Compute stats
  const stats = debrief?.stats ?? {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    netPnl: 0,
    bestTrade: null,
    worstTrade: null,
  };

  const winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
  const isWinSession = stats.netPnl >= 0;
  const pnlText = stats.netPnl !== 0 ? format(stats.netPnl) : 'breakeven';

  // Construct dynamic spoken script
  const script = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const tradesCount = stats.totalTrades;

    if (tradesCount === 0) {
      return `Welcome to your TradeMind end-of-day debrief for ${todayStr}. No trades were executed today. Cash is a valid position, and protecting mental capital on non-setup days is the hallmark of institutional discipline. Enjoy your evening and prepare your watchlists for tomorrow's pre-market session.`;
    }

    let text = `Good session, trader. Here is your TradeMind automated audio debrief for ${todayStr}. `;
    text += `Today you executed ${tradesCount} position${tradesCount > 1 ? 's' : ''}, with ${stats.wins} win${stats.wins !== 1 ? 's' : ''} and ${stats.losses} loss${stats.losses !== 1 ? 'es' : ''}. `;
    text += `Your realized net P and L is ${isWinSession ? 'positive' : 'negative'} ${pnlText}, with a win rate of ${Math.round(winRate)} percent. `;

    if (stats.bestTrade) {
      text += `Your top performing setup was ${stats.bestTrade.symbol}, generating ${format(stats.bestTrade.pnl)}. `;
    }

    if (stats.worstTrade && stats.worstTrade.pnl < 0) {
      text += `Your largest drawdown occurred on ${stats.worstTrade.symbol}, dropping ${format(Math.abs(stats.worstTrade.pnl))}. `;
    }

    // Behavioral and psychological advice
    if (isWinSession) {
      text += `You executed with composure today. Guard against overconfidence going into tomorrow. Stick strictly to your position sizing invariant and let setups come to you. `;
    } else {
      text += `Remember: losses are business expenses in this profession. Do not carry emotional tilt into tomorrow. Reset your mindset, verify higher timeframe liquidity sweeps, and honor your stop losses without hesitation. `;
    }

    text += `Great effort. Rest, recharge, and see you at the opening bell.`;
    return text;
  }, [stats, isWinSession, pnlText, format]);

  // Audio speech controls
  const handlePlay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Voice synthesis is not supported on this browser');
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utteranceRef.current = utterance;

    if (availableVoices[selectedVoiceIndex]) {
      utterance.voice = availableVoices[selectedVoiceIndex];
    }
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPaused(false);
      setIsPlaying(false);
    }
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (isPlaying) {
      handleStop();
      setTimeout(handlePlay, 100);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success('Audio debrief transcript copied');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl border border-border/80 bg-card/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border/60 flex items-start justify-between gap-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 text-white">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  AI End-of-Day Voice Briefing
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                  60s Audio Debrief
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Institutional spoken breakdown of today&apos;s trade executions and psychology.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              handleStop();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Audio Waveform & Player Controls */}
        <div className="p-6 bg-gradient-to-b from-muted/30 to-background flex flex-col items-center justify-center space-y-6 border-b border-border/40">
          {/* Animated Equalizer Waveform */}
          <div className="flex items-center justify-center gap-1.5 h-16 w-full">
            {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65].map((h, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 rounded-full transition-all duration-300',
                  isPlaying
                    ? 'bg-gradient-to-t from-violet-600 to-cyan-400 animate-pulse'
                    : 'bg-muted-foreground/30',
                )}
                style={{
                  height: isPlaying ? `${Math.max(15, (h * (Math.sin(i) + 1.2)) % 100)}%` : '15%',
                  animationDelay: `${i * 80}ms`,
                  animationDuration: '600ms',
                }}
              />
            ))}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 w-full text-center">
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Net P&amp;L</span>
              <div className={cn('text-sm font-bold font-mono', isWinSession ? 'text-emerald-400' : 'text-rose-400')}>
                {stats.netPnl !== 0 ? (isWinSession ? '+' : '') + format(stats.netPnl) : '₹0.00'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Win Rate</span>
              <div className="text-sm font-bold font-mono text-foreground">
                {Math.round(winRate)}%
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Positions</span>
              <div className="text-sm font-bold font-mono text-primary">
                {stats.totalTrades} Closed
              </div>
            </div>
          </div>

          {/* Transport Player Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleStop}
              className="p-3 rounded-full bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {isPlaying ? (
              <button
                onClick={handlePause}
                className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 transition-all hover:scale-105 cursor-pointer"
                title="Pause Briefing"
              >
                <Pause className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 transition-all hover:scale-105 cursor-pointer"
                title="Play Audio Briefing"
              >
                <Play className="w-6 h-6 ml-0.5" />
              </button>
            )}

            {/* Speed Toggle */}
            <div className="flex items-center rounded-xl bg-accent/50 p-1 border border-border/60 text-xs">
              {[1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={cn(
                    'px-2 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer',
                    speechRate === rate
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Spoken Transcript Scroll Box */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Executive Spoken Script
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 text-xs text-foreground/90 leading-relaxed font-sans">
            {script}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Speech synthesis powered client-side with 0 external API cost
          </span>

          <button
            onClick={() => {
              handleStop();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
