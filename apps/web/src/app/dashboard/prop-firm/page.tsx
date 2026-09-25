// ──────────────────────────────────────────────
// TradeMind — Prop Firm Challenge & Funded Account Tracker
//
// Industry-first prop firm tracker for Indian & global traders.
// Supports FTMO, FundedNext, Apex, Topstep, The5ers, Funding Pips,
// and custom prop firm evaluation & funded accounts.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award,
  Shield,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  Activity,
  Calculator,
  RefreshCw,
  ExternalLink,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Flame,
  Check,
  Percent,
  Compass,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { TraderCredentialModal } from '@/components/education/TraderCredentialModal';

interface PropFirmAccount {
  id: string;
  firmName: string;
  accountName: string;
  accountSize: number;
  currency: string;
  phase: 'Phase 1' | 'Phase 2' | 'Funded' | 'Instant';
  startingBalance: number;
  currentBalance: number;
  highWaterMark: number;
  dailyLossLimitPct: number; // e.g. 5%
  maxDrawdownPct: number;    // e.g. 10%
  profitTargetPct: number;   // e.g. 8%
  minTradingDays: number;
  tradingDaysCompleted: number;
  todayPnl: number;
  weekendHoldingAllowed: boolean;
  newsTradingAllowed: boolean;
  drawdownType?: 'STATIC' | 'TRAILING';
  notes?: string;
  createdAt: string;
}

const PROP_FIRM_PRESETS = [
  {
    name: 'FTMO $100K (2-Step)',
    firm: 'FTMO',
    size: 100000,
    currency: 'USD',
    phase: 'Phase 1' as const,
    dailyLoss: 5,
    maxDrawdown: 10,
    profitTarget: 10,
    minDays: 4,
    drawdownType: 'STATIC' as const,
  },
  {
    name: 'FTMO $50K (2-Step)',
    firm: 'FTMO',
    size: 50000,
    currency: 'USD',
    phase: 'Phase 1' as const,
    dailyLoss: 5,
    maxDrawdown: 10,
    profitTarget: 10,
    minDays: 4,
    drawdownType: 'STATIC' as const,
  },
  {
    name: 'FundedNext $50K (Stellar)',
    firm: 'FundedNext',
    size: 50000,
    currency: 'USD',
    phase: 'Phase 1' as const,
    dailyLoss: 5,
    maxDrawdown: 10,
    profitTarget: 8,
    minDays: 5,
    drawdownType: 'STATIC' as const,
  },
  {
    name: 'Apex Trader Funding $50K',
    firm: 'Apex',
    size: 50000,
    currency: 'USD',
    phase: 'Phase 1' as const,
    dailyLoss: 0, // Trailing threshold based
    maxDrawdown: 5, // $2,500 trailing
    profitTarget: 6, // $3,000
    minDays: 1,
    drawdownType: 'TRAILING' as const,
  },
  {
    name: 'Topstep $50K Trading Combine',
    firm: 'Topstep',
    size: 50000,
    currency: 'USD',
    phase: 'Phase 1' as const,
    dailyLoss: 2, // $1,000
    maxDrawdown: 4, // $2,000
    profitTarget: 6, // $3,000
    minDays: 2,
    drawdownType: 'TRAILING' as const,
  },
  {
    name: 'The5ers $100K High Stakes',
    firm: 'The5ers',
    size: 100000,
    currency: 'USD',
    phase: 'Phase 1' as const,
    dailyLoss: 5,
    maxDrawdown: 10,
    profitTarget: 8,
    minDays: 3,
    drawdownType: 'STATIC' as const,
  },
];

