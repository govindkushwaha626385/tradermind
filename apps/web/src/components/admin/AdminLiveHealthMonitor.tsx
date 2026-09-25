// ──────────────────────────────────────────────
// TradeMind — Admin Live Global Health & Broker Sync Monitor
//
// Real-time visualization for platform administrators:
// - Active user sessions & sync activity
// - Broker sync success rates (Zerodha, Dhan, Angel One, Upstox, Delta)
// - Token expiration countdowns & daily session invalidations
// ──────────────────────────────────────────────

'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  RefreshCw,
  Users,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Play,
  Pause,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface BrokerMonitorSummary {
  activeUserSessions: number;
  totalUsers: number;
  totalConnections: number;
  healthyCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  errorCount: number;
  overallSyncSuccessRate: number;
  isPreMarketWindow: boolean;
  marketContext: {
    marketName: string;
    marketOpenTime: string;
    minutesToOpen: number | null;
  };
}

interface BrokerBreakdown {
  brokerId: string;
  total: number;
  healthy: number;
  expired: number;
  successRate: number;
}

interface TokenCountdownItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  brokerId: string;
  brokerClientId: string;
  label: string;
  status: 'HEALTHY' | 'EXPIRING_SOON' | 'EXPIRED' | 'ERROR';
  minutesRemaining: number | null;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
  authType: string;
  actionRequired: string;
}

const BROKER_NAMES: Record<string, string> = {
  zerodha: 'Zerodha Kite',
  dhan: 'Dhan HQ',
  angelone: 'Angel One SmartAPI',
  upstox: 'Upstox Pro',
  groww: 'Groww Direct',
  delta: 'Delta Exchange',
  fyers: 'Fyers API',
  ibkr: 'Interactive Brokers',
  binance: 'Binance Global',
};

