// ──────────────────────────────────────────────
// TradeMind — Admin Sync Logs Page
//
// Allows admins to view sync history across all users:
// - Status (RUNNING / SUCCESS / FAILED)
// - Executions imported, trades created, duration
// - Error messages for debugging
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface SyncLog {
  id: string;
  userId: string;
  brokerConnectionId: string;
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

export default function AdminSyncLogsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'Sync Logs — TradeMind | Admin';
  }, []);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.getAdminSyncLogs({ page, limit: 20 });
      if (res.success) {
        setLogs((res.data as any).logs ?? []);
        setPagination((res.data as any).pagination);
      }
    } catch (err) {
      console.error('Failed to fetch sync logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDateTime = (d: string) => {
    return new Date(d).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'Running…';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    const sec = (ms / 1000).toFixed(1);
    return `${sec}s`;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesStatus = !statusFilter || log.status === statusFilter;
    const matchesSearch =
      !search ||
      log.syncType?.toLowerCase().includes(search.toLowerCase()) ||
      log.userId?.toLowerCase().includes(search.toLowerCase()) ||
      (log.errorMessage && log.errorMessage.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <PageHeader
        title="Sync Logs"
        description="Broker execution and trade synchronization audit trail across all connections"
        icon={RefreshCcw}
        actions={
        <button
          onClick={() => fetchLogs(pagination.page)}
          className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by sync type, user ID, or error..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="RUNNING">Running</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={7} cols={7} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Zap}
            title={search || statusFilter ? 'No matching sync logs' : 'No sync activity yet'}
            description={
              search || statusFilter
                ? 'Try clearing the search query or status filter.'
                : 'Broker synchronization operations will be tracked and displayed here.'
            }
            action={
              search || statusFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearch('');
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
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Started</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Duration</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Imported</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Trades</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Error Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredLogs.map((log) => {
                  const conf = STATUS_CONFIG[log.status] ?? {
                    badge: 'bg-accent text-muted-foreground border-border/50',
                    icon: Clock,
                  };
                  const StatusIcon = conf.icon;

                  return (
                    <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                            conf.badge,
                          )}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono font-medium uppercase text-muted-foreground">
                        {log.syncType}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.startedAt)}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                        {getDuration(log.startedAt, log.completedAt)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-right font-mono font-medium">
                        {log.executionsImported}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-right font-mono font-bold text-foreground">
                        {log.tradesCreated}
                      </td>
                      <td className="px-4 py-3.5 text-xs max-w-[220px]">
                        {log.errorMessage ? (
                          <span
                            className="text-destructive font-mono line-clamp-1 hover:line-clamp-none cursor-help"
                            title={log.errorMessage}
                          >
                            {log.errorMessage}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
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
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} sync events)
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
    </div>
  );
}
