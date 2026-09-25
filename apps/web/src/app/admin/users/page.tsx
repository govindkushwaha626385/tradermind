// ──────────────────────────────────────────────
// TradeMind — Admin User Management Page
//
// Allows admins to:
// - View all users with pagination & search
// - View user details (subscription, brokers, trades)
// - Promote/demote users to/from admin
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldOff,
  Mail,
  Calendar,
  Loader2,
  RefreshCw,
  UserCog,
  Trash2,
  X,
  LogIn,
  Download,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/export-csv';
import { toast } from '@/components/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  UserQuotaOverrideModal,
  type UserOverrideData,
} from '@/components/admin/UserQuotaOverrideModal';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: {
    id: string;
    planId: string;
    status: string;
    provider: string;
    currentPeriodEnd: string | null;
    trialEndsAt?: string | null;
  } | null;
  override?: {
    customTradeQuota?: number;
    notes?: string;
    grantedBy?: string;
    grantedAt?: string;
  } | null;
}

interface UserDetail extends AdminUser {
  brokerCount: number;
  tradeCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  // ConfirmDialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<AdminUser | UserDetail | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  // Quota Override Modal state
  const [overrideModalUser, setOverrideModalUser] = useState<UserOverrideData | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  const handleImpersonate = async (targetUser: AdminUser) => {
    if (targetUser.role === 'ADMIN') {
      toast.error('Cannot impersonate another administrator');
      return;
    }
    setImpersonating(targetUser.id);
    try {
      const res = await api.impersonateUser(targetUser.id);
      if (res.success && res.data) {
        toast.success(`Generated impersonation session for ${res.data.targetUser.name}`);
        sessionStorage.setItem('trademind_impersonated_user', JSON.stringify(res.data.targetUser));
        sessionStorage.setItem('trademind_access_token', res.data.token);
        window.open('/dashboard?impersonated=true', '_blank');
      } else {
        toast.error('Failed to generate impersonation token');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to impersonate user');
    } finally {
      setImpersonating(null);
    }
  };

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.getAdminUsers({
        page,
        limit: 20,
        search: search || undefined,
        role: roleFilter || undefined,
      });
      if (res.success) {
        setUsers((res.data as any).users ?? []);
        setPagination((res.data as any).pagination);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    document.title = 'User Management — TradeMind | Admin';
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    setSearch(searchInput);
    fetchUsers(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const viewUserDetail = async (id: string) => {
    setLoadingDetail(true);
    setSelectedUser(null);
    try {
      const res = await api.getAdminUser(id);
      if (res.success) setSelectedUser(res.data as UserDetail);
    } catch (err) {
      console.error('Failed to fetch user detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleRole = async (user: AdminUser) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setUpdatingRole(user.id);
    try {
      const res = await api.updateUserRole(user.id, newRole);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)),
        );
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) => (prev ? { ...prev, role: newRole } : null));
        }
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setUpdatingRole(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success';
      case 'canceled':
      case 'expired':
        return 'bg-destructive/10 text-destructive';
      case 'past_due':
      case 'incomplete':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-accent text-muted-foreground';
    }
  };


  // Open confirm dialog (non-blocking, replaces window.confirm)
  const requestDeleteUser = (user: AdminUser | UserDetail) => {
    setConfirmTarget(user);
    setConfirmOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      const res = await api.deleteAdminUser(confirmTarget.id);
      if (res.success) {
        toast.success(`User ${confirmTarget.email} deleted successfully`);
        setSelectedUser(null);
        setConfirmOpen(false);
        setConfirmTarget(null);
        fetchUsers(pagination.page);
      } else {
        toast.error((res as any).error?.message || 'Failed to delete user');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete user');
    } finally {
      setConfirmLoading(false);
      setDeletingUser(null);
    }
  };

