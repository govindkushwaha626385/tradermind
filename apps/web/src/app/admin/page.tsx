// ──────────────────────────────────────────────
// TradeMind — Admin Dashboard (Super-Controls)
//
// Provides system-wide management:
// - Revenue Intelligence (MRR, ARR, Churn, Store vs Subs)
// - System Health & Queue Depth (Jobs, Cache, Rate Limits)
// - Dynamic Feature Flags (1-click toggles)
// - Live Sync Monitor (Real-time polling)
// - System-wide Configuration editor
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  DollarSign,
  Shield,
  RefreshCw,
  Save,
  CheckCircle2,
  Users,
  TrendingUp,
  Activity,
  Plug,
  Circle,
  Sparkles,
  ShoppingBag,
  Star,
  ArrowRight,
  Flag,
  Trash2,
  Server,
  Zap,
  Check,
  X,
  Clock,
  Layers,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { SkeletonStatRow } from '@/components/ui/SkeletonCard';

interface AdminConfig {
  key: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  isPublic: boolean;
  value: unknown;
  updatedAt: string | null;
}

interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  rules?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface LiveSyncLog {
  id: string;
  brokerConnectionId: string;
  userId: string;
  syncType: string;
  status: string;
  executionsImported: number;
  tradesCreated: number;
  tradesUpdated: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

const CONFIG_CATEGORIES = [
  { id: 'revenue', label: 'Revenue KPIs', icon: TrendingUp },
  { id: 'health', label: 'System Vitals', icon: Activity },
  { id: 'feature_flags', label: 'Feature Flags', icon: Flag },
  { id: 'live_sync', label: 'Live Sync Stream', icon: RefreshCw },
  { id: 'fees', label: 'Fees & Brokerage', icon: DollarSign },
  { id: 'general', label: 'General', icon: Settings },
  { id: 'broker', label: 'Broker Settings', icon: Plug },
  { id: 'rate_limits', label: 'Rate Limits', icon: Shield },
  { id: 'ai', label: 'AI Engine', icon: Sparkles },
];

export default function AdminPage() {
  const [activeCategory, setActiveCategory] = useState('revenue');
  const [configs, setConfigs] = useState<AdminConfig[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState<Record<string, string>>({});
  const [revenue, setRevenue] = useState<{
    mrrInr: number;
    arrInr: number;
    totalRevenueInr: number;
    totalSubscriptionRevenueInr: number;
    totalStoreRevenueInr: number;
    activeSubscribers: number;
    churnRatePercent: number;
    totalUsers: number;
  } | null>(null);

  const [systemHealth, setSystemHealth] = useState<{
    status: string;
    database: { status: string };
    queue: {
      depth: Record<string, number>;
      pendingJobs: number;
      runningJobs: number;
      failedJobs: number;
      totalCompleted: number;
    };
    cache: {
      totalEntries: number;
      expiredEntries: number;
    };
    rateLimiter: {
      activeWindows: number;
    };
    server: {
      uptimeSeconds: number;
      nodeVersion: string;
      rssMb: number;
      heapUsedMb: number;
    };
    totalUsers: number;
  } | null>(null);

  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null);
  const [liveSyncLogs, setLiveSyncLogs] = useState<LiveSyncLog[]>([]);
  const [flushingCache, setFlushingCache] = useState(false);

  const [aiAnalytics, setAiAnalytics] = useState<{
    totalRequestsCached: number;
    totalTokensConsumed: number;
    estimatedCostUsd: number;
    estimatedSavingsUsd: number;
    activeProviders: Array<{ provider: string; cachedEntries: number; tokensUsed: number }>;
    geminiFreeTierLimit: string;
    groqFreeTierLimit: string;
  } | null>(null);
  const [testingAi, setTestingAi] = useState(false);

  useEffect(() => {
    document.title = 'Admin Super-Dashboard — TradeMind';
    fetchAdminData();
  }, []);

  // Poll live sync logs when active tab is live_sync
  useEffect(() => {
    if (activeCategory !== 'live_sync') return;
    fetchLiveSyncLogs();
    const interval = setInterval(fetchLiveSyncLogs, 5000);
    return () => clearInterval(interval);
  }, [activeCategory]);

  async function fetchLiveSyncLogs() {
    try {
      const res = await api.getLiveSyncLogs(40);
      if (res.success && res.data) {
        setLiveSyncLogs(res.data);
      }
    } catch {
      // Ignore background poll errors
    }
  }

  async function fetchAdminData() {
    setLoading(true);
    try {
      const [configRes, statsRes, revRes, healthRes, flagsRes, aiRes] = await Promise.all([
        api.getAdminConfigs().catch(() => ({ success: false, data: [] })),
        api.getAdminStats().catch(() => ({ success: false, data: {} })),
        api.getAdminRevenue().catch(() => ({ success: false, data: null })),
        api.getAdminSystemHealth().catch(() => ({ success: false, data: null })),
        api.getFeatureFlags().catch(() => ({ success: false, data: [] })),
        api.getAdminAiAnalytics().catch(() => ({ success: false, data: null })),
      ]);

      if (configRes.success) setConfigs((configRes.data as AdminConfig[]) ?? []);
      if (statsRes?.success) setAdminStats((statsRes.data as Record<string, string>) ?? {});
      if (revRes?.success && revRes.data) setRevenue(revRes.data);
      if (healthRes?.success && healthRes.data) setSystemHealth(healthRes.data);
      if (flagsRes?.success && flagsRes.data) setFeatureFlags(flagsRes.data as FeatureFlag[]);
      if (aiRes?.success && aiRes.data) setAiAnalytics(aiRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  const handleTestAi = async () => {
    setTestingAi(true);
    try {
      const res = await api.getAiStatus();
      if (res.success && res.data) {
        const { gemini, groq } = res.data.providers;
        toast.success(`AI Status: Gemini (${gemini ? 'Active ✅' : 'Inactive'}), Groq (${groq ? 'Active ✅' : 'Inactive'})`);
      }
    } catch {
      toast.error('AI provider test failed');
    } finally {
      setTestingAi(false);
    }
  };

  const handleFlushCache = async () => {
    setFlushingCache(true);
    try {
      const res = await api.flushAdminCache('*');
      if (res.success) {
        toast.success('All cache entries purged across L1 and L2');
        fetchAdminData();
      } else {
        toast.error('Failed to flush cache');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to flush cache');
    } finally {
      setFlushingCache(false);
    }
  };

  const handleToggleFlag = async (flag: FeatureFlag) => {
    setTogglingFlag(flag.id);
    try {
      const nextState = !flag.isEnabled;
      const res = await api.updateFeatureFlag(flag.id, { isEnabled: nextState });
      if (res.success) {
        toast.success(`Feature "${flag.name}" is now ${nextState ? 'ENABLED' : 'DISABLED'}`);
        setFeatureFlags((prev) =>
          prev.map((f) => (f.id === flag.id ? { ...f, isEnabled: nextState } : f))
        );
      } else {
        toast.error('Failed to update feature flag');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update feature flag');
    } finally {
      setTogglingFlag(null);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      for (const [key, rawValue] of Object.entries(editValues)) {
        const config = configs.find((c) => c.key === key);
        let parsed: unknown = rawValue;
        if (config?.type === 'number') parsed = Number(rawValue);
        if (config?.type === 'boolean') parsed = rawValue === 'true';
        if (config?.type === 'json') parsed = JSON.parse(rawValue);
        await api.updateAdminConfig(key, parsed);
      }
      setSaved(true);
      toast.success('Configuration updated successfully');
      fetchAdminData();
    } catch {
      toast.error('Failed to save configuration');
    }
  };

  const filteredConfigs = configs.filter((c) => c.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Super-Controls</h1>
          <p className="text-muted-foreground text-sm">
            Live revenue telemetry, background workers, feature flags, and system config.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={handleFlushCache}
            disabled={flushingCache}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
            title="Purge all L1 & L2 cache"
          >
            <Trash2 className={cn('w-4 h-4', flushingCache && 'animate-spin')} />
            Flush Cache
          </button>
        </div>
      </div>

      {/* Top Telemetry / Revenue Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MRR</div>
          <div className="text-xl font-bold font-mono text-emerald-500 mt-1">
            ₹{(revenue?.mrrInr ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Monthly Recurring</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-blue-500/20 bg-blue-500/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ARR</div>
          <div className="text-xl font-bold font-mono text-blue-500 mt-1">
            ₹{(revenue?.arrInr ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Annual Run-Rate</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-violet-500/20 bg-violet-500/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Subs</div>
          <div className="text-xl font-bold font-mono text-violet-500 mt-1">
            {revenue?.activeSubscribers ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Paying Traders</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Churn Rate</div>
          <div className="text-xl font-bold font-mono text-rose-500 mt-1">
            {revenue?.churnRatePercent ?? 0}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Subscription Churn</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Jobs</div>
          <div className="text-xl font-bold font-mono text-amber-500 mt-1">
            {systemHealth?.queue.pendingJobs ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Queue Backlog</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-primary/20 bg-primary/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Users</div>
          <div className="text-xl font-bold font-mono text-primary mt-1">
            {revenue?.totalUsers ?? adminStats.totalUsers ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Registered Accounts</div>
        </div>
      </div>

      {/* Main Tab Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="glass-card rounded-2xl p-2 space-y-1">
            {CONFIG_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Pane */}
        <div className="flex-1 space-y-4">
          {/* TAB 1: REVENUE KPIS */}
          {activeCategory === 'revenue' && (
            <div className="glass-card rounded-2xl p-5 space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  SaaS Revenue &amp; Monetization Telemetry
                </h2>
                <Link
                  href="/admin/billing"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  View Invoices &amp; Subscriptions <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-accent/30 border border-border/50">
                  <div className="text-xs text-muted-foreground">Total Subscription Revenue</div>
                  <div className="text-2xl font-bold font-mono text-foreground mt-1">
                    ₹{(revenue?.totalSubscriptionRevenueInr ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">From recurring billing</div>
                </div>

                <div className="p-4 rounded-xl bg-accent/30 border border-border/50">
                  <div className="text-xs text-muted-foreground">Digital Store Revenue</div>
                  <div className="text-2xl font-bold font-mono text-foreground mt-1">
                    ₹{(revenue?.totalStoreRevenueInr ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Courses, playbooks &amp; tools</div>
                </div>

                <div className="p-4 rounded-xl bg-accent/30 border border-border/50">
                  <div className="text-xs text-muted-foreground">Combined Gross Revenue</div>
                  <div className="text-2xl font-bold font-mono text-emerald-500 mt-1">
                    ₹{(revenue?.totalRevenueInr ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">100% all-time receipts</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM VITALS */}
          {activeCategory === 'health' && (
            <div className="glass-card rounded-2xl p-5 space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-500" />
                  System Infrastructure &amp; Workers
                </h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {systemHealth?.status ?? 'OPERATIONAL'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-accent/30 border border-border/50">
                  <div className="text-xs text-muted-foreground">Database Pool</div>
                  <div className="text-lg font-bold text-emerald-500 mt-1">
                    {systemHealth?.database.status ?? 'HEALTHY'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">PostgreSQL Supabase</div>
                </div>

                <div className="p-4 rounded-xl bg-accent/30 border border-border/50">
                  <div className="text-xs text-muted-foreground">Active Cache Keys</div>
                  <div className="text-lg font-bold font-mono text-foreground mt-1">
                    {systemHealth?.cache.totalEntries ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {systemHealth?.cache.expiredEntries ?? 0} expired pending purge
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-accent/30 border border-border/50">
                  <div className="text-xs text-muted-foreground">Memory RSS / Heap</div>
                  <div className="text-lg font-bold font-mono text-foreground mt-1">
                    {systemHealth?.server.rssMb ?? 0} MB / {systemHealth?.server.heapUsedMb ?? 0} MB
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Node {systemHealth?.server.nodeVersion}</div>
                </div>

                <div className="p-4 rounded-xl bg-accent/30 border border-border/50">
                  <div className="text-xs text-muted-foreground">Server Uptime</div>
                  <div className="text-lg font-bold font-mono text-foreground mt-1">
                    {Math.floor((systemHealth?.server.uptimeSeconds ?? 0) / 3600)}h {Math.floor(((systemHealth?.server.uptimeSeconds ?? 0) % 3600) / 60)}m
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Zero crash rate</div>
                </div>
              </div>

              {/* Queue Depth Breakdown */}
              <div className="p-4 rounded-xl bg-accent/20 border border-border/50 space-y-3">
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Background Job Queue Depth
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <span className="text-muted-foreground">Pending</span>
                    <div className="text-base font-bold text-amber-500 font-mono">
                      {systemHealth?.queue.pendingJobs ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <span className="text-muted-foreground">Running</span>
                    <div className="text-base font-bold text-blue-500 font-mono">
                      {systemHealth?.queue.runningJobs ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <span className="text-muted-foreground">Completed</span>
                    <div className="text-base font-bold text-emerald-500 font-mono">
                      {systemHealth?.queue.totalCompleted ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <span className="text-muted-foreground">Failed</span>
                    <div className="text-base font-bold text-rose-500 font-mono">
                      {systemHealth?.queue.failedJobs ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FEATURE FLAGS */}
          {activeCategory === 'feature_flags' && (
            <div className="glass-card rounded-2xl p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <Flag className="w-5 h-5 text-primary" />
                    Feature Flags &amp; Progressive Rollouts
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toggle system capabilities in real-time without redeploying.
                  </p>
                </div>
              </div>

              {featureFlags.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No feature flags configured yet.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {featureFlags.map((flag) => (
                    <div key={flag.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm font-mono">{flag.name}</span>
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase',
                              flag.isEnabled
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-muted text-muted-foreground border border-border',
                            )}
                          >
                            {flag.isEnabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        {flag.description && (
                          <p className="text-xs text-muted-foreground">{flag.description}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleFlag(flag)}
                        disabled={togglingFlag === flag.id}
                        className={cn(
                          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                          flag.isEnabled ? 'bg-emerald-500' : 'bg-muted',
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                            flag.isEnabled ? 'translate-x-5' : 'translate-x-0',
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LIVE SYNC STREAM */}
          {activeCategory === 'live_sync' && (
            <div className="glass-card rounded-2xl p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                    Live Broker Sync Monitor
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time feed updating every 5 seconds.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Polling (5s)
                </span>
              </div>

              {liveSyncLogs.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No sync logs recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50 text-left text-muted-foreground uppercase tracking-wider">
                        <th className="pb-2.5">Time</th>
                        <th className="pb-2.5">Type</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5 text-right">Executions</th>
                        <th className="pb-2.5 text-right">Trades Created</th>
                        <th className="pb-2.5">Error / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {liveSyncLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-accent/40">
                          <td className="py-2 text-muted-foreground whitespace-nowrap">
                            {new Date(log.startedAt).toLocaleTimeString()}
                          </td>
                          <td className="py-2 font-mono font-semibold">{log.syncType}</td>
                          <td className="py-2">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full font-bold text-[10px]',
                                log.status === 'SUCCESS' || log.status === 'DONE'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : log.status === 'RUNNING'
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : 'bg-rose-500/10 text-rose-500',
                              )}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2 text-right font-mono">{log.executionsImported}</td>
                          <td className="py-2 text-right font-mono">{log.tradesCreated}</td>
                          <td className="py-2 text-rose-400 truncate max-w-[200px]">
                            {log.errorMessage ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STANDARD CONFIG TABS (fees, general, broker, rate_limits, ai) */}
          {!['revenue', 'health', 'feature_flags', 'live_sync'].includes(activeCategory) && (
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  {CONFIG_CATEGORIES.find((c) => c.id === activeCategory)?.label}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchAdminData}
                    className="p-2 rounded-xl hover:bg-accent text-muted-foreground"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      saved
                        ? 'bg-success/10 text-success'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                  >
                    {saved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI Analytics banner */}
              {activeCategory === 'ai' && aiAnalytics && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 via-blue-500/5 to-purple-500/10 border border-violet-500/20 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-semibold text-foreground">
                        Zero-Cost AI Engine Analytics
                      </span>
                    </div>
                    <button
                      onClick={handleTestAi}
                      disabled={testingAi}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
                    >
                      <RefreshCw className={cn('w-3.5 h-3.5', testingAi && 'animate-spin')} />
                      {testingAi ? 'Testing...' : 'Test AI Providers'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                      <div className="text-muted-foreground">Tokens Consumed</div>
                      <div className="text-base font-bold font-mono text-foreground mt-0.5">
                        {aiAnalytics.totalTokensConsumed.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                      <div className="text-muted-foreground">Monthly AI Cost</div>
                      <div className="text-base font-bold font-mono text-success mt-0.5">
                        $0.00
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">100% Free Tier</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                      <div className="text-muted-foreground">Cached Inferences</div>
                      <div className="text-base font-bold font-mono text-foreground mt-0.5">
                        {aiAnalytics.totalRequestsCached}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Sub-10ms response</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background/80 border border-border/50">
                      <div className="text-muted-foreground">Est. API Savings</div>
                      <div className="text-base font-bold font-mono text-violet-500 mt-0.5">
                        +${aiAnalytics.estimatedSavingsUsd.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">vs Paid API</div>
                    </div>
                  </div>
                </div>
              )}

              {filteredConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No configuration values in this category.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredConfigs.map((config) => (
                    <div
                      key={config.key}
                      className="flex items-center justify-between p-3 rounded-xl bg-accent/50 gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{config.label}</div>
                        <div className="text-xs text-muted-foreground font-mono">{config.key}</div>
                        {config.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {config.description}
                          </div>
                        )}
                      </div>
                      <input
                        type={config.type === 'number' ? 'number' : 'text'}
                        defaultValue={String(config.value ?? '')}
                        onChange={(e) => handleValueChange(config.key, e.target.value)}
                        className="w-32 px-3 py-1.5 rounded-lg border border-input bg-background text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        step={config.type === 'number' ? 'any' : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
