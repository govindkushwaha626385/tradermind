// ──────────────────────────────────────────────
// TradeMind — Admin User RBAC & Quota Override Modal
//
// Super-console tool allowing platform administrators to:
// - Promote/demote users with RBAC safeguards
// - Grant instant subscription trial extensions (+7d, +14d, +30d, +90d, +365d)
// - Override monthly trade quota limits (custom number or unlimited -1)
// - Switch subscription tier (Free, Pro, Elite) without payment gateway hurdles
// - Log all quota overrides to adminAuditLogs for compliance
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  Zap,
  Clock,
  Infinity as InfinityIcon,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  AlertTriangle,
  Loader2,
  Sparkles,
  Sliders,
  Check,
} from 'lucide-react';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';

export interface UserOverrideData {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription?: {
    id?: string;
    planId?: string;
    status?: string;
    provider?: string;
    currentPeriodEnd?: string | null;
    trialEndsAt?: string | null;
  } | null;
  override?: {
    customTradeQuota?: number;
    notes?: string;
    grantedBy?: string;
    grantedAt?: string;
  } | null;
}

interface UserQuotaOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserOverrideData | null;
  onSuccess: () => void;
}

const PLAN_PRESETS = [
  { slug: 'free', label: 'Starter (Free)', defaultQuota: 50, badge: 'Starter' },
  { slug: 'pro_monthly', label: 'Pro Monthly (₹499/mo)', defaultQuota: -1, badge: 'Pro' },
  { slug: 'pro_yearly', label: 'Pro Annual (₹3,999/yr)', defaultQuota: -1, badge: 'Pro' },
  { slug: 'elite_monthly', label: 'Elite Monthly (₹999/mo)', defaultQuota: -1, badge: 'Elite' },
  { slug: 'elite_yearly', label: 'Elite Annual (₹7,999/yr)', defaultQuota: -1, badge: 'Elite' },
];

