// ──────────────────────────────────────────────
// TradeMind — Risk Kill Switch Widget
//
// Dashboard card providing:
// - Live kill switch state (Armed, Triggered, Disarmed)
// - Today's P&L vs daily loss threshold progress
// - Trades executed today vs daily maximum
// - Consecutive loss counter
// - Emergency Kill Switch trigger button
// - Risk Settings modal configuration
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  Settings2,
  RefreshCw,
  Flame,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { RiskStatus, RiskProfile } from '@trademind/shared';
import { formatCurrency, cn } from '@/lib/utils';

export function RiskKillSwitchWidget() {
  const [status, setStatus] = useState<RiskStatus | null>(null);
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [confirmKillOpen, setConfirmKillOpen] = useState<boolean>(false);

  // Profile form state for settings modal
  const [formData, setFormData] = useState({
    dailyLossLimitAbs: '',
    maxTradesPerDay: '',
    maxConsecutiveLosses: '',
    killSwitchEnabled: true,
    killSwitchResetMode: 'manual',
    notifyAt75Pct: true,
    notifyOnKillSwitch: true,
  });

  const fetchData = async () => {
    try {
      const [statusRes, profileRes] = await Promise.all([
        api.getRiskStatus(),
        api.getRiskProfile(),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
        setFormData({
          dailyLossLimitAbs: String(profileRes.data.dailyLossLimitAbs ?? '10000'),
          maxTradesPerDay: String(profileRes.data.maxTradesPerDay ?? 10),
          maxConsecutiveLosses: String(profileRes.data.maxConsecutiveLosses ?? 3),
          killSwitchEnabled: profileRes.data.killSwitchEnabled ?? true,
          killSwitchResetMode: profileRes.data.killSwitchResetMode ?? 'manual',
          notifyAt75Pct: profileRes.data.notifyAt75Pct ?? true,
          notifyOnKillSwitch: profileRes.data.notifyOnKillSwitch ?? true,
        });
      }
    } catch (e) {
      console.error('Failed to load risk status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTriggerKillSwitch = async () => {
    setActionLoading(true);
    try {
      await api.triggerKillSwitch('Emergency kill switch triggered by trader');
      setConfirmKillOpen(false);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetKillSwitch = async () => {
    setActionLoading(true);
    try {
      await api.resetKillSwitch();
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.updateRiskProfile({
        dailyLossLimitAbs: formData.dailyLossLimitAbs,
        maxTradesPerDay: Number(formData.maxTradesPerDay),
        maxConsecutiveLosses: Number(formData.maxConsecutiveLosses),
        killSwitchEnabled: formData.killSwitchEnabled,
        killSwitchResetMode: formData.killSwitchResetMode as import('@trademind/shared').KillSwitchResetMode,
        notifyAt75Pct: formData.notifyAt75Pct,
        notifyOnKillSwitch: formData.notifyOnKillSwitch,
      });
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse">
        <div className="h-6 w-36 bg-slate-800 rounded mb-4" />
        <div className="h-16 w-full bg-slate-800/60 rounded" />
      </div>
    );
  }

  const isKillSwitchActive = status?.killSwitchActive ?? false;
  const isEnabled = profile?.killSwitchEnabled ?? true;
  const dailyLimitAbs = Number(profile?.dailyLossLimitAbs ?? 10000);
  const todayPnl = status?.todayPnl ?? 0;
  const pctUsed = status?.pctOfDailyLimitUsed ?? 0;
  const tradeCount = status?.todayTradeCount ?? 0;
  const maxTrades = profile?.maxTradesPerDay ?? 10;
  const consecLosses = status?.consecutiveLosses ?? 0;
  const maxConsec = profile?.maxConsecutiveLosses ?? 3;

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 backdrop-blur-xl shadow-xl">
        {/* Glow accent */}
        <div
          className={cn(
            'absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-all duration-500',
            isKillSwitchActive
              ? 'bg-red-500/20'
              : pctUsed >= 75
              ? 'bg-amber-500/20'
              : 'bg-emerald-500/10'
          )}
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'p-2 rounded-lg border flex items-center justify-center',
                isKillSwitchActive
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : isEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
              )}
            >
              {isKillSwitchActive ? (
                <ShieldAlert className="w-5 h-5 animate-pulse text-red-400" />
              ) : isEnabled ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <Shield className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Risk & Kill Switch
                </h3>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                    isKillSwitchActive
                      ? 'bg-red-950/60 border-red-500/50 text-red-300 animate-pulse'
                      : isEnabled
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  )}
                >
                  {isKillSwitchActive
                    ? 'TRIGGERED'
                    : isEnabled
                    ? 'ARMED & ACTIVE'
                    : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isKillSwitchActive
                  ? 'Trading blocked by safety rules'
                  : 'Capital preservation & discipline guard'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
            title="Configure Risk Limits"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* Daily Loss Limit Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Daily Loss Allowance</span>
            <span className="font-mono font-medium">
              <span className={todayPnl < 0 ? 'text-red-400' : 'text-emerald-400'}>
                {formatCurrency(todayPnl)}
              </span>
              <span className="text-slate-500"> / {formatCurrency(dailyLimitAbs)}</span>
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                pctUsed >= 90
                  ? 'bg-red-500'
                  : pctUsed >= 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              )}
              style={{ width: `${Math.min(100, pctUsed)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500">
            <span>{pctUsed}% limit consumed</span>
            {pctUsed >= 75 && (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Warning threshold hit
              </span>
            )}
          </div>
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-2.5">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>Trades Today</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-white">
                {tradeCount}
              </span>
              <span className="text-xs text-slate-500">/ {maxTrades} max</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-2.5">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Consecutive Losses</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={cn(
                  'text-lg font-bold font-mono',
                  consecLosses >= maxConsec
                    ? 'text-red-400'
                    : consecLosses > 0
                    ? 'text-amber-400'
                    : 'text-white'
                )}
              >
                {consecLosses}
              </span>
              <span className="text-xs text-slate-500">/ {maxConsec} trigger</span>
            </div>
          </div>
        </div>

        {/* Kill Switch Trigger / Reset CTA */}
        {isKillSwitchActive ? (
          <button
            onClick={handleResetKillSwitch}
            disabled={actionLoading}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-xs text-white bg-red-600 hover:bg-red-500 border border-red-400/50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50 cursor-pointer"
          >
            {actionLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
            Reset Kill Switch / Resume Trading
          </button>
        ) : (
          <button
            onClick={() => setConfirmKillOpen(true)}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-xs text-red-400 bg-red-950/20 hover:bg-red-950/50 border border-red-800/40 hover:border-red-700/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Lock className="w-4 h-4 text-red-400" />
            Emergency Kill Switch (Block Trading)
          </button>
        )}
      </div>

      {/* Confirmation Modal for Manual Kill Switch */}
      {confirmKillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-red-500/50 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Activate Kill Switch?</h4>
                <p className="text-xs text-slate-400">Immediate trading halt</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-6">
              Activating the Kill Switch locks down today&apos;s trading session to prevent revenge trading or further drawdowns. You can reset it if your policy allows.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmKillOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerKillSwitch}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Lock Trading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Settings Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-400" />
                <h4 className="text-base font-bold text-white">Risk Profile & Rules</h4>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Daily Loss Limit (₹ Absolute)
                </label>
                <input
                  type="number"
                  value={formData.dailyLossLimitAbs}
                  onChange={(e) =>
                    setFormData({ ...formData, dailyLossLimitAbs: e.target.value })
                  }
                  placeholder="10000"
                  className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  When today&apos;s realized loss exceeds this value, trading is automatically halted.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Max Trades / Day
                  </label>
                  <input
                    type="number"
                    value={formData.maxTradesPerDay}
                    onChange={(e) =>
                      setFormData({ ...formData, maxTradesPerDay: e.target.value })
                    }
                    placeholder="10"
                    className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Max Consecutive Losses
                  </label>
                  <input
                    type="number"
                    value={formData.maxConsecutiveLosses}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxConsecutiveLosses: e.target.value,
                      })
                    }
                    placeholder="3"
                    className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Kill Switch Reset Mode
                </label>
                <select
                  value={formData.killSwitchResetMode}
                  onChange={(e) =>
                    setFormData({ ...formData, killSwitchResetMode: e.target.value })
                  }
                  className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="manual">Manual (Trader can reset anytime)</option>
                  <option value="eod">End of Day (Resets next morning only)</option>
                  <option value="cooldown">Cooldown (Locks for set duration)</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.killSwitchEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        killSwitchEnabled: e.target.checked,
                      })
                    }
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-300">
                    Enable Automatic Kill Switch
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyAt75Pct}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notifyAt75Pct: e.target.checked,
                      })
                    }
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-300">
                    Notify & Warn at 75% of Daily Loss Limit
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Risk Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
