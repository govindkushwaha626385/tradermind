// ──────────────────────────────────────────────
// TradeMind — Global Toast Notification System
//
// Usage:
//   import { toast, ToastContainer } from '@/components/Toast';
//
//   toast.success('Saved!');
//   toast.error('Something went wrong.');
//   toast.info('Syncing trades...');
//   toast.warning('Broker token expiring soon.');
//
// Add <ToastContainer /> once in a layout.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  exiting?: boolean;
}

// ── Event Bus ────────────────────────────────────────────────────────────────
// We use a lightweight event bus so `toast.*()` can be called from
// anywhere — including server actions and non-React code — without
// needing to pass props through the tree.

type ToastListener = (item: Omit<ToastItem, 'id'>) => void;
const listeners = new Set<ToastListener>();

function emit(item: Omit<ToastItem, 'id'>) {
  listeners.forEach((fn) => fn(item));
}

/** Call these anywhere to show a toast. */
export const toast = {
  success: (message: string, duration = 4000) => emit({ type: 'success', message, duration }),
  error:   (message: string, duration = 6000) => emit({ type: 'error',   message, duration }),
  info:    (message: string, duration = 4000) => emit({ type: 'info',    message, duration }),
  warning: (message: string, duration = 5000) => emit({ type: 'warning', message, duration }),
};

// ── Icon + style maps ─────────────────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType, { icon: React.ElementType; bar: string; text: string; bg: string }> = {
  success: { icon: CheckCircle2, bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/50' },
  error:   { icon: XCircle,      bar: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800/50' },
  info:    { icon: Info,         bar: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/50' },
  warning: { icon: AlertTriangle,bar: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/50' },
};

// ── Individual Toast ──────────────────────────────────────────────────────────

function Toast({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const { icon: Icon, bar, text, bg } = TOAST_STYLES[item.type];
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const duration = item.duration ?? 4000;

  // Shrink progress bar over time
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);

  // Auto-remove
  useEffect(() => {
    const timer = setTimeout(() => onRemove(item.id), duration);
    return () => clearTimeout(timer);
  }, [item.id, duration, onRemove]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'relative flex items-start gap-3 w-full max-w-sm rounded-2xl border p-4 shadow-lg shadow-black/10 backdrop-blur-md overflow-hidden',
        bg,
        item.exiting ? 'animate-toast-out' : 'animate-toast-in',
      )}
    >
      {/* Progress bar */}
      <div
        className={cn('absolute bottom-0 left-0 h-0.5 rounded-full transition-all', bar)}
        style={{ width: `${progress}%`, transitionDuration: '50ms' }}
      />

      <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', text)} />

      <p className="text-sm font-medium text-foreground flex-1 leading-relaxed">
        {item.message}
      </p>

      <button
        onClick={() => onRemove(item.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Toast Container ───────────────────────────────────────────────────────────

/**
 * Place <ToastContainer /> once in a root layout (e.g. client-layout.tsx).
 * Toasts will stack in the bottom-right corner.
 */
export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    // Trigger exit animation then remove
    setItems((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  useEffect(() => {
    const handler: ToastListener = (item) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev.slice(-4), { ...item, id }]); // max 5 toasts
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
    >
      {items.map((item) => (
        <div key={item.id} className="pointer-events-auto w-full max-w-sm">
          <Toast item={item} onRemove={remove} />
        </div>
      ))}
    </div>
  );
}
