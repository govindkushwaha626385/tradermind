// ──────────────────────────────────────────────
// TradeMind — AI Behavioral Tilt Shield & Revenge Trading Protection
//
// A psychological circuit breaker modal triggered when:
// - Consecutive losses >= 3
// - Daily loss limit approaches or exceeds 80%
// - Manual "Tilt Pause" triggered from Command Palette or Topbar
//
// Features:
// - Interactive 4-4-4 Box Breathing visualizer (Inhale, Hold, Exhale, Hold)
// - Objective Loss Breakdown & Rule Check
// - 1-Click Risk Lockout (Emergency Kill-Switch)
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Heart,
  Brain,
  AlertTriangle,
  Lock,
  RotateCcw,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface TiltProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consecutiveLosses?: number;
  todayPnl?: number;
  onKillSwitchTriggered?: () => void;
}

export function TiltProtectionModal({
  isOpen,
  onClose,
  consecutiveLosses = 3,
  todayPnl = -12500,
  onKillSwitchTriggered,
}: TiltProtectionModalProps) {
  const { format } = useCurrency();
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Pause'>('Inhale');
  const [breathCount, setBreathCount] = useState(4);
  const [reflectionAnswer, setReflectionAnswer] = useState<string>('');
  const [honestCheckPassed, setHonestCheckPassed] = useState(false);
  const [lockingOut, setLockingOut] = useState(false);

  // 4-4-4-4 Box Breathing cycle
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setBreathCount((prev) => {
        if (prev > 1) return prev - 1;

        // Transition phase
        setBreathingPhase((phase) => {
          if (phase === 'Inhale') return 'Hold';
          if (phase === 'Hold') return 'Exhale';
          if (phase === 'Exhale') return 'Pause';
          return 'Inhale';
        });
        return 4;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleActivateKillSwitch = async () => {
    setLockingOut(true);
    try {
      await api.triggerKillSwitch();
      toast.success('Risk Kill Switch armed. Trading locked for the day.');
      onKillSwitchTriggered?.();
      onClose();
    } catch {
      toast.error('Failed to engage Kill Switch');
    } finally {
      setLockingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-xl rounded-3xl border border-rose-500/30 bg-background/95 p-6 md:p-8 shadow-2xl shadow-rose-950/40 text-foreground overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(244,63,94,0.06) 0%, rgba(15,23,42,0.98) 100%)',
        }}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Psychological Tilt Alert</h2>
                <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Circuit Breaker
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI detected emotional escalation: {consecutiveLosses} consecutive losses ({format(todayPnl)})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Box Breathing Visualizer */}
        <div className="my-6 p-6 rounded-2xl bg-card/60 border border-border/60 text-center relative overflow-hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2">
            Neuro-Calm Exercise · Box Breathing
          </div>

          {/* Animated Pulsing Ring */}
          <div className="relative w-28 h-28 mx-auto my-3 flex items-center justify-center">
            <div
              className={cn(
                'absolute inset-0 rounded-full border-2 border-rose-500/40 transition-all duration-1000',
                breathingPhase === 'Inhale' && 'scale-110 border-emerald-400/60 bg-emerald-500/10',
                breathingPhase === 'Hold' && 'scale-110 border-blue-400/60 bg-blue-500/10',
                breathingPhase === 'Exhale' && 'scale-90 border-rose-400/60 bg-rose-500/10',
                breathingPhase === 'Pause' && 'scale-90 border-amber-400/60 bg-amber-500/10',
              )}
            />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black tabular-nums">{breathCount}</span>
              <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                {breathingPhase}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {breathingPhase === 'Inhale' && 'Breathe in slowly through your nose. Disconnect from P&L.'}
            {breathingPhase === 'Hold' && 'Hold gently. Acknowledge the market does not owe you anything.'}
            {breathingPhase === 'Exhale' && 'Slowly release all tension. Protect your remaining capital.'}
            {breathingPhase === 'Pause' && 'Empty your mind. Do not click buy or sell until centered.'}
          </p>
        </div>

        {/* Cognitive Re-Anchor Reflection */}
        <div className="space-y-3 mb-6">
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-primary" />
            <span>Honesty Check Before Next Trade</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setReflectionAnswer('setup_violation')}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                reflectionAnswer === 'setup_violation'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40',
              )}
            >
              1. I forced trades outside my playbook setup
            </button>
            <button
              type="button"
              onClick={() => setReflectionAnswer('oversized')}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                reflectionAnswer === 'oversized'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40',
              )}
            >
              2. I increased size to win back losses
            </button>
            <button
              type="button"
              onClick={() => setReflectionAnswer('bad_market')}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                reflectionAnswer === 'bad_market'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40',
              )}
            >
              3. Market conditions are choppy / unfavorable
            </button>
            <button
              type="button"
              onClick={() => setReflectionAnswer('normal_variance')}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                reflectionAnswer === 'normal_variance'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40',
              )}
            >
              4. Good execution, acceptable statistical loss
            </button>
          </div>

          <label className="flex items-center gap-2 pt-2 cursor-pointer text-xs text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={honestCheckPassed}
              onChange={(e) => setHonestCheckPassed(e.target.checked)}
              className="rounded border-border accent-primary w-4 h-4 cursor-pointer"
            />
            <span>I accept today&apos;s outcome and promise not to revenge trade.</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleActivateKillSwitch}
            disabled={lockingOut}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-semibold text-xs bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-colors"
          >
            <Lock className="w-4 h-4" />
            <span>{lockingOut ? 'Locking...' : 'Lock Trading for Today (Kill-Switch)'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={!honestCheckPassed}
            className={cn(
              'w-full sm:w-auto py-3 px-6 rounded-xl font-semibold text-xs border transition-all flex items-center justify-center gap-2',
              honestCheckPassed
                ? 'border-border bg-background hover:bg-accent text-foreground'
                : 'border-border/40 bg-muted/10 text-muted-foreground cursor-not-allowed opacity-60',
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I am Centered (Resume)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
