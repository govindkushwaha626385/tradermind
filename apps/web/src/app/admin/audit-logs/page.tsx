// ──────────────────────────────────────────────
// TradeMind — Admin Audit Logs Viewer
//
// Displays an immutable history of privileged admin actions.
// Features: action filter, actor search, SkeletonTable, EmptyState, pagination.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface AuditEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_MAP: Record<string, { label: string; badge: string }> = {
  'config.update': { label: 'Config Updated', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  'user.role.update': { label: 'Role Changed', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  'subscription.update': { label: 'Subscription Updated', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  'plan.create': { label: 'Plan Created', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  'plan.update': { label: 'Plan Updated', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  'plan.delete': { label: 'Plan Deactivated', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  'user.delete': { label: 'User Deleted', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    document.title = 'Audit Logs — TradeMind | Admin';
  }, []);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.getAdminAuditLogs({ page, limit: 50 });
      if (res.success) {
        const result = res.data as { logs: AuditEntry[]; pagination: Pagination };
        setLogs(result.logs ?? []);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const filteredLogs = logs.filter((entry) => {
    const matchesSearch =
      !search ||
      entry.actorEmail?.toLowerCase().includes(search.toLowerCase()) ||
      entry.entityType?.toLowerCase().includes(search.toLowerCase()) ||
      (entry.entityId && entry.entityId.toLowerCase().includes(search.toLowerCase())) ||
      (entry.ipAddress && entry.ipAddress.includes(search));
    const matchesAction = !actionFilter || entry.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <PageHeader
        title="Audit Logs"
        description="Immutable, chronological record of all administrative actions & security events"
        icon={ShieldCheck}
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
            placeholder="Search by actor email, entity ID, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Actions</option>
          <option value="config.update">Config Updates</option>
          <option value="user.role.update">Role Changes</option>
          <option value="subscription.update">Subscription Updates</option>
          <option value="plan.create">Plan Creates</option>
          <option value="plan.update">Plan Updates</option>
          <option value="plan.delete">Plan Deactivations</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={8} cols={5} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Activity}
            title={search || actionFilter ? 'No matching audit records' : 'No audit logs recorded'}
            description={
              search || actionFilter
                ? 'Try resetting the search or action filter.'
                : 'Privileged actions performed by admins will be permanently logged here.'
            }
            action={
              search || actionFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearch('');
                      setActionFilter('');
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
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Timestamp</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Admin Actor</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Target Entity</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredLogs.map((entry) => {
                  const conf = ACTION_MAP[entry.action] ?? {
                    label: entry.action,
                    badge: 'bg-accent text-muted-foreground border-border/50',
                  };

                  return (
                    <tr key={entry.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-semibold text-foreground font-mono">
                          {entry.actorEmail || 'System'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border',
                            conf.badge,
                          )}
                        >
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{entry.entityType}</span>
                        {entry.entityId && (
                          <span className="ml-1 font-mono text-xs opacity-75">
                            ({entry.entityId.slice(0, 8)}…)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                        {entry.ipAddress || '—'}
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
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} audit entries)
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