export function AdminLiveHealthMonitor() {
  const [summary, setSummary] = useState<BrokerMonitorSummary | null>(null);
  const [breakdown, setBreakdown] = useState<BrokerBreakdown[]>([]);
  const [tokens, setTokens] = useState<TokenCountdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EXPIRED' | 'EXPIRING_SOON' | 'HEALTHY'>('ALL');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncAllLoading, setSyncAllLoading] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await api.getAdminBrokerHealthMonitor();
      if (res && res.success && res.data) {
        setSummary(res.data.summary);
        setBreakdown(res.data.brokerBreakdown || []);
        setTokens(res.data.tokenCountdowns || []);
      }
    } catch (err: any) {
      console.error('[Admin Health Monitor Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    if (!autoRefresh) return;
    const timer = setInterval(fetchHealth, 10000); // 10s auto-poll
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleForceSync = async (id: string, name: string) => {
    try {
      setSyncingId(id);
      const res = await api.adminForceSyncBroker(id);
      if (res && res.success) {
        toast.success(`Synced ${name} successfully!`);
        fetchHealth();
      } else {
        const errorMsg = (res as any)?.error?.message || (typeof res?.error === 'string' ? res.error : 'Sync failed');
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to force sync broker');
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncAllLoading(true);
      const res = await api.adminSyncAllBrokers();
      if (res && res.success) {
        toast.success(`Cluster Sync: ${res.data?.successfulSyncs ?? 0} succeeded, ${res.data?.failedSyncs ?? 0} failed.`);
        fetchHealth();
      } else {
        throw new Error((res as any)?.error?.message || 'Cluster sync failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Cluster sync failed');
    } finally {
      setSyncAllLoading(false);
    }
  };

  const filteredTokens = tokens.filter((t) => {
    const matchesFilter =
      statusFilter === 'ALL' ||
      (statusFilter === 'EXPIRED' && (t.status === 'EXPIRED' || t.status === 'ERROR')) ||
      t.status === statusFilter;

    const matchesSearch =
      t.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      t.userName.toLowerCase().includes(search.toLowerCase()) ||
      t.brokerClientId.toLowerCase().includes(search.toLowerCase()) ||
      t.brokerId.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  if (loading && !summary) {
    return (
      <div className="p-8 rounded-2xl border border-border/50 bg-card/50 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">Loading Real-Time Broker Health Monitor…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Bar: Stream Status & Auto-refresh Controls ──── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Admin Live Broker Sync & Session Health
          </h2>
          {summary?.isPreMarketWindow && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/40 animate-pulse">
              Pre-Market Window Active ({summary.marketContext.minutesToOpen}m to open)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            )}
            title={autoRefresh ? 'Auto-refresh every 10s is active' : 'Auto-refresh paused'}
          >
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoRefresh ? 'Live (10s)' : 'Paused'}</span>
          </button>

          <button
            type="button"
            onClick={fetchHealth}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            title="Refresh now"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>

          <button
            type="button"
            onClick={handleSyncAll}
            disabled={syncAllLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{syncAllLoading ? 'Triggering Fleet Sync…' : 'Trigger Fleet Sync'}</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI Summary Cards ──── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Sessions */}
          <div className="p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Trader Sessions</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {summary.activeUserSessions}
              <span className="text-xs font-normal text-muted-foreground ml-2">/ {summary.totalUsers} total</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium">Syncing or traded in past 24h</p>
          </div>

          {/* Card 2: Sync Success Rate */}
          <div className="p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Fleet Sync Success</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {summary.overallSyncSuccessRate}%
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, summary.overallSyncSuccessRate)}%` }}
              />
            </div>
          </div>

          {/* Card 3: Healthy vs Expired */}
          <div className="p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Token Health Status</span>
              <Server className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-foreground flex items-center gap-2">
              <span className="text-emerald-400">{summary.healthyCount} Valid</span>
              <span className="text-zinc-600">·</span>
              <span className={cn(summary.expiredCount > 0 ? 'text-rose-400' : 'text-zinc-400')}>
                {summary.expiredCount} Expired
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {summary.expiringSoonCount > 0 ? `⚠️ ${summary.expiringSoonCount} expiring within 2h` : 'All remaining connections healthy'}
            </p>
          </div>

          {/* Card 4: Pre-Market Bell Window */}
          <div className="p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Pre-Market Bell</span>
              <Clock className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {summary.isPreMarketWindow
                ? `${summary.marketContext.minutesToOpen}m to Open`
                : 'Market Session'}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {summary.isPreMarketWindow
                ? `Bell rings at ${summary.marketContext.marketOpenTime}`
                : 'Normal execution polling cycle'}
            </p>
          </div>
        </div>
      )}

      {/* ── Broker Breakdown Grid ──── */}
      {breakdown.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Broker Fleet Breakdown & Token Expiration Cycles
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {breakdown.map((b) => {
              const displayName = BROKER_NAMES[b.brokerId] || b.brokerId.toUpperCase();
              const isZerodha = b.brokerId === 'zerodha';

              return (
                <div
                  key={b.brokerId}
                  className="p-3.5 rounded-xl border border-border/60 bg-card/40 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground truncate">{displayName}</span>
                    {isZerodha && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-300" title="Zerodha Kite tokens expire daily at 6:00 AM IST">
                        Daily
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="font-mono font-bold text-emerald-400">{b.successRate}%</span>
                  </div>

                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-muted-foreground">Connections:</span>
                    <span className="font-mono">
                      <strong className="text-white">{b.healthy}</strong>/{b.total}
                    </span>
                  </div>

                  {b.expired > 0 && (
                    <div className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {b.expired} Need Re-auth
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Live Token Expiration Countdown Table ──── */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              Token Expiration Countdown & Session Registry
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live audit of individual broker access tokens with countdown to invalidation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user or broker..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs">
              {(['ALL', 'EXPIRED', 'EXPIRING_SOON', 'HEALTHY'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                    statusFilter === s
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {s === 'ALL' ? 'All' : s === 'EXPIRED' ? 'Expired' : s === 'EXPIRING_SOON' ? 'Soon' : 'Healthy'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTokens.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No broker connections match the current search & status filters.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Trader</th>
                  <th className="pb-2.5">Broker & Client ID</th>
                  <th className="pb-2.5">Token Health Status</th>
                  <th className="pb-2.5">Expiration Countdown</th>
                  <th className="pb-2.5">Last Synced</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredTokens.map((t) => {
                  const isSyncing = syncingId === t.id;

                  return (
                    <tr key={t.id} className="hover:bg-accent/30 transition-colors">
                      <td className="py-2.5">
                        <div className="font-semibold text-foreground">{t.userName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{t.userEmail}</div>
                      </td>

                      <td className="py-2.5">
                        <div className="font-bold text-foreground">
                          {BROKER_NAMES[t.brokerId] || t.brokerId.toUpperCase()}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400">
                          {t.brokerClientId || t.label}
                        </div>
                      </td>

                      <td className="py-2.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px]',
                            t.status === 'HEALTHY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : t.status === 'EXPIRING_SOON'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          )}
                        >
                          {t.status === 'HEALTHY' && <CheckCircle2 className="w-3 h-3" />}
                          {t.status === 'EXPIRING_SOON' && <Clock className="w-3 h-3" />}
                          {t.status === 'EXPIRED' && <XCircle className="w-3 h-3" />}
                          {t.status === 'ERROR' && <AlertTriangle className="w-3 h-3" />}
                          <span>{t.status}</span>
                        </span>
                      </td>

                      <td className="py-2.5">
                        {t.status === 'EXPIRED' ? (
                          <span className="text-rose-400 font-bold font-mono text-[11px]">
                            {t.actionRequired}
                          </span>
                        ) : t.minutesRemaining != null ? (
                          <span className={cn(
                            'font-mono font-bold text-[11px]',
                            t.minutesRemaining <= 60 ? 'text-rose-400' : t.minutesRemaining <= 120 ? 'text-amber-400' : 'text-zinc-300'
                          )}>
                            {t.minutesRemaining < 60
                              ? `${t.minutesRemaining}m remaining`
                              : `${Math.floor(t.minutesRemaining / 60)}h ${t.minutesRemaining % 60}m remaining`}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-mono text-[11px]">Permanent Session</span>
                        )}
                      </td>

                      <td className="py-2.5 text-muted-foreground font-mono text-[11px]">
                        {t.lastSyncedAt ? new Date(t.lastSyncedAt).toLocaleTimeString() : 'Never'}
                      </td>

                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleForceSync(t.id, t.label)}
                          disabled={isSyncing}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin text-primary')} />
                          <span>{isSyncing ? 'Syncing…' : 'Sync'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
