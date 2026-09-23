// ──────────────────────────────────────────────
// TradeMind — ConfirmDialog Component
//
// Premium confirmation modal that replaces
// window.confirm() with a non-blocking, branded
// dialog. Handles destructive actions safely.
// ──────────────────────────────────────────────

'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when opened (safe default)
  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl p-6 shadow-card-lg animate-bounce-in">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          aria-label="Close dialog"
          disabled={loading}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className={cn(
            'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
            danger
              ? 'bg-destructive/10 text-destructive'
              : 'bg-warning/10 text-warning',
          )}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 id="confirm-dialog-title" className="font-semibold text-base">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-input hover:bg-accent transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50',
              danger
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
