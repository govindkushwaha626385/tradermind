// ──────────────────────────────────────────────
// TradeMind — Admin Invoices Viewer
//
// Allows admins to view all payment invoices across users.
// Features: status filter, user search, revenue summary, SkeletonTable, EmptyState.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface Invoice {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  provider: string;
  amountPaid: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { badge: string; icon: typeof CheckCircle2 }> = {
  paid: { badge: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  open: { badge: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  void: { badge: 'bg-accent text-muted-foreground border-border/50', icon: XCircle },
  uncollectible: { badge: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    document.title = 'Invoices — TradeMind | Admin';
  }, []);

  const fetchInvoices = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.getAdminInvoices({ page, limit: 20 });
      if (res.success) {
        const result = res.data as { data: Invoice[]; pagination: Pagination };
        setInvoices(result.data ?? []);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

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

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      !search ||
      inv.userName?.toLowerCase().includes(search.toLowerCase()) ||
      inv.userEmail?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCollected = filteredInvoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amountPaid, 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <PageHeader
        title="Invoices & Billing"
        description="Payment records and transaction history across all platform users"
        icon={Receipt}
        actions={
        <button
          onClick={() => fetchInvoices(pagination.page)}
          className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        }
      />

      {/* Mini Revenue Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Page Revenue</p>
            <p className="text-xl font-bold font-mono text-foreground">
              {formatAmount(totalCollected, 'INR')}
            </p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Paid Invoices</p>
            <p className="text-xl font-bold font-mono text-foreground">
              {filteredInvoices.filter((i) => i.status === 'paid').length}
            </p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Total Count</p>
            <p className="text-xl font-bold font-mono text-foreground">{pagination.total}</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer name or email..."
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
          <option value="paid">Paid</option>
          <option value="open">Open / Pending</option>
          <option value="void">Void</option>
          <option value="uncollectible">Failed / Uncollectible</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={6} cols={6} />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Receipt}
            title={search || statusFilter ? 'No matching invoices' : 'No invoices yet'}
            description={
              search || statusFilter
                ? 'Try adjusting your search query or status filter.'
                : 'Customer subscription and renewal invoices will show up here.'
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
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Paid At</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredInvoices.map((inv) => {
                  const statusConf = STATUS_CONFIG[inv.status] ?? {
                    badge: 'bg-accent text-muted-foreground border-border/50',
                    icon: Clock,
                  };
                  const StatusIcon = statusConf.icon;

                  return (
                    <tr key={inv.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-xs text-foreground">{inv.userName || 'Customer'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{inv.userEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 font-bold font-mono text-sm">
                        {formatAmount(inv.amountPaid, inv.currency)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                            statusConf.badge,
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span className="capitalize">{inv.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono uppercase">
                        {inv.provider || 'Stripe'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(inv.paidAt)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(inv.createdAt)}
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
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} invoices)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchInvoices(pagination.page - 1)}
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
                  onClick={() => fetchInvoices(pagination.page + 1)}
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
