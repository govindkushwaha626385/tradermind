// ──────────────────────────────────────────────
// TradeMind — Admin Sync Logs & Real-Time Ingestion Console
//
// Live audit trail across all broker connections:
// - Real-time webhook ingestion events & postback latency
// - Deduplicated fill counts (fillHash) & clustered trades
// - Broker identifiers (Zerodha, Dhan, Angel One, Upstox, Delta, IBKR)
// - User account context & error diagnostics
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCcw,
  Zap,
  Radio,
  Copy,
  Check,
  Eye,
  X,
  Server,
  Terminal,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface SyncLog {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  brokerConnectionId: string;
  brokerId?: string | null;
  brokerLabel?: string | null;
  brokerClientId?: string | null;
  syncType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  executionsImported: number;
  tradesCreated: number;
  tradesUpdated: number;
  errorMessage: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { badge: string; icon: typeof CheckCircle2 }> = {
  RUNNING: { badge: 'bg-primary/10 text-primary border-primary/20 animate-pulse', icon: Clock },
  SUCCESS: { badge: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  FAILED: { badge: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

const BROKER_COLOR: Record<string, string> = {
  zerodha: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  dhan: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  angelone: 'bg-red-500/10 text-red-400 border-red-500/20',
  upstox: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  delta_exchange: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  delta: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  binance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  bybit: 'bg-amber-600/10 text-amber-400 border-amber-600/20',
  ibkr: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  generic: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function AdminSyncLogsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [syncTypeFilter, setSyncTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.title = 'Sync Logs & Webhook Ingestion — TradeMind | Admin';
  }, []);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.getAdminSyncLogs({
        page,
        limit: 20,
        status: statusFilter || undefined,
        syncType: syncTypeFilter || undefined,
        search: search.trim() || undefined,
      });
      if (res.success) {
        setLogs((res.data as any).logs ?? []);
        setPagination((res.data as any).pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch sync logs:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, syncTypeFilter, search]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // Real-time auto-refresh interval (every 10s)
  useEffect(() => {
    if (!autoRefresh) {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      return;
    }

    refreshTimerRef.current = setInterval(() => {
      fetchLogs(pagination.page);
    }, 10000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [autoRefresh, fetchLogs, pagination.page]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDateTime = (d: string) => {
    return new Date(d).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'Running…';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    const sec = (ms / 1000).toFixed(1);
    return `${sec}s`;
  };

  // Metrics summary
  const totalImported = logs.reduce((sum, l) => sum + (l.executionsImported || 0), 0);
  const totalTradesCreated = logs.reduce((sum, l) => sum + (l.tradesCreated || 0), 0);
  const webhookCount = logs.filter((l) => l.syncType === 'webhook').length;
  const failureCount = logs.filter((l) => l.status === 'FAILED').length;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl pb-16">
      <PageHeader
        title="Sync Logs & Webhook Ingestion"
        description="Real-time execution postbacks, broker synchronization, and fill deduplication audit trail"
        icon={RefreshCcw}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-background hover:bg-accent text-muted-foreground border-border/60',
              )}
              title={autoRefresh ? 'Live polling active (10s)' : 'Enable live polling'}
            >
              <Radio className={cn('w-3.5 h-3.5', autoRefresh && 'animate-pulse text-emerald-400')} />
              <span>Live {autoRefresh ? 'Active' : 'Off'}</span>
            </button>

            <button
              onClick={() => fetchLogs(pagination.page)}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
              title="Manual Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-border/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Executions</span>
            <Server className="w-4 h-4 text-primary/70" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{totalImported.toLocaleString()}</div>
          <div className="text-[11px] text-muted-foreground/80 mt-1">Deduplicated fills imported</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Journal Trades</span>
            <Activity className="w-4 h-4 text-success/70" />
          </div>
          <div className="text-2xl font-bold font-mono text-success mt-2">{totalTradesCreated.toLocaleString()}</div>
          <div className="text-[11px] text-muted-foreground/80 mt-1">Clustered positions reconciled</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Real-Time Webhooks</span>
            <Zap className="w-4 h-4 text-amber-400/80" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">{webhookCount}</div>
          <div className="text-[11px] text-muted-foreground/80 mt-1">Instant postback triggers</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sync Failures</span>
            <XCircle className="w-4 h-4 text-destructive/70" />
          </div>
          <div className="text-2xl font-bold font-mono text-destructive mt-2">{failureCount}</div>
          <div className="text-[11px] text-muted-foreground/80 mt-1">Requiring token reconnection</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search trader name, email, broker ID, or error message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={syncTypeFilter}
          onChange={(e) => setSyncTypeFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Sync Types</option>
          <option value="webhook">⚡ Real-Time Webhook</option>
          <option value="incremental">🔄 Incremental Sync</option>
          <option value="full">📦 Full Sync</option>
          <option value="csv">📄 CSV Import</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="RUNNING">Running</option>
        </select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="glass-card rounded-2xl p-6 border border-border/50">
          <SkeletonTable rows={8} cols={7} />
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 border border-border/50">
          <EmptyState
            icon={Zap}
            title={search || statusFilter || syncTypeFilter ? 'No matching sync logs' : 'No sync activity yet'}
            description={
              search || statusFilter || syncTypeFilter
                ? 'Try clearing your search query or filters.'
                : 'Broker execution and postback events will appear here in real-time as trades occur.'
            }
            action={
              search || statusFilter || syncTypeFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearch('');
                      setStatusFilter('');
                      setSyncTypeFilter('');
                    },
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-border/50 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-accent/20">
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs">Trader</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs">Broker</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs">Sync Type</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs">Started At</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs">Duration</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground text-xs">Fills</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground text-xs">Trades</th>
                  <th className="text-center px-4 py-3.5 font-medium text-muted-foreground text-xs">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {logs.map((log) => {
                  const conf = STATUS_CONFIG[log.status] ?? {
                    badge: 'bg-accent text-muted-foreground border-border/50',
                    icon: Clock,
                  };
                  const StatusIcon = conf.icon;
                  const brokerKey = (log.brokerId || 'generic').toLowerCase();
                  const brokerStyle = BROKER_COLOR[brokerKey] ?? BROKER_COLOR.generic;

                  return (
                    <tr key={log.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                            conf.badge,
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {log.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground text-xs truncate max-w-[160px]">
                          {log.userName || log.userEmail?.split('@')[0] || 'Unknown Trader'}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[160px]">
                          {log.userEmail || log.userId.slice(0, 8)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize',
                            brokerStyle,
                          )}
                        >
                          {log.brokerLabel || log.brokerId || 'Broker'}
                        </span>
                        {log.brokerClientId && (
                          <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                            ID: {log.brokerClientId}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {log.syncType === 'webhook' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <Zap className="w-3 h-3 text-amber-400" />
                            Live Webhook
                          </span>
                        ) : (
                          <span className="text-xs font-mono font-medium uppercase text-muted-foreground">
                            {log.syncType}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {formatDateTime(log.startedAt)}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {getDuration(log.startedAt, log.completedAt)}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-right font-mono font-bold text-foreground">
                        {log.executionsImported}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-right font-mono font-bold text-success">
                        {log.tradesCreated}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors border border-border/40"
                          title="Inspect Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
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
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total sync events)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchLogs(pagination.page - 1)}
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
                  onClick={() => fetchLogs(pagination.page + 1)}
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

      {/* Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card rounded-2xl border border-border max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Sync Event Diagnostics</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Event ID</span>
                <span className="font-mono text-foreground select-all">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Broker Connection</span>
                <span className="font-mono text-foreground select-all">{selectedLog.brokerConnectionId}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Trader</span>
                <span className="font-semibold text-foreground">
                  {selectedLog.userName || 'Trader'} ({selectedLog.userEmail || selectedLog.userId})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Broker Provider</span>
                <span className="font-semibold text-foreground capitalize">
                  {selectedLog.brokerLabel || selectedLog.brokerId || 'Unknown'} (Client: {selectedLog.brokerClientId || 'N/A'})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Started At</span>
                <span className="font-mono text-foreground">{formatDateTime(selectedLog.startedAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Completed At</span>
                <span className="font-mono text-foreground">
                  {selectedLog.completedAt ? formatDateTime(selectedLog.completedAt) : 'In Progress'}
                </span>
              </div>
            </div>

            {selectedLog.errorMessage && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-destructive">Error Stack / Diagnostics:</span>
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-mono text-destructive select-all whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {selectedLog.errorMessage}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <button
                onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2), selectedLog.id)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedId === selectedLog.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === selectedLog.id ? 'Copied JSON!' : 'Copy Event JSON'}</span>
              </button>

              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
