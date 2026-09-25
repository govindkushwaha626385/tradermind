// ──────────────────────────────────────────────
// TradeMind — AI Trade Autopsy Modal
// Instant slide-over/modal root-cause diagnosis of trade execution,
// slippage, emotional leaks, and strategic compliance.
// ──────────────────────────────────────────────

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart2,
  PlayCircle,
  ExternalLink,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { TradeAutopsy } from './TradeAutopsy';

interface TradeAutopsyModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: any;
  currency?: string;
  onOpenChart?: () => void;
}

export function TradeAutopsyModal({
  isOpen,
  onClose,
  trade,
  currency: currencyProp,
  onOpenChart,
}: TradeAutopsyModalProps) {
  const { currency: globalCurrency, format } = useCurrency();
  const currency = currencyProp || globalCurrency;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !trade) return null;

  const symbol = trade.tradingsymbol || trade.symbol || 'TRADE';
  const isLong =
    trade.direction === 'LONG' ||
    trade.direction === 'BUY' ||
    trade.transactionType === 'BUY' ||
    trade.side === 'BUY';
  const netPnl = Number(trade.netPnl ?? trade.realizedPnl ?? 0);
  const isWin = netPnl >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-scale-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-pink-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate font-display">
                  {symbol}
                </h2>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    isLong ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  )}
                >
                  {isLong ? 'LONG' : 'SHORT'}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold',
                    isWin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  )}
                >
                  {isWin ? '+' : ''}{format(netPnl)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI Executive Root-Cause Trade Autopsy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenChart && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChart();
                }}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/60 bg-background/50 hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                title="Open Candlestick Chart"
              >
                <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Chart</span>
              </button>
            )}
            <Link
              href={`/dashboard/trades/${trade.id}/replay`}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-400 transition-colors"
              title="Open Bar-by-Bar Replay"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Replay</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              aria-label="Close autopsy"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <TradeAutopsy
            tradeId={trade.id}
            symbol={symbol}
          />
        </div>
      </div>
    </div>
  );
}
