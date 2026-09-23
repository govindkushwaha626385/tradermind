// ──────────────────────────────────────────────
// TradeMind — Notification Panel (Bell Dropdown)
//
// A slide-down dropdown showing real notifications
// from the backend. Marks notifications as read.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Info,
  BookOpen,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const TYPE_STYLES: Record<string, { icon: React.ElementType; color: string }> = {
  unlogged_trade:     { icon: TrendingUp,    color: 'text-blue-500' },
  sync_complete:      { icon: RefreshCw,     color: 'text-emerald-500' },
  sync_failed:        { icon: AlertTriangle, color: 'text-red-500' },
  behavioral_insight: { icon: BookOpen,      color: 'text-violet-500' },
  token_expiry:       { icon: AlertTriangle, color: 'text-amber-500' },
  system:             { icon: Info,          color: 'text-muted-foreground' },
};

function getStyle(type: string) {
  return TYPE_STYLES[type] ?? TYPE_STYLES.system!;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

interface NotificationPanelProps {
  /** Callback to update the unread dot in the parent header */
  onUnreadChange?: (hasUnread: boolean) => void;
}

export function NotificationPanel({ onUnreadChange }: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Notify parent of unread state
  useEffect(() => {
    onUnreadChange?.(unreadCount > 0);
  }, [unreadCount, onUnreadChange]);

  // Load notifications when panel opens
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getNotifications?.({ limit: 20 });
      if (res?.success) {
        setNotifications((res.data as Notification[]) ?? []);
      }
    } catch {
      // Silent fail — notification loading is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  // Also check for unread on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await (api as any).getNotifications?.({ limit: 5, unreadOnly: true });
        if (res?.success) {
          const list = (res.data as Notification[]) ?? [];
          onUnreadChange?.(list.some((n) => !n.isRead));
        }
      } catch { /* ignore */ }
    })();
  }, [onUnreadChange]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  async function markAllRead() {
    try {
      await (api as any).markAllNotificationsRead?.();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  }

  async function markRead(id: string) {
    try {
      await (api as any).markNotificationRead?.(id);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, isRead: true } : n),
      );
    } catch { /* ignore */ }
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        id="notification-bell"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-card rounded-2xl shadow-xl shadow-black/10 border border-border animate-slide-down overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="p-1 rounded-md hover:bg-accent text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((n) => {
                  const { icon: Icon, color } = getStyle(n.type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        'w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors',
                        !n.isRead && 'bg-primary/5',
                      )}
                    >
                      <div className={cn('mt-0.5 shrink-0', color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn('text-sm font-medium truncate', !n.isRead && 'text-foreground')}>
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <button
                onClick={loadNotifications}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
