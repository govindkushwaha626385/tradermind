// ──────────────────────────────────────────────
// TradeMind — Live Behavioral Intervention Banner & Sound Chime (v2.0)
//
// Institutional-grade psychological circuit breaker:
// - Synthesized Web Audio API sound chime (zero external MP3 assets, zero latency)
// - Floating emergency banner with glassmorphism and animated risk beacons
// - 15-min / 30-min guided cool-down breathing timer (4-7-8 relaxation cycle)
// - Violation telemetry badges (loss limit, revenge entries, prop firm drawdowns)
// - 1-Click "Start AI Grounding Debrief" flow into AI Copilot
// - Collapsible floating state memory with persistent audio preferences
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Zap,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  RotateCcw,
  ArrowRight,
  Award,
  Activity,
  Heart,
  Brain,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import type { BehavioralShieldResult, ShieldFlag, ShieldLevel } from '@trademind/shared';

// ── Web Audio API Institutional Chime Synthesizer ──
function playSynthesizedChime(level: ShieldLevel) {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const isDanger = level === 'danger';

    // Master gain to keep tones pleasant and smooth
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.2, now);
    masterGain.connect(ctx.destination);

    if (isDanger) {
      // Danger Alert: Dual harmonic warning chord in two pulses (440Hz + 554Hz, then 440Hz + 659Hz)
      const playPulse = (startOffset: number, freq1: number, freq2: number) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const pulseGain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq1, now + startOffset);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq2, now + startOffset);

        pulseGain.gain.setValueAtTime(0, now + startOffset);
        pulseGain.gain.linearRampToValueAtTime(0.25, now + startOffset + 0.04);
        pulseGain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + 0.55);

        osc1.connect(pulseGain);
        osc2.connect(pulseGain);
        pulseGain.connect(masterGain);

        osc1.start(now + startOffset);
        osc2.start(now + startOffset);
        osc1.stop(now + startOffset + 0.6);
        osc2.stop(now + startOffset + 0.6);
      };

      playPulse(0, 440, 554.37);      // A4 + C#5
      playPulse(0.22, 440, 659.25);   // A4 + E5
    } else {
      // Warning Alert: Soft institutional ascending chime (523Hz + 659Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const chordGain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now); // E5

      chordGain.gain.setValueAtTime(0, now);
      chordGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      chordGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc1.connect(chordGain);
      osc2.connect(chordGain);
      chordGain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.95);
      osc2.stop(now + 0.95);
    }
  } catch (err) {
    // Graceful fallback if audio is blocked by browser policy
    console.debug('[Shield Audio] Web Audio playback prevented:', err);
  }
}

