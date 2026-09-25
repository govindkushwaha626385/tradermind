// ──────────────────────────────────────────────
// TradeMind — Admin Background Jobs & Queue Super-Console
//
// Real-time PostgreSQL job queue monitoring, retry dispatching,
// and worker queue depth controls.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Layers,
  Activity,
  Trash2,
  RotateCcw,
  Play,
  X,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Cpu,
  Terminal,
  Send,
  Eye,
  TrendingUp,
  Sparkles,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface BackgroundJobItem {
  id: string;
  queue: string;
  jobName: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  maxAttempts: number;
  runAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<BackgroundJobItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({ PENDING: 0, RUNNING: 0, DONE: 0, FAILED: 0, RETRYING: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Action States
  const [inspectJob, setInspectJob] = useState<BackgroundJobItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackgroundJobItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [clearingDone, setClearingDone] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dispatch Job Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    queue: 'default',
    jobName: 'sync-trades',
    payloadJson: '{\n  "priority": "high"\n}',
    maxAttempts: 3,
  });

  const [dispatchingSession, setDispatchingSession] = useState<string | null>(null);

  const handleAdminDispatchEod = async (session: 'IST' | 'EST' | 'UTC' | 'ALL') => {
    setDispatchingSession(session);
    try {
      const res = await api.adminDispatchEodDigests(session);
      if (res.success && res.data) {
        toast.success(
          `🎉 ${res.data.sessionName} debrief dispatched! Sent to ${res.data.sentCount} active users (${res.data.skippedCount} skipped, took ${res.data.durationMs}ms)`
        );
        fetchJobs(1);
      } else {
        toast.error((res as any)?.error?.message || 'Failed to dispatch EOD digests');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch EOD digests');
    } finally {
      setDispatchingSession(null);
    }
  };

  useEffect(() => {
    document.title = 'Job Queue & Workers — TradeMind | Admin';
  }, []);

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.getAdminJobs({
        page,
        limit: 50,
        status: statusFilter || undefined,
        queue: queueFilter || undefined,
        search: search.trim() || undefined,
      });
      if (res.success && res.data) {
        setJobs(res.data.jobs ?? []);
        setStats(res.data.stats ?? {});
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load background jobs:', err);
      toast.error('Failed to load background jobs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, queueFilter, search]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRetryJob = async (job: BackgroundJobItem) => {
    setRetryingId(job.id);
    try {
      const res = await api.adminRetryJob(job.id);
      if (res.success) {
        toast.success(`Job "${job.jobName}" scheduled for immediate retry`);
        fetchJobs(pagination.page);
      } else {
        toast.error((res as any).error?.message || 'Failed to retry job');
      }
    } catch {
      toast.error('Failed to retry job');
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteJob = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.adminDeleteJob(deleteTarget.id);
      if (res.success) {
        toast.success(`Deleted job ${deleteTarget.jobName} (#${deleteTarget.id.slice(0, 8)})`);
        setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      } else {
        toast.error('Failed to delete job');
      }
    } catch {
      toast.error('Failed to delete job');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleClearCompleted = async () => {
    setClearingDone(true);
    try {
      const res = await api.adminClearCompletedJobs();
      if (res.success) {
        toast.success(res.data?.message || 'Purged completed jobs from history');
        fetchJobs(1);
      } else {
        toast.error('Failed to clear completed jobs');
      }
    } catch {
      toast.error('Failed to clear completed jobs');
    } finally {
      setClearingDone(false);
    }
  };

  const handleDispatchJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    try {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(dispatchForm.payloadJson);
      } catch {
        toast.error('Invalid JSON payload');
        setDispatching(false);
        return;
      }

      const res = await api.adminDispatchJob({
        queue: dispatchForm.queue,
        jobName: dispatchForm.jobName,
        payload: parsedPayload,
        maxAttempts: Number(dispatchForm.maxAttempts),
      });

      if (res.success) {
        toast.success(`Enqueued job "${dispatchForm.jobName}" to queue "${dispatchForm.queue}"`);
        setDispatchModalOpen(false);
        fetchJobs(1);
      } else {
        toast.error((res as any).error?.message || 'Failed to enqueue job');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch job');
    } finally {
      setDispatching(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      ' ' + new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <PageHeader
        title="Background Jobs & Worker Queue"
        description="Persistent PostgreSQL queue management, worker depths, and job retry controls"
        icon={Cpu}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDispatchModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-all cursor-pointer shadow-sm"
              title="Enqueue a new background task"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Job</span>
            </button>
            <button
              onClick={handleClearCompleted}
              disabled={clearingDone}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-input bg-background hover:bg-accent text-sm font-medium transition-colors cursor-pointer"
              title="Clear all DONE jobs from history"
            >
              <Trash2 className={cn('w-4 h-4 text-muted-foreground', clearingDone && 'animate-spin')} />
              <span>Prune Done</span>
            </button>
            <button
              onClick={() => fetchJobs(pagination.page)}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      {/* Queue Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-500 mt-1">
            {stats.PENDING ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Awaiting pickup</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Running</span>
            <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-500 mt-1">
            {stats.RUNNING ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Active worker tasks</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500 mt-1">
            {stats.DONE ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Succeeded</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Failed</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-500 mt-1">
            {stats.FAILED ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Needs intervention</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Retrying</span>
            <RotateCcw className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-violet-500 mt-1">
            {stats.RETRYING ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Exponential backoff</div>
        </div>
      </div>

      {/* ── Automated Post-Market EOD Dispatcher Control Center ── */}
      <div className="glass-card rounded-2xl p-5 border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-secondary/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Automated Market-Close EOD Trade Digests
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                  Scheduled Workers
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calculates daily realized net/gross P&L, discipline scores (0-100), and detected mistakes for all traders.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleAdminDispatchEod('ALL')}
            disabled={dispatchingSession !== null}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <Send className={cn('w-3.5 h-3.5', dispatchingSession === 'ALL' && 'animate-spin')} />
            <span>{dispatchingSession === 'ALL' ? 'Dispatching...' : 'Dispatch All Sessions'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Indian Markets */}
          <div className="p-3.5 rounded-xl bg-card border border-border/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-base">🇮🇳</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                  3:45 PM IST
                </span>
              </div>
              <h4 className="text-xs font-bold text-foreground mt-1.5">Indian Markets</h4>
              <p className="text-[11px] text-muted-foreground">NSE, BSE & MCX session close</p>
            </div>
            <button
              onClick={() => handleAdminDispatchEod('IST')}
              disabled={dispatchingSession !== null}
              className="w-full py-1.5 px-3 rounded-lg border border-border hover:bg-accent text-foreground text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className={cn('w-3 h-3', dispatchingSession === 'IST' && 'animate-spin')} />
              <span>{dispatchingSession === 'IST' ? 'Sending...' : 'Trigger IST Debrief'}</span>
            </button>
          </div>

          {/* US Equities */}
          <div className="p-3.5 rounded-xl bg-card border border-border/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-base">🇺🇸</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                  4:15 PM EST
                </span>
              </div>
              <h4 className="text-xs font-bold text-foreground mt-1.5">US Equities</h4>
              <p className="text-[11px] text-muted-foreground">NYSE & NASDAQ session close</p>
            </div>
            <button
              onClick={() => handleAdminDispatchEod('EST')}
              disabled={dispatchingSession !== null}
              className="w-full py-1.5 px-3 rounded-lg border border-border hover:bg-accent text-foreground text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className={cn('w-3 h-3', dispatchingSession === 'EST' && 'animate-spin')} />
              <span>{dispatchingSession === 'EST' ? 'Sending...' : 'Trigger EST Debrief'}</span>
            </button>
          </div>

          {/* Global Crypto & Forex */}
          <div className="p-3.5 rounded-xl bg-card border border-border/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-base">🌐</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                  00:00 UTC
                </span>
              </div>
              <h4 className="text-xs font-bold text-foreground mt-1.5">Crypto & Forex</h4>
              <p className="text-[11px] text-muted-foreground">24/7 Global UTC Daily Rollover</p>
            </div>
            <button
              onClick={() => handleAdminDispatchEod('UTC')}
              disabled={dispatchingSession !== null}
              className="w-full py-1.5 px-3 rounded-lg border border-border hover:bg-accent text-foreground text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className={cn('w-3 h-3', dispatchingSession === 'UTC' && 'animate-spin')} />
              <span>{dispatchingSession === 'UTC' ? 'Sending...' : 'Trigger UTC Debrief'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by job name, queue, or error message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={queueFilter}
          onChange={(e) => setQueueFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Queues</option>
          <option value="default">Default</option>
          <option value="sync-trades">Trade Sync</option>
          <option value="cleanup">Cleanup &amp; Cache</option>
          <option value="leaderboard">Leaderboard</option>
          <option value="notifications">Notifications</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="RUNNING">RUNNING</option>
          <option value="DONE">DONE</option>
          <option value="FAILED">FAILED</option>
          <option value="RETRYING">RETRYING</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={8} cols={7} />
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Layers}
            title={search || queueFilter || statusFilter ? 'No jobs match your filter' : 'Queue is empty'}
            description={
              search || queueFilter || statusFilter
                ? 'Try clearing your search query or filters to view all queue tasks.'
                : 'All background jobs have been processed by worker processes.'
            }
            action={
              search || queueFilter || statusFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearch('');
                      setQueueFilter('');
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
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Queue &amp; Job</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">Attempts</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Run At</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Completed</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Error Details</th>
                  <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-xs text-foreground font-mono">{job.jobName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">queue: {job.queue}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase font-mono',
                          job.status === 'DONE' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
                          job.status === 'RUNNING' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse',
                          job.status === 'PENDING' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                          job.status === 'FAILED' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                          job.status === 'RETRYING' && 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
                        )}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-mono">
                      {job.attempts} / {job.maxAttempts}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDate(job.runAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDate(job.completedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-rose-500 truncate max-w-[200px] font-mono">
                      {job.error || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setInspectJob(job)}
                          className="p-1.5 rounded-lg border border-input hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Inspect Payload"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {(job.status === 'FAILED' || job.status === 'RETRYING') && (
                          <button
                            onClick={() => handleRetryJob(job)}
                            disabled={retryingId === job.id}
                            className="p-1.5 rounded-lg border border-primary/30 hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                            title="Retry Job Now"
                          >
                            <RotateCcw className={cn('w-3.5 h-3.5', retryingId === job.id && 'animate-spin')} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(job)}
                          className="p-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                          title="Delete Job"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-accent/10">
              <div className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total jobs)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchJobs(pagination.page - 1)}
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
                  onClick={() => fetchJobs(pagination.page + 1)}
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

      {/* Inspect Job Modal */}
      {inspectJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 pb-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  Background Job Payload &amp; Trace
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: {inspectJob.id}
                </p>
              </div>
              <button
                onClick={() => setInspectJob(null)}
                className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-accent/30 border border-border/40">
                  <div className="text-[10px] text-muted-foreground uppercase font-sans">Queue</div>
                  <div className="font-bold text-foreground mt-0.5">{inspectJob.queue}</div>
                </div>
                <div className="p-3 rounded-xl bg-accent/30 border border-border/40">
                  <div className="text-[10px] text-muted-foreground uppercase font-sans">Status</div>
                  <div className="font-bold text-foreground mt-0.5">{inspectJob.status} ({inspectJob.attempts}/{inspectJob.maxAttempts})</div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-sans">
                  Payload JSON
                </div>
                <pre className="p-3 rounded-xl bg-secondary/50 border border-border/40 overflow-x-auto text-[11px] max-h-48 scrollbar-thin">
                  {JSON.stringify(inspectJob.payload, null, 2)}
                </pre>
              </div>

              {inspectJob.error && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mb-1.5 font-sans">
                    Error Log
                  </div>
                  <pre className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 overflow-x-auto text-[11px] max-h-36 scrollbar-thin">
                    {inspectJob.error}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 bg-accent/20 border-t border-border/50 flex justify-end">
              <button
                onClick={() => setInspectJob(null)}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-sans text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Job Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 pb-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  Dispatch Background Job
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enqueue a task to the asynchronous worker pool
                </p>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDispatchJob} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Queue Name</label>
                  <select
                    value={dispatchForm.queue}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, queue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-input bg-background"
                  >
                    <option value="default">default</option>
                    <option value="sync-trades">sync-trades</option>
                    <option value="cleanup">cleanup</option>
                    <option value="leaderboard">leaderboard</option>
                    <option value="notifications">notifications</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Max Retry Attempts</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={dispatchForm.maxAttempts}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, maxAttempts: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-input bg-background font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Job Name / Task Identifier</label>
                <input
                  type="text"
                  value={dispatchForm.jobName}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, jobName: e.target.value })}
                  placeholder="e.g. sync-broker-all or prune-old-cache"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Payload JSON</label>
                <textarea
                  rows={4}
                  value={dispatchForm.payloadJson}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, payloadJson: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 border-t border-border/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-input hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{dispatching ? 'Enqueueing...' : 'Enqueue Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Job Deletion */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Background Job"
        description={
          deleteTarget
            ? `Are you sure you want to delete job "${deleteTarget.jobName}" (${deleteTarget.status}) from the queue? This will remove it permanently.`
            : ''
        }
        confirmLabel="Delete Job"
        danger={true}
        loading={deleting}
        onConfirm={handleDeleteJob}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
