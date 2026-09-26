// ──────────────────────────────────────────────
// TradeMind — Trades & Positions Page
//
// Dual-mode interface:
// 1. "Completed Trades (Buy ➔ Sell / Sell ➔ Buy)"
//    Full round-trip positions with realized P&L,
//    entry/exit prices, win/loss status, duration,
//    and constituent execution fill drill-down!
// 2. "Raw Broker Fills (Executions)"
//    Direct fill-by-fill broker execution logs.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Loader2,
  SlidersHorizontal,
  PlayCircle,
  Activity,
  BarChart2,
  ArrowLeftRight,
  Share2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { Pagination } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/Toast';
import { TradeCandleModal } from '@/components/chart/TradeCandleModal';
import { TradeComparisonModal } from '@/components/chart/TradeComparisonModal';
import { BrandedShareCardModal } from '@/components/social/BrandedShareCardModal';
import { TradeAutopsyModal } from '@/components/ai/TradeAutopsyModal';
import { TradeExportModal } from '@/components/trades/TradeExportModal';
import { AskTradeMindQueryBar } from '@/components/trades/AskTradeMindQueryBar';
import { MultimodalChartVisionModal } from '@/components/chart/MultimodalChartVisionModal';
import type { DashboardStats } from '@trademind/shared';

interface TradeExecution {
  id: string;
  tradingsymbol: string;
  transactionType: string;
  quantity: number;
  executionPrice: number;
  executionTimestamp: string;
  exchange: string;
  segment: string;
  totalCharges: number;
  netPnl?: number;
  grossPnl?: number;
  currency?: string;
}

interface JournalTradeItem {
  id: string;
  tradingsymbol: string;
  exchange: string;
  assetClass: string;
  direction: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED' | 'PARTIALLY_CLOSED';
  totalQuantity: number;
  avgEntryPrice: number;
  avgExitPrice?: number | null;
  grossPnl: number;
  totalFeesAndTaxes: number;
  netPnl: number;
  holdingPeriodMinutes?: number | null;
  openedAt: string;
  closedAt?: string | null;
  currency?: string;
  executions?: TradeExecution[];
}

const SEGMENT_OPTIONS = ['ALL', 'NSE_EQ', 'NSE_FO', 'BSE_EQ', 'BSE_FO', 'MCX', 'CDS', 'CRYPTO', 'US_EQUITY', 'FOREX'];
const PAGE_SIZE = 25;