export function UserQuotaOverrideModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: UserQuotaOverrideModalProps) {
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [planSlug, setPlanSlug] = useState<string>('pro_monthly');
  const [isUnlimitedQuota, setIsUnlimitedQuota] = useState<boolean>(true);
  const [customQuotaInput, setCustomQuotaInput] = useState<string>('500');
  const [extendDays, setExtendDays] = useState<number | null>(null);
  const [subStatus, setSubStatus] = useState<'active' | 'trialing' | 'canceled' | 'past_due' | 'expired'>('active');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sync state when active user changes
  useEffect(() => {
    if (!user) return;
    setRole((user.role as 'USER' | 'ADMIN') || 'USER');
    
    // Check existing override quota
    if (user.override?.customTradeQuota !== undefined) {
      if (user.override.customTradeQuota === -1) {
        setIsUnlimitedQuota(true);
        setCustomQuotaInput('500');
      } else {
        setIsUnlimitedQuota(false);
        setCustomQuotaInput(String(user.override.customTradeQuota));
      }
    } else {
      setIsUnlimitedQuota(true);
      setCustomQuotaInput('500');
    }

    if (user.override?.notes) {
      setAuditNotes(user.override.notes);
    } else {
      setAuditNotes('');
    }

    if (user.subscription?.status) {
      setSubStatus(user.subscription.status as any);
    } else {
      setSubStatus('active');
    }

    setExtendDays(null);
  }, [user]);

  if (!isOpen || !user) return null;

  const handleApplyPreset = (presetType: '7d' | '30d' | '90d' | '365d' | 'unlimited' | 'starter_reset') => {
    switch (presetType) {
      case '7d':
        setExtendDays(7);
        setPlanSlug('pro_monthly');
        setSubStatus('trialing');
        setIsUnlimitedQuota(true);
        setAuditNotes((prev) => prev || 'Granted 7-day Pro trial courtesy extension');
        break;
      case '30d':
        setExtendDays(30);
        setPlanSlug('pro_monthly');
        setSubStatus('trialing');
        setIsUnlimitedQuota(true);
        setAuditNotes((prev) => prev || 'Granted 30-day Pro trial extension');
        break;
      case '90d':
        setExtendDays(90);
        setPlanSlug('elite_monthly');
        setSubStatus('active');
        setIsUnlimitedQuota(true);
        setAuditNotes((prev) => prev || 'VIP 90-day Elite access grant');
        break;
      case '365d':
        setExtendDays(365);
        setPlanSlug('pro_yearly');
        setSubStatus('active');
        setIsUnlimitedQuota(true);
        setAuditNotes((prev) => prev || '1-Year VIP Institutional Pass');
        break;
      case 'unlimited':
        setIsUnlimitedQuota(true);
        setAuditNotes((prev) => prev || 'Granted unlimited trade sync quota override');
        break;
      case 'starter_reset':
        setPlanSlug('free');
        setIsUnlimitedQuota(false);
        setCustomQuotaInput('50');
        setExtendDays(null);
        setSubStatus('active');
        setAuditNotes((prev) => prev || 'Reset to standard starter tier');
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const quotaValue = isUnlimitedQuota ? -1 : Math.max(1, parseInt(customQuotaInput, 10) || 50);

      const payload: any = {
        role,
        customTradeQuota: quotaValue,
        planSlug,
        status: subStatus,
        notes: auditNotes.trim() || undefined,
      };

      if (extendDays && extendDays > 0) {
        payload.extendTrialDays = extendDays;
      }

      const res = await api.overrideUserQuota(user.id, payload);

      if (res.success) {
        toast.success(`Successfully updated RBAC & quotas for ${user.email}`);
        onSuccess();
        onClose();
      } else {
        toast.error((res as any).error?.message || 'Failed to apply quota override');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unexpected error applying quota override');
    } finally {
      setSubmitting(false);
    }
  };

  const existingQuotaDisplay = user.override?.customTradeQuota !== undefined
    ? (user.override.customTradeQuota === -1 ? 'Unlimited' : `${user.override.customTradeQuota} trades/mo`)
    : 'Default Plan Limits';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-primary to-emerald-500" />

        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-border/50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20 text-amber-500 border border-amber-500/30">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  Super-Console: User RBAC & Quota Override
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  SUPER-ADMIN
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target: <strong className="text-foreground">{user.name}</strong> ({user.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Summary Pill */}
        <div className="mx-6 mt-4 p-3 rounded-2xl bg-accent/30 border border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">Current Role: </span>
              <strong className={user.role === 'ADMIN' ? 'text-primary' : 'text-foreground'}>
                {user.role}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground">Active Plan: </span>
              <strong className="text-foreground">
                {user.subscription?.planId ? 'Active Tier' : 'Starter Free'}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground">Current Quota: </span>
              <strong className="text-emerald-500">{existingQuotaDisplay}</strong>
            </div>
          </div>
          {user.subscription?.currentPeriodEnd && (
            <div className="text-muted-foreground">
              Period ends:{' '}
              <strong className="text-foreground">
                {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
              </strong>
            </div>
          )}
        </div>

        {/* 1-Click Fast Presets */}
        <div className="px-6 pt-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            ⚡ 1-Click Super Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset('7d')}
              className="px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 text-xs font-semibold text-foreground flex items-center justify-between transition-colors text-left"
            >
              <span>+7 Days Pro Trial</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('30d')}
              className="px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 text-xs font-semibold text-foreground flex items-center justify-between transition-colors text-left"
            >
              <span>+30 Days Pro Trial</span>
              <Clock className="w-3.5 h-3.5 text-primary" />
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('90d')}
              className="px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 text-xs font-semibold text-foreground flex items-center justify-between transition-colors text-left"
            >
              <span>+90 Days VIP Elite</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('365d')}
              className="px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 text-xs font-semibold text-foreground flex items-center justify-between transition-colors text-left"
            >
              <span>+1 Year Annual</span>
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('unlimited')}
              className="px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 text-xs font-semibold text-foreground flex items-center justify-between transition-colors text-left"
            >
              <span>Unlimited Quota</span>
              <InfinityIcon className="w-3.5 h-3.5 text-emerald-500" />
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('starter_reset')}
              className="px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 text-xs font-semibold text-foreground flex items-center justify-between transition-colors text-left"
            >
              <span>Reset to Starter</span>
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Detailed Override Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* RBAC Role Selection */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>RBAC Security Role</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('USER')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    role === 'USER'
                      ? 'bg-primary/20 border-primary text-primary shadow-sm'
                      : 'border-input hover:bg-accent text-muted-foreground'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${role === 'USER' ? 'opacity-100' : 'opacity-0'}`} />
                  USER (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ADMIN')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    role === 'ADMIN'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-sm'
                      : 'border-input hover:bg-accent text-muted-foreground'
                  }`}
                >
                  <ShieldAlert className={`w-3.5 h-3.5 ${role === 'ADMIN' ? 'opacity-100' : 'opacity-0'}`} />
                  ADMIN (Operator)
                </button>
              </div>
            </div>

            {/* Subscription Status */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Subscription Status Override</span>
              </label>
              <select
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="active">Active (Paying / Verified)</option>
                <option value="trialing">Trialing (Evaluation Period)</option>
                <option value="canceled">Canceled</option>
                <option value="past_due">Past Due</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Tier Selection */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Plan Tier Target</span>
              </label>
              <select
                value={planSlug}
                onChange={(e) => setPlanSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {PLAN_PRESETS.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Trial Duration Extension */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Add Trial Days to Current Expiry</span>
              </label>
              <div className="flex items-center gap-2">
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDays(extendDays === d ? null : d)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      extendDays === d
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-accent text-foreground'
                    }`}
                  >
                    +{d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trade Quota Configuration */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Monthly Trade Execution & Sync Quota
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Directly overrides the monthly trade ingestion threshold for this user
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUnlimitedQuota}
                  onChange={(e) => setIsUnlimitedQuota(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs font-bold text-foreground">Unlimited (-1)</span>
              </label>
            </div>

            {!isUnlimitedQuota && (
              <div className="flex items-center gap-3 pt-1">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    step="50"
                    value={customQuotaInput}
                    onChange={(e) => setCustomQuotaInput(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    trades/mo
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[200, 500, 1000].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCustomQuotaInput(String(num))}
                      className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-medium hover:bg-accent text-foreground transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Admin Audit Reason */}
          <div>
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Super-Console Audit Reason / Notes</span>
            </label>
            <input
              type="text"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="e.g. Granted 30-day trial extension for prop firm institutional demo"
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-border/50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-input hover:bg-accent text-foreground text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-primary to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Applying Overrides...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply Override & Sync RBAC</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
