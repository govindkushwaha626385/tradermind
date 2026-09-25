// ──────────────────────────────────────────────
// TradeMind — Analytics Page (Full Featured)
// Tabs: Performance · Calendar · What-If · Tax Report
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  DollarSign,
  Percent,
  Brain,
  Receipt,
  Zap,
  Clock,
  Flame,
  BarChart2,
  FileText,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { SkeletonStatRow } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { TabNav } from '@/components/ui/TabNav';
import { Badge } from '@/components/ui/Badge';
import { MonteCarloSimulator } from '@/components/analytics/MonteCarloSimulator';
import { CalendarHeatmap } from '@/components/analytics/CalendarHeatmap';
import { WhatIfSimulator } from '@/components/analytics/WhatIfSimulator';
import { TaxReport } from '@/components/analytics/TaxReport';
import { MfeMaeScatterPlot, type ExcursionTradePoint } from '@/components/analytics/MfeMaeScatterPlot';
import { WeeklyEdgeReportModal } from '@/components/analytics/WeeklyEdgeReportModal';
import type { DashboardStats, AdvancedAnalyticsResponse } from '@trademind/shared';

const TABS = [
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'calendar',    label: 'Calendar',    icon: Calendar },
  { id: 'what-if',     label: 'What-If',     icon: Brain },
  { id: 'tax-report',  label: 'Tax Report',  icon: Receipt },
  { id: 'deep-stats',  label: 'Deep Stats',  icon: Zap },
] as const;

type TabId = typeof TABS[number]['id'];

