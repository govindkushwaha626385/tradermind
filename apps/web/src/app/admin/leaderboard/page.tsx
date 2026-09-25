'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Award,
  Users,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Filter,
  CheckCircle,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface LeaderboardAdminEntry {
  userId: string;
  isPublic: boolean;
  displayName: string;
  bio: string | null;
  twitterUrl: string | null;
  userEmail: string;
  userName: string;
  updatedAt: string;
  rank: number | null;
  totalPnl: number;
  pnlPercent: number;
  winRate: number;
  totalTrades: number;
  disciplineScore: number;
  compositeScore: number;
  computedAt: string | null;
}

interface LeaderboardStats {
  totalOptedIn: number;
  publicCount: number;
  disqualifiedCount: number;
  avgWinRate: number;
  avgCompositeScore: number;
}

export default function AdminLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardAdminEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'ALL_TIME' | 'MONTHLY' | 'WEEKLY'>('ALL_TIME');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'hidden'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  // ConfirmDialog State
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    userId: string;
    action: 'disqualify' | 'reinstate' | 'delete_snapshot';
    title: string;
    description: string;
    danger: boolean;
  }>({
    open: false,
    userId: '',
    action: 'disqualify',
    title: '',
    description: '',
    danger: false,
  });

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminLeaderboard({
        period,
        search: searchQuery.trim() || undefined,
      });
      if (res.data) {
        setEntries(res.data.entries || []);
        setStats(res.data.stats || null);
      }
    } catch (err) {
      console.error('Failed to load admin leaderboard data:', err);
      toast.error('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  }, [period, searchQuery]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRecomputeRankings = async () => {
    setRecomputing(true);
    try {
      const res = await api.adminRecomputeLeaderboard();
      if (res.success) {
        toast.success('Leaderboard rankings recomputed across ALL_TIME, MONTHLY, and WEEKLY');
        fetchLeaderboard();
      } else {
        toast.error((res as any).error?.message || 'Failed to recompute rankings');
      }
    } catch {
      toast.error('Failed to recompute leaderboard rankings');
    } finally {
      setRecomputing(false);
    }
  };

  const promptModerate = (userId: string, action: 'disqualify' | 'reinstate' | 'delete_snapshot', name: string) => {
    if (action === 'disqualify') {
      setConfirmState({
        open: true,
        userId,
        action,
        title: 'Disqualify Trader',
        description: `Are you sure you want to disqualify "${name}"? Their profile and score will be hidden from the public leaderboard.`,
        danger: true,
      });
    } else if (action === 'reinstate') {
      setConfirmState({
        open: true,
        userId,
        action,
        title: 'Reinstate Trader',
        description: `Reinstate "${name}" to the public leaderboard?`,
        danger: false,
      });
    } else {
      setConfirmState({
        open: true,
        userId,
        action,
        title: 'Delete Snapshot Rank',
        description: `Delete cached leaderboard ranking for "${name}"? It will be recalculated on the next cron cycle or on-demand recompute.`,
        danger: true,
      });
    }
  };

  const executeModerate = async () => {
    const { userId, action } = confirmState;
    if (!userId) return;

    setActionInProgress(userId);
    try {
      await api.moderateAdminLeaderboard(userId, { action });
      toast.success(
        action === 'disqualify'
          ? 'Trader disqualified and hidden from leaderboard'
          : action === 'reinstate'
          ? 'Trader reinstated to leaderboard'
          : 'Snapshot deleted',
      );
      setConfirmState((prev) => ({ ...prev, open: false }));
      await fetchLeaderboard();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to perform action');
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (visibilityFilter === 'public') return e.isPublic;
    if (visibilityFilter === 'hidden') return !e.isPublic;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <Trophy className="w-6 h-6 text-amber-500" />
            Leaderboard Moderation &amp; Compliance
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Audit public rankings, verify trader profiles, and disqualify fraudulent or abusive entries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecomputeRankings}
            disabled={recomputing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Recalculate snapshots across ALL_TIME, MONTHLY, and WEEKLY"
          >
            <Zap className={cn('w-3.5 h-3.5', recomputing && 'animate-spin')} />
            <span>{recomputing ? 'Recomputing...' : 'Recompute Rankings'}</span>
          </button>
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border hover:bg-accent text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Users className="w-3.5 h-3.5 text-primary" />
            Opted-In Traders
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">
            {stats?.totalOptedIn ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <Eye className="w-3.5 h-3.5" />
            Active Public
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {stats?.publicCount ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
            <EyeOff className="w-3.5 h-3.5" />
            Hidden / Disqualified
          </div>
          <div className="text-2xl font-bold mt-1 text-rose-500">
            {stats?.disqualifiedCount ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            Avg Win Rate
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">
            {stats?.avgWinRate ?? 0}%
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            Avg Composite
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">
            {stats?.avgCompositeScore ?? 0}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/40 p-3 rounded-xl border border-border">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex rounded-lg bg-secondary/80 p-0.5 border border-border text-xs">
            {(['ALL_TIME', 'MONTHLY', 'WEEKLY'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  period === p ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p === 'ALL_TIME' ? 'All-Time' : p === 'MONTHLY' ? 'Monthly' : 'Weekly'}
              </button>
            ))}
          </div>

          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as any)}
            className="px-2.5 py-1 text-xs rounded-lg bg-background border border-border focus:outline-none"
          >
            <option value="all">All Visibility</option>
            <option value="public">Public Only</option>
            <option value="hidden">Hidden Only</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-muted-foreground bg-muted/40 border-b border-border">
              <tr>
                <th className="py-3 px-4 font-semibold">Rank</th>
                <th className="py-3 px-4 font-semibold">Trader Profile</th>
                <th className="py-3 px-4 font-semibold">Composite</th>
                <th className="py-3 px-4 font-semibold">Win Rate</th>
                <th className="py-3 px-4 font-semibold">Total P&L</th>
                <th className="py-3 px-4 font-semibold">Discipline</th>
                <th className="py-3 px-4 font-semibold">Trades</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No leaderboard opt-in records found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => (
                  <tr key={row.userId} className="hover:bg-muted/20 transition-colors">
                    {/* Rank */}
                    <td className="py-3 px-4 font-mono font-bold">
                      {row.rank ? (
                        <span className="flex items-center gap-1">
                          {row.rank === 1 ? '🥇 #1' : row.rank === 2 ? '🥈 #2' : row.rank === 3 ? '🥉 #3' : `#${row.rank}`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Profile */}
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {row.displayName}
                          {row.twitterUrl && (
                            <a
                              href={row.twitterUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-blue-400"
                            >
                              <ExternalLink className="w-3 h-3 inline" />
                            </a>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {row.userName} • {row.userEmail}
                        </div>
                      </div>
                    </td>

                    {/* Composite Score */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {row.compositeScore.toFixed(1)}
                      </span>
                    </td>

                    {/* Win Rate */}
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {row.winRate.toFixed(1)}%
                    </td>

                    {/* Total PnL */}
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${row.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {row.totalPnl >= 0 ? '+' : ''}₹{row.totalPnl.toLocaleString()}
                      </span>
                    </td>

                    {/* Discipline */}
                    <td className="py-3 px-4 text-foreground">
                      {row.disciplineScore.toFixed(0)}/100
                    </td>

                    {/* Total Trades */}
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {row.totalTrades}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {row.isPublic ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <Eye className="w-3 h-3" /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          <EyeOff className="w-3 h-3" /> Disqualified
                        </span>
                      )}
                    </td>

                    {/* Moderation Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.isPublic ? (
                          <button
                            onClick={() => promptModerate(row.userId, 'disqualify', row.displayName)}
                            disabled={actionInProgress === row.userId}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Disqualify from leaderboard"
                          >
                            Disqualify
                          </button>
                        ) : (
                          <button
                            onClick={() => promptModerate(row.userId, 'reinstate', row.displayName)}
                            disabled={actionInProgress === row.userId}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            title="Reinstate to leaderboard"
                          >
                            Reinstate
                          </button>
                        )}

                        <button
                          onClick={() => promptModerate(row.userId, 'delete_snapshot', row.displayName)}
                          disabled={actionInProgress === row.userId}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                          title="Clear snapshot rank"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Moderation Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        danger={confirmState.danger}
        confirmLabel={confirmState.action === 'disqualify' ? 'Disqualify' : confirmState.action === 'reinstate' ? 'Reinstate' : 'Delete'}
        loading={Boolean(actionInProgress)}
        onConfirm={executeModerate}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
