// ──────────────────────────────────────────────
// TradeMind — Dashboard Home Page v2
//
// Layout:
// 1. Hero greeting + market status + date
// 2. KPI strip (4 StatCards with sparklines)
// 3. Two-column: Equity Curve (2/3) | Quick Panel (1/3)
// 4. Bottom grid: Recent Trades | Top Symbols | Day Heatmap
// 5. AI Insights ribbon
// 6. Behavioral + Pre-market tools (unchanged)
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Activity,
  DollarSign,
  BarChart3,
  Brain,
  AlertTriangle,
  BookOpen,
  RefreshCw,
  Plus,
  Plug,
  ArrowRight,
  Zap,
  Sparkles,
  Target,
  Trophy,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Minus,
  ChevronRight,
  Flame,
  Layers,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { EquityCurve } from '@/components/EquityCurve';
import { toast } from '@/components/Toast';
import { SkeletonStatRow, SkeletonCard } from '@/components/ui/SkeletonCard';
import { BehavioralShield } from '@/components/ai/BehavioralShield';
import { PremarketRoutineModal } from '@/components/discipline/PremarketRoutineModal';
import { DailyDebrief } from '@/components/ai/DailyDebrief';
import { ReviewSubmitModal } from '@/components/ReviewSubmitModal';
import { MarketSessionStatus } from '@/components/dashboard/MarketSessionStatus';
import { RiskGuard } from '@/components/dashboard/RiskGuard';
import { RiskKillSwitchWidget } from '@/components/dashboard/RiskKillSwitchWidget';
import { StatCard } from '@/components/ui/StatCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { LiveDot } from '@/components/ui/LiveDot';
import { TradingViewLiveWidget } from '@/components/chart/TradingViewLiveWidget';
import type { EquityPoint } from '@/components/EquityCurve';
import type { DashboardStats, BehavioralInsight, Partner } from '@trademind/shared';

const DASHBOARD_TERMINAL_PRESETS = [
  { label: 'NIFTY 50', symbol: 'NSE:NIFTY', badge: '🇮🇳' },
  { label: 'BANK NIFTY', symbol: 'NSE:BANKNIFTY', badge: '🇮🇳' },
  { label: 'BTC / USD', symbol: 'BINANCE:BTCUSDT', badge: '🪙' },
  { label: 'ETH / USD', symbol: 'BINANCE:ETHUSDT', badge: '🪙' },
  { label: 'S&P 500', symbol: 'SP:SPX', badge: '🇺🇸' },
  { label: 'NASDAQ', symbol: 'NASDAQ:NDX', badge: '🇺🇸' },
  { label: 'NVIDIA', symbol: 'NASDAQ:NVDA', badge: '🇺🇸' },
  { label: 'GOLD', symbol: 'OANDA:XAUUSD', badge: '💱' },
  { label: 'EUR / USD', symbol: 'FX:EURUSD', badge: '💱' },
];

interface TradeSummary {
  symbol: string;
  direction: string;
  pnl: number;
  date: string;
  status: string;
}

const SEVERITY_COLORS = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high:     'bg-warning/10 text-warning border-warning/20',
  medium:   'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  low:      'bg-success/10 text-success border-success/20',
};

const QUICK_ACTIONS = [
  { label: 'Log a Trade',    href: '/dashboard/trades',    icon: BookOpen, desc: 'Record your latest trade', gradient: 'from-blue-500 to-indigo-500' },
  { label: 'Connect Broker', href: '/dashboard/brokers',   icon: Plug,     desc: 'Auto-sync executions',    gradient: 'from-emerald-500 to-teal-500' },
  { label: 'Analytics',      href: '/dashboard/analytics', icon: BarChart3, desc: 'Deep-dive performance',  gradient: 'from-violet-500 to-purple-500' },
  { label: 'AI Insights',    href: '/dashboard/insights',  icon: Brain,    desc: 'Behavioral patterns',     gradient: 'from-pink-500 to-rose-500' },
];