export default function TradesPage() {
  const { format, currency: activeCurrency } = useCurrency();
  const [viewMode, setViewMode] = useState<'closed' | 'executions'>('closed');
  const [search, setSearch]     = useState('');
  const [segment, setSegment]   = useState('ALL');
  const [direction, setDirection] = useState<'ALL' | 'LONG' | 'SHORT' | 'BUY' | 'SELL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WON' | 'LOST' | 'OPEN'>('ALL');

  // Completed trades state
  const [journalTrades, setJournalTrades] = useState<JournalTradeItem[]>([]);
  const [expandedTradeIds, setExpandedTradeIds] = useState<Set<string>>(new Set());

  // Raw executions state
  const [executions, setExecutions] = useState<TradeExecution[]>([]);

  // Summary stats
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [sortKey, setSortKey]     = useState<string>('openedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedChartTrade, setSelectedChartTrade]     = useState<any | null>(null);
  const [selectedAutopsyTrade, setSelectedAutopsyTrade] = useState<any | null>(null);
  const [compareTradeA, setCompareTradeA]               = useState<any | null>(null);
  const [compareOpen, setCompareOpen]                   = useState(false);
  const [selectedShareTrade, setSelectedShareTrade]     = useState<any | null>(null);
  const [exportModalOpen, setExportModalOpen]           = useState(false);
  const [visionModalOpen, setVisionModalOpen]           = useState(false);
  const [aiFilteredTrades, setAiFilteredTrades]         = useState<JournalTradeItem[] | null>(null);

  useEffect(() => {
    document.title = viewMode === 'closed'
      ? 'Completed Trades & Positions — TradeMind'
      : 'Raw Trade Executions — TradeMind';
  }, [viewMode]);

  useEffect(() => {
    fetchData();
  }, [viewMode, page, segment, direction, statusFilter, sortKey, sortOrder]);

  useEffect(() => {
    const handleBrokerSynced = () => {
      fetchData();
    };
    window.addEventListener('broker-synced', handleBrokerSynced);
    return () => window.removeEventListener('broker-synced', handleBrokerSynced);
  }, [viewMode, page, segment, direction, statusFilter, sortKey, sortOrder]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch dashboard overview stats once for top metric pills
      api.getDashboard().then((res) => {
        if (res.success && res.data) {
          setStats(res.data as DashboardStats);
        }
      }).catch(() => {});

      if (viewMode === 'closed') {
        const params: Record<string, string | number | undefined> = {
          limit: PAGE_SIZE,
          page,
          sortBy: sortKey === 'executionTimestamp' ? 'openedAt' : sortKey,
          sortOrder,
        };
        if (segment !== 'ALL') params.assetClass = segment;
        if (direction === 'LONG' || direction === 'SHORT') params.direction = direction;
        if (statusFilter === 'OPEN') params.status = 'OPEN';
        if (statusFilter === 'WON' || statusFilter === 'LOST') params.status = 'CLOSED';

        const res = await api.getJournalTrades(params);
        if (res.success) {
          let list = (res.data as JournalTradeItem[]) ?? [];
          if (statusFilter === 'WON') {
            list = list.filter((t) => t.netPnl > 0);
          } else if (statusFilter === 'LOST') {
            list = list.filter((t) => t.netPnl < 0);
          }
          setJournalTrades(list);
          setTotal(res.total ?? list.length);
        }
      } else {
        const params: Record<string, string | number | undefined> = {
          limit: PAGE_SIZE,
          page,
          sortBy: sortKey === 'openedAt' ? 'executionTimestamp' : sortKey,
          sortOrder,
        };
        if (segment !== 'ALL') params.segment = segment;
        if (direction === 'BUY' || direction === 'SELL') params.transactionType = direction;

        const res = await api.getTrades(params);
        if (res.success) {
          setExecutions((res.data as TradeExecution[]) ?? []);
          setTotal(res.total ?? 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch trades data:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (viewMode === 'closed') {
        await api.exportJournalCsv();
      } else {
        await api.exportTradesCsv();
      }
      toast.success('CSV exported successfully');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((o) => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const filteredClosed: JournalTradeItem[] = useMemo(() => {
    const base: JournalTradeItem[] = aiFilteredTrades !== null ? aiFilteredTrades : journalTrades;
    return base.filter((t: JournalTradeItem) =>
      t.tradingsymbol.toLowerCase().includes(search.toLowerCase()),
    );
  }, [aiFilteredTrades, journalTrades, search]);

  const filteredExecutions = executions.filter((t) =>
    t.tradingsymbol.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function formatHoldTime(minutes?: number | null): string {
    if (minutes === undefined || minutes === null) return '—';
    if (minutes < 1) return '< 1m';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  const netPnlTotal = stats?.totalNetPnl ?? 0;
  const winRateRaw  = stats?.winRate ?? 0;
  const winRateVal  = winRateRaw <= 1 && winRateRaw > 0 ? winRateRaw * 100 : winRateRaw;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Trade Log & Positions"
        description="Monitor completed positions (Buy ➔ Sell / Sell ➔ Buy) with real P&L and broker fill drilldowns"
        icon={Layers}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl border border-border hover:bg-accent transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={() => {
                const sample = viewMode === 'closed' ? journalTrades[0] : executions[0];
                setCompareTradeA(sample || null);
                setCompareOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border hover:bg-accent text-sm font-semibold transition-colors shadow-sm"
              title="Side-by-Side Trade Comparison Studio"
            >
              <ArrowLeftRight className="w-4 h-4 text-purple-400" />
              Compare Studio
            </button>
            <button
              onClick={() => setVisionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-sm font-semibold transition-all shadow-sm cursor-pointer"
              title="Open Multimodal AI Chart Vision Inspector"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>AI Chart Vision</span>
            </button>
            <button
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-accent text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              title="Export filtered trades into CSV, TSV, or JSON"
            >
              <Download className="w-4 h-4 text-violet-400" />
              <span>Export Ledger</span>
            </button>
          </div>
        }
      />

      {/* ── Summary Metrics Bar ─────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Net Realized P&L</span>
            <span className={cn('w-2 h-2 rounded-full', netPnlTotal >= 0 ? 'bg-emerald-500' : 'bg-rose-500')} />
          </div>
          <div className="mt-2">
            <span className={cn('text-xl sm:text-2xl font-bold font-mono', netPnlTotal >= 0 ? 'text-profit' : 'text-loss')}>
              {netPnlTotal >= 0 ? '+' : ''}{format(netPnlTotal)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Gross: {format(stats?.totalGrossPnl ?? 0)}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Win Rate</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted">
              {stats?.totalWins ?? 0}W / {stats?.totalLosses ?? 0}L
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {winRateVal.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {stats?.closedTrades ?? stats?.totalTrades ?? 0} completed trades
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Best Trade</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-profit">
              +{format(stats?.bestTrade ?? 0)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Worst: {format(stats?.worstTrade ?? 0)}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Brokerage & Charges</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {format(stats?.totalFees ?? 0)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Taxes, STT & exchange fees
          </p>
        </div>
      </div>

      {/* ── Segmented Tab Switcher (The core answer to Single Trade vs Raw Fills) ──────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/60">
          <button
            type="button"
            onClick={() => {
              setViewMode('closed');
              setPage(1);
              setSortKey('openedAt');
            }}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all',
              viewMode === 'closed'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Layers className="w-4 h-4 text-primary" />
            <span>Closed Trades (Buy ➔ Sell)</span>
            <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
              {stats?.totalTrades ?? journalTrades.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('executions');
              setPage(1);
              setSortKey('executionTimestamp');
            }}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all',
              viewMode === 'executions'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span>Raw Broker Fills (Executions)</span>
            <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
              {total > 0 && viewMode === 'executions' ? total : '39'}
            </span>
          </button>
        </div>

        {viewMode === 'closed' && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Click any trade row to view constituent execution fills</span>
          </div>
        )}
      </div>

      {/* ── "Ask TradeMind" Natural Language Query Engine ── */}
      {viewMode === 'closed' && (
        <AskTradeMindQueryBar
          trades={journalTrades}
          onFilteredTradesChange={(filtered, predicate) => {
            if (predicate) {
              setAiFilteredTrades(filtered);
            } else {
              setAiFilteredTrades(null);
            }
          }}
        />
      )}

      {/* ── Filter Controls ─────────────────────── */}
      <div className="glass-card rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-1 items-center gap-3 flex-wrap w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search symbol (e.g. OFSS, PAYTM)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Segment */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <select
              value={segment}
              onChange={(e) => { setSegment(e.target.value); setPage(1); }}
              className="text-sm px-3 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SEGMENT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status / Direction Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === 'closed' && (
            <div className="flex items-center rounded-xl p-0.5 bg-muted/60 border border-border/60 text-xs">
              {(['ALL', 'WON', 'LOST', 'OPEN'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setPage(1); }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-medium transition-all text-xs',
                    statusFilter === st
                      ? st === 'WON' ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                        : st === 'LOST' ? 'bg-rose-500/20 text-rose-400 font-bold'
                        : st === 'OPEN' ? 'bg-amber-500/20 text-amber-400 font-bold'
                        : 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center rounded-xl p-0.5 bg-muted/60 border border-border/60 text-xs">
            {(viewMode === 'closed' ? ['ALL', 'LONG', 'SHORT'] : ['ALL', 'BUY', 'SELL']).map((d) => (
              <button
                key={d}
                onClick={() => { setDirection(d as any); setPage(1); }}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition-all text-xs',
                  direction === d
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Data View ─────────────────────── */}
      {loading ? (
        <SkeletonTable rows={8} cols={viewMode === 'closed' ? 8 : 7} />
      ) : (viewMode === 'closed' ? filteredClosed.length === 0 : filteredExecutions.length === 0) ? (
        <div className="glass-card rounded-2xl">
          <EmptyState
            icon={TrendingUp}
            title={viewMode === 'closed' ? 'No completed trades found' : 'No executions found'}
            description="Your broker sync has recorded 0 trades matching the current filter."
            action={{ label: 'Manage Brokers', href: '/dashboard/brokers' }}
          />
        </div>
      ) : viewMode === 'closed' ? (
        /* ════════════════════════════════════════════════════════════════
           TAB 1: COMPLETED TRADES (Buy ➔ Sell / Sell ➔ Buy)
           ════════════════════════════════════════════════════════════════ */
        <div className="glass-card rounded-2xl overflow-hidden border border-border/60">
          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-border/30">
            {filteredClosed.map((trade) => {
              const isWon = trade.status === 'CLOSED' && trade.netPnl > 0;
              const isLost = trade.status === 'CLOSED' && trade.netPnl < 0;
              const isOpen = trade.status === 'OPEN';
              const isExpanded = expandedTradeIds.has(trade.id);

              return (
                <div key={trade.id} className="p-4 space-y-3 hover:bg-accent/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpand(trade.id)}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <Link
                        href={`/dashboard/trades/${trade.id}`}
                        className="font-bold text-foreground text-sm font-mono hover:text-primary transition-colors hover:underline"
                      >
                        {trade.tradingsymbol}
                      </Link>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                        {trade.exchange}
                      </span>
                    </div>

                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold',
                        isWon ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : isLost ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
                      )}
                    >
                      {isWon && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {isLost && <XCircle className="w-3 h-3 text-rose-400" />}
                      {isOpen && <Clock className="w-3 h-3 text-amber-400" />}
                      {isWon ? 'WON' : isLost ? 'LOST' : 'OPEN'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-accent/30 text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Entry ➔ Exit</div>
                      <div className="font-semibold text-foreground font-mono mt-0.5 text-[11px]">
                        {format(trade.avgEntryPrice)} ➔ {trade.avgExitPrice ? format(trade.avgExitPrice) : 'Open'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Qty · Duration</div>
                      <div className="font-semibold text-foreground font-mono mt-0.5 text-[11px]">
                        {trade.totalQuantity} · {formatHoldTime(trade.holdingPeriodMinutes)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Net Realized P&L</div>
                      <div className={cn(
                        'font-bold font-mono mt-0.5 text-xs',
                        trade.netPnl > 0 ? 'text-profit' : trade.netPnl < 0 ? 'text-loss' : 'text-muted-foreground',
                      )}>
                        {trade.netPnl >= 0 ? `+${format(trade.netPnl)}` : format(trade.netPnl)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Constituent Fills (Mobile) */}
                  {isExpanded && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2 animate-fade-in">
                      <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-primary" />
                        <span>Execution Fills for this Position</span>
                      </div>
                      {trade.executions && trade.executions.length > 0 ? (
                        <div className="space-y-1.5 divide-y divide-border/20">
                          {trade.executions.map((fill, idx) => (
                            <div key={fill.id || idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  'px-1.5 py-0.2 rounded font-bold text-[10px]',
                                  fill.transactionType === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400',
                                )}>
                                  {fill.transactionType}
                                </span>
                                <span className="font-mono">{fill.quantity} @ {format(fill.executionPrice)}</span>
                              </div>
                              <div className="text-muted-foreground font-mono text-[10px]">
                                {formatDate(fill.executionTimestamp)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          1 Fill recorded (Entry @ {format(trade.avgEntryPrice)})
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground text-[11px]">
                      {formatDate(trade.openedAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedAutopsyTrade(trade)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs font-semibold transition-colors"
                        title="1-Click AI Trade Autopsy"
                      >
                        <Sparkles className="w-3 h-3 text-pink-400" />
                        Autopsy
                      </button>
                      <Link
                        href={`/dashboard/trades/${trade.id}/replay`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold transition-colors"
                      >
                        <PlayCircle className="w-3 h-3" />
                        Replay
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/40">
                  <th className="w-10 px-3 py-3 text-center text-muted-foreground"></th>
                  <th
                    onClick={() => handleSort('tradingsymbol')}
                    className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left cursor-pointer hover:text-foreground select-none"
                  >
                    Symbol / Instrument
                    {sortKey === 'tradingsymbol' && <span className="ml-1 text-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">
                    Side
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    Entry ➔ Exit
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    Charges
                  </th>
                  <th
                    onClick={() => handleSort('netPnl')}
                    className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right cursor-pointer hover:text-foreground select-none"
                  >
                    Net P&L
                    {sortKey === 'netPnl' && <span className="ml-1 text-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    Hold Time
                  </th>
                  <th
                    onClick={() => handleSort('openedAt')}
                    className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left cursor-pointer hover:text-foreground select-none"
                  >
                    Time / Date
                    {sortKey === 'openedAt' && <span className="ml-1 text-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClosed.map((trade, i) => {
                  const isWon = trade.status === 'CLOSED' && trade.netPnl > 0;
                  const isLost = trade.status === 'CLOSED' && trade.netPnl < 0;
                  const isOpen = trade.status === 'OPEN';
                  const isExpanded = expandedTradeIds.has(trade.id);

                  return (
                    <React.Fragment key={trade.id}>
                      <tr
                        className={cn(
                          'border-b border-border/30 last:border-0 transition-colors hover:bg-accent/40 cursor-pointer',
                          i % 2 === 1 && !isExpanded && 'bg-muted/15',
                          isExpanded && 'bg-accent/30',
                        )}
                        onClick={() => toggleExpand(trade.id)}
                      >
                        <td className="px-3 py-3.5 text-center text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-primary inline" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground inline" />
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/trades/${trade.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-primary transition-colors hover:underline inline-flex items-center gap-1 font-bold font-mono"
                              title="View Trade Deep-Dive"
                            >
                              {trade.tradingsymbol}
                            </Link>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-semibold">
                              {trade.exchange}
                            </span>
                            {trade.assetClass && (
                              <span className="text-[9px] px-1 py-0.2 rounded border border-border/50 text-muted-foreground font-mono">
                                {trade.assetClass}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold',
                              trade.direction === 'LONG'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400',
                            )}
                          >
                            {trade.direction === 'LONG' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {trade.direction}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide',
                              isWon ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                : isLost ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
                            )}
                          >
                            {isWon && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            {isLost && <XCircle className="w-3 h-3 text-rose-400" />}
                            {isOpen && <Clock className="w-3 h-3 text-amber-400" />}
                            {isWon ? 'WON' : isLost ? 'LOST' : 'OPEN'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right font-medium tabular-nums font-mono">
                          {trade.totalQuantity.toLocaleString()}
                        </td>

                        <td className="px-4 py-3.5 text-right tabular-nums font-mono text-xs">
                          <div className="flex items-center justify-end gap-1.5">
                            <span>{format(trade.avgEntryPrice)}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className={trade.avgExitPrice ? 'text-foreground font-semibold' : 'text-muted-foreground italic'}>
                              {trade.avgExitPrice ? format(trade.avgExitPrice) : 'Open'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums font-mono text-xs">
                          {format(trade.totalFeesAndTaxes)}
                        </td>

                        <td className={cn(
                          'px-4 py-3.5 text-right font-bold tabular-nums font-mono text-sm',
                          trade.netPnl > 0 ? 'text-profit'
                            : trade.netPnl < 0 ? 'text-loss'
                            : 'text-muted-foreground',
                        )}>
                          {trade.netPnl >= 0 ? `+${format(trade.netPnl)}` : format(trade.netPnl)}
                        </td>

                        <td className="px-4 py-3.5 text-center text-xs text-muted-foreground font-mono">
                          {formatHoldTime(trade.holdingPeriodMinutes)}
                        </td>

                        <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                          {formatDate(trade.openedAt)}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedAutopsyTrade(trade)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs font-semibold transition-colors"
                              title="1-Click AI Trade Autopsy & Execution Leak Diagnosis"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                              Autopsy
                            </button>
                            <button
                              onClick={() => setSelectedChartTrade(trade)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold transition-colors"
                              title="View Candlestick Chart"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                              Chart
                            </button>
                            <button
                              onClick={() => {
                                setCompareTradeA(trade);
                                setCompareOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-semibold transition-colors"
                              title="Compare with another trade"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                              Compare
                            </button>
                            <button
                              onClick={() => setSelectedShareTrade(trade)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-colors"
                              title="Generate Branded Share Card"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              Share
                            </button>
                            <Link
                              href={`/dashboard/trades/${trade.id}/replay`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold transition-colors"
                              title="Visual Candlestick Replay"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              Replay
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expandable Execution Fills Drawer ────────── */}
                      {isExpanded && (
                        <tr className="bg-accent/20 border-b border-border/40">
                          <td colSpan={11} className="px-6 py-4">
                            <div className="rounded-xl border border-border/60 bg-background/80 p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-primary" />
                                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    Constituent Broker Order Fills (Single Trade Lifecycle: Buy ➔ Sell)
                                  </h4>
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  Total Fills: {trade.executions?.length ?? 0} · Realized Net: <strong className={trade.netPnl >= 0 ? 'text-profit' : 'text-loss'}>{trade.netPnl >= 0 ? '+' : ''}{format(trade.netPnl)}</strong>
                                </div>
                              </div>

                              {trade.executions && trade.executions.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground border-b border-border/30">
                                        <th className="py-1.5 text-left font-semibold">Leg #</th>
                                        <th className="py-1.5 text-left font-semibold">Action</th>
                                        <th className="py-1.5 text-right font-semibold">Quantity</th>
                                        <th className="py-1.5 text-right font-semibold">Fill Price</th>
                                        <th className="py-1.5 text-right font-semibold">Total Turn</th>
                                        <th className="py-1.5 text-right font-semibold">Charges</th>
                                        <th className="py-1.5 text-left font-semibold pl-4">Execution Time (IST)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20 font-mono">
                                      {trade.executions.map((fill, fIdx) => (
                                        <tr key={fill.id || fIdx} className="hover:bg-muted/30">
                                          <td className="py-2 text-muted-foreground">Fill {fIdx + 1}</td>
                                          <td className="py-2">
                                            <span className={cn(
                                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold',
                                              fill.transactionType === 'BUY'
                                                ? 'bg-emerald-500/15 text-emerald-400'
                                                : 'bg-rose-500/15 text-rose-400',
                                            )}>
                                              {fill.transactionType === 'BUY' ? 'BUY' : 'SELL'}
                                            </span>
                                          </td>
                                          <td className="py-2 text-right">{fill.quantity.toLocaleString()}</td>
                                          <td className="py-2 text-right font-semibold text-foreground">{format(fill.executionPrice)}</td>
                                          <td className="py-2 text-right text-muted-foreground">{format(fill.quantity * fill.executionPrice)}</td>
                                          <td className="py-2 text-right text-muted-foreground">{format(fill.totalCharges)}</td>
                                          <td className="py-2 text-left pl-4 text-muted-foreground">{formatDate(fill.executionTimestamp)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic py-2">
                                  No split fills found for this trade; executed as a single block fill.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════
           TAB 2: RAW BROKER EXECUTIONS (Fills)
           ════════════════════════════════════════════════════════════════ */
        <div className="glass-card rounded-2xl overflow-hidden border border-border/60">
          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-border/30">
            {filteredExecutions.map((trade) => {
              const isBuy = trade.transactionType === 'BUY';
              return (
                <div key={trade.id} className="p-4 space-y-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/trades/${trade.id}`}
                        className="font-bold text-foreground text-sm font-mono hover:text-primary transition-colors hover:underline"
                        title="View Trade Details"
                      >
                        {trade.tradingsymbol}
                      </Link>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                        {trade.exchange}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold',
                        isBuy
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-500/10 text-red-700 dark:text-red-400',
                      )}
                    >
                      {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {trade.transactionType}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-accent/30 text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Qty</div>
                      <div className="font-semibold text-foreground font-mono mt-0.5">{trade.quantity.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Price</div>
                      <div className="font-semibold text-foreground font-mono mt-0.5">{format(trade.executionPrice, trade.currency)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Charges</div>
                      <div className="font-semibold text-muted-foreground font-mono mt-0.5">
                        {format(trade.totalCharges, trade.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground text-[11px]">
                      {formatDate(trade.executionTimestamp)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/dashboard/trades/${trade.id}/replay`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold transition-colors"
                        title="Visual Candlestick Replay"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Replay
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {[
                    { key: 'tradingsymbol', label: 'Symbol' },
                    { key: 'transactionType', label: 'Side' },
                    { key: 'quantity', label: 'Qty', align: 'right' as const },
                    { key: 'executionPrice', label: 'Fill Price', align: 'right' as const },
                    { key: 'totalCharges', label: 'Charges', align: 'right' as const },
                    { key: 'executionTimestamp', label: 'Execution Time (IST)' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-foreground select-none',
                        col.align === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="ml-1 text-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExecutions.map((trade, i) => {
                  const isBuy = trade.transactionType === 'BUY';
                  return (
                    <tr
                      key={trade.id}
                      className={cn(
                        'border-b border-border/30 last:border-0 transition-colors hover:bg-accent/50',
                        i % 2 === 1 && 'bg-muted/20',
                      )}
                    >
                      <td className="px-4 py-3.5 font-semibold text-foreground">
                        <Link
                          href={`/dashboard/trades/${trade.id}`}
                          className="hover:text-primary transition-colors hover:underline inline-flex items-center gap-1 font-bold font-mono"
                          title="View Trade Details"
                        >
                          {trade.tradingsymbol}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          {trade.exchange}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold',
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-500/10 text-red-700 dark:text-red-400',
                          )}
                        >
                          {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {trade.transactionType}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-medium tabular-nums font-mono">
                        {trade.quantity.toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 text-right tabular-nums font-mono font-semibold">
                        {format(trade.executionPrice, trade.currency)}
                      </td>

                      <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums font-mono">
                        {format(trade.totalCharges, trade.currency)}
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(trade.executionTimestamp)}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedChartTrade(trade)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold transition-colors"
                            title="Quick Candlestick Chart"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                            Chart
                          </button>
                          <Link
                            href={`/dashboard/trades/${trade.id}/replay`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold transition-colors"
                            title="Visual Candlestick Replay"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Replay
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ─────────────────────── */}
      {!loading && total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* ── AI Trade Autopsy Modal ────────────────────────────── */}
      <TradeAutopsyModal
        isOpen={!!selectedAutopsyTrade}
        onClose={() => setSelectedAutopsyTrade(null)}
        trade={selectedAutopsyTrade}
        onOpenChart={() => {
          setSelectedChartTrade(selectedAutopsyTrade);
        }}
      />

      {/* ── Quick Candlestick Chart Inspection Modal ─────────── */}
      <TradeCandleModal
        isOpen={!!selectedChartTrade}
        onClose={() => setSelectedChartTrade(null)}
        trade={selectedChartTrade}
      />

      {/* ── Institutional Trade Comparison Studio Modal ──────── */}
      <TradeComparisonModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        tradeA={compareTradeA}
        allTrades={viewMode === 'closed' ? journalTrades : executions}
      />

      {/* ── Verified Branded Social Share Card Modal ─────────── */}
      {selectedShareTrade && (
        <BrandedShareCardModal
          isOpen={!!selectedShareTrade}
          onClose={() => setSelectedShareTrade(null)}
          trade={{
            id: selectedShareTrade.id,
            symbol: selectedShareTrade.tradingsymbol,
            exchange: selectedShareTrade.exchange,
            direction: selectedShareTrade.direction ?? selectedShareTrade.transactionType,
            entryPrice: selectedShareTrade.avgEntryPrice ?? selectedShareTrade.executionPrice,
            quantity: selectedShareTrade.totalQuantity ?? selectedShareTrade.quantity,
            netPnl: selectedShareTrade.netPnl,
            currency: selectedShareTrade.currency ?? activeCurrency,
            tradeDate: selectedShareTrade.openedAt ?? selectedShareTrade.executionTimestamp,
            strategyName: selectedShareTrade.assetClass ?? selectedShareTrade.segment,
          }}
        />
      )}

      {/* ── Institutional Trade Ledger Export Modal ── */}
      <TradeExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        defaultScope={viewMode === 'closed' ? 'journal' : 'executions'}
      />

      {/* ── Multimodal AI Chart Vision Inspector Modal ── */}
      <MultimodalChartVisionModal
        isOpen={visionModalOpen}
        onClose={() => setVisionModalOpen(false)}
      />
    </div>
  );
}
