// ──────────────────────────────────────────────
// TradeMind — Admin Journal Trades Viewer
//
// Allows admins to view all journal trades across users
// with filtering by status, symbol, user, and date range.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Filter,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface JournalEntry {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  tradingsymbol: string;
  exchange: string;
  assetClass: string;
  direction: string;
  status: string;
  totalQuantity: number;
  avgEntryPrice: number;
  avgExitPrice: number | null;
  grossPnl: number;
  netPnl: number;
  rMultiple: number | null;
  openedAt: string;
  closedAt: string | null;
  tradeType: string | null;
  emotions: string[] | null;
  mistakeTags: string[] | null;
  traderNotes: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-primary/10 text-primary border-primary/20',
  CLOSED: 'bg-muted text-muted-foreground border-border/50',
  PARTIALLY_CLOSED: 'bg-warning/10 text-warning border-warning/20',
};

export default function AdminJournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [symbolSearch, setSymbolSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Delete trade state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<JournalEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    document.title = 'Journal Viewer — TradeMind | Admin';
  }, []);

  const fetchJournal = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (symbolSearch) params.symbol = symbolSearch;

      const res = await api.getAdminJournal(params);
      if (res.success) {
        const result = res.data as { data: JournalEntry[]; pagination: Pagination };
        setEntries(result.data ?? []);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch journal:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, symbolSearch]);

  useEffect(() => {
    fetchJournal();
  }, [fetchJournal]);

  const handleDeleteConfirm = async () => {
    if (!tradeToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await api.adminDeleteJournalTrade(tradeToDelete.id);
      if (res.success) {
        toast.success(`Trade ${tradeToDelete.tradingsymbol} removed from journal`);
        setEntries((prev) => prev.filter((x) => x.id !== tradeToDelete.id));
        if (selectedEntry?.id === tradeToDelete.id) {
          setSelectedEntry(null);
        }
        setDeleteConfirmOpen(false);
        setTradeToDelete(null);
      } else {
        toast.error((res as any).error?.message || 'Failed to delete trade');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete trade');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPnl = (val: number) => {
    const prefix = val >= 0 ? '+' : '';
    return `${prefix}₹${val.toFixed(2)}`;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Journal Viewer
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse all user trade journal entries, annotations, notes, and outcome metrics
          </p>
        </div>
        <button
          onClick={() => fetchJournal(pagination.page)}
          className="p-2.5 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by symbol or user..."
            value={symbolSearch}
            onChange={(e) => setSymbolSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open Positions</option>
          <option value="CLOSED">Closed Trades</option>
          <option value="PARTIALLY_CLOSED">Partially Closed</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={7} cols={8} />
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={BookOpen}
            title={symbolSearch || statusFilter ? 'No matching journal entries' : 'No journal trades found'}
            description={
              symbolSearch || statusFilter
                ? 'Try adjusting your search query or status filter.'
                : 'Journaled trades from all platform accounts will be listed here.'
            }
            action={
              symbolSearch || statusFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSymbolSearch('');
                      setStatusFilter('');
                    },
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-accent/20">
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Symbol</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Direction</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Net P&amp;L</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">R-Multiple</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Opened</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={cn(
                      'hover:bg-accent/40 transition-colors cursor-pointer',
                      selectedEntry?.id === entry.id && 'bg-accent/60',
                    )}
                    onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-xs text-foreground">{entry.userName || 'Trader'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{entry.userEmail}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">{entry.tradingsymbol}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                          entry.direction === 'LONG'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive',
                        )}
                      >
                        {entry.direction === 'LONG' ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {entry.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                          STATUS_COLORS[entry.status] ?? 'bg-accent text-muted-foreground border-border/50',
                        )}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs font-mono font-medium">{entry.totalQuantity}</td>
                    <td
                      className={cn(
                        'px-4 py-3.5 text-right text-xs font-mono font-bold',
                        entry.netPnl >= 0 ? 'text-success' : 'text-destructive',
                      )}
                    >
                      {formatPnl(entry.netPnl)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs font-mono text-muted-foreground">
                      {entry.rMultiple !== null ? `${entry.rMultiple.toFixed(2)}R` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDate(entry.openedAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTradeToDelete(entry);
                          setDeleteConfirmOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Delete trade entry from database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-accent/10">
              <div className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchJournal(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-xl hover:bg-accent disabled:opacity-30 transition-colors border border-border/40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium px-2">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchJournal(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-xl hover:bg-accent disabled:opacity-30 transition-colors border border-border/40"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail panel */}
      {selectedEntry && (
        <div className="glass-card rounded-2xl p-6 space-y-4 animate-bounce-in shadow-card">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <span>Trade Breakdown</span>
              <span className="font-mono text-primary font-bold">#{selectedEntry.tradingsymbol}</span>
            </h3>
            <button
              onClick={() => setSelectedEntry(null)}
              className="text-xs px-3 py-1.5 rounded-lg border border-input text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Trader</span>
              <span className="font-semibold text-foreground">{selectedEntry.userName}</span>
              <span className="text-xs text-muted-foreground block font-mono">{selectedEntry.userEmail}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Exchange / Segment</span>
              <span className="font-mono font-medium">
                {selectedEntry.exchange} · {selectedEntry.assetClass}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Direction &amp; Type</span>
              <span className="font-semibold">{selectedEntry.direction} · {selectedEntry.tradeType ?? 'MANUAL'}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Avg Entry Price</span>
              <span className="font-mono font-semibold">₹{selectedEntry.avgEntryPrice?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Avg Exit Price</span>
              <span className="font-mono font-semibold">
                {selectedEntry.avgExitPrice ? `₹${selectedEntry.avgExitPrice.toFixed(2)}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Gross P&amp;L</span>
              <span
                className={cn(
                  'font-mono font-bold',
                  selectedEntry.grossPnl >= 0 ? 'text-success' : 'text-destructive',
                )}
              >
                ₹{selectedEntry.grossPnl.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Net Realized P&amp;L</span>
              <span
                className={cn(
                  'font-mono font-bold',
                  selectedEntry.netPnl >= 0 ? 'text-success' : 'text-destructive',
                )}
              >
                ₹{selectedEntry.netPnl.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Quantity Executed</span>
              <span className="font-mono font-semibold">{selectedEntry.totalQuantity} units</span>
            </div>
          </div>

          {selectedEntry.emotions && selectedEntry.emotions.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Emotions Tagged</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedEntry.emotions.map((e) => (
                  <span
                    key={e}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent border border-border/40"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedEntry.mistakeTags && selectedEntry.mistakeTags.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Mistakes Flagged</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedEntry.mistakeTags.map((m) => (
                  <span
                    key={m}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedEntry.traderNotes && (
            <div className="pt-2">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Trader Reflection Notes</span>
              <p className="text-xs font-mono bg-accent/40 rounded-xl p-3.5 whitespace-pre-wrap border border-border/30">
                {selectedEntry.traderNotes}
              </p>
            </div>
          )}

          {/* Drawer Actions */}
          <div className="pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">ID: {selectedEntry.id}</span>
            <button
              onClick={() => {
                setTradeToDelete(selectedEntry);
                setDeleteConfirmOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Trade Record</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Journal Trade Record"
        description={
          tradeToDelete
            ? `Permanently delete trade #${tradeToDelete.tradingsymbol} (${tradeToDelete.direction}, net PnL: ${formatPnl(tradeToDelete.netPnl)}) for ${tradeToDelete.userEmail}? This will recalculate trader statistics and cannot be undone.`
            : ''
        }
        confirmLabel="Delete Trade"
        cancelLabel="Keep Trade"
        danger
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setTradeToDelete(null);
        }}
      />
    </div>
  );
}