export default function PropFirmPage() {
  const [accounts, setAccounts] = useState<PropFirmAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCredentialOpen, setIsCredentialOpen] = useState(false);
  const [simulatedLoss, setSimulatedLoss] = useState<string>('500');
  const [isSyncing, setIsSyncing] = useState(false);

  // New account form state
  const [formPreset, setFormPreset] = useState<string>('custom');
  const [formFirm, setFormFirm] = useState('FTMO');
  const [formName, setFormName] = useState('My Prop Challenge');
  const [formSize, setFormSize] = useState('100000');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formPhase, setFormPhase] = useState<'Phase 1' | 'Phase 2' | 'Funded' | 'Instant'>('Phase 1');
  const [formDailyLoss, setFormDailyLoss] = useState('5');
  const [formMaxDrawdown, setFormMaxDrawdown] = useState('10');
  const [formProfitTarget, setFormProfitTarget] = useState('10');
  const [formMinDays, setFormMinDays] = useState('4');
  const [formTodayPnl, setFormTodayPnl] = useState('0');
  const [formBalance, setFormBalance] = useState('100000');
  const [formDrawdownType, setFormDrawdownType] = useState<'STATIC' | 'TRAILING'>('STATIC');

  // Load accounts from cloud API with localStorage fallback
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.getPropFirmAccounts();
      if (res?.data && Array.isArray(res.data)) {
        if (res.data.length > 0) {
          const mapped = res.data.map((a: any) => ({
            ...a,
            accountSize: Number(a.accountSize),
            startingBalance: Number(a.startingBalance),
            currentBalance: Number(a.currentBalance),
            highWaterMark: Number(a.highWaterMark),
            dailyLossLimitPct: Number(a.dailyLossLimitPct),
            maxDrawdownPct: Number(a.maxDrawdownPct),
            profitTargetPct: Number(a.profitTargetPct),
            todayPnl: Number(a.todayPnl),
          }));
          setAccounts(mapped);
          setSelectedId((prev) => (mapped.find((m: any) => m.id === prev) ? prev : mapped[0].id));
          localStorage.setItem('trademind_prop_accounts', JSON.stringify(mapped));
          return;
        } else {
          // Explicit empty set from DB
          setAccounts([]);
          setSelectedId('');
          localStorage.removeItem('trademind_prop_accounts');
          return;
        }
      }
    } catch {
      // Fallback to local storage if API offline
    } finally {
      setLoading(false);
    }

    try {
      const stored = localStorage.getItem('trademind_prop_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed);
          setSelectedId(parsed[0].id);
          return;
        }
      }
      setAccounts([]);
      setSelectedId('');
    } catch {
      setAccounts([]);
      setSelectedId('');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStartPreset = async (preset: typeof PROP_FIRM_PRESETS[0]) => {
    const newAccData = {
      firmName: preset.firm,
      accountName: preset.name,
      accountSize: preset.size,
      currency: preset.currency,
      phase: preset.phase,
      startingBalance: preset.size,
      currentBalance: preset.size,
      highWaterMark: preset.size,
      dailyLossLimitPct: preset.dailyLoss,
      maxDrawdownPct: preset.maxDrawdown,
      profitTargetPct: preset.profitTarget,
      minTradingDays: preset.minDays,
      tradingDaysCompleted: 0,
      todayPnl: 0,
      weekendHoldingAllowed: false,
      newsTradingAllowed: true,
      drawdownType: preset.drawdownType,
      notes: `${preset.firm} Evaluation Challenge [${preset.drawdownType} DRAWDOWN]`,
    };

    try {
      const res = await api.createPropFirmAccount(newAccData);
      if (res?.data) {
        toast.success(`🎉 Created prop challenge: ${res.data.accountName}`);
        await loadAccounts();
        setSelectedId(res.data.id);
        return;
      }
    } catch {
      // Local fallback
    }

    const localAcc: PropFirmAccount = {
      ...newAccData,
      id: `prop-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const next = [...accounts, localAcc];
    saveAccounts(next);
    setSelectedId(localAcc.id);
    toast.success(`🎉 Initialized prop challenge: ${localAcc.accountName}`);
  };

  useEffect(() => {
    document.title = 'Prop Firm Tracker — TradeMind';
    loadAccounts();
  }, []);

  const saveAccounts = (newAccounts: PropFirmAccount[]) => {
    setAccounts(newAccounts);
    try {
      localStorage.setItem('trademind_prop_accounts', JSON.stringify(newAccounts));
    } catch (e) {
      console.error('Failed to save prop accounts to localStorage', e);
    }
  };

  const currentAccount = accounts.find((a) => a.id === selectedId) ?? accounts[0];

  const handleApplyPreset = (presetName: string) => {
    setFormPreset(presetName);
    const p = PROP_FIRM_PRESETS.find((x) => x.name === presetName);
    if (!p) return;
    setFormFirm(p.firm);
    setFormName(p.name);
    setFormSize(String(p.size));
    setFormBalance(String(p.size));
    setFormCurrency(p.currency);
    setFormPhase(p.phase);
    setFormDailyLoss(String(p.dailyLoss));
    setFormMaxDrawdown(String(p.maxDrawdown));
    setFormProfitTarget(String(p.profitTarget));
    setFormMinDays(String(p.minDays));
    setFormDrawdownType(p.drawdownType);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const size = parseFloat(formSize) || 100000;
    const balance = parseFloat(formBalance) || size;
    const newAccData = {
      firmName: formFirm,
      accountName: formName || `${formFirm} ${formCurrency === 'EUR' ? '€' : formCurrency === 'GBP' ? '£' : formCurrency === 'INR' ? '₹' : formCurrency === 'USDT' ? '₮' : '$'}${size.toLocaleString()}`,
      accountSize: size,
      currency: formCurrency,
      phase: formPhase,
      startingBalance: size,
      currentBalance: balance,
      highWaterMark: Math.max(size, balance),
      dailyLossLimitPct: parseFloat(formDailyLoss) || 0,
      maxDrawdownPct: parseFloat(formMaxDrawdown) || 10,
      profitTargetPct: parseFloat(formProfitTarget) || 10,
      minTradingDays: parseInt(formMinDays, 10) || 4,
      tradingDaysCompleted: 0,
      todayPnl: parseFloat(formTodayPnl) || 0,
      weekendHoldingAllowed: false,
      newsTradingAllowed: true,
      drawdownType: formDrawdownType,
      notes: `${formFirm} ${formPhase} [${formDrawdownType} DRAWDOWN]`,
    };

    try {
      const res = await api.createPropFirmAccount(newAccData);
      if (res?.data) {
        toast.success(`🎉 Created prop firm account in cloud: ${res.data.accountName}`);
        await loadAccounts();
        setSelectedId(res.data.id);
        setIsAddModalOpen(false);
        return;
      }
    } catch {
      // Local fallback
    }

    const localAcc: PropFirmAccount = {
      ...newAccData,
      id: `prop-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const next = [...accounts, localAcc];
    saveAccounts(next);
    setSelectedId(localAcc.id);
    setIsAddModalOpen(false);
    toast.success(`🎉 Created prop firm account: ${localAcc.accountName}`);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prop firm account?')) return;

    try {
      await api.deletePropFirmAccount(id);
    } catch {
      // ignore
    }

    const next = accounts.filter((a) => a.id !== id);
    saveAccounts(next);
    setSelectedId(next[0]?.id ?? '');
    toast.success('Account deleted');
  };

  const handleSyncLiveTrades = async () => {
    if (!currentAccount?.id) return;
    setIsSyncing(true);
    try {
      const res = await api.syncPropFirmAccount(currentAccount.id);
      if (res?.data) {
        toast.success(`⚡ Live trades synced with ${currentAccount.accountName}`);
        await loadAccounts();
      } else {
        toast.info('Account updated with current trade calculations');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateBalance = (newBalance: number) => {
    if (!currentAccount) return;
    const next = accounts.map((a) => {
      if (a.id !== currentAccount.id) return a;
      const hwm = Math.max(a.highWaterMark, newBalance);
      return {
        ...a,
        currentBalance: newBalance,
        highWaterMark: hwm,
      };
    });
    saveAccounts(next);
    toast.success('Balance updated');
  };

  const renderAddAccountModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-slate-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-white mb-1">Add Prop Firm Challenge Account</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Select a standard firm preset or enter custom challenge rules
        </p>

        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Load Firm Preset
            </label>
            <select
              value={formPreset}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="custom">Custom Prop Firm...</option>
              {PROP_FIRM_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Prop Firm Name</label>
              <input
                type="text"
                required
                value={formFirm}
                onChange={(e) => setFormFirm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="FTMO, FundedNext, Apex..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Account Label</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="My Challenge #1"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Account Size</label>
              <input
                type="number"
                required
                value={formSize}
                onChange={(e) => {
                  setFormSize(e.target.value);
                  setFormBalance(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
                <option value="GBP">GBP (£)</option>
                <option value="USDT">USDT (₮)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Stage</label>
              <select
                value={formPhase}
                onChange={(e) => setFormPhase(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Phase 1">Phase 1 (Challenge)</option>
                <option value="Phase 2">Phase 2 (Verification)</option>
                <option value="Funded">Funded / Live</option>
                <option value="Instant">Instant Funding</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Daily Loss Limit %</label>
              <input
                type="number"
                step="0.5"
                value={formDailyLoss}
                onChange={(e) => setFormDailyLoss(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Max Drawdown %</label>
              <input
                type="number"
                step="0.5"
                value={formMaxDrawdown}
                onChange={(e) => setFormMaxDrawdown(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Profit Target %</label>
              <input
                type="number"
                step="0.5"
                value={formProfitTarget}
                onChange={(e) => setFormProfitTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Min Trading Days</label>
              <input
                type="number"
                min="0"
                value={formMinDays}
                onChange={(e) => setFormMinDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="4"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Drawdown Model</label>
              <select
                value={formDrawdownType}
                onChange={(e) => setFormDrawdownType(e.target.value as 'STATIC' | 'TRAILING')}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="STATIC">Static Floor (FTMO, 5ers, FundedNext)</option>
                <option value="TRAILING">Trailing High Watermark (Apex, Topstep)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-accent text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <PageHeader
          title="Prop Firm Challenge Tracker"
          description="Monitor evaluation milestones, daily loss limits, and drawdown guardrails in real time"
          icon={Award}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          <div className="h-44 rounded-2xl bg-zinc-900 border border-zinc-800" />
          <div className="h-44 rounded-2xl bg-zinc-900 border border-zinc-800" />
          <div className="h-44 rounded-2xl bg-zinc-900 border border-zinc-800" />
        </div>
      </div>
    );
  }

  if (!currentAccount || accounts.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <PageHeader
          title="Prop Firm Challenge Tracker"
          description="Monitor evaluation milestones, daily loss limits, and drawdown guardrails in real time"
          icon={Award}
          actions={
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Custom Challenge
            </button>
          }
        />

        {/* Hero Onboarding Card */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-zinc-900/80 to-zinc-950 p-6 sm:p-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Prop Desk Compliance Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Track Your Prop Firm Challenge with Trailing Drawdown Guardrails
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Never breach an evaluation rule again. Select your prop firm below to automatically enforce daily loss limits, trailing drawdowns, minimum trading days, and profit targets with real data.
            </p>
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Configure Custom Challenge
              </button>
              <Link
                href="/dashboard/roadmap?track=prop_firm"
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm transition-colors border border-zinc-700/60 flex items-center gap-1.5"
              >
                <Compass className="w-4 h-4 text-emerald-400" />
                View Funded Trader Roadmap
              </Link>
            </div>
          </div>
        </div>

        {/* 1-Click Starter Presets Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            1-Click Official Challenge Starters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROP_FIRM_PRESETS.map((preset, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-indigo-500/50 transition-all p-5 flex flex-col justify-between shadow-lg hover:shadow-indigo-500/10"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {preset.firm}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      {preset.currency === 'USD' ? '$' : '€'}{preset.size.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {preset.name}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      {preset.phase} Evaluation Challenge
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                    <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
                      <span className="text-zinc-500 block text-[10px]">Profit Target</span>
                      <span className="font-bold text-emerald-400">+{preset.profitTarget}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
                      <span className="text-zinc-500 block text-[10px]">Daily Loss Limit</span>
                      <span className="font-bold text-amber-400">{preset.dailyLoss > 0 ? `${preset.dailyLoss}%` : 'Trailing'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
                      <span className="text-zinc-500 block text-[10px]">Max Drawdown</span>
                      <span className="font-bold text-rose-400">{preset.maxDrawdown}% {preset.drawdownType === 'TRAILING' ? 'Trailing' : 'Static'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
                      <span className="text-zinc-500 block text-[10px]">Min Trading Days</span>
                      <span className="font-bold text-zinc-200">{preset.minDays} Days</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleQuickStartPreset(preset)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-transparent text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start This Challenge</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {isAddModalOpen && renderAddAccountModal()}
      </div>
    );
  }

  // Financial Calculations
  const curSymbol =
    currentAccount.currency === 'USD' ? '$' :
    currentAccount.currency === 'EUR' ? '€' :
    currentAccount.currency === 'GBP' ? '£' :
    currentAccount.currency === 'USDT' ? '₮' : '₹';
  const netGain = currentAccount.currentBalance - currentAccount.startingBalance;
  const netGainPct = (netGain / currentAccount.startingBalance) * 100;

  const targetProfitAbs = (currentAccount.accountSize * currentAccount.profitTargetPct) / 100;
  const remainingProfitTarget = Math.max(0, targetProfitAbs - netGain);
  const targetProgressPct = Math.min(100, Math.max(0, (netGain / targetProfitAbs) * 100));

  const isTrailing =
    currentAccount.drawdownType === 'TRAILING' ||
    currentAccount.notes?.toUpperCase().includes('TRAILING') ||
    currentAccount.firmName.toUpperCase().includes('APEX') ||
    currentAccount.firmName.toUpperCase().includes('TOPSTEP') ||
    currentAccount.dailyLossLimitPct === 0;

  const maxDrawdownAbs = (currentAccount.accountSize * currentAccount.maxDrawdownPct) / 100;
  const staticLossLevel = currentAccount.startingBalance - maxDrawdownAbs;
  const trailingLossLevel = Math.max(staticLossLevel, currentAccount.highWaterMark - maxDrawdownAbs);
  const maxLossLevel = isTrailing ? trailingLossLevel : staticLossLevel;
  const currentDrawdownBuffer = Math.max(0, currentAccount.currentBalance - maxLossLevel);
  const drawdownUsedPct = maxDrawdownAbs > 0 ? Math.min(100, Math.max(0, ((maxDrawdownAbs - currentDrawdownBuffer) / maxDrawdownAbs) * 100)) : 0;

  const dailyLossLimitAbs = (currentAccount.accountSize * currentAccount.dailyLossLimitPct) / 100;
  // If today's pnl is negative, it consumes from daily loss limit
  const todayLossUsed = currentAccount.todayPnl < 0 ? Math.abs(currentAccount.todayPnl) : 0;
  const dailyLossRemaining = dailyLossLimitAbs > 0 ? Math.max(0, dailyLossLimitAbs - todayLossUsed) : Infinity;
  const dailyLossUsedPct = dailyLossLimitAbs > 0 ? Math.min(100, (todayLossUsed / dailyLossLimitAbs) * 100) : 0;

  // Simulation
  const simLossNum = parseFloat(simulatedLoss) || 0;
  const simNewDailyBuffer = dailyLossLimitAbs > 0 ? Math.max(0, dailyLossRemaining - simLossNum) : Infinity;
  const simNewTotalBuffer = Math.max(0, currentDrawdownBuffer - simLossNum);
  const simBreachedDaily = dailyLossLimitAbs > 0 ? simLossNum > dailyLossRemaining : false;
  const simBreachedTotal = simLossNum > currentDrawdownBuffer;

  const isTargetAchieved = netGain >= targetProfitAbs && currentAccount.profitTargetPct > 0;
  const isDaysCompleted = currentAccount.tradingDaysCompleted >= currentAccount.minTradingDays;
  const isReadyToPass = isTargetAchieved && isDaysCompleted && currentAccount.phase !== 'Funded';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <PageHeader
        title="Prop Firm Challenge Tracker"
        description="Monitor evaluation milestones, daily loss limits, and drawdown guardrails in real time"
        icon={Award}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firmName} — {a.accountName} ({curSymbol}{a.accountSize.toLocaleString()})
                </option>
              ))}
            </select>
            <button
              onClick={handleSyncLiveTrades}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              title="Sync live trade PnL & recalculate drawdown"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Live PnL</span>
            </button>
            <button
              onClick={() => setIsCredentialOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
              title="Generate Verified Institutional Credential Certificate"
            >
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Export Credential</span>
            </button>
            <Link
              href="/dashboard/roadmap?track=prop_firm"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary/80 hover:bg-secondary text-foreground text-sm font-semibold transition-colors shadow-sm"
              title="Prop Firm Evolution Blueprint on Roadmap"
            >
              <Compass className="w-4 h-4 text-primary" />
              <span className="hidden md:inline">Firm Roadmap</span>
            </Link>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </div>
        }
      />

      {/* Pass Celebration Banner */}
      {isReadyToPass && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">
                🎉 Congratulations! You have satisfied all {currentAccount.phase} rules!
              </h4>
              <p className="text-xs text-emerald-300/90 mt-0.5">
                Profit target hit ({curSymbol}{targetProfitAbs.toLocaleString()}) and minimum trading days fulfilled ({currentAccount.tradingDaysCompleted}/{currentAccount.minTradingDays}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsCredentialOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors whitespace-nowrap shadow-sm cursor-pointer flex items-center gap-1.5 border border-white/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Claim Credential</span>
            </button>
            <button
              onClick={() => {
                const nextPhase = currentAccount.phase === 'Phase 1' ? 'Phase 2' : 'Funded';
                const next = accounts.map((a) => (a.id === currentAccount.id ? { ...a, phase: nextPhase as any } : a));
                saveAccounts(next);
                toast.success(`Promoted to ${nextPhase}!`);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors whitespace-nowrap shadow-md cursor-pointer"
            >
              Advance to {currentAccount.phase === 'Phase 1' ? 'Phase 2' : 'Live Funded'}
            </button>
          </div>
        </div>
      )}

      {/* Live Funded Account Banner */}
      {currentAccount.phase === 'Funded' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                👑 Institutional Funded Trader Status Active
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                  VERIFIED
                </span>
              </h4>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Managing {curSymbol}{currentAccount.accountSize.toLocaleString()} live capital with {currentAccount.firmName}. All drawdown guardrails are armed.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCredentialOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 text-xs font-bold transition-transform hover:scale-[1.02] whitespace-nowrap shadow-md cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Funded Certificate</span>
          </button>
        </div>
      )}

      {/* Account Info Pill Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 border border-border/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">{currentAccount.accountName}</h3>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                {currentAccount.phase}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Firm: <strong className="text-foreground">{currentAccount.firmName}</strong> · Initial Capital: {curSymbol}{currentAccount.accountSize.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Adjust Balance:</span>
            <input
              type="number"
              defaultValue={currentAccount.currentBalance}
              onBlur={(e) => handleUpdateBalance(parseFloat(e.target.value) || currentAccount.currentBalance)}
              className="w-28 px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => handleDeleteAccount(currentAccount.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete this account"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Key Metics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Balance / Net PnL */}
        <div className="glass-card rounded-2xl p-5 border border-border/60 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Equity</span>
            <div className={cn('p-1.5 rounded-lg', netGain >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
              {netGain >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {curSymbol}{currentAccount.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className={cn('font-bold', netGain >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {netGain >= 0 ? '+' : ''}{curSymbol}{netGain.toLocaleString()} ({netGainPct >= 0 ? '+' : ''}{netGainPct.toFixed(2)}%)
            </span>
            <span className="text-muted-foreground">vs starting</span>
          </div>
        </div>

        {/* Profit Target */}
        <div className="glass-card rounded-2xl p-5 border border-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profit Target ({currentAccount.profitTargetPct}%)</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {targetProgressPct.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Goal: {curSymbol}{targetProfitAbs.toLocaleString()}</span>
            <span className={remainingProfitTarget === 0 ? 'text-emerald-400 font-bold' : ''}>
              {remainingProfitTarget === 0 ? 'Passed ✅' : `${curSymbol}${remainingProfitTarget.toLocaleString()} left`}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${targetProgressPct}%` }}
            />
          </div>
        </div>

        {/* Max Overall Drawdown Buffer */}
        <div className="glass-card rounded-2xl p-5 border border-border/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isTrailing ? 'Trailing Drawdown' : 'Max Drawdown Buffer'}
              </span>
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
                isTrailing ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
              )}>
                {isTrailing ? 'Trailing' : 'Static'}
              </span>
            </div>
            <div className={cn('p-1.5 rounded-lg', currentDrawdownBuffer < maxDrawdownAbs * 0.3 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400')}>
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {curSymbol}{currentDrawdownBuffer.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>
              Floor: {curSymbol}{maxLossLevel.toLocaleString()} {isTrailing ? `(HWM: ${curSymbol}${currentAccount.highWaterMark.toLocaleString()})` : ''}
            </span>
            <span className={cn('font-semibold', drawdownUsedPct > 50 ? 'text-amber-400' : 'text-emerald-400')}>
              {drawdownUsedPct.toFixed(1)}% used
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', drawdownUsedPct > 70 ? 'bg-red-500' : drawdownUsedPct > 40 ? 'bg-amber-500' : 'bg-emerald-500')}
              style={{ width: `${Math.max(5, 100 - drawdownUsedPct)}%` }}
            />
          </div>
        </div>

        {/* Daily Loss Buffer */}
        <div className="glass-card rounded-2xl p-5 border border-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily Loss Remaining</span>
            <div className={cn('p-1.5 rounded-lg', dailyLossLimitAbs > 0 && dailyLossRemaining < dailyLossLimitAbs * 0.3 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400')}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {dailyLossLimitAbs === 0 ? 'No Daily Limit' : `${curSymbol}${dailyLossRemaining.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{dailyLossLimitAbs === 0 ? 'Trailing Drawdown Only' : `Today's Limit: ${curSymbol}${dailyLossLimitAbs.toLocaleString()}`}</span>
            <span className={cn('font-semibold', currentAccount.todayPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              Today P&L: {currentAccount.todayPnl >= 0 ? '+' : ''}{curSymbol}{currentAccount.todayPnl}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', dailyLossUsedPct > 70 ? 'bg-red-500' : 'bg-emerald-500')}
              style={{ width: `${dailyLossLimitAbs === 0 ? 100 : Math.max(5, 100 - dailyLossUsedPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Challenge Rules + Breach Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Challenge Milestones & Rules (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-border/60 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Challenge Milestone Tracker
              </h3>
              <span className="text-xs text-muted-foreground font-medium">
                Live compliance status
              </span>
            </div>

            <div className="space-y-4">
              {/* Rule 1: Target Profit */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-border/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', isTargetAchieved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400')}>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Reach {currentAccount.profitTargetPct}% Profit Target</div>
                    <div className="text-xs text-muted-foreground">
                      Target: {curSymbol}{targetProfitAbs.toLocaleString()} · Current: {curSymbol}{netGain.toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', isTargetAchieved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400')}>
                  {isTargetAchieved ? 'Completed' : `${targetProgressPct.toFixed(1)}%`}
                </span>
              </div>

              {/* Rule 2: Max Overall Drawdown */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-border/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', currentDrawdownBuffer > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span>Do Not Exceed {currentAccount.maxDrawdownPct}% {isTrailing ? 'Trailing' : 'Total'} Drawdown</span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
                        isTrailing ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      )}>
                        {isTrailing ? `Trailing Floor: ${curSymbol}${maxLossLevel.toLocaleString()}` : `Static Floor: ${curSymbol}${maxLossLevel.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Max loss: {curSymbol}{maxDrawdownAbs.toLocaleString()} · Safe Buffer Remaining: {curSymbol}{currentDrawdownBuffer.toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', currentDrawdownBuffer > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                  {currentDrawdownBuffer > 0 ? `Passing (${((currentDrawdownBuffer / maxDrawdownAbs) * 100).toFixed(0)}% Buffer Safe)` : 'Breached ⚠️'}
                </span>
              </div>

              {/* Rule 3: Max Daily Loss */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-border/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', dailyLossLimitAbs === 0 || dailyLossRemaining > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {dailyLossLimitAbs === 0 ? 'No Daily Loss Limit Rule' : `Do Not Exceed ${currentAccount.dailyLossLimitPct}% Daily Loss`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dailyLossLimitAbs === 0
                        ? `Evaluation protected purely by ${isTrailing ? 'trailing drawdown floor' : 'overall drawdown'}`
                        : `Daily Max: ${curSymbol}${dailyLossLimitAbs.toLocaleString()} · Remaining Today: ${curSymbol}${dailyLossRemaining.toLocaleString()}`}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                  {dailyLossLimitAbs === 0 ? 'N/A (Trailing Only)' : 'Passing'}
                </span>
              </div>

              {/* Rule 4: Minimum Trading Days */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-border/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', isDaysCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400')}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Minimum {currentAccount.minTradingDays} Trading Days</div>
                    <div className="text-xs text-muted-foreground">
                      {currentAccount.tradingDaysCompleted} of {currentAccount.minTradingDays} active trading days logged
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const next = accounts.map((a) =>
                        a.id === currentAccount.id
                          ? { ...a, tradingDaysCompleted: a.tradingDaysCompleted + 1 }
                          : a,
                      );
                      saveAccounts(next);
                      toast.success('Logged today as an active trading day');
                    }}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                  >
                    +1 Day
                  </button>
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', isDaysCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400')}>
                    {isDaysCompleted ? 'Completed' : `${currentAccount.tradingDaysCompleted}/${currentAccount.minTradingDays}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Breach Risk Simulator (1 col) */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-border/60 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Pre-Trade Risk Simulator</h3>
                <p className="text-xs text-muted-foreground">Test next trade's risk before placing</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  If this trade loses: ({curSymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{curSymbol}</span>
                  <input
                    type="number"
                    value={simulatedLoss}
                    onChange={(e) => setSimulatedLoss(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-input bg-background text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-border/40 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Remaining Daily Buffer:</span>
                  <span className={cn('font-mono font-bold', simBreachedDaily ? 'text-red-400' : 'text-foreground')}>
                    {dailyLossLimitAbs === 0 ? 'No Daily Limit (Trailing Only)' : `${curSymbol}${simNewDailyBuffer.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Remaining {isTrailing ? 'Trailing' : 'Max'} Drawdown:</span>
                  <span className={cn('font-mono font-bold', simBreachedTotal ? 'text-red-400' : 'text-foreground')}>
                    {curSymbol}{simNewTotalBuffer.toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/40">
                  {simBreachedDaily || simBreachedTotal ? (
                    <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                      <div>
                        <strong>VIOLATION HAZARD:</strong> This trade risk exceeds your allowed {simBreachedDaily ? 'daily loss' : isTrailing ? 'trailing drawdown floor' : 'max drawdown'} limit! Reduce position size.
                      </div>
                    </div>
                  ) : (dailyLossLimitAbs > 0 && simLossNum > dailyLossRemaining * 0.5) || simLossNum > currentDrawdownBuffer * 0.35 ? (
                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div>
                        <strong>CAUTION:</strong> This trade risks {dailyLossLimitAbs > 0 && simLossNum > dailyLossRemaining * 0.5 ? 'over 50% of your daily allowance' : 'over 35% of your remaining drawdown buffer'}. Recommended risk is 0.5% - 1% max per trade.
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                      <div>
                        <strong>SAFE RISK SIZE:</strong> Trade fits safely within your {isTrailing ? 'trailing' : 'daily and overall'} drawdown risk parameters.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Max Position Size */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                <span className="font-semibold text-primary">💡 TradeMind Risk Rule of Thumb:</span>
                <p className="text-muted-foreground">
                  Never risk more than <strong>{curSymbol}{(currentAccount.accountSize * 0.0075).toLocaleString()}</strong> (0.75%) on a single setup to stay mathematically immune to tilt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Prop Firm Modal */}
      {isAddModalOpen && renderAddAccountModal()}

      {/* Verified Trader Credential Modal */}
      <TraderCredentialModal
        isOpen={isCredentialOpen}
        onClose={() => setIsCredentialOpen(false)}
        traderName={currentAccount.accountName}
        rankTitle={`${currentAccount.firmName} ${currentAccount.phase === 'Funded' ? 'Funded Professional' : 'Challenge Candidate'}`}
        rankBadge={currentAccount.phase === 'Funded' ? '👑' : '🏆'}
        levelNumber={currentAccount.phase === 'Funded' ? 4 : 3}
        totalXp={currentAccount.phase === 'Funded' ? 5200 : 2800}
        completedCount={currentAccount.tradingDaysCompleted}
        totalMilestones={Math.max(currentAccount.minTradingDays, 5)}
      />
    </div>
  );
}