  const handleExportCsv = () => {
    if (users.length === 0) {
      toast.error('No users to export');
      return;
    }
    const success = downloadCsv(
      `trademind-users-${new Date().toISOString().split('T')[0]}`,
      users,
      [
        { header: 'User ID', accessor: (u) => u.id },
        { header: 'Full Name', accessor: (u) => u.name },
        { header: 'Email Address', accessor: (u) => u.email },
        { header: 'Role', accessor: (u) => u.role },
        { header: 'Subscription Plan', accessor: (u) => u.subscription?.planId ?? 'FREE' },
        { header: 'Subscription Status', accessor: (u) => u.subscription?.status ?? 'active' },
        { header: 'Joined At', accessor: (u) => u.createdAt },
      ]
    );
    if (success) toast.success(`Exported ${users.length} users to CSV`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* ConfirmDialog — replaces window.confirm() */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete User Account"
        description={confirmTarget
          ? `Permanently delete "${confirmTarget.name}" (${confirmTarget.email})? This removes all their trades, broker connections, journal entries, and account data. This action cannot be undone.`
          : ''}
        confirmLabel="Delete Permanently"
        cancelLabel="Keep Account"
        danger
        loading={confirmLoading}
        onConfirm={handleDeleteUser}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View, search, and manage all platform users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={users.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-input bg-background hover:bg-accent text-sm font-medium transition-colors disabled:opacity-50"
            title="Export Users to CSV"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => fetchUsers(pagination.page)}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Roles</option>
          <option value="USER">Users</option>
          <option value="ADMIN">Admins</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Users table + Detail panel */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Users table */}
        <div
          className={cn(
            'flex-1 glass-card rounded-2xl overflow-hidden',
            selectedUser && 'lg:max-w-[60%]',
          )}>
          {loading ? (
            <div className="p-4">
              <SkeletonTable rows={6} cols={5} />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {search ? 'No users match your search' : 'No users found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subscription</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={cn(
                        'border-b border-border/50 transition-colors hover:bg-accent/50 cursor-pointer',
                        selectedUser?.id === user.id && 'bg-accent',
                      )}
                      onClick={() => viewUserDetail(user.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            user.role === 'ADMIN'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-accent text-muted-foreground',
                          )}
                        >
                          {user.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {user.subscription ? (
                            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(user.subscription.status))}>
                              {user.subscription.status}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No plan</span>
                          )}
                          {user.override?.customTradeQuota !== undefined && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              ⚡ {user.override.customTradeQuota === -1 ? 'Unlimited' : `${user.override.customTradeQuota}/mo`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverrideModalUser(user as any);
                              setIsOverrideModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
                            title="Super-Console: Override Quotas & RBAC"
                          >
                            <Sliders className="w-3 h-3 text-primary" />
                            <span>Override</span>
                          </button>
                          {user.role !== 'ADMIN' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImpersonate(user);
                              }}
                              disabled={impersonating === user.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                              title="Impersonate User"
                            >
                              {impersonating === user.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <LogIn className="w-3 h-3" />
                              )}
                              Impersonate
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRole(user);
                            }}
                            disabled={updatingRole === user.id}
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                              user.role === 'ADMIN'
                                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            )}
                          >
                            {updatingRole === user.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : user.role === 'ADMIN' ? (
                              <ShieldOff className="w-3 h-3" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )}
                            {user.role === 'ADMIN' ? 'Demote' : 'Promote'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1}--
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchUsers(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User detail panel */}
        {selectedUser && (
          <div className="lg:w-96 glass-card rounded-2xl p-5 space-y-4 h-fit lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : selectedUser ? (
              <>
                {/* User info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">{selectedUser.name}</div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        selectedUser.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground',
                      )}
                    >
                      {selectedUser.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                      {selectedUser.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    {selectedUser.email}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {formatDateTime(selectedUser.createdAt)}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-accent/50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold">{selectedUser.brokerCount}</div>
                    <div className="text-xs text-muted-foreground">Brokers</div>
                  </div>
                  <div className="bg-accent/50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold">{selectedUser.tradeCount}</div>
                    <div className="text-xs text-muted-foreground">Trades</div>
                  </div>
                </div>

                {/* Subscription */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Subscription
                  </h4>
                  {selectedUser.subscription ? (
                    <div className="bg-accent/30 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Status</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(selectedUser.subscription.status))}>
                          {selectedUser.subscription.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Period End</span>
                        <span>{formatDate(selectedUser.subscription.currentPeriodEnd)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Provider</span>
                        <span className="capitalize">{selectedUser.subscription.provider}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No active subscription</p>
                  )}

                  {/* Super-Console Quota Override Badge */}
                  {selectedUser.override && (
                    <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-1.5">
                      <div className="font-bold text-amber-500 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Custom Quota Active</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-400">
                          OVERRIDDEN
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Monthly Trades:</span>
                        <strong className="text-foreground">
                          {selectedUser.override.customTradeQuota === -1 ? 'Unlimited' : `${selectedUser.override.customTradeQuota}/mo`}
                        </strong>
                      </div>
                      {selectedUser.override.notes && (
                        <div className="text-[11px] text-muted-foreground italic border-t border-border/40 pt-1">
                          "{selectedUser.override.notes}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => {
                      setOverrideModalUser(selectedUser as any);
                      setIsOverrideModalOpen(true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500/10 via-primary/10 to-emerald-500/10 hover:from-amber-500/20 hover:to-emerald-500/20 text-foreground border border-border transition-all cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-primary" />
                    <span>Override Quotas & Trial</span>
                  </button>

                  {selectedUser.role !== 'ADMIN' && (
                    <button
                      onClick={() => handleImpersonate(selectedUser)}
                      disabled={impersonating === selectedUser.id}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                    >
                      {impersonating === selectedUser.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      Impersonate This User
                    </button>
                  )}
                  <button
                    onClick={() => toggleRole(selectedUser)}
                    disabled={updatingRole === selectedUser.id}
                    className={cn(
                      'w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer',
                      selectedUser.role === 'ADMIN'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                        : 'bg-primary/10 text-primary hover:bg-primary/20',
                    )}
                  >
                    {updatingRole === selectedUser.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : selectedUser.role === 'ADMIN' ? (
                      <>
                        <ShieldOff className="w-4 h-4" />
                        Remove Admin
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Promote to Admin
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => requestDeleteUser(selectedUser)}
                    disabled={deletingUser === selectedUser.id}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {deletingUser === selectedUser.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Account
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Super-Console User Quota & RBAC Override Modal */}
      <UserQuotaOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setOverrideModalUser(null);
        }}
        user={overrideModalUser}
        onSuccess={() => {
          fetchUsers(pagination.page);
          if (selectedUser?.id && overrideModalUser?.id === selectedUser.id) {
            viewUserDetail(selectedUser.id);
          }
        }}
      />
    </div>
  );
}
