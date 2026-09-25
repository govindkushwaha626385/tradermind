// ──────────────────────────────────────────────
// TradeMind — Admin Live System Audit Stream
// Real-time forensic audit trail of all administrative actions,
// quota overrides, broadcast announcements, and sync operations.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  RefreshCw,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  FileCode,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface AuditLogItem {
  id: string;
  action: string;
  adminId: string;
  adminEmail?: string;
  targetId?: string;
  targetType?: string;
  ipAddress?: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export function AdminAuditStream() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.getAdminAuditLogs({ limit: 25 });
      if (res.success && res.data) {
        setLogs((res.data.logs as AuditLogItem[]) ?? []);
      }
    } catch {
      // background poll error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('QUOTA') || action.includes('OVERRIDE')) {
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
    if (action.includes('ROLE') || action.includes('ADMIN')) {
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    }
    if (action.includes('BROADCAST')) {
      return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    }
    if (action.includes('SYNC')) {
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
    if (action.includes('CACHE') || action.includes('FLUSH')) {
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    }
    return 'bg-primary/10 text-primary border-primary/20';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Live System Audit Stream
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable forensic trail of configuration changes, security overrides, and system jobs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5',
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-muted text-muted-foreground border-border',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground',
              )}
            />
            {autoRefresh ? 'Live Polling (8s)' : 'Paused'}
          </button>

          <Link
            href="/admin/audit-logs"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Full Audit Archive</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => {
              setLoading(true);
              fetchLogs();
            }}
            disabled={loading}
            className="p-1.5 rounded-lg bg-accent/60 hover:bg-accent text-muted-foreground transition-all cursor-pointer"
            title="Refresh stream"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Loading audit events...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground bg-accent/20 rounded-xl border border-border/40">
          No audit log events recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const hasDetails = log.details && Object.keys(log.details).length > 0;

            return (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-accent/30 border border-border/60 hover:border-border transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'text-[11px] font-bold font-mono px-2 py-0.5 rounded-md border uppercase',
                        getActionBadgeColor(log.action),
                      )}
                    >
                      {log.action}
                    </span>
                    <span className="text-xs text-foreground font-semibold flex items-center gap-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      {log.adminEmail || log.adminId || 'System Worker'}
                    </span>
                    {log.targetType && (
                      <span className="text-[11px] text-muted-foreground">
                        → {log.targetType}:{' '}
                        <span className="font-mono text-foreground font-medium">
                          {log.targetId?.slice(0, 12)}...
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleTimeString()} ·{' '}
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                    {hasDetails && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="p-1 rounded-md hover:bg-accent text-foreground transition-all cursor-pointer"
                        title={isExpanded ? 'Collapse Payload' : 'Expand Payload'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && hasDetails && (
                  <div className="mt-3 p-3 rounded-lg bg-background/90 border border-border/80 text-xs font-mono overflow-x-auto text-foreground/90">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