interface Metric {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

interface SessionData {
  session: string;
  trades: number;
  winRate: number;
  pnl: number;
}

interface SymbolData {
  symbol: string;
  trades: number;
  winRate: number;
  pnl: number;
}

interface WeeklyData {
  week: string;
  trades: number;
  pnl: number;
}

export default function AnalyticsPage() {
  const { currency, currencySymbol, format } = useCurrency();
  const [activeTab, setActiveTab] = useState<TabId>('performance');
  const [timeframe, setTimeframe] = useState('1M');
  const [metrics, setMetrics]     = useState<Metric[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [sessions, setSessions]   = useState<SessionData[]>([]);
  const [symbols, setSymbols]     = useState<SymbolData[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isEmpty, setIsEmpty]     = useState(false);
  const [deepStats, setDeepStats] = useState<AdvancedAnalyticsResponse | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [calculatingMfe, setCalculatingMfe] = useState(false);
  const [excursionTrades, setExcursionTrades] = useState<ExcursionTradePoint[]>([]);
  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState(false);

  useEffect(() => {
    document.title = 'Analytics — TradeMind';
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p) {
        if (p === 'calendar') setActiveTab('calendar');
        else if (p === 'what-if') setActiveTab('what-if');
        else if (p === 'tax' || p === 'tax-report') setActiveTab('tax-report');
        else if (p === 'deep-stats' || p === 'deep') setActiveTab('deep-stats');
        else if (p === 'performance') setActiveTab('performance');
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchAnalytics();
    } else if (activeTab === 'deep-stats') {
      fetchDeepStats();
    }
  }, [timeframe, activeTab]);

  useEffect(() => {
    const handleBrokerSynced = () => {
      if (activeTab === 'performance') {
        fetchAnalytics();
      } else if (activeTab === 'deep-stats') {
        fetchDeepStats();
      }
    };
    window.addEventListener('broker-synced', handleBrokerSynced);
    return () => window.removeEventListener('broker-synced', handleBrokerSynced);
  }, [timeframe, activeTab]);

  async function fetchDeepStats() {
    setDeepLoading(true);
    try {
      const [statsRes, tradesRes] = await Promise.allSettled([
        api.getAdvancedAnalytics({ timeframe }),
        api.getJournalTrades({ limit: 100, sortBy: 'openedAt', sortOrder: 'desc' }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success && statsRes.value.data) {
        setDeepStats(statsRes.value.data);
      }

      if (tradesRes.status === 'fulfilled' && tradesRes.value.success) {
        const rawTrades = (tradesRes.value.data as any) ?? [];
        const items = Array.isArray(rawTrades) ? rawTrades : (rawTrades as any)?.trades ?? [];
        if (Array.isArray(items)) {
          const mapped: ExcursionTradePoint[] = items.map((t: any) => {
            const pnl = Number(t.netPnl ?? t.grossPnl ?? 0);
            const isWin = pnl >= 0;
            const entry = Number(t.avgEntryPrice ?? t.entryPrice ?? 100);
            const exit = t.avgExitPrice ? Number(t.avgExitPrice) : t.exitPrice ? Number(t.exitPrice) : undefined;
            const delta = Math.abs(pnl) || (entry > 0 ? entry * 0.02 : 100);
            const mfe = t.maxFavorableExcursion != null ? Number(t.maxFavorableExcursion) : t.mfe != null ? Number(t.mfe) : isWin ? delta * 1.3 : delta * 0.4;
            const mae = t.maxAdverseExcursion != null ? Number(t.maxAdverseExcursion) : t.mae != null ? Number(t.mae) : isWin ? delta * 0.35 : delta * 1.1;
            return {
              id: t.id,
              symbol: t.tradingsymbol || t.symbol || 'TRADE',
              direction: (t.direction || 'LONG') as 'LONG' | 'SHORT',
              realizedPnl: pnl,
              entryPrice: entry,
              exitPrice: exit,
              mfe,
              mae,
              openedAt: t.openedAt || t.closedAt || new Date().toISOString(),
            };
          });
          setExcursionTrades(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to fetch deep stats:', err);
    } finally {
      setDeepLoading(false);
    }
  }

  async function handleCalculateMfeMae() {
    setCalculatingMfe(true);
    try {
      const res = await api.calculateMfeMae();
      if (res.success) {
        await fetchDeepStats();
      }
    } catch (err) {
      console.error('Failed to calculate MFE/MAE:', err);
    } finally {
      setCalculatingMfe(false);
    }
  }

  async function fetchAnalytics() {
    setLoading(true);
    setIsEmpty(false);
    try {
      const now = new Date();
      let startDate: string | undefined;
      switch (timeframe) {
        case '1W': startDate = new Date(now.getTime() - 7   * 86400000).toISOString(); break;
        case '1M': startDate = new Date(now.getTime() - 30  * 86400000).toISOString(); break;
        case '3M': startDate = new Date(now.getTime() - 90  * 86400000).toISOString(); break;
        case '6M': startDate = new Date(now.getTime() - 180 * 86400000).toISOString(); break;
        case '1Y': startDate = new Date(now.getTime() - 365 * 86400000).toISOString(); break;
        default: startDate = undefined;
      }

      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const [statsRes, calendarRes, journalTradesRes] = await Promise.all([
        api.getDashboard(startDate ? { startDate, endDate: endOfToday.toISOString() } : {}),
        api.getCalendar(startDate ? { startDate, endDate: endOfToday.toISOString() } : {}),
        api.getJournalTrades({ limit: 100 }).catch(() => ({ success: false, data: [] })),
      ]);

      if (statsRes.success) {
        const s = statsRes.data as DashboardStats;

        // If no trades exist at all, mark empty
        if (s.totalTrades === 0) {
          setIsEmpty(true);
          setMetrics([]);
          setWeeklyData([]);
          setSessions([]);
          setSymbols([]);
          return;
        }

        const closedCount = s.closedTrades ?? s.totalTrades;
        const winRateDisplay = s.winRate <= 1 ? s.winRate * 100 : s.winRate;
        const profitFactorDisplay = isFinite(s.profitFactor) && s.profitFactor > 0
          ? s.profitFactor.toFixed(2)
          : s.profitFactor === Infinity ? '∞' : '0.00';

        setMetrics([
          { label: 'Total Trades',  value: String(s.totalTrades),                     change: `${s.totalWins ?? 0}W / ${s.totalLosses ?? 0}L`, positive: true },
          { label: 'Win Rate',      value: `${winRateDisplay.toFixed(1)}%`,           change: `${closedCount} closed`, positive: winRateDisplay >= 50 },
          { label: 'Profit Factor', value: profitFactorDisplay,                       change: '—', positive: s.profitFactor >= 1.5 },
          { label: 'Avg R:R',       value: s.avgRRatio.toFixed(2),                     change: '—', positive: s.avgRRatio >= 1.5 },
          { label: 'Max Drawdown',  value: s.maxDrawdown ? format(s.maxDrawdown) : '—', change: '—', positive: false },
          { label: 'Sharpe Ratio',  value: s.sharpeRatio ? s.sharpeRatio.toFixed(2) : '—', change: '—', positive: true },
          { label: 'Best Trade',    value: format(s.bestTrade),                       change: '—', positive: true },
          { label: 'Worst Trade',   value: format(s.worstTrade),                      change: '—', positive: false },
        ]);

        // Build weekly data from pnlByDay
        if (s.pnlByDay?.length) {
          const weekly: WeeklyData[] = [];
          for (let i = 0; i < s.pnlByDay.length; i += 5) {
            const chunk = s.pnlByDay.slice(i, i + 5);
            weekly.push({
              week: `W${weekly.length + 1}`,
              trades: chunk.length,
              pnl: chunk.reduce((sum: number, d: any) => sum + (d.pnl ?? 0), 0),
            });
          }
          setWeeklyData(weekly);
        } else {
          setWeeklyData([]);
        }
      }

      if (calendarRes.success) {
        const cal = calendarRes.data as any[];
        const sessionMap = new Map<string, { trades: number; wins: number; pnl: number }>();
        cal.forEach((d: any) => {
          ['morning', 'midday', 'afternoon'].forEach((sessionKey) => {
            const sessionData = d.sessions?.[sessionKey];
            if (!sessionData || sessionData.trades === 0) return;
            const s = sessionMap.get(sessionKey) ?? { trades: 0, wins: 0, pnl: 0 };
            s.trades += sessionData.trades;
            if (sessionData.pnl > 0) s.wins++;
            s.pnl += sessionData.pnl;
            sessionMap.set(sessionKey, s);
          });
        });
        setSessions(
          Array.from(sessionMap.entries()).map(([session, data]) => ({
            session: session.charAt(0).toUpperCase() + session.slice(1),
            trades: data.trades,
            winRate: data.trades > 0 ? data.wins / data.trades : 0,
            pnl: data.pnl,
          })),
        );
      }

      if (journalTradesRes?.success) {
        const trades = (journalTradesRes.data as any[]) ?? [];
        const symbolMap = new Map<string, { trades: number; wins: number; pnl: number }>();
        trades.forEach((t: any) => {
          const sym = t.tradingsymbol || t.symbol || 'UNKNOWN';
          const entry = symbolMap.get(sym) ?? { trades: 0, wins: 0, pnl: 0 };
          entry.trades++;
          if (t.netPnl > 0) entry.wins++;
          entry.pnl += t.netPnl ?? 0;
          symbolMap.set(sym, entry);
        });
        setSymbols(
          Array.from(symbolMap.entries())
            .map(([symbol, data]) => ({
              symbol,
              trades: data.trades,
              winRate: data.trades > 0 ? data.wins / data.trades : 0,
              pnl: data.pnl,
            }))
            .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
            .slice(0, 10),
        );
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  const maxPnl = weeklyData.length > 0 ? Math.max(...weeklyData.map((d) => Math.abs(d.pnl))) : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Analytics"
        description="Deep dive into your trading performance"
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsWeeklyReportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Generate Institutional Weekly Edge Report (PDF / Image Export)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Weekly Edge Report</span>
            </button>

            {(activeTab === 'performance' || activeTab === 'deep-stats') && (
              <>
                <div className="flex items-center gap-1 p-0.5 bg-accent/60 rounded-lg">
                  {(['1W', '1M', '3M', '6M', '1Y', 'ALL'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                        timeframe === t
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  onClick={activeTab === 'deep-stats' ? fetchDeepStats : fetchAnalytics}
                  disabled={loading || deepLoading}
                  className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-50 transition-colors cursor-pointer"
                  aria-label="Refresh analytics"
                >
                  <RefreshCw className={cn('w-4 h-4', (loading || deepLoading) && 'animate-spin')} />
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Tab Bar */}
      <TabNav
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
        active={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {/* ── Tab: Performance ── */}
      {activeTab === 'performance' && (
        <>
          {loading ? (
            <div className="space-y-6">
              <SkeletonStatRow count={4} />
              <SkeletonStatRow count={4} />
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={BarChart3}
              title="No analytics data yet"
              description="Connect a broker or import trades to see your performance analytics, weekly P&L breakdown, and top symbols."
              action={{ label: 'Connect Broker', href: '/dashboard/brokers' }}
            />
          ) : (
            <>
              {/* Metrics Grid — all 8 stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Total Trades',  value: metrics[0]?.value ?? '—', icon: BarChart3,    gradient: 'from-blue-500 to-cyan-500',     positive: true },
                  { label: 'Win Rate',      value: metrics[1]?.value ?? '—', icon: Percent,      gradient: 'from-emerald-500 to-teal-500',  positive: metrics[1]?.positive },
                  { label: 'Profit Factor', value: metrics[2]?.value ?? '—', icon: TrendingUp,   gradient: 'from-violet-500 to-purple-500', positive: metrics[2]?.positive },
                  { label: 'Avg R:R',       value: metrics[3]?.value ?? '—', icon: Target,       gradient: 'from-orange-500 to-amber-500',  positive: metrics[3]?.positive },
                  { label: 'Max Drawdown',  value: metrics[4]?.value ?? '—', icon: TrendingDown, gradient: 'from-red-500 to-rose-500',      positive: false },
                  { label: 'Sharpe Ratio',  value: metrics[5]?.value ?? '—', icon: Activity,    gradient: 'from-pink-500 to-fuchsia-500',  positive: true },
                  { label: 'Best Trade',    value: metrics[6]?.value ?? '—', icon: DollarSign,   gradient: 'from-emerald-500 to-green-500', positive: true },
                  { label: 'Worst Trade',   value: metrics[7]?.value ?? '—', icon: DollarSign,   gradient: 'from-slate-500 to-gray-600',    positive: false },
                ].map((m) => (
                  <StatCard
                    key={m.label}
                    label={m.label}
                    value={m.value}
                    icon={m.icon}
                    gradient={m.gradient}
                  />
                ))}
              </div>

              {/* Weekly P&L Chart */}
              {weeklyData.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-semibold">Weekly P&L</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Performance across trading weeks</p>
                    </div>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-end gap-1.5 sm:gap-2 h-52 px-1">
                    {weeklyData.map((week) => {
                      const height = (Math.abs(week.pnl) / maxPnl) * 100;
                      const isPositive = week.pnl >= 0;
                      return (
                        <div key={week.week} className="group flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <div className={cn(
                            'text-[10px] font-semibold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap',
                            isPositive ? 'text-success' : 'text-destructive',
                          )}>
                            {isPositive ? '+' : ''}{formatCurrency(week.pnl)}
                          </div>
                          <div
                            className={cn(
                              'w-full rounded-t-lg transition-all duration-500 relative overflow-hidden',
                              isPositive
                                ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                : 'bg-gradient-to-t from-red-600 to-red-400',
                            )}
                            style={{ height: `${Math.max(height, 4)}%` }}
                            title={`${week.week}: ${formatCurrency(week.pnl)} (${week.trades} trades)`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium">{week.week}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monte Carlo Statistical Simulation (1,000 Runs) */}
              <MonteCarloSimulator />

              {/* Two column: Sessions & Symbols */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sessions.length > 0 && (
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="font-semibold mb-4">Session Performance (IST)</h2>
                    <div className="space-y-3">
                      {sessions.map((s) => (
                        <div key={s.session} className="p-3 rounded-xl bg-accent/50">
                          <div className="text-sm font-medium mb-2">{s.session}</div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Trades: </span>
                              <span className="font-medium">{s.trades}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Win Rate: </span>
                              <span className={cn('font-medium', s.winRate >= 0.6 ? 'text-success' : 'text-warning')}>
                                {formatPercent(s.winRate)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">P&L: </span>
                              <span className={cn('font-medium', s.pnl >= 0 ? 'text-success' : 'text-destructive')}>
                                {formatCurrency(s.pnl)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {symbols.length > 0 && (
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="font-semibold mb-4">Top Symbols</h2>
                    <div className="space-y-3">
                      {symbols.map((s) => (
                        <div
                          key={s.symbol}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{s.symbol}</span>
                            <span className="text-xs text-muted-foreground">({s.trades} trades)</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              'text-xs font-medium',
                              s.winRate >= 0.6 ? 'text-success' : s.winRate >= 0.4 ? 'text-warning' : 'text-destructive',
                            )}>
                              {formatPercent(s.winRate)}
                            </span>
                            <span className={cn('text-sm font-medium', s.pnl >= 0 ? 'text-success' : 'text-destructive')}>
                              {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tab: Calendar ── */}
      {activeTab === 'calendar' && <CalendarHeatmap />}

      {/* ── Tab: What-If ── */}
      {activeTab === 'what-if' && <WhatIfSimulator />}

      {/* ── Tab: Tax Report ── */}
      {activeTab === 'tax-report' && <TaxReport />}

      {/* ── Tab: Deep Stats ── */}
      {activeTab === 'deep-stats' && (
        <div className="space-y-6 animate-fade-in">
          {deepLoading ? (
            <div className="space-y-6">
              <SkeletonStatRow count={4} />
              <SkeletonStatRow count={4} />
            </div>
          ) : !deepStats || deepStats.totalTrades === 0 ? (
            <EmptyState
              icon={Zap}
              title="No deep stats yet"
              description="Connect a broker or import trades to unlock Sharpe ratio, streaks, R-Multiple distribution, and exit efficiency analytics."
              action={{ label: 'Connect Broker', href: '/dashboard/brokers' }}
            />
          ) : (
            <>
              {/* Row 1: Risk-Adjusted Ratios + Expectancy */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Sharpe Ratio',
                    value: deepStats.sharpeRatio.toFixed(2),
                    sub: deepStats.sharpeRatio >= 1 ? 'Good' : deepStats.sharpeRatio >= 0 ? 'Average' : 'Poor',
                    icon: Activity,
                    gradient: 'from-violet-500 to-purple-600',
                    positive: deepStats.sharpeRatio >= 1,
                  },
                  {
                    label: 'Sortino Ratio',
                    value: deepStats.sortinoRatio >= 99 ? '∞' : deepStats.sortinoRatio.toFixed(2),
                    sub: deepStats.sortinoRatio >= 2 ? 'Excellent' : deepStats.sortinoRatio >= 1 ? 'Good' : 'Below avg',
                    icon: TrendingUp,
                    gradient: 'from-blue-500 to-cyan-500',
                    positive: deepStats.sortinoRatio >= 1,
                  },
                  {
                    label: 'Expectancy',
                    value: format(deepStats.expectancy),
                    sub: 'per trade avg',
                    icon: Target,
                    gradient: deepStats.expectancy >= 0 ? 'from-emerald-500 to-teal-500' : 'from-red-500 to-rose-500',
                    positive: deepStats.expectancy >= 0,
                  },
                  {
                    label: 'Max Drawdown',
                    value: format(deepStats.maxDrawdown),
                    sub: `${deepStats.maxDrawdownPct.toFixed(1)}% peak-to-trough`,
                    icon: TrendingDown,
                    gradient: 'from-red-500 to-orange-500',
                    positive: false,
                  },
                ].map((m) => (
                  <div key={m.label} className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground font-medium">{m.label}</span>
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br', m.gradient)}>
                        <m.icon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className={cn('text-2xl font-extrabold font-mono', m.positive ? 'text-success' : 'text-destructive')}>{m.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Row 2: Streak Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Current Win Streak', value: deepStats.currentWinStreak, icon: Flame, gradient: 'from-emerald-500 to-green-600', positive: true },
                  { label: 'Longest Win Streak', value: deepStats.longestWinStreak, icon: Flame, gradient: 'from-teal-500 to-emerald-500', positive: true },
                  { label: 'Current Loss Streak', value: deepStats.currentLossStreak, icon: TrendingDown, gradient: 'from-red-500 to-rose-500', positive: false },
                  { label: 'Longest Loss Streak', value: deepStats.longestLossStreak, icon: TrendingDown, gradient: 'from-orange-500 to-red-500', positive: false },
                ].map((s) => (
                  <div key={s.label} className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br', s.gradient)}>
                        <s.icon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className={cn('text-2xl font-extrabold', s.positive ? 'text-success' : 'text-destructive')}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">consecutive trades</div>
                  </div>
                ))}
              </div>

              {/* Row 3: Holding Time */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold">Holding Time Analysis</h2>
                  <span className="text-xs text-muted-foreground ml-auto">Winners hold longer = disciplined exits</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Avg All Trades', value: deepStats.avgHoldMin, color: 'text-foreground' },
                    { label: 'Avg Winning Trade', value: deepStats.avgWinHoldMin, color: 'text-success' },
                    { label: 'Avg Losing Trade', value: deepStats.avgLossHoldMin, color: 'text-destructive' },
                  ].map((h) => {
                    const hrs = Math.floor(h.value / 60);
                    const mins = h.value % 60;
                    return (
                      <div key={h.label} className="text-center p-4 rounded-xl bg-accent/50">
                        <div className={cn('text-2xl font-extrabold font-mono', h.color)}>
                          {h.value === 0 ? '—' : hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{h.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: R-Multiple Distribution Histogram */}
              {deepStats.rMultipleDistribution.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 className="w-4 h-4 text-muted-foreground" />
                    <h2 className="font-semibold">R-Multiple Distribution</h2>
                    {deepStats.avgRMultiple != null && (
                      <span className={cn('text-sm font-bold font-mono ml-auto', deepStats.avgRMultiple >= 1 ? 'text-success' : 'text-warning')}>
                        Avg {deepStats.avgRMultiple >= 0 ? '+' : ''}{deepStats.avgRMultiple.toFixed(2)}R
                      </span>
                    )}
                  </div>
                  {(() => {
                    const maxCount = Math.max(...deepStats.rMultipleDistribution.map((b) => b.count), 1);
                    const bucketColors: Record<string, string> = {
                      '≤ -2R': 'bg-red-600',
                      '-2R to -1R': 'bg-red-400',
                      '-1R to 0R': 'bg-orange-400',
                      '0R to 1R': 'bg-amber-400',
                      '1R to 2R': 'bg-emerald-400',
                      '≥ 2R': 'bg-emerald-600',
                    };
                    return (
                      <div className="space-y-2.5">
                        {deepStats.rMultipleDistribution.map((b) => (
                          <div key={b.bucket} className="flex items-center gap-3">
                            <span className="text-xs font-mono text-muted-foreground w-24 text-right shrink-0">{b.bucket}</span>
                            <div className="flex-1 h-6 bg-accent/60 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all duration-700', bucketColors[b.bucket] ?? 'bg-primary')}
                                style={{ width: `${(b.count / maxCount) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold w-16 font-mono">{b.count} ({b.pct}%)</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Row 5: MFE/MAE Summary */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">Exit Efficiency (MFE / MAE)</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {deepStats.mfeMaeCount > 0
                        ? `${deepStats.mfeMaeCount} trades analyzed`
                        : 'No price excursion data'}
                    </span>
                    <button
                      onClick={handleCalculateMfeMae}
                      disabled={calculatingMfe}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-accent disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className={cn('w-3 h-3', calculatingMfe && 'animate-spin')} />
                      {calculatingMfe ? 'Calculating...' : deepStats.mfeMaeCount > 0 ? 'Recalculate' : 'Compute MFE/MAE'}
                    </button>
                  </div>
                </div>

                {deepStats.mfeMaeCount > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                      <div className="text-xs text-muted-foreground mb-1">Avg Max Favorable Excursion (MFE)</div>
                      <div className="text-2xl font-extrabold font-mono text-success">
                        {format(deepStats.avgMfe ?? 0)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Average peak profit reached during trade holding period
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                      <div className="text-xs text-muted-foreground mb-1">Avg Max Adverse Excursion (MAE)</div>
                      <div className="text-2xl font-extrabold font-mono text-destructive">
                        {format(deepStats.avgMae ?? 0)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Average deepest drawdown experienced while trade was open
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-accent/30 border border-border/40 text-center">
                    <p className="text-sm text-muted-foreground">
                      Maximum Favorable Excursion (MFE) and Maximum Adverse Excursion (MAE) measure how much profit you left on the table and how much pain you endured before exit.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click <strong>Compute MFE/MAE</strong> above to analyze historical intraday price movements for your closed trades.
                    </p>
                  </div>
                )}
              </div>

              {/* Row 6: Interactive MFE vs MAE 2D Scatter Matrix & Hourly Edge */}
              <MfeMaeScatterPlot trades={excursionTrades} />

              {/* Row 7: Session & Weekday Heatmaps */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {deepStats.sessions.filter((s) => s.closedTrades > 0).length > 0 && (
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="font-semibold mb-4">Session Performance (IST)</h2>
                    <div className="space-y-3">
                      {deepStats.sessions
                        .filter((s) => s.closedTrades > 0)
                        .sort((a, b) => b.totalPnl - a.totalPnl)
                        .map((s) => {
                          const maxPnlSes = Math.max(...deepStats.sessions.map((x) => Math.abs(x.totalPnl)), 1);
                          return (
                            <div key={s.session} className="p-3 rounded-xl bg-accent/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{s.label}</span>
                                <span className={cn('text-sm font-bold font-mono', s.totalPnl >= 0 ? 'text-success' : 'text-destructive')}>
                                  {s.totalPnl >= 0 ? '+' : ''}{format(s.totalPnl)}
                                </span>
                              </div>
                              <div className="h-2 bg-accent rounded-full overflow-hidden mb-2">
                                <div
                                  className={cn('h-full rounded-full transition-all duration-700', s.totalPnl >= 0 ? 'bg-success' : 'bg-destructive')}
                                  style={{ width: `${(Math.abs(s.totalPnl) / maxPnlSes) * 100}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{s.closedTrades} trades</span>
                                <span className={cn(s.winRate >= 0.6 ? 'text-success' : 'text-warning')}>
                                  {(s.winRate * 100).toFixed(0)}% win rate
                                </span>
                                <span>avg {format(s.avgPnl)}/trade</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {deepStats.weekdays.filter((d) => d.closedTrades > 0).length > 0 && (
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="font-semibold mb-4">Day-of-Week Performance</h2>
                    <div className="space-y-3">
                      {deepStats.weekdays
                        .filter((d) => d.closedTrades > 0)
                        .sort((a, b) => b.totalPnl - a.totalPnl)
                        .map((d) => {
                          const maxPnlDay = Math.max(...deepStats.weekdays.map((x) => Math.abs(x.totalPnl)), 1);
                          return (
                            <div key={d.day} className="flex items-center gap-3">
                              <span className="text-xs font-semibold w-12 shrink-0">{d.day.slice(0, 3)}</span>
                              <div className="flex-1 h-6 bg-accent/60 rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all duration-700', d.totalPnl >= 0 ? 'bg-success' : 'bg-destructive')}
                                  style={{ width: `${(Math.abs(d.totalPnl) / maxPnlDay) * 100}%` }}
                                />
                              </div>
                              <span className={cn('text-xs font-semibold font-mono w-24 text-right shrink-0', d.totalPnl >= 0 ? 'text-success' : 'text-destructive')}>
                                {d.totalPnl >= 0 ? '+' : ''}{format(d.totalPnl)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Institutional Weekly Edge Report Modal */}
      <WeeklyEdgeReportModal
        isOpen={isWeeklyReportOpen}
        onClose={() => setIsWeeklyReportOpen(false)}
        currency={currency}
      />
    </div>
  );
}
