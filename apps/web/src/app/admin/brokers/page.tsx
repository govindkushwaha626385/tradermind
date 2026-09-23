// ──────────────────────────────────────────────
// TradeMind — Admin Broker Connections Viewer
//
// Allows admins to view all broker connections across users.
// Features: user search, broker filter, SkeletonTable, EmptyState, document.title.
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
  Plug,
  ShieldCheck,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface BrokerConnection {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  brokerId: string;
  brokerClientId: string;
  label: string;
  authType: string;
  status: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminBrokersPage() {
  const [brokers, setBrokers] = useState<BrokerConnection[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');

  useEffect(() => {
    document.title = 'Broker Connections — TradeMind | Admin';
  }, []);

  const fetchBrokers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.getAdminBrokers({ page, limit: 20 });
      if (res.success) {
        const result = res.data as { data: BrokerConnection[]; pagination: Pagination };
        setBrokers(result.data ?? []);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrokers();
  }, [fetchBrokers]);

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

  const filteredBrokers = brokers.filter((b) => {
    const matchesSearch =
      !search ||
      b.userName?.toLowerCase().includes(search.toLowerCase()) ||
      b.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      b.brokerClientId?.toLowerCase().includes(search.toLowerCase()) ||
      b.label?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !brokerFilter || b.brokerId?.toLowerCase() === brokerFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <PageHeader
        title="Broker Connections"
        description="Active broker API links and authentication credentials across all users"
        icon={Plug}
        actions={
        <button
          onClick={() => fetchBrokers(pagination.page)}
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
            placeholder="Search by user, email, client ID, or label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={brokerFilter}
          onChange={(e) => setBrokerFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Brokers</option>
          <option value="zerodha">Zerodha</option>
          <option value="upstox">Upstox</option>
          <option value="groww">Groww</option>
          <option value="angelone">AngelOne</option>
          <option value="dhan">Dhan</option>
          <option value="fyers">Fyers</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={6} cols={6} />
        </div>
      ) : filteredBrokers.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Plug}
            title={search || brokerFilter ? 'No matching connections' : 'No broker connections found'}
            description={
              search || brokerFilter
                ? 'Try adjusting your search criteria or broker filter.'
                : 'Users who connect their trading accounts via OAuth or API keys will appear here.'
            }
            action={
              search || brokerFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearch('');
                      setBrokerFilter('');
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
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Broker</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Client ID</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Last Synced</th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">Connected On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredBrokers.map((b) => (
                  <tr key={b.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-xs text-foreground">{b.userName || 'Trader'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{b.userEmail}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="capitalize font-semibold text-xs text-foreground font-mono">
                          {b.brokerId}
                        </span>
                        {b.label && (
                          <span className="text-xs px-2 py-0.5 rounded bg-accent/60 text-muted-foreground">
                            {b.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-foreground font-medium">
                      {b.brokerClientId}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                          b.isActive
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20',
                        )}
                      >
                        {b.isActive ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {b.isActive ? 'Active' : 'Disconnected'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDate(b.lastSyncedAt)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(b.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-accent/10">
              <div className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} connections)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchBrokers(pagination.page - 1)}
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
                  onClick={() => fetchBrokers(pagination.page + 1)}
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