export function BehavioralInterventionBanner() {
  const router = useRouter();

  const [shield, setShield] = useState<BehavioralShieldResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastChimedLevel, setLastChimedLevel] = useState<ShieldLevel>('none');
  const [lockingOut, setLockingOut] = useState(false);

  // 15/30-minute cooldown remaining in seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // 4-7-8 Breathing relaxation exercise state
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathSeconds, setBreathSeconds] = useState(4);

  // Load sound mute preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('trademind_shield_audio_muted');
      if (storedMute === 'true') {
        setIsMuted(true);
      }
    }
  }, []);

  // Fetch live behavioral shield status
  const fetchShield = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getBehavioralShield();
      if (res && res.data) {
        setShield(res.data);

        // Calculate initial cooldown timer if active
        if (res.data.cooldownActive && (res.data.cooldownMinutesRemaining ?? 0) > 0) {
          setSecondsRemaining((prev) => {
            if (prev > 0) return prev; // Preserve counting down session
            return (res.data.cooldownMinutesRemaining ?? 15) * 60;
          });
        }
      }
    } catch (err) {
      console.error('[BehavioralInterventionBanner] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount and periodic refresh (every 60s)
  useEffect(() => {
    fetchShield();
    const interval = setInterval(fetchShield, 60000);
    return () => clearInterval(interval);
  }, [fetchShield]);

  // Listen to trade changes and broker sync events
  useEffect(() => {
    const handleSync = () => {
      fetchShield();
    };
    window.addEventListener('broker-synced', handleSync);
    window.addEventListener('trademind:trade-saved', handleSync);
    return () => {
      window.removeEventListener('broker-synced', handleSync);
      window.removeEventListener('trademind:trade-saved', handleSync);
    };
  }, [fetchShield]);

  // Play audio chime when risk escalates
  useEffect(() => {
    if (!shield) return;
    const currentLevel = shield.level;

    if (
      (currentLevel === 'warning' || currentLevel === 'danger') &&
      currentLevel !== lastChimedLevel &&
      !isMuted
    ) {
      playSynthesizedChime(currentLevel);
      setLastChimedLevel(currentLevel);
    }
  }, [shield, lastChimedLevel, isMuted]);

  // Cooldown countdown timer
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // 4-7-8 Breathing Cycle (4s Inhale, 7s Hold, 8s Exhale)
  useEffect(() => {
    if (!shield || (shield.level !== 'warning' && shield.level !== 'danger')) return;

    const breathTimer = setInterval(() => {
      setBreathSeconds((prev) => {
        if (prev > 1) return prev - 1;

        // Transition cycle
        setBreathPhase((current) => {
          if (current === 'Inhale') {
            setBreathSeconds(7);
            return 'Hold';
          }
          if (current === 'Hold') {
            setBreathSeconds(8);
            return 'Exhale';
          }
          setBreathSeconds(4);
          return 'Inhale';
        });

        return 4;
      });
    }, 1000);

    return () => clearInterval(breathTimer);
  }, [shield]);

  // Toggle audio chime mute
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('trademind_shield_audio_muted', String(next));
    if (!next && shield && (shield.level === 'warning' || shield.level === 'danger')) {
      playSynthesizedChime(shield.level);
    }
  };

  // Launch AI Grounding Debrief Session
  const handleStartAiDebrief = () => {
    if (!shield) return;

    const flagsSummary = shield.flags
      .map((f) => `• ${f.title}: ${f.description}`)
      .join('\n');

    const groundingPrompt = `I just tripped TradeMind's Behavioral Risk Shield (${shield.level.toUpperCase()} LEVEL).

Active Red Flags:
${flagsSummary}

Today's P&L: ${shield.currencySymbol || '$'}${shield.dailyPnl.toFixed(0)} across ${shield.todayTradeCount} trades.

Please initiate an institutional psychology debrief. I need you to:
1. Ground my nervous system and break any revenge trading impulse.
2. Review why continuing to trade today violates positive expected value (+EV).
3. Outline 3 strict boundary rules before I allow myself back at the terminal tomorrow.`;

    router.push(`/dashboard/ai-assistant?persona=psychology&question=${encodeURIComponent(groundingPrompt)}`);
  };

  // Emergency Kill Switch
  const handleKillSwitch = async () => {
    setLockingOut(true);
    try {
      await api.triggerKillSwitch(shield?.alertMessage || 'Behavioral shield lockout');
      toast.success('Emergency Kill Switch armed. Trading disabled for the session.');
      fetchShield();
    } catch {
      toast.error('Failed to trigger kill switch.');
    } finally {
      setLockingOut(false);
    }
  };

  // Only render if caution, warning, or danger
  if (!shield || shield.level === 'none') {
    return null;
  }

  const isDanger = shield.level === 'danger';
  const isWarning = shield.level === 'warning';
  const isCaution = shield.level === 'caution';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Collapsed Floating Pill State ────────────────
  if (isCollapsed) {
    return (
      <aside
        aria-label="Behavioral Shield Status"
        className={cn(
          'fixed bottom-20 left-4 z-40 max-w-sm rounded-2xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-xl transition-all duration-300 flex items-center gap-3 animate-fade-in cursor-pointer select-none',
          isDanger
            ? 'bg-rose-950/90 border-rose-500/60 text-rose-100 shadow-rose-950/60'
            : isWarning
            ? 'bg-amber-950/90 border-amber-500/60 text-amber-100 shadow-amber-950/60'
            : 'bg-slate-900/90 border-blue-500/40 text-blue-100'
        )}
        onClick={() => setIsCollapsed(false)}
      >
        <div className="relative flex items-center justify-center flex-shrink-0">
          {isDanger ? (
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <span
            className={cn(
              'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full',
              isDanger ? 'bg-rose-500 animate-ping' : 'bg-amber-500'
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isDanger ? 'Shield Lockout' : 'Risk Active'}
            </span>
            {secondsRemaining > 0 && (
              <span className="text-2xs font-mono font-bold bg-black/40 px-1.5 py-0.5 rounded text-rose-300">
                {formatTime(secondsRemaining)}
              </span>
            )}
          </div>
          <p className="text-2xs text-muted-foreground truncate">
            {shield.flags.length} active flag{shield.flags.length > 1 ? 's' : ''} · Click to review
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(false);
          }}
          className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          title="Expand banner"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  // ── Full Expanded Intervention Banner ────────────
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full border-b transition-all duration-300 select-none overflow-hidden z-30 shrink-0 backdrop-blur-2xl',
        isDanger
          ? 'bg-gradient-to-r from-rose-950/95 via-rose-900/90 to-background border-rose-500/50 text-foreground shadow-2xl shadow-rose-950/40'
          : isWarning
          ? 'bg-gradient-to-r from-amber-950/95 via-amber-900/85 to-background border-amber-500/50 text-foreground shadow-xl shadow-amber-950/30'
          : 'bg-gradient-to-r from-slate-900/95 via-blue-950/80 to-background border-blue-500/40 text-foreground'
      )}
    >
      {/* Ambient background glow accent */}
      <div
        className={cn(
          'absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40',
          isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
        )}
      />

      <div className="max-w-[1600px] mx-auto px-4 py-3 sm:px-6 sm:py-3.5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
          {/* Left: Indicator Icon & Status Headline */}
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-inner mt-0.5 sm:mt-0',
                isDanger
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                  : isWarning
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
              )}
            >
              {isDanger ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Brain className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-widest border',
                    isDanger
                      ? 'bg-rose-500/25 border-rose-400/50 text-rose-200'
                      : isWarning
                      ? 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                      : 'bg-blue-500/25 border-blue-400/40 text-blue-200'
                  )}
                >
                  {isDanger
                    ? 'Critical Shield Lockout'
                    : isWarning
                    ? 'Behavioral Risk Alert'
                    : 'Behavioral Caution'}
                </span>

                {secondsRemaining > 0 && (
                  <span className="flex items-center gap-1 text-2xs font-mono font-bold bg-black/40 border border-white/10 px-2 py-0.5 rounded-lg text-rose-300">
                    <Clock className="w-3 h-3 text-rose-400" />
                    <span>Cool-down: {formatTime(secondsRemaining)}</span>
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm font-semibold tracking-tight text-foreground mt-0.5">
                {shield.alertMessage}
              </p>
            </div>
          </div>

          {/* Center: Neuro-Calm 4-7-8 Breathing Pulse (For Warning & Danger) */}
          {(isDanger || isWarning) && (
            <div className="w-full lg:w-auto flex items-center justify-between sm:justify-start gap-3 px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2 text-2xs">
                <Heart className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="text-muted-foreground font-medium">4-7-8 Calm:</span>
                <span
                  className={cn(
                    'font-bold uppercase tracking-wider transition-colors',
                    breathPhase === 'Inhale' && 'text-emerald-300',
                    breathPhase === 'Hold' && 'text-blue-300',
                    breathPhase === 'Exhale' && 'text-rose-300'
                  )}
                >
                  {breathPhase} ({breathSeconds}s)
                </span>
              </div>

              {/* Dynamic pulse relaxation bar */}
              <div className="w-24 sm:w-28 h-2 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    breathPhase === 'Inhale' && 'w-full bg-emerald-400',
                    breathPhase === 'Hold' && 'w-full bg-blue-400 opacity-80',
                    breathPhase === 'Exhale' && 'w-1/4 bg-rose-400'
                  )}
                />
              </div>
            </div>
          )}

          {/* Right: Actions, Mute Toggle & Minimize */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-shrink-0">
            {/* 1-Click Start AI Grounding Debrief */}
            <button
              onClick={handleStartAiDebrief}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1.5 shadow-md shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start AI Grounding Debrief</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>

            {/* Emergency Kill Switch Button for Danger */}
            {isDanger && (
              <button
                onClick={handleKillSwitch}
                disabled={lockingOut}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
                title="Lock terminal orders for rest of session"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {lockingOut ? 'Locking...' : 'Lock Session'}
                </span>
              </button>
            )}

            {/* Audio Chime Mute/Unmute Toggle */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-background/50 hover:bg-background border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
              title={isMuted ? 'Unmute Audio Alert Chime' : 'Mute Audio Alert Chime'}
              aria-label="Toggle Alert Sound"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {/* Collapse banner to floating pill */}
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-2 rounded-xl bg-background/50 hover:bg-background border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Minimize banner"
              aria-label="Minimize banner"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Active Violation Telemetry Badges ──── */}
        {shield.flags.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-2xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1 mr-1">
              <Activity className="w-3 h-3" />
              Active Telemetry:
            </span>

            {shield.flags.map((flag, idx) => {
              const isFlagDanger = flag.severity === 'danger';
              return (
                <div
                  key={idx}
                  className={cn(
                    'group relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-medium border transition-colors',
                    isFlagDanger
                      ? 'bg-rose-950/60 border-rose-500/40 text-rose-200 hover:bg-rose-900/60'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-200 hover:bg-amber-900/60'
                  )}
                  title={`${flag.description} - Recommendation: ${flag.recommendation}`}
                >
                  {flag.type === 'revenge_trading' ? (
                    <Flame className="w-3 h-3 text-rose-400" />
                  ) : flag.type === 'loss_limit' ? (
                    <Lock className="w-3 h-3 text-amber-400" />
                  ) : flag.type === 'prop_firm_drawdown' ? (
                    <Award className="w-3 h-3 text-amber-400" />
                  ) : flag.type === 'overtrading' ? (
                    <Clock className="w-3 h-3 text-blue-400" />
                  ) : (
                    <Brain className="w-3 h-3 text-purple-400" />
                  )}

                  <span className="font-semibold">{flag.title}</span>

                  {flag.metric && (
                    <span className="font-mono text-2xs opacity-80 border-l border-white/15 pl-1.5">
                      {flag.metric.unit === '₹' || flag.metric.unit === '$' || flag.metric.unit === '€' || flag.metric.unit === '£'
                        ? `${flag.metric.unit}${flag.metric.current.toFixed(0)} / ${flag.metric.unit}${flag.metric.threshold.toFixed(0)}`
                        : `${flag.metric.current} / ${flag.metric.threshold} ${flag.metric.unit}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