const TIMEFRAMES = ['1W', '1M', '3M', '6M', '1Y', 'ALL'] as const;
type Timeframe = typeof TIMEFRAMES[number];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return '☀️ Good morning';
  if (h < 17) return '🌤️ Good afternoon';
  return '🌙 Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function DashboardPage() {
  const { currency, currencySymbol, format } = useCurrency();
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [connections, setConnections] = useState<Array<{ id: string; brokerId: string; label: string; brokerClientId: string }>>([]);
  const [blendedPortfolio, setBlendedPortfolio] = useState<{
    totalCash: number;
    totalMarginUsed: number;
    totalCollateral: number;
    totalEquity: number;
    dailyVaR95: number;
    accountsCount: number;
  } | null>(null);
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<BehavioralInsight[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeSummary[]>([]);
  const [equityData, setEquityData] = useState<EquityPoint[]>([]);
  const [usage, setUsage]   = useState<{ trades: { used: number; limit: number; unlimited: boolean }; brokers: { used: number; limit: number; unlimited: boolean } } | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [premarketOpen, setPremarketOpen] = useState(false);
  const [debriefOpen, setDebriefOpen]     = useState(false);
  const [reviewOpen, setReviewOpen]       = useState(false);
  const [lastUpdated, setLastUpdated]     = useState<string>('');
  const [mainViewMode, setMainViewMode]   = useState<'equity' | 'terminal'>('equity');
  const [terminalSymbol, setTerminalSymbol] = useState<string>('NSE:NIFTY');

  useEffect(() => { document.title = 'Dashboard — TradeMind'; }, []);
  useEffect(() => { fetchDashboard(false, timeframe); }, [timeframe]);

  useEffect(() => {
    const handleBrokerSynced = () => {
      fetchDashboard(true, timeframe);
    };
    window.addEventListener('broker-synced', handleBrokerSynced);
    return () => window.removeEventListener('broker-synced', handleBrokerSynced);
  }, [timeframe]);

  useEffect(() => {
    const handleOpenPremarket = () => setPremarketOpen(true);
    window.addEventListener('open-premarket-routine', handleOpenPremarket);
    return () => window.removeEventListener('open-premarket-routine', handleOpenPremarket);
  }, []);

  useEffect(() => {
    api.getProfile().then((res) => {
      if (res.success) {
        const p = res.data as any;
        setUserName(p.name ?? null);
      }
    }).catch(() => {});
  }, []);

  async function fetchDashboard(showToast = false, tf: Timeframe = timeframe, accountId = selectedAccountId) {
    if (showToast) setRefreshing(true);
    else setLoading(true);

    try {
      const now = new Date();
      let startDate: string | undefined;
      const dayMs = 86400000;
      switch (tf) {
        case '1W':  startDate = new Date(now.getTime() - 7   * dayMs).toISOString(); break;
        case '1M':  startDate = new Date(now.getTime() - 30  * dayMs).toISOString(); break;
        case '3M':  startDate = new Date(now.getTime() - 90  * dayMs).toISOString(); break;
        case '6M':  startDate = new Date(now.getTime() - 180 * dayMs).toISOString(); break;
        case '1Y':  startDate = new Date(now.getTime() - 365 * dayMs).toISOString(); break;
        case 'ALL': startDate = undefined; break;
      }

      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (accountId && accountId !== 'all') params.connectionId = accountId;

      const [statsRes, insightsRes, recentRes] = await Promise.allSettled([
        api.getDashboard(params),
        api.getBehavioralInsights(startDate ? { startDate } : {}),
        api.getJournalTrades({
          limit: 8,
          sortBy: 'openedAt',
          sortOrder: 'desc',
          ...(startDate ? { startDate } : {}),
          ...(accountId && accountId !== 'all' ? { brokerConnectionId: accountId } : {}),
        }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
        const d = statsRes.value.data as any;
        setStats(d?.stats ?? d as DashboardStats);
        const rawEquity = d?.equityCurve ?? d?.equity ?? [];
        setEquityData(Array.isArray(rawEquity) ? rawEquity : []);
        if (Array.isArray(d?.connections)) setConnections(d.connections);
        if (d?.blendedPortfolio) setBlendedPortfolio(d.blendedPortfolio);
      } else {
        setStats({
          totalTrades: 0,
          closedTrades: 0,
          openTrades: 0,
          winRate: 0,
          profitFactor: 0,
          totalNetPnl: 0,
          totalGrossPnl: 0,
          totalFees: 0,
          totalWins: 0,
          totalLosses: 0,
          avgWin: 0,
          avgLoss: 0,
          bestTrade: 0,
          worstTrade: 0,
          avgRRatio: 0,
          emotionsBreakdown: {},
          pnlByDay: [],
        } as any);
      }
      if (insightsRes.status === 'fulfilled' && insightsRes.value?.success) {
        const raw = (insightsRes.value.data as any)?.insights ?? insightsRes.value.data ?? [];
        setInsights(Array.isArray(raw) ? raw.slice(0, 3) : []);
      }
      if (recentRes.status === 'fulfilled' && recentRes.value?.success) {
        const raw = (recentRes.value.data as any) ?? [];
        const items = Array.isArray(raw) ? raw : (raw as any)?.trades ?? [];
        const mapped: TradeSummary[] = items.slice(0, 8).map((t: any) => ({
          symbol: t.tradingsymbol || t.symbol || 'Unknown',
          direction: t.direction || 'LONG',
          pnl: Number(t.netPnl ?? t.grossPnl ?? 0),
          date: t.closedAt || t.openedAt || t.executionTimestamp || new Date().toISOString(),
          status: t.status || 'CLOSED',
        }));
        setRecentTrades(mapped);
      }

      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      if (showToast) toast.success('Dashboard refreshed');
    } catch {
      if (showToast) toast.error('Failed to refresh');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const hasData = stats && (
    (stats.totalTrades ?? 0) > 0 ||
    equityData.length > 0 ||
    recentTrades.length > 0
  );

  // Build sparkline from equity curve (last 7 points)
  const sparkline7 = equityData.slice(-7).map((p) => ({ value: (p as any).cumulativePnl ?? (p as any).pnl ?? 0 }));

  const netPnl         = stats?.totalNetPnl ?? 0;
  const rawWinRate     = stats?.winRate ?? 0;
  const winRatePercent = rawWinRate <= 1 && rawWinRate > 0 ? rawWinRate * 100 : rawWinRate;
  const profitFactor   = stats?.profitFactor ?? 0;
  const totalTrades    = stats?.totalTrades ?? 0;
  const closedTrades   = stats?.closedTrades ?? totalTrades;
  const totalWins      = stats?.totalWins ?? 0;
  const totalLosses    = stats?.totalLosses ?? 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Hero greeting row ─────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground leading-tight">
            {getGreeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{formatDate()}</span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5">
              <LiveDot size="sm" />
              <span className="text-success font-medium">Market Live</span>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Account / Portfolio Switcher */}
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedAccountId(nextId);
                fetchDashboard(false, timeframe, nextId);
              }}
              className="appearance-none pl-8 pr-8 py-1.5 rounded-xl bg-card hover:bg-accent border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer transition-colors"
            >
              <option value="all">
                ⚡ All Accounts Blended ({connections.length > 0 ? connections.length : 'All'})
              </option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || c.brokerId.toUpperCase()} ({c.brokerClientId})
                </option>
              ))}
            </select>
            <Layers className="w-3.5 h-3.5 text-primary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Pre-market / debrief shortcuts */}
          <button
            onClick={() => setPremarketOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            Pre-market
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-eod-review'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/25 text-sm font-semibold text-primary transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            EOD Wrap-Up
          </button>
          <button
            onClick={() => setDebriefOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Daily Debrief
          </button>
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-brand text-white text-sm font-semibold shadow-brand hover:opacity-90 transition-opacity disabled:opacity-60"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Multi-Account Blended Portfolio Aggregator ── */}
      {blendedPortfolio && connections.length > 1 && (
        <div className="p-3.5 rounded-2xl glass-card border border-border/60 flex items-center justify-between gap-4 flex-wrap text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-foreground flex items-center gap-2">
                <span>Multi-Account Blended Portfolio</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30">
                  {connections.length} Accounts Synchronized
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>Combined Buying Power: <strong className="text-foreground">{format(blendedPortfolio.totalEquity || blendedPortfolio.totalCash || 0)}</strong></span>
                <span>·</span>
                <span>Margin Used: <strong className="text-foreground">{format(blendedPortfolio.totalMarginUsed || 0)}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">Daily VaR (95%)</span>
              <span className="font-mono font-bold text-foreground">
                {blendedPortfolio.dailyVaR95 > 0 ? `-${format(blendedPortfolio.dailyVaR95)}` : 'Safe'}
              </span>
            </div>
            <Link
              href="/dashboard/brokers"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/80 border border-border text-xs font-semibold text-foreground transition-all"
            >
              <span>Manage Accounts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Zero-Data 3-Step Quick Start Onboarding ── */}
      {!hasData && !loading && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Welcome to TradeMind</span>
              </div>
              <h2 className="text-lg font-bold text-foreground">Get Started in 3 Simple Steps</h2>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Connect your Indian broker or import historical trades to unlock live institutional analytics, equity curves, MFE/MAE analysis, and AI behavioral coaching.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/dashboard/brokers"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-xs font-semibold shadow-brand hover:opacity-90 transition-opacity"
              >
                <Plug className="w-4 h-4" />
                Connect Broker
              </Link>
              <Link
                href="/dashboard/brokers/import"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent/80 border border-border text-xs font-semibold text-foreground transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                Import CSV
              </Link>
              <Link
                href="/dashboard/trades"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent/80 border border-border text-xs font-semibold text-foreground transition-all"
              >
                <Plus className="w-4 h-4" />
                Log Manual Trade
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Strip ─────────────────────────────── */}
      {loading ? (
        <SkeletonStatRow count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Net P&L"
            value={format(netPnl)}
            icon={DollarSign}
            gradient={netPnl >= 0 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-500'}
            trend={{ value: 0, positive: netPnl >= 0, label: 'this period' }}
            sparkline={sparkline7}
            valueClassName={cn('font-mono', netPnl >= 0 ? 'text-profit' : 'text-loss')}
          />
          <StatCard
            label="Win Rate"
            value={`${winRatePercent.toFixed(1)}%`}
            icon={Trophy}
            gradient="from-blue-500 to-violet-500"
            subValue={`${totalWins}W / ${totalLosses}L of ${closedTrades} closed`}
            sparkline={sparkline7}
          />
          <StatCard
            label="Profit Factor"
            value={isFinite(profitFactor) && profitFactor > 0 ? profitFactor.toFixed(2) : profitFactor === Infinity ? '∞' : '—'}
            icon={Activity}
            gradient="from-violet-500 to-purple-500"
            subValue={profitFactor >= 1.5 ? 'Excellent' : profitFactor >= 1 ? 'Good' : 'Needs work'}
          />
          <StatCard
            label="Total Trades"
            value={totalTrades.toString()}
            icon={BarChart3}
            gradient="from-orange-500 to-amber-500"
            subValue={stats?.openTrades ? `${closedTrades} closed · ${stats.openTrades} open` : `Avg R:R ${(stats?.avgRRatio ?? 0).toFixed(2)}`}
          />
        </div>
      )}

      {/* ── Risk + Market status row ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MarketSessionStatus />
        <RiskKillSwitchWidget />
      </div>

      {/* ── Main 2-col: Equity + Side panel ──────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Equity curve / Live Terminal — 2/3 */}
        <div className="xl:col-span-2">
          <SectionCard
            title={mainViewMode === 'equity' ? 'Equity Curve' : 'Live Market Terminal'}
            badge={
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => setMainViewMode('equity')}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                    mainViewMode === 'equity'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Equity
                </button>
                <button
                  type="button"
                  onClick={() => setMainViewMode('terminal')}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
                    mainViewMode === 'terminal'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Terminal</span>
                </button>
              </div>
            }
            icon={mainViewMode === 'equity' ? TrendingUp : BarChart3}
            iconGradient="from-blue-500 to-violet-500"
            headerRight={
              mainViewMode === 'equity' ? (
                <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150',
                        timeframe === tf
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 hidden sm:inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>Real-Time Stream</span>
                  </span>
                  <Link
                    href="/dashboard/replay"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Full Replay</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )
            }
            noPadding
            bodyClassName="px-3 sm:px-4 pb-4 pt-2"
          >
            {mainViewMode === 'equity' ? (
              loading ? (
                <div className="skeleton h-52 rounded-xl" />
              ) : equityData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">No trade data yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Connect a broker or log your first trade</p>
                  </div>
                  <Link
                    href="/dashboard/brokers"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-brand text-white text-xs font-semibold shadow-brand hover:opacity-90 transition-opacity"
                  >
                    <Plug className="w-3.5 h-3.5" />
                    Connect Broker
                  </Link>
                </div>
              ) : (
                <EquityCurve data={equityData} height={220} />
              )
            ) : (
              <div className="space-y-3 pt-1">
                {/* Benchmark selector pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  {DASHBOARD_TERMINAL_PRESETS.map((preset) => (
                    <button
                      key={preset.symbol}
                      onClick={() => setTerminalSymbol(preset.symbol)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer',
                        terminalSymbol === preset.symbol
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span className="text-[11px]">{preset.badge}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>

                {/* TradingView Live Terminal Widget */}
                <div className="w-full h-[380px] sm:h-[440px] rounded-xl overflow-hidden border border-border/40 bg-zinc-950">
                  <TradingViewLiveWidget
                    symbol={terminalSymbol}
                    height="100%"
                    interval="5"
                    allowSymbolChange={true}
                  />
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right panel — 1/3 */}
        <div className="flex flex-col gap-4">
          {/* AI Insights */}
          <SectionCard
            title="AI Insights"
            icon={Sparkles}
            iconGradient="from-violet-500 to-pink-500"
            badge={insights.length > 0 ? <Badge variant="brand" size="xs">{insights.length}</Badge> : undefined}
            headerRight={
              <Link href="/dashboard/insights" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            }
          >
            {loading ? (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
            ) : insights.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Start trading to unlock AI behavioral insights.
              </p>
            ) : (
              <div className="space-y-2">
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-2.5 p-3 rounded-xl border text-xs',
                      SEVERITY_COLORS[insight.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.medium,
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight capitalize">{String(insight.emotion ?? 'Insight')}</p>
                      <p className="opacity-80 mt-0.5 leading-snug line-clamp-2">{insight.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Quick Actions */}
          {!hasData && (
            <SectionCard title="Get Started" icon={Zap} iconGradient="from-amber-500 to-orange-500">
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex flex-col gap-2 p-3 rounded-xl bg-muted hover:bg-accent border border-border hover:border-primary/20 transition-all group"
                  >
                    <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center', action.gradient)}>
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{action.label}</p>
                      <p className="text-[0.625rem] text-muted-foreground leading-tight">{action.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Risk Guard */}
          <RiskGuard />
        </div>
      </div>

      {/* ── Bottom grid: Trades + Stats ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Trades */}
        <SectionCard
          title="Recent Trades"
          icon={Activity}
          iconGradient="from-teal-500 to-cyan-500"
          headerRight={
            <Link href="/dashboard/trades" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              All trades <ChevronRight className="w-3 h-3" />
            </Link>
          }
          noPadding
          bodyClassName="px-5 pb-4 pt-2"
        >
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
            </div>
          ) : recentTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <BookOpen className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No trades recorded yet</p>
              <Link
                href="/dashboard/trades"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Log first trade <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTrades.map((trade, i) => {
                const isProfit = trade.pnl >= 0;
                const d = new Date(trade.date);
                const dateLabel = isNaN(d.getTime())
                  ? 'Recent'
                  : `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                return (
                  <Link
                    key={i}
                    href="/dashboard/trades"
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                        isProfit ? 'bg-profit-subtle' : 'bg-loss-subtle',
                      )}>
                        {isProfit
                          ? <TrendingUp className="w-3.5 h-3.5 text-profit" />
                          : <TrendingUp className="w-3.5 h-3.5 text-loss rotate-180" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                          {trade.symbol}
                        </p>
                        <p className="text-[0.625rem] text-muted-foreground flex items-center gap-1.5 leading-tight mt-0.5">
                          <span className={cn(
                            'px-1 py-0.2 rounded text-[0.6rem] font-bold tracking-wider uppercase',
                            trade.direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500',
                          )}>
                            {trade.direction}
                          </span>
                          <span>{dateLabel}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn(
                        'text-xs font-bold font-mono',
                        isProfit ? 'text-profit' : 'text-loss',
                      )}>
                        {isProfit ? '+' : ''}{format(trade.pnl)}
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Performance summary */}
        <SectionCard
          title="Performance"
          icon={BarChart3}
          iconGradient="from-violet-500 to-indigo-500"
        >
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-8 rounded-lg" />)}
            </div>
          ) : !stats ? (
            <p className="text-xs text-muted-foreground text-center py-6">No performance data</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Best Trade',    value: format(stats.bestTrade ?? 0),   positive: true },
                { label: 'Worst Trade',   value: format(stats.worstTrade ?? 0),  positive: false },
                { label: 'Avg R:R',       value: (stats.avgRRatio ?? 0).toFixed(2),       positive: (stats.avgRRatio ?? 0) >= 1 },
                { label: 'Total Fees',    value: format(stats.totalFees ?? 0),   positive: false },
                { label: 'Max Drawdown',  value: format(stats.maxDrawdown ?? 0), positive: false },
                { label: 'Sharpe Ratio',  value: (stats.sharpeRatio ?? 0).toFixed(2),    positive: (stats.sharpeRatio ?? 0) >= 1 },
              ].map(({ label, value, positive }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <div className="flex-1 mx-3">
                    <div className="h-px bg-border/50" />
                  </div>
                  <span className={cn(
                    'text-xs font-semibold font-mono',
                    positive ? 'text-profit' : 'text-loss',
                  )}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Behavioral tools ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BehavioralShield />
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground font-display">Trading Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Pre-market Routine', icon: Clock,          onClick: () => setPremarketOpen(true), gradient: 'from-blue-500 to-indigo-500' },
              { label: 'Daily Debrief',      icon: Sparkles,       onClick: () => setDebriefOpen(true),   gradient: 'from-violet-500 to-purple-500' },
              { label: 'Review Trade',       icon: CheckCircle2,   onClick: () => setReviewOpen(true),    gradient: 'from-emerald-500 to-teal-500' },
              { label: 'View Journal',       icon: BookOpen,       href: '/dashboard/journal',            gradient: 'from-orange-500 to-amber-500' },
            ].map((item) => (
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-muted hover:bg-accent border border-border hover:border-primary/20 transition-all text-xs font-medium text-foreground"
                >
                  <div className={cn('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', item.gradient)}>
                    <item.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-muted hover:bg-accent border border-border hover:border-primary/20 transition-all text-xs font-medium text-foreground text-left"
                >
                  <div className={cn('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', item.gradient)}>
                    <item.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  {item.label}
                </button>
              )
            ))}
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────── */}
      <PremarketRoutineModal
        isOpen={premarketOpen}
        onClose={() => setPremarketOpen(false)}
      />
      {/* DailyDebrief renders inline — show conditionally via className */}
      {debriefOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDebriefOpen(false)}>
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <DailyDebrief />
          </div>
        </div>
      )}
      <ReviewSubmitModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSubmitted={() => fetchDashboard(true)}
      />
    </div>
  );
}
