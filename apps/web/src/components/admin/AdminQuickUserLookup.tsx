// ──────────────────────────────────────────────
// TradeMind — Admin Quick User & Quota Control Hub
// Instant search, role escalation, custom quota overrides,
// and user troubleshooting directly within the admin console.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Users,
  Shield,
  ShieldAlert,
  Zap,
  Sliders,
  LogIn,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  UserQuotaOverrideModal,
  type UserOverrideData,
} from '@/components/admin/UserQuotaOverrideModal';

interface QuickUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
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
  brokerCount?: number;
  tradeCount?: number;
}

export function AdminQuickUserLookup() {
  const [users, setUsers] = useState<QuickUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOverrideData | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const fetchUsers = useCallback(async (query: string = '') => {
    setLoading(true);
    try {
      const res = await api.getAdminUsers({ search: query, limit: 12 });
      if (res.success && res.data) {
        setUsers(res.data.users as QuickUser[]);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  const handleImpersonate = async (user: QuickUser) => {
    setImpersonating(user.id);
    try {
      const res = await api.impersonateUser(user.id);
      if (res.success && res.data) {
        toast.success(`Impersonating ${user.email}. Redirecting...`);
        localStorage.setItem('accessToken', res.data.token);
        window.location.href = '/dashboard';
      } else {
        toast.error('Impersonation failed');
      }
    } catch {
      toast.error('Failed to impersonate user');
    } finally {
      setImpersonating(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Quick User &amp; Quota Command
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search active accounts, assign custom trade quotas, extend trials, or switch RBAC roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Full User Registry</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => fetchUsers(search)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-accent/60 hover:bg-accent text-muted-foreground transition-all cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by trader name, email, or user ID..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/80 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-sm"
        />
      </div>

      {/* User Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Searching accounts...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground bg-accent/20 rounded-xl border border-border/40">
          No users matching &quot;{search}&quot; found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {users.map((u) => {
            const hasCustomQuota =
              u.override?.customTradeQuota !== undefined &&
              u.override?.customTradeQuota !== null;
            const quotaDisplay =
              u.override?.customTradeQuota === -1
                ? 'Unlimited'
                : u.override?.customTradeQuota !== undefined
                ? `${u.override.customTradeQuota} trades/mo`
                : null;

            return (
              <div
                key={u.id}
                className="p-4 rounded-xl bg-accent/30 border border-border/60 hover:border-border transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {u.name || 'Unnamed Trader'}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
                          u.role === 'ADMIN'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-primary/10 text-primary border border-primary/20',
                        )}
                      >
                        {u.role}
                      </span>
                      {hasCustomQuota && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Quota: {quotaDisplay}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                      {u.email}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0',
                      u.subscription?.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {u.subscription?.status ?? 'Free'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2 text-xs">
                  <div className="text-muted-foreground text-[11px]">
                    Joined: {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setIsOverrideModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Quota / Plan</span>
                    </button>
                    <button
                      onClick={() => handleImpersonate(u)}
                      disabled={impersonating === u.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground font-medium text-xs transition-all cursor-pointer"
                      title="Impersonate Trader Session"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>Login As</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User Quota Override Modal */}
      <UserQuotaOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={() => fetchUsers(search)}
      />
    </div>
  );
}
