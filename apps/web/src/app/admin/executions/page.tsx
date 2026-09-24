// ──────────────────────────────────────────────
// TradeMind — Admin Trade Executions Viewer
//
// Allows admins to view raw trade executions across all users.
// Features: symbol search, segment filter, SkeletonTable, EmptyState, pagination.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/export-csv';
import { toast } from '@/components/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface Execution {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  tradingsymbol: string;
  exchange: string;
  segment: string;
  transactionType: string;
  orderType: string;
  quantity: number;
  executionPrice: number;
  brokerOrderId: string;
  brokerExecutionId: string;
  executionTimestamp: string;
  brokerConnectionId: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');

  useEffect(() => {
    document.title = 'Trade Executions — TradeMind | Admin';
  }, []);

  const fetchExecutions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.getAdminExecutions({ page, limit: 50 });
      if (res.success) {
        const result = res.data as { data: Execution[]; pagination: Pagination };
        setExecutions(result.data ?? []);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch executions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredExecutions = executions.filter((exe) => {
    const matchesSearch =
      !search ||
      exe.tradingsymbol?.toLowerCase().includes(search.toLowerCase()) ||
      exe.userName?.toLowerCase().includes(search.toLowerCase()) ||
      exe.userEmail?.toLowerCase().includes(search.toLowerCase());
    const matchesSegment = !segmentFilter || exe.segment === segmentFilter;
    return matchesSearch && matchesSegment;
  });

  const handleExportCsv = () => {
    if (filteredExecutions.length === 0) {
      toast.error('No executions to export');
      return;
    }
    const success = downloadCsv(
      `trademind-executions-${new Date().toISOString().split('T')[0]}`,
      filteredExecutions,
      [
        { header: 'Execution ID', accessor: (e) => e.id },
        { header: 'User Email', accessor: (e) => e.userEmail },
        { header: 'User Name', accessor: (e) => e.userName },
        { header: 'Trading Symbol', accessor: (e) => e.tradingsymbol },
        { header: 'Exchange', accessor: (e) => e.exchange },
        { header: 'Segment', accessor: (e) => e.segment },
        { header: 'Type', accessor: (e) => e.transactionType },
        { header: 'Order Type', accessor: (e) => e.orderType },
        { header: 'Quantity', accessor: (e) => e.quantity },
        { header: 'Price', accessor: (e) => e.executionPrice },
        { header: 'Broker Order ID', accessor: (e) => e.brokerOrderId },
        { header: 'Execution Time', accessor: (e) => e.executionTimestamp },
      ]
    );
    if (success) toast.success(`Exported ${filteredExecutions.length} executions to CSV`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <PageHeader
        title="Trade Executions"
        description="Raw broker fills and orders across all platform users"
        icon={Activity}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={filteredExecutions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-input bg-background hover:bg-accent text-sm font-medium transition-colors disabled:opacity-50"
              title="Export Executions to CSV"
            >
              <Download className="w-4 h-4 text-muted-foreground" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => fetchExecutions(pagination.page)}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by symbol, user name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Segments</option>
          <option value="EQ">Equity (EQ)</option>
          <option value="FNO">Futures &amp; Options (FNO)</option>
          <option value="COMMODITY">Commodity</option>
          <option value="CURRENCY">Currency</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={8} cols={7} />
        </div>
      ) : filteredExecutions.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Layers}
            title={search || segmentFilter ? 'No executions match your filter' : 'No executions recorded'}
            description={
              search || segmentFilter
                ? 'Try clearing the search filter or segment filter to view all executions.'
                : 'Broker trade executions will appear here in real-time as users trade.'
            }
            action={
              search || segmentFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearch('');
                      setSegmentFilter('');
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
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Price</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Order Type</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Segment</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredExecutions.map((exe) => (
                  <tr key={exe.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-xs text-foreground">{exe.userName || 'Anonymous'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{exe.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-sm font-mono tracking-tight">{exe.tradingsymbol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                          exe.transactionType === 'BUY'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive',
                        )}
                      >
                        {exe.transactionType === 'BUY' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {exe.transactionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono font-medium">{exe.quantity}</td>
                    <td className="px-4 py-3 text-right text-xs font-mono font-bold text-foreground">
                      ₹{exe.executionPrice?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-accent/60 font-mono text-muted-foreground">
                        {exe.orderType || 'MARKET'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                        {exe.segment || exe.exchange || 'EQ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(exe.executionTimestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-accent/10">
              <div className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total executions)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchExecutions(pagination.page - 1)}
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
                  onClick={() => fetchExecutions(pagination.page + 1)}
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
    </div>
  );
}
