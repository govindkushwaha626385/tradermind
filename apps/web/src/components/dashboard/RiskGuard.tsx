// ──────────────────────────────────────────────
// TradeMind — RiskGuard Component
//
// Persistent, real-time risk monitor banner that displays:
// - Kill switch activation alerts (locks trading UI)
// - 75%+ daily loss warnings
// - Consecutive loss alerts
// - Quick reset / unlock actions
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, Lock, Unlock, RefreshCw, X, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { RiskStatus } from '@trademind/shared';
import { cn } from '@/lib/utils';

interface RiskGuardProps {
  onStatusChange?: (status: RiskStatus) => void;
  className?: string;
}

export function RiskGuard({ onStatusChange, className }: RiskGuardProps) {
  const [status, setStatus] = useState<RiskStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [resetting, setResetting] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.getRiskStatus();
      if (res.success && res.data) {
        setStatus(res.data);
        onStatusChange?.(res.data);
      }
    } catch {
      // Graceful fallback if offline or backend starting
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status every 30 seconds during active sessions
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    if (!status?.killSwitchActive) return;
    setResetting(true);
    setErrorMsg(null);
    try {
      const res = await api.resetKillSwitch();
      if (res.success) {
        await fetchStatus();
      } else {
        setErrorMsg(res.error?.message ?? 'Failed to reset kill switch');
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Network error resetting kill switch');
    } finally {
      setResetting(false);
    }
  };

  if (loading || !status) return null;

  const isKillSwitchActive = status.killSwitchActive;
  const isHighRisk = status.pctOfDailyLimitUsed >= 75 && !isKillSwitchActive;
  const hasWarnings = (status.warnings?.length ?? 0) > 0;

  // Don't render banner if all is green and no warnings
  if (!isKillSwitchActive && !isHighRisk && !hasWarnings) return null;
  if (dismissed && !isKillSwitchActive) return null;

  return (
    <div
      className={cn(
        'relative w-full rounded-xl border p-4 shadow-lg transition-all duration-300 backdrop-blur-md',
        isKillSwitchActive
          ? 'border-red-500/50 bg-red-950/40 text-red-100 shadow-red-950/30 animate-pulse'
          : isHighRisk
          ? 'border-amber-500/40 bg-amber-950/30 text-amber-100 shadow-amber-950/20'
          : 'border-yellow-500/30 bg-yellow-950/20 text-yellow-100',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0',
              isKillSwitchActive
                ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                : 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
            )}
          >
            {isKillSwitchActive ? (
              <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-wide uppercase">
                {isKillSwitchActive ? 'Trading Lock Active — Kill Switch Engaged' : 'Risk Warning Active'}
              </span>
              {isKillSwitchActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-red-600/30 text-red-300 border border-red-500/50">
                  <Lock className="w-3 h-3" /> LOCKED
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm mt-0.5 text-slate-300">
              {status.reason ??
                (isHighRisk
                  ? `You have reached ${status.pctOfDailyLimitUsed}% of your daily loss limit. Consider stepping away for the day.`
                  : status.warnings?.[0] ?? 'Daily risk threshold approaching.')}
            </p>

            {errorMsg && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errorMsg}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isKillSwitchActive ? (
            <button
              onClick={handleReset}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {resetting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
              {resetting ? 'Resetting...' : 'Request Unlock / Reset'}
            </button>
          ) : (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              aria-label="Dismiss risk alert"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
