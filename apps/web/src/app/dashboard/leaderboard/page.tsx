// ──────────────────────────────────────────────
// TradeMind — Trader Leaderboard (Dashboard View)
//
// Ranked leaderboard based on composite scoring:
// 40% Win Rate + 40% Discipline Score + 20% Profit Factor.
// Privacy-first with opt-in custom display name and bio.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Globe,
  Edit3,
  ExternalLink,
  ChevronUp,
  UserCheck,
  X,
  Loader2,
  Sparkles,
  Flame,
  Info,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import type { LeaderboardEntry, LeaderboardOptIn, LeaderboardPeriod } from '@trademind/shared';

const PERIODS: { label: string; value: LeaderboardPeriod; desc: string }[] = [
  { label: 'All Time', value: 'ALL_TIME', desc: 'Overall historical performance' },
  { label: 'This Month', value: 'MONTHLY', desc: 'Past 30 days rolling edge' },
  { label: 'This Week', value: 'WEEKLY', desc: 'Past 7 days rolling edge' },
];

export default function DashboardLeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('ALL_TIME');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Opt-in status of the logged-in user
  const [userOptIn, setUserOptIn] = useState<LeaderboardOptIn | null>(null);
  const [userRanks, setUserRanks] = useState<Record<string, LeaderboardEntry> | null>(null);
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Modal
  const [optInModalOpen, setOptInModalOpen] = useState(false);
  const [optOutDialogOpen, setOptOutDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Opt-in form
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formTwitterUrl, setFormTwitterUrl] = useState('');

  // Fetch leaderboard entries for active period
  const fetchLeaderboard = useCallback(async (selectedPeriod: LeaderboardPeriod) => {
    try {
      setLoading(true);
      const res = await api.getLeaderboard({ period: selectedPeriod, limit: 50 });
      if (res.success && Array.isArray(res.data)) {
        setEntries(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load leaderboard rankings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch current user's opt-in status
  const fetchMyStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const res = await api.getMyLeaderboardStatus();
      if (res.success) {
        setIsOptedIn(res.data.optedIn);
        setUserOptIn(res.data.profile);
        setUserRanks(res.data.ranks);

        if (res.data.profile) {
          setFormDisplayName(res.data.profile.displayName || '');
          setFormBio(res.data.profile.bio || '');
          setFormTwitterUrl(res.data.profile.twitterUrl || '');
        }
      }
    } catch (err) {
      console.warn('Could not fetch leaderboard status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Trader Leaderboard — TradeMind';
    fetchMyStatus();
  }, [fetchMyStatus]);

  useEffect(() => {
    fetchLeaderboard(period);
  }, [fetchLeaderboard, period]);

  // Handle opt-in / profile update
  const handleSaveOptIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDisplayName.trim()) {
      toast.error('Please enter a public display name');
      return;
    }

    try {
      setActionLoading(true);
      if (isOptedIn) {
        const res = await api.updateLeaderboardOptIn({
          displayName: formDisplayName.trim(),
          bio: formBio.trim() || null,
          twitterUrl: formTwitterUrl.trim() || null,
        });
        if (res.success) {
          toast.success('Leaderboard profile updated');
          setOptInModalOpen(false);
          fetchMyStatus();
          fetchLeaderboard(period);
        }
      } else {
        const res = await api.optInLeaderboard({
          displayName: formDisplayName.trim(),
          bio: formBio.trim() || undefined,
          twitterUrl: formTwitterUrl.trim() || undefined,
        });
        if (res.success) {
          toast.success('Welcome to the Leaderboard!');
          setIsOptedIn(true);
          setOptInModalOpen(false);
          fetchMyStatus();
          fetchLeaderboard(period);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update opt-in settings');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOptOutConfirm = async () => {
    try {
      setActionLoading(true);
      const res = await api.optOutLeaderboard();
      if (res.success) {
        toast.success('You have opted out of the public leaderboard');
        setIsOptedIn(false);
        setUserOptIn(null);
        setOptOutDialogOpen(false);
        setOptInModalOpen(false);
        fetchLeaderboard(period);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to opt out');
    } finally {
      setActionLoading(false);
    }
  };

  // Top 3 Podium
  const topThree = useMemo(() => {
    return [
      entries.find((e) => e.rank === 1) || null,
      entries.find((e) => e.rank === 2) || null,
      entries.find((e) => e.rank === 3) || null,
    ];
  }, [entries]);

  // Rest of entries (rank 4+)
  const rankedRest = useMemo(() => {
    return entries.filter((e) => e.rank > 3);
  }, [entries]);

  // Current user's snapshot for the active period
  const currentUserEntry = useMemo(() => {
    if (!userRanks) return null;
    return userRanks[period] || null;
  }, [userRanks, period]);

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────── */}
      <PageHeader
        title="Trader Leaderboard"
        description="Discipline-ranked: 40% Win Rate · 40% Discipline Score · 20% Profit Factor — opt-in, privacy-first."
        icon={Trophy}
        actions={
          <div className="flex items-center p-1 rounded-xl bg-zinc-900/90 border border-zinc-800">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                  period === p.value
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                    : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* ── User Opt-in Status Banner ─────────────────────── */}
      {!loadingStatus && (
        <div
          className={cn(
            'p-5 rounded-2xl border transition-all relative overflow-hidden',
            isOptedIn
              ? 'bg-zinc-900/60 border-zinc-800/80 shadow-sm'
              : 'bg-gradient-to-r from-amber-500/10 via-zinc-900/80 to-brand-500/10 border-amber-500/30 shadow-lg',
          )}
        >
          {isOptedIn ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-lg">
                  {currentUserEntry ? `#${currentUserEntry.rank}` : '—'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">
                      {userOptIn?.displayName}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Opted In (Public)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {currentUserEntry
                      ? `Rank #${currentUserEntry.rank} in ${period.replace('_', ' ')} • Composite Score: ${currentUserEntry.compositeScore}`
                      : 'Trades currently synchronizing for this timeframe snapshot.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOptInModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">
                    Compete on the TradeMind Leaderboard
                  </span>
                </div>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Showcase your discipline, track how you rank against top traders globally, and build your trader credibility. Your account email remains 100% private.
                </p>
              </div>

              <button
                onClick={() => setOptInModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all whitespace-nowrap"
              >
                Opt In to Leaderboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Top 3 Podium ──────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-72" />
          <SkeletonCard className="h-64" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Leaderboard is initializing"
          description="No traders have opted in for this timeframe snapshot yet. Be the first to join and take Rank #1!"
          action={{
            label: isOptedIn ? 'Check Back Soon' : 'Opt In Now',
            onClick: () => setOptInModalOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          {/* #2 Rank: Silver */}
          {topThree[1] ? (
            <div className="rounded-3xl p-6 bg-zinc-900/80 border border-slate-700/60 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-xl order-2 md:order-1">
              <div className="absolute top-0 right-0 p-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-400/10 border border-slate-400/30 flex items-center justify-center font-extrabold text-slate-300 text-lg shadow-sm">
                  2
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
                  <Medal className="w-4 h-4 text-slate-300" />
                  <span>Silver Podium</span>
                </div>

                <h3 className="text-xl font-bold text-white truncate">
                  {topThree[1].displayName}
                </h3>
                {topThree[1].bio && (
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {topThree[1].bio}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Composite Score</span>
                  <span className="font-bold text-slate-200 text-sm">
                    {topThree[1].compositeScore}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Win Rate</span>
                  <span className="font-semibold text-emerald-400">
                    {topThree[1].winRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Net Return</span>
                  <span
                    className={cn(
                      'font-bold',
                      topThree[1].totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                    )}
                  >
                    {formatCurrency(topThree[1].totalPnl)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 rounded-3xl border border-dashed border-zinc-800 flex items-center justify-center text-xs text-zinc-600 order-2 md:order-1">
              Rank #2 Open
            </div>
          )}

          {/* #1 Rank: Gold Champion */}
          {topThree[0] ? (
            <div className="rounded-3xl p-7 bg-gradient-to-b from-amber-500/15 via-zinc-900/90 to-zinc-900 border-2 border-amber-500/50 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-amber-500/10 order-1 md:order-2 md:-translate-y-2">
              <div className="absolute top-0 right-0 p-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center font-black text-amber-300 text-2xl shadow-lg">
                  1
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Gold Champion</span>
                </div>

                <h3 className="text-2xl font-extrabold text-white truncate">
                  {topThree[0].displayName}
                </h3>
                {topThree[0].bio && (
                  <p className="text-xs text-zinc-300 line-clamp-2 mt-1 leading-relaxed">
                    {topThree[0].bio}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Composite Score</span>
                  <span className="font-extrabold text-amber-300 text-base">
                    {topThree[0].compositeScore}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Win Rate</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {topThree[0].winRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Net Return</span>
                  <span
                    className={cn(
                      'font-black text-sm',
                      topThree[0].totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                    )}
                  >
                    {formatCurrency(topThree[0].totalPnl)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-56 rounded-3xl border border-dashed border-zinc-800 flex items-center justify-center text-xs text-zinc-600 order-1 md:order-2">
              Rank #1 Open
            </div>
          )}

          {/* #3 Rank: Bronze */}
          {topThree[2] ? (
            <div className="rounded-3xl p-6 bg-zinc-900/80 border border-amber-700/40 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-xl order-3">
              <div className="absolute top-0 right-0 p-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-700/15 border border-amber-600/30 flex items-center justify-center font-extrabold text-amber-500 text-lg shadow-sm">
                  3
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold mb-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Bronze Podium</span>
                </div>

                <h3 className="text-xl font-bold text-white truncate">
                  {topThree[2].displayName}
                </h3>
                {topThree[2].bio && (
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {topThree[2].bio}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Composite Score</span>
                  <span className="font-bold text-amber-500/90 text-sm">
                    {topThree[2].compositeScore}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Win Rate</span>
                  <span className="font-semibold text-emerald-400">
                    {topThree[2].winRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Net Return</span>
                  <span
                    className={cn(
                      'font-bold',
                      topThree[2].totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                    )}
                  >
                    {formatCurrency(topThree[2].totalPnl)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 rounded-3xl border border-dashed border-zinc-800 flex items-center justify-center text-xs text-zinc-600 order-3">
              Rank #3 Open
            </div>
          )}
        </div>
      )}

      {/* ── Ranked Table (Ranks 4+) ────────────────────────── */}
      {rankedRest.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>All Ranked Traders</span>
              <span className="text-xs font-normal text-zinc-500">
                (Top {entries.length} shown)
              </span>
            </h3>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden backdrop-blur-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Trader</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4 text-right">Win Rate</th>
                  <th className="py-3.5 px-4 text-right">Discipline</th>
                  <th className="py-3.5 px-4 text-right">Trades</th>
                  <th className="py-3.5 px-4 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {rankedRest.map((entry) => (
                  <tr
                    key={entry.userId}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-400">
                      #{entry.rank}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{entry.displayName}</span>
                        {entry.twitterUrl && (
                          <a
                            href={entry.twitterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-brand-400 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {entry.bio && (
                        <p className="text-[11px] text-zinc-500 truncate max-w-xs mt-0.5">
                          {entry.bio}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {entry.compositeScore}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                      {entry.winRate}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-zinc-300">
                      {entry.disciplineScore}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                      {entry.totalTrades}
                    </td>
                    <td
                      className={cn(
                        'py-3.5 px-4 text-right font-bold font-mono',
                        entry.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      {formatCurrency(entry.totalPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Opt-in / Edit Profile Modal ────────────────────── */}
      {optInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setOptInModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
              <Trophy className="w-4 h-4" />
              <span>Leaderboard Profile</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {isOptedIn ? 'Edit Public Profile' : 'Join the Leaderboard'}
            </h2>
            <p className="text-xs text-zinc-400 mb-6">
              Customize how your ranking is displayed to other traders. You can opt out at any time.
            </p>

            <form onSubmit={handleSaveOptIn} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Public Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  placeholder="e.g. NiftySniper, AlphaBull, QuantTrader"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Letters, numbers, underscores, and dashes only (max 30 chars).
                </span>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">Bio / Trading Style</label>
                <textarea
                  rows={2}
                  maxLength={280}
                  placeholder="e.g. Intraday Options Seller • 1:2 R:R Rule-Follower"
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Twitter / X Profile (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://x.com/your_handle"
                  value={formTwitterUrl}
                  onChange={(e) => setFormTwitterUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                {isOptedIn ? (
                  <button
                    type="button"
                    onClick={() => setOptOutDialogOpen(true)}
                    className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                  >
                    Opt Out of Leaderboard
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOptInModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                  >
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isOptedIn ? 'Update Profile' : 'Confirm Opt-In'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Opt Out Confirmation Dialog ────────────────────── */}
      <ConfirmDialog
        open={optOutDialogOpen}
        title="Opt Out of Leaderboard"
        description="Are you sure you want to opt out? Your public profile will be removed from the leaderboard rankings. You can opt back in anytime."
        confirmLabel="Opt Out"
        danger
        loading={actionLoading}
        onConfirm={handleOptOutConfirm}
        onCancel={() => setOptOutDialogOpen(false)}
      />
    </div>
  );
}
