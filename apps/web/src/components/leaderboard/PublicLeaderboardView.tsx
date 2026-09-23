// ──────────────────────────────────────────────
// TradeMind — Public Leaderboard View Component
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Medal,
  Award,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Flame,
  Globe,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LeaderboardEntry, LeaderboardPeriod } from '@trademind/shared';

const PERIODS: { label: string; value: LeaderboardPeriod }[] = [
  { label: 'All Time', value: 'ALL_TIME' },
  { label: 'This Month', value: 'MONTHLY' },
  { label: 'This Week', value: 'WEEKLY' },
];

export function PublicLeaderboardView() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('ALL_TIME');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async (p: LeaderboardPeriod) => {
    try {
      setLoading(true);
      const res = await api.getLeaderboard({ period: p, limit: 50 });
      if (res.success && Array.isArray(res.data)) {
        setEntries(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch public leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(period);
  }, [fetchLeaderboard, period]);

  const topThree = useMemo(() => {
    return [
      entries.find((e) => e.rank === 1) || null,
      entries.find((e) => e.rank === 2) || null,
      entries.find((e) => e.rank === 3) || null,
    ];
  }, [entries]);

  const restEntries = useMemo(() => {
    return entries.filter((e) => e.rank > 3);
  }, [entries]);

  return (
    <div className="space-y-8">
      {/* ── Period Selector ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
        <div>
          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
            Verified Trader Standings
          </span>
          <p className="text-xs text-zinc-400 mt-0.5">
            Updated in real-time from verified journal trade executions.
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-zinc-950 border border-zinc-800 self-start sm:self-auto">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
                period === p.value
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Podium ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-64" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Rankings are initializing"
          description="Leaderboard positions for this timeframe are currently computing. Sign in to opt in and claim Rank #1!"
          action={{
            label: 'Sign In to TradeMind',
            href: '/login',
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          {/* #2 Rank */}
          {topThree[1] && (
            <div className="rounded-3xl p-6 bg-zinc-900/80 border border-slate-700/60 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-xl order-2 md:order-1">
              <div className="w-10 h-10 rounded-2xl bg-slate-400/10 border border-slate-400/30 flex items-center justify-center font-extrabold text-slate-300 text-lg absolute top-4 right-4">
                2
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                  <Medal className="w-4 h-4 text-slate-300" />
                  <span>Rank #2</span>
                </div>
                <h3 className="text-xl font-bold text-white truncate">{topThree[1].displayName}</h3>
                {topThree[1].bio && (
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">{topThree[1].bio}</p>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Discipline Score</span>
                  <span className="font-bold text-slate-200">{topThree[1].compositeScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Win Rate</span>
                  <span className="font-semibold text-emerald-400">{topThree[1].winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Net Profit</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(topThree[1].totalPnl)}</span>
                </div>
              </div>
            </div>
          )}

          {/* #1 Rank: Champion */}
          {topThree[0] && (
            <div className="rounded-3xl p-7 bg-gradient-to-b from-amber-500/15 via-zinc-900/90 to-zinc-900 border-2 border-amber-500/50 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-amber-500/10 order-1 md:order-2 md:-translate-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center font-black text-amber-300 text-2xl absolute top-4 right-4 shadow-lg">
                1
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Leaderboard Leader</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white truncate">{topThree[0].displayName}</h3>
                {topThree[0].bio && (
                  <p className="text-xs text-zinc-300 line-clamp-2 mt-1 leading-relaxed">{topThree[0].bio}</p>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-amber-500/20 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-medium">Discipline Score</span>
                  <span className="font-extrabold text-amber-300 text-base">{topThree[0].compositeScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-medium">Win Rate</span>
                  <span className="font-bold text-emerald-400 text-sm">{topThree[0].winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-medium">Net Profit</span>
                  <span className="font-black text-emerald-400 text-sm">{formatCurrency(topThree[0].totalPnl)}</span>
                </div>
              </div>
            </div>
          )}

          {/* #3 Rank */}
          {topThree[2] && (
            <div className="rounded-3xl p-6 bg-zinc-900/80 border border-amber-700/40 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-xl order-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-700/15 border border-amber-600/30 flex items-center justify-center font-extrabold text-amber-500 text-lg absolute top-4 right-4">
                3
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold mb-1">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Rank #3</span>
                </div>
                <h3 className="text-xl font-bold text-white truncate">{topThree[2].displayName}</h3>
                {topThree[2].bio && (
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">{topThree[2].bio}</p>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Discipline Score</span>
                  <span className="font-bold text-amber-500/90">{topThree[2].compositeScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Win Rate</span>
                  <span className="font-semibold text-emerald-400">{topThree[2].winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Net Profit</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(topThree[2].totalPnl)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Table (Rank 4+) ────────────────────────────────── */}
      {restEntries.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                <th className="py-3.5 px-4">Trader</th>
                <th className="py-3.5 px-4 text-center">Discipline Score</th>
                <th className="py-3.5 px-4 text-right">Win Rate</th>
                <th className="py-3.5 px-4 text-right">Trades</th>
                <th className="py-3.5 px-4 text-right">Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {restEntries.map((entry) => (
                <tr key={entry.userId} className="hover:bg-zinc-800/30 transition-colors">
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
                      <p className="text-[11px] text-zinc-500 truncate max-w-xs mt-0.5">{entry.bio}</p>
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
      )}

      {/* ── Join Leaderboard CTA ───────────────────────────── */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-500/10 via-brand-600/10 to-purple-600/10 border border-amber-500/30 text-center space-y-4">
        <h3 className="text-xl font-bold text-white">
          Want to see your name on the Leaderboard?
        </h3>
        <p className="text-xs text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Connect your trading account, journal your daily setups, and track your true mathematical consistency with TradeMind.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all inline-flex items-center gap-2"
          >
            <span>Start Journaling for Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
