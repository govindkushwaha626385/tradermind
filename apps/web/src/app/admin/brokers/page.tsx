// ──────────────────────────────────────────────
// TradeMind — Admin Broker Connections Super-Console
//
// Allows platform administrators to:
// - View, filter, and search all broker connections across users
// - Force on-demand live trade synchronization for any connection
// - Toggle connection active/disabled state to handle broken tokens
// - Remove/disconnect corrupted broker connections safely
// - Inspect real-time connection status and timestamps
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
  Trash2,
  Power,
  PowerOff,
  Building2,
  Activity,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Confirm delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<BrokerConnection | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    document.title = 'Broker Super-Console — TradeMind | Admin';
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

  const handleForceSync = async (b: BrokerConnection) => {
    setSyncingId(b.id);
    try {
      const res = await api.adminForceSyncBroker(b.id);
      if (res.success) {
        const data = res.data;
        if (data?.tradesCreated !== undefined) {
          toast.success(
            `Synced ${b.brokerId.toUpperCase()}: ${data.importedCount ?? 0} executions, ${data.tradesCreated ?? 0} trades created`,
          );
        } else {
          toast.success(`Sync completed for ${b.brokerId.toUpperCase()}`);
        }
        fetchBrokers(pagination.page);
      } else {
        toast.error((res as any).error?.message || 'Sync failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sync broker');
    } finally {
      setSyncingId(null);
    }
  };

  const [syncingAll, setSyncingAll] = useState(false);

  const handleSyncAllBrokers = async () => {
    setSyncingAll(true);
    try {
      const res = await api.adminSyncAllBrokers();
      if (res.success && res.data) {
        const { totalConnections, successfulSyncs, totalImportedCount, totalTradesCreated } = res.data;
        toast.success(
          `Batch sync complete: ${successfulSyncs}/${totalConnections} active brokers synced (${totalImportedCount} fills, ${totalTradesCreated} trades)`,
        );
        fetchBrokers(pagination.page);
      } else {
        toast.error((res as any).error?.message || 'Batch sync failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sync brokers');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleToggleActive = async (b: BrokerConnection) => {
    setTogglingId(b.id);
    try {
      const res = await api.adminUpdateBroker(b.id, { isActive: !b.isActive });
      if (res.success) {
        toast.success(b.isActive ? `Deactivated ${b.brokerId.toUpperCase()}` : `Reactivated ${b.brokerId.toUpperCase()}`);
        setBrokers((prev) => prev.map((x) => (x.id === b.id ? { ...x, isActive: !b.isActive } : x)));
      } else {
        toast.error('Failed to toggle broker status');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to toggle broker status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!connectionToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await api.adminDeleteBroker(connectionToDelete.id);
      if (res.success) {
        toast.success(`Broker connection ${connectionToDelete.brokerClientId} deleted`);
        setBrokers((prev) => prev.filter((x) => x.id !== connectionToDelete.id));
        setDeleteConfirmOpen(false);
        setConnectionToDelete(null);
      } else {
        toast.error((res as any).error?.message || 'Failed to delete connection');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete connection');
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

  const activeCount = brokers.filter((b) => b.isActive).length;
  const disconnectedCount = brokers.length - activeCount;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <PageHeader
        title="Broker Connections Super-Console"
        description="Monitor, force-sync, toggle authentication tokens, and manage broker links across all users"
        icon={Plug}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAllBrokers}
              disabled={syncingAll}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-violet-600/25 transition-all cursor-pointer"
              title="Trigger automated sync across all active platform brokers"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', syncingAll && 'animate-spin')} />
              <span>{syncingAll ? 'Syncing All Brokers...' : 'Sync All Active Connections'}</span>
            </button>

            <button
              onClick={() => fetchBrokers(pagination.page)}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors border border-border/50 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Metric Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-border/60">
          <div className="text-xs font-medium text-muted-foreground">Total Connections</div>
          <div className="text-2xl font-bold text-foreground mt-1">{pagination.total || brokers.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Across all platform users</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/60">
          <div className="text-xs font-medium text-muted-foreground">Active &amp; Ready</div>
          <div className="text-2xl font-bold text-emerald-500 mt-1">{activeCount}</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Sync workers operational</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/60">
          <div className="text-xs font-medium text-muted-foreground">Disconnected / Token Revoked</div>
          <div className="text-2xl font-bold text-destructive mt-1">{disconnectedCount}</div>
          <div className="text-[10px] text-destructive/80 mt-0.5">Requires trader reconnection</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/60">
          <div className="text-xs font-medium text-muted-foreground">Supported Providers</div>
          <div className="text-2xl font-bold text-primary mt-1">12+</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Zerodha, Dhan, AngelOne, Upstox...</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by trader name, email, client ID, or custom label..."
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
          <option value="zerodha">Zerodha Kite</option>
          <option value="upstox">Upstox</option>
          <option value="dhan">Dhan HQ</option>
          <option value="angelone">AngelOne SmartAPI</option>
          <option value="fyers">Fyers API</option>
          <option value="groww">Groww</option>
          <option value="icici">ICICI Direct</option>
          <option value="kotak">Kotak Neo</option>
          <option value="finvasia">Shoonya (Finvasia)</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card rounded-2xl p-6">
          <SkeletonTable rows={6} cols={7} />
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
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">Super Actions</th>
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
                        {b.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDate(b.lastSyncedAt)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleForceSync(b)}
                          disabled={syncingId === b.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Force instant sync for this broker account"
                        >
                          <RefreshCw className={cn('w-3 h-3', syncingId === b.id && 'animate-spin')} />
                          <span>{syncingId === b.id ? 'Syncing...' : 'Force Sync'}</span>
                        </button>
                        <button
                          onClick={() => handleToggleActive(b)}
                          disabled={togglingId === b.id}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer',
                            b.isActive
                              ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20',
                          )}
                          title={b.isActive ? 'Deactivate connection' : 'Reactivate connection'}
                        >
                          {b.isActive ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                          <span>{b.isActive ? 'Disable' : 'Enable'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setConnectionToDelete(b);
                            setDeleteConfirmOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Delete connection"
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
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} connections)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchBrokers(pagination.page - 1)}
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
                  onClick={() => fetchBrokers(pagination.page + 1)}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Broker Connection"
        description={
          connectionToDelete
            ? `Permanently remove ${connectionToDelete.brokerId.toUpperCase()} connection (${connectionToDelete.brokerClientId}) for ${connectionToDelete.userEmail}? Automated synchronizations will stop immediately.`
            : ''
        }
        confirmLabel="Delete Connection"
        cancelLabel="Keep Connection"
        danger
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setConnectionToDelete(null);
        }}
      />
    </div>
  );
}
