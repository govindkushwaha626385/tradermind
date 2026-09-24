// ──────────────────────────────────────────────
// TradeMind — Quick Trade Capture (Mobile FAB)
//
// Floating action button on mobile/tablet for
// 30-second trade logging: Symbol, Direction,
// Qty, Entry/Exit price.
// ──────────────────────────────────────────────

'use client';

import { useState, useCallback } from 'react';
import { Plus, X, TrendingUp, TrendingDown, Loader2, CheckCircle2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

interface QuickTradeForm {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  quantity: string;
  entryPrice: string;
  exitPrice: string;
}

const EMPTY_FORM: QuickTradeForm = {
  symbol: '',
  direction: 'LONG',
  quantity: '',
  entryPrice: '',
  exitPrice: '',
};

interface QuickTradeCaptureProps {
  /** Refetch parent trade list after a successful log */
  onSuccess?: () => void;
}

export function QuickTradeCapture({ onSuccess }: QuickTradeCaptureProps) {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState<QuickTradeForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const pnl = (() => {
    const qty = parseFloat(form.quantity) || 0;
    const entry = parseFloat(form.entryPrice) || 0;
    const exit = parseFloat(form.exitPrice) || 0;
    if (!qty || !entry || !exit) return null;
    return form.direction === 'LONG'
      ? (exit - entry) * qty
      : (entry - exit) * qty;
  })();

  const reset = useCallback(() => {
    setForm(EMPTY_FORM);
    setDone(false);
    setOpen(false);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.quantity || !form.entryPrice || !form.exitPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tradingsymbol: form.symbol.toUpperCase().trim(),
        transactionType: form.direction === 'LONG' ? 'BUY' : 'SELL',
        quantity: parseFloat(form.quantity),
        averagePrice: parseFloat(form.entryPrice),
        fillPrice: parseFloat(form.exitPrice),
        product: 'MIS',
        exchange: 'NSE',
        tradeDate: new Date().toISOString(),
        isManual: true,
      };

      const res = await (api as any).createManualTrade(payload);
      if (res?.success !== false) {
        setDone(true);
        toast.success(`${form.symbol.toUpperCase()} logged successfully!`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('broker-synced', { detail: { manualTrade: true } }));
          window.dispatchEvent(new CustomEvent('trademind:trade-saved', { detail: payload }));
        }
        onSuccess?.();
        setTimeout(reset, 1500);
      } else {
        toast.error(res?.error?.message ?? 'Failed to log trade');
      }
    } catch (err) {
      toast.error('Failed to log trade. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form, onSuccess, reset]);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={reset}
        />
      )}

      {/* Slide-up capture sheet */}
      <div
        className={cn(
          'fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] left-3 right-3 z-[55] lg:hidden',
          'rounded-2xl border border-gray-200/50 dark:border-gray-800/50',
          'bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-2xl',
          'transition-all duration-300 ease-out origin-bottom',
          open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none',
        )}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Log Trade</h3>
              <p className="text-xs text-muted-foreground">Quick capture</p>
            </div>
            <button
              onClick={reset}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="w-10 h-10 text-success animate-bounce-in" />
              <p className="text-sm font-medium text-success">Trade logged!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Symbol + Direction */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Symbol (e.g. NIFTY)"
                  value={form.symbol}
                  onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring uppercase"
                  required
                  autoCapitalize="characters"
                />
                <div className="flex rounded-xl overflow-hidden border border-input">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, direction: 'LONG' }))}
                    className={cn(
                      'px-3 py-2.5 text-xs font-semibold flex items-center gap-1 transition-colors',
                      form.direction === 'LONG'
                        ? 'bg-success/20 text-success'
                        : 'text-muted-foreground hover:bg-accent',
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, direction: 'SHORT' }))}
                    className={cn(
                      'px-3 py-2.5 text-xs font-semibold flex items-center gap-1 transition-colors border-l border-input',
                      form.direction === 'SHORT'
                        ? 'bg-destructive/20 text-destructive'
                        : 'text-muted-foreground hover:bg-accent',
                    )}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    SELL
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <input
                type="number"
                placeholder="Quantity"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
                min="0"
                step="1"
                inputMode="numeric"
              />

              {/* Entry / Exit prices */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Entry Price</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.entryPrice}
                    onChange={(e) => setForm((f) => ({ ...f, entryPrice: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                    min="0"
                    step="0.05"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Exit Price</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.exitPrice}
                    onChange={(e) => setForm((f) => ({ ...f, exitPrice: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                    min="0"
                    step="0.05"
                    inputMode="decimal"
                  />
                </div>
              </div>

              {/* P&L Preview */}
              {pnl !== null && (
                <div className={cn(
                  'px-3 py-2 rounded-xl text-sm font-semibold text-center',
                  pnl >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                )}>
                  Est. P&L: {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Logging...' : 'Log Trade'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* FAB Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fixed right-4 z-[55] lg:hidden',
          'w-12 h-12 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-300',
          open
            ? 'bg-muted-foreground/20 text-foreground bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)]'
            : 'bg-primary text-primary-foreground bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] glow-primary',
        )}
        aria-label={open ? 'Close trade capture' : 'Log a trade'}
      >
        {open
          ? <X className="w-5 h-5" />
          : <Plus className="w-6 h-6" />
        }
      </button>
    </>
  );
}
