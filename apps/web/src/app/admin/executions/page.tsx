// ──────────────────────────────────────────────
// TradeMind — Admin Trade Executions Viewer & Management Super-Console
//
// Allows admins to view, inspect, filter, and delete raw trade executions across all users.
// Features:
// - Real-time metrics ribbon (Total Fills, Volume, Buy/Sell Ratio, Unique Symbols)
// - Symbol/User search, Segment filter, Side filter
// - Execution Details Modal with raw broker IDs
// - 1-click execution deletion with audit logging and ConfirmDialog
// - CSV export
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Trash2,
  Eye,
  X,
  Copy,
  Check,
  DollarSign,
  PieChart,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/export-csv';
import { toast } from '@/components/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
  const [sideFilter, setSideFilter] = useState('');

  // Modals & Action States
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [deleteExecutionTarget, setDeleteExecutionTarget] = useState<Execution | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      toast.error('Failed to load trade executions');
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
      second: '2-digit',
    });
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredExecutions = useMemo(() => {
    return executions.filter((exe) => {
      const matchesSearch =
        !search ||
        exe.tradingsymbol?.toLowerCase().includes(search.toLowerCase()) ||
        exe.userName?.toLowerCase().includes(search.toLowerCase()) ||
        exe.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
        exe.brokerOrderId?.toLowerCase().includes(search.toLowerCase()) ||
        exe.brokerExecutionId?.toLowerCase().includes(search.toLowerCase());

      const matchesSegment = !segmentFilter || exe.segment === segmentFilter;
      const matchesSide = !sideFilter || exe.transactionType === sideFilter;

      return matchesSearch && matchesSegment && matchesSide;
    });
  }, [executions, search, segmentFilter, sideFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let buyCount = 0;
    let sellCount = 0;
    let totalTurnover = 0;
    const symbols = new Set<string>();

    for (const exe of filteredExecutions) {
      if (exe.transactionType === 'BUY') buyCount++;
      else sellCount++;
      totalTurnover += Math.abs((exe.quantity || 0) * (exe.executionPrice || 0));
      if (exe.tradingsymbol) symbols.add(exe.tradingsymbol);
    }

    return {
      totalFills: filteredExecutions.length,
      buyCount,
      sellCount,
      totalTurnover,
      uniqueSymbols: symbols.size,
    };
  }, [filteredExecutions]);

  const handleDeleteExecution = async () => {
    if (!deleteExecutionTarget) return;
    setDeleting(true);
    try {
      const res = await api.adminDeleteExecution(deleteExecutionTarget.id);
      if (res.success) {
        toast.success(`Deleted execution ${deleteExecutionTarget.tradingsymbol} (#${deleteExecutionTarget.id.slice(0, 8)})`);
        setExecutions((prev) => prev.filter((e) => e.id !== deleteExecutionTarget.id));
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      } else {
        toast.error((res as any).error?.message || 'Failed to delete execution');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete execution');
    } finally {
      setDeleting(false);
      setDeleteExecutionTarget(null);
    }
  };

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
        { header: 'Side', accessor: (e) => e.transactionType },
        { header: 'Order Type', accessor: (e) => e.orderType },
        { header: 'Quantity', accessor: (e) => e.quantity },
        { header: 'Price', accessor: (e) => e.executionPrice },
        { header: 'Trade Value', accessor: (e) => (e.quantity * e.executionPrice).toFixed(2) },
        { header: 'Broker Order ID', accessor: (e) => e.brokerOrderId },
        { header: 'Broker Execution ID', accessor: (e) => e.brokerExecutionId },
        { header: 'Broker Connection ID', accessor: (e) => e.brokerConnectionId },
        { header: 'Execution Time', accessor: (e) => e.executionTimestamp },
      ]
    );
    if (success) toast.success(`Exported ${filteredExecutions.length} executions to CSV`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <PageHeader
        title="Trade Executions Super-Console"
        description="Raw broker order fills and executions with full inspect, search, and administrative removal controls"
        icon={Activity}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={filteredExecutions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-input bg-background hover:bg-accent text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              title="Export Executions to CSV"
            >
              <Download className="w-4 h-4 text-muted-foreground" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => fetchExecutions(pagination.page)}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      {/* Real-time Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Page Fills</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {metrics.totalFills}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {pagination.total} total in database
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Turnover Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-500 mt-1">
            ₹{metrics.totalTurnover.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Gross traded value</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Buy / Sell Split</span>
            <PieChart className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1 flex items-center gap-1.5">
            <span className="text-emerald-500">{metrics.buyCount}B</span>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-rose-500">{metrics.sellCount}S</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Transaction directions</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Unique Symbols</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-500 mt-1">
            {metrics.uniqueSymbols}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Traded instruments</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by symbol, user, email, order ID, or execution ID..."
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

        <select
          value={sideFilter}
          onChange={(e) => setSideFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Sides (Buy &amp; Sell)</option>
          <option value="BUY">BUY Only</option>
          <option value="SELL">SELL Only</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={8} cols={8} />
        </div>
      ) : filteredExecutions.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Layers}
            title={search || segmentFilter || sideFilter ? 'No executions match your filter' : 'No executions recorded'}
            description={
              search || segmentFilter || sideFilter
                ? 'Try clearing your search query or filters to view all raw broker executions.'
                : 'Broker trade executions will appear here in real-time as users trade.'
            }
            action={
              search || segmentFilter || sideFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearch('');
                      setSegmentFilter('');
                      setSideFilter('');
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
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Side</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Price</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Value</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Segment</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Timestamp</th>
                  <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredExecutions.map((exe) => {
                  const tradeValue = Math.abs((exe.quantity || 0) * (exe.executionPrice || 0));
                  return (
                    <tr key={exe.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs text-foreground">{exe.userName || 'Anonymous'}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[160px]">{exe.userEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-xs font-mono tracking-tight text-foreground">{exe.tradingsymbol}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{exe.exchange || 'NSE'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono',
                            exe.transactionType === 'BUY'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
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
                      <td className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">
                        ₹{tradeValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary font-medium">
                          {exe.segment || 'EQ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(exe.executionTimestamp)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedExecution(exe)}
                            className="p-1.5 rounded-lg border border-input hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Inspect Raw Broker Execution Payload"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteExecutionTarget(exe)}
                            className="p-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                            title="Delete Execution (Super-Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                  className="p-2 rounded-xl hover:bg-accent disabled:opacity-30 transition-colors border border-border/40 cursor-pointer"
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
                  className="p-2 rounded-xl hover:bg-accent disabled:opacity-30 transition-colors border border-border/40 cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Execution Inspection Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 pb-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Execution Payload Inspection
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Raw telemetry and identifiers from broker synchronization
                </p>
              </div>
              <button
                onClick={() => setSelectedExecution(null)}
                className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-accent/30 border border-border/40 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-sans">Trading Symbol</div>
                  <div className="font-bold text-foreground text-sm">{selectedExecution.tradingsymbol}</div>
                </div>
                <div className="p-3 rounded-xl bg-accent/30 border border-border/40 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-sans">Side &amp; Qty</div>
                  <div className="font-bold text-foreground text-sm">
                    <span className={selectedExecution.transactionType === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}>
                      {selectedExecution.transactionType}
                    </span>{' '}
                    {selectedExecution.quantity} @ ₹{selectedExecution.executionPrice}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Execution ID', value: selectedExecution.id, key: 'id' },
                  { label: 'Broker Order ID', value: selectedExecution.brokerOrderId || 'N/A', key: 'orderId' },
                  { label: 'Broker Execution ID', value: selectedExecution.brokerExecutionId || 'N/A', key: 'execId' },
                  { label: 'Broker Connection ID', value: selectedExecution.brokerConnectionId || 'N/A', key: 'connId' },
                  { label: 'User ID', value: selectedExecution.userId, key: 'userId' },
                  { label: 'User Email', value: selectedExecution.userEmail, key: 'email' },
                  { label: 'Execution Timestamp', value: selectedExecution.executionTimestamp, key: 'time' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/40">
                    <span className="text-muted-foreground font-sans text-[11px]">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground truncate max-w-[240px]">{item.value}</span>
                      {item.value !== 'N/A' && (
                        <button
                          onClick={() => copyToClipboard(item.value, item.key)}
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Copy"
                        >
                          {copiedKey === item.key ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-accent/20 border-t border-border/50 flex justify-end">
              <button
                onClick={() => setSelectedExecution(null)}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-sans text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Execution Deletion Dialog */}
      <ConfirmDialog
        open={Boolean(deleteExecutionTarget)}
        title="Permanently Delete Execution"
        description={
          deleteExecutionTarget
            ? `Are you sure you want to delete ${deleteExecutionTarget.transactionType} ${deleteExecutionTarget.quantity} ${deleteExecutionTarget.tradingsymbol} @ ₹${deleteExecutionTarget.executionPrice} for ${deleteExecutionTarget.userEmail}? This will permanently remove the record from broker fills and cannot be undone.`
            : ''
        }
        confirmLabel="Delete Execution"
        danger={true}
        loading={deleting}
        onConfirm={handleDeleteExecution}
        onCancel={() => setDeleteExecutionTarget(null)}
      />
    </div>
  );
}
