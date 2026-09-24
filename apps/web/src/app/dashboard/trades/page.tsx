// ──────────────────────────────────────────────
// TradeMind — Trades Page (Full Featured)
//
// Raw execution viewer with:
// - P&L column (color-coded)
// - Segment filter (EQ / FO / CDS / MCX)
// - Direction filter (BUY / SELL)
// - Sort by any column
// - Export CSV (wired to api.exportTradesCsv)
// - Pagination
// - Premium skeleton loading + EmptyState
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
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

const SEGMENT_OPTIONS = ['ALL', 'NSE_EQ', 'NSE_FO', 'BSE_EQ', 'BSE_FO', 'MCX', 'CDS'];
const PAGE_SIZE = 25;

export default function TradesPage() {
  const { format } = useCurrency();
  const [search, setSearch]     = useState('');
  const [segment, setSegment]   = useState('ALL');
  const [direction, setDirection] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [trades, setTrades]     = useState<TradeExecution[]>([]);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [sortKey, setSortKey]   = useState<string>('executionTimestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    document.title = 'Trade Executions — TradeMind';
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [page, segment, direction, sortKey, sortOrder]);

  useEffect(() => {
    const handleBrokerSynced = () => {
      fetchTrades();
    };
    window.addEventListener('broker-synced', handleBrokerSynced);
    return () => window.removeEventListener('broker-synced', handleBrokerSynced);
  }, [page, segment, direction, sortKey, sortOrder]);

  async function fetchTrades() {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        limit: PAGE_SIZE,
        page,
        sortBy: sortKey,
        sortOrder,
      };
      if (segment !== 'ALL') params.segment = segment;
      if (direction !== 'ALL') params.transactionType = direction;

      const res = await api.getTrades(params);
      if (res.success) {
        setTrades((res.data as TradeExecution[]) ?? []);
        setTotal(res.total ?? 0);
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string | undefined> = {};
      if (segment !== 'ALL') params.segment = segment;
      if (direction !== 'ALL') params.transactionType = direction;
      await api.exportTradesCsv(params);
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

  const filtered = trades.filter((t) =>
    t.tradingsymbol.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Trade Executions"
        description="Raw fill data synced from your broker"
        icon={Activity}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTrades}
              disabled={loading}
              className="p-2 rounded-xl border border-border hover:bg-accent transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-accent text-sm font-medium transition-colors"
            >
              {exporting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Export CSV
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbol..."
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

        {/* Direction */}
        <div className="flex items-center gap-1">
          {(['ALL', 'BUY', 'SELL'] as const).map((d) => (
            <button
              key={d}
              onClick={() => { setDirection(d); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                direction === d
                  ? d === 'BUY' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : d === 'SELL' ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                    : 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl">
          <EmptyState
            icon={TrendingUp}
            title="No trades found"
            description="Connect a broker or import a CSV to see your trade executions here."
            action={{ label: 'Connect Broker', href: '/dashboard/brokers' }}
          />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-border/30">
            {filtered.map((trade) => {
              const pnl = trade.netPnl ?? 0;
              const isBuy = trade.transactionType === 'BUY';
              return (
                <div key={trade.id} className="p-4 space-y-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm font-mono">{trade.tradingsymbol}</span>
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
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Net P&L</div>
                      <div className={cn(
                        'font-bold font-mono mt-0.5',
                        pnl > 0 ? 'text-success' : pnl < 0 ? 'text-destructive' : 'text-muted-foreground'
                      )}>
                        {trade.netPnl !== undefined ? (pnl >= 0 ? `+${format(pnl, trade.currency)}` : format(pnl, trade.currency)) : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground text-[11px]">
                      {formatDate(trade.executionTimestamp)}
                    </span>
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
                    { key: 'executionPrice', label: 'Price', align: 'right' as const },
                    { key: 'netPnl', label: 'Net P&L', align: 'right' as const },
                    { key: 'totalCharges', label: 'Charges', align: 'right' as const },
                    { key: 'executionTimestamp', label: 'Time' },
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
                    Replay
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade, i) => {
                  const pnl = trade.netPnl ?? 0;
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
                        {trade.tradingsymbol}
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
                          {isBuy
                            ? <TrendingUp className="w-3 h-3" />
                            : <TrendingDown className="w-3 h-3" />}
                          {trade.transactionType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium tabular-nums">
                        {trade.quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {format(trade.executionPrice, trade.currency)}
                      </td>
                      <td className={cn(
                        'px-4 py-3.5 text-right font-semibold tabular-nums',
                        pnl > 0 ? 'text-success'
                          : pnl < 0 ? 'text-destructive'
                          : 'text-muted-foreground',
                      )}>
                        {trade.netPnl !== undefined ? format(pnl, trade.currency) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">
                        {format(trade.totalCharges, trade.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">
                        {formatDate(trade.executionTimestamp)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/dashboard/trades/${trade.id}/replay`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold transition-colors"
                          title="Visual Candlestick Replay"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Replay
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
