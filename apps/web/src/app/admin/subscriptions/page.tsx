// ──────────────────────────────────────────────
// TradeMind — Admin Subscriptions Page
//
// Allows admins to:
// - View all user subscriptions with plan & user info
// - Change plan / status for any subscription
// - Confirm modal on subscription cancellation
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Subscription {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  status: string;
  provider: string;
  currentPeriodEnd: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { badge: string; icon: typeof CheckCircle2 }> = {
  active: { badge: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  canceled: { badge: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  past_due: { badge: 'bg-warning/10 text-warning border-warning/20', icon: AlertTriangle },
  trialing: { badge: 'bg-primary/10 text-primary border-primary/20', icon: Sparkles },
  expired: { badge: 'bg-accent text-muted-foreground border-border/50', icon: Clock },
};

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  // ConfirmDialog state for cancellation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    document.title = 'Subscriptions — TradeMind | Admin';
  }, []);

  const fetchSubs = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const res = await api.getAdminSubscriptions({
        page: pg,
        limit: LIMIT,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      if (res.success) {
        const payload = res.data as any;
        // API now returns { data: [...], pagination: {...} }
        const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
        const pagination = payload?.pagination;
        setSubs(rows as Subscription[]);
        if (pagination) {
          setTotal(pagination.total);
          setTotalPages(pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      toast.error('Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchSubs(page);
  }, [page, statusFilter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchSubs(1);
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const updateStatus = async (subId: string, status: string) => {
    setUpdating(subId);
    try {
      const res = await api.updateAdminSubscription(subId, { status });
      if (res.success) {
        setSubs((prev) => prev.map((s) => (s.id === subId ? { ...s, status } : s)));
        toast.success(`Subscription ${status === 'active' ? 'reactivated' : 'canceled'}`);
      } else {
        toast.error((res as any).error?.message || 'Failed to update subscription');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update subscription');
    } finally {
      setUpdating(null);
      setConfirmOpen(false);
      setCancelTarget(null);
      setConfirmLoading(false);
    }
  };

  const requestCancel = (sub: Subscription) => {
    setCancelTarget(sub);
    setConfirmOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setConfirmLoading(true);
    await updateStatus(cancelTarget.id, 'canceled');
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const activeCount = subs.filter((s) => s.status === 'active').length;
  const canceledCount = subs.filter((s) => s.status === 'canceled').length;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* ConfirmDialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Cancel User Subscription"
        description={
          cancelTarget
            ? `Are you sure you want to cancel the ${cancelTarget.planName} subscription for ${cancelTarget.userName} (${cancelTarget.userEmail})? They will lose access to premium features at the end of their current billing cycle.`
            : ''
        }
        confirmLabel="Cancel Subscription"
        cancelLabel="Keep Active"
        danger
        loading={confirmLoading}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setConfirmOpen(false);
          setCancelTarget(null);
        }}
      />

      <PageHeader
        title="Subscriptions"
        description="Manage active memberships, renewals, and subscriber tiers"
        icon={CreditCard}
        actions={
        <button
          onClick={() => fetchSubs(page)}
          className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        }
      />

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Active Members</p>
            <p className="text-xl font-bold font-mono text-foreground">{activeCount}</p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Canceled</p>
            <p className="text-xl font-bold font-mono text-foreground">{canceledCount}</p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Total Subscriptions</p>
            <p className="text-xl font-bold font-mono text-foreground">{total}</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer name, email, or plan..."
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
          <option value="active">Active</option>
          <option value="canceled">Canceled</option>
          <option value="past_due">Past Due</option>
          <option value="trialing">Trialing</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={6} cols={6} />
        </div>
      ) : subs.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={CreditCard}
            title={search || statusFilter ? 'No matching subscriptions' : 'No subscriptions found'}
            description={
              search || statusFilter
                ? 'Try adjusting your search criteria or status filter.'
                : 'Customer subscriptions will automatically appear here once users upgrade.'
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
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Subscriber</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Current Period End</th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {subs.map((sub: Subscription) => {
                  const conf = STATUS_CONFIG[sub.status] ?? {
                    badge: 'bg-accent text-muted-foreground border-border/50',
                    icon: Clock,
                  };
                  const StatusIcon = conf.icon;

                  return (
                    <tr key={sub.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-xs text-foreground">{sub.userName || 'User'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{sub.userEmail}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          <CreditCard className="w-3 h-3" />
                          {sub.planName ?? 'Pro Tier'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                            conf.badge,
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span className="capitalize">{sub.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono uppercase">
                        {sub.provider || 'Stripe'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(sub.currentPeriodEnd)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sub.status === 'active' ? (
                            <button
                              onClick={() => requestCancel(sub)}
                              disabled={updating === sub.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              onClick={() => updateStatus(sub.id, 'active')}
                              disabled={updating === sub.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Reactivate
                            </button>
                          )}
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

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            Showing page {page} of {totalPages} &middot; {total} total
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 hover:bg-accent disabled:opacity-40 transition-colors"
            >
              &larr; Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 hover:bg-accent disabled:opacity-40 transition-colors"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
