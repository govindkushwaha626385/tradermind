// ──────────────────────────────────────────────
// TradeMind — Trade Candlestick Chart Modal
//
// Institutional TradingView Lightweight Charts inspection modal:
// - Multi-timeframe candlestick chart (1m to 1W)
// - Entry & Exit markers with P&L coloring
// - MFE & MAE excursion levels
// - Quick navigation to Full Replay & AI Autopsy
// ──────────────────────────────────────────────

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Play,
  ExternalLink,
  Activity,
  Layers,
  Calendar,
  Clock,
  ShieldCheck,
  Maximize2,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { LightweightCandleChart, ChartTimeframe } from './LightweightCandleChart';
import type { TradeReplayData } from '@trademind/shared';

interface TradeCandleModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: any;
  currency?: string;
}

export function TradeCandleModal({
  isOpen,
  onClose,
  trade,
  currency: currencyProp,
}: TradeCandleModalProps) {
  const router = useRouter();
  const { currency: globalCurrency, format } = useCurrency();
  const currency = currencyProp || globalCurrency;

  const [selectedTf, setSelectedTf] = useState<ChartTimeframe>('5m');

  // Close on Escape key
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

  const symbol = trade.symbol || trade.tradingsymbol || 'TRADE';
  const isLong =
    trade.direction === 'LONG' ||
    trade.direction === 'BUY' ||
    trade.transactionType === 'BUY' ||
    trade.side === 'BUY';
  const rawPrice =
    trade.avgEntryPrice ??
    trade.entryPrice ??
    trade.executionPrice ??
    trade.price ??
    0;
  const entryPrice = Number(rawPrice);
  const exitPrice = trade.avgExitPrice ? Number(trade.avgExitPrice) : trade.exitPrice ? Number(trade.exitPrice) : undefined;
  const hasPnl = trade.netPnl !== undefined && trade.netPnl !== null;
  const netPnl = Number(trade.netPnl ?? trade.realizedPnl ?? 0);
  const isWin = netPnl >= 0;
  const quantity = Number(trade.totalQuantity ?? trade.qty ?? trade.quantity ?? 1);
  const entryTime = trade.openedAt || trade.executionTimestamp || trade.entryTime || new Date().toISOString();
  const exitTime = trade.closedAt || trade.exitTime;

  // Convert trade into TradeReplayData for LightweightCandleChart
  const replayData: TradeReplayData = {
    tradeId: trade.id,
    symbol,
    exchange: trade.exchange || 'NSE',
    direction: isLong ? 'LONG' : 'SHORT',
    segment: trade.segment || trade.tradeType || 'EQUITY',
    entryPrice,
    exitPrice,
    quantity,
    entryTime,
    exitTime,
    mfe: trade.maxFavorableExcursion != null ? Number(trade.maxFavorableExcursion) : undefined,
    mae: trade.maxAdverseExcursion != null ? Number(trade.maxAdverseExcursion) : undefined,
    realizedPnl: hasPnl ? netPnl : undefined,
    markers: [
      {
        type: 'ENTRY',
        price: entryPrice,
        timestamp: entryTime,
        label: `Entry: ${entryPrice.toFixed(2)}`,
        color: isLong ? '#22c55e' : '#ef4444',
      },
      ...(exitPrice ? [{
        type: 'EXIT' as const,
        price: exitPrice,
        timestamp: exitTime || entryTime,
        label: `Exit: ${exitPrice.toFixed(2)}`,
        color: isWin ? '#10b981' : '#f43f5e',
      }] : []),
    ],
    journalReflection: trade.traderNotes,
    journalEmotions: trade.emotions,
    journalMistakes: trade.mistakeTags,
  };

  const handleAskCopilot = () => {
    const prompt = `Review my execution on ${symbol} (${isLong ? 'LONG' : 'SHORT'}):
• Entry: ${entryPrice.toFixed(2)}
• Exit: ${exitPrice ? exitPrice.toFixed(2) : 'Open'}
• Net P&L: ${isWin ? '+' : ''}${format(netPnl)}
• Emotions tagged: ${trade.emotions?.join(', ') || 'None'}
• Mistakes tagged: ${trade.mistakeTags?.join(', ') || 'None'}

Please give me an institutional execution autopsy, evaluate whether my entry was high-probability, and suggest where I could have trailed my stop more effectively.`;

    onClose();
    router.push(`/dashboard/ai-assistant?persona=autopsy&question=${encodeURIComponent(prompt)}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-trade-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border border-border/80 bg-background/95 shadow-2xl shadow-black/60 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.98) 100%)',
        }}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs border shadow-sm',
                isLong
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              )}
            >
              {isLong ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-trade-title" className="text-lg font-bold tracking-tight text-foreground">
                  {symbol}
                </h2>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider',
                    isLong
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  )}
                >
                  {isLong ? 'LONG / BUY' : 'SHORT / SELL'}
                </span>
                {trade.strategyName && (
                  <span className="hidden sm:inline px-2 py-0.5 rounded-full text-2xs font-semibold bg-accent text-accent-foreground border border-border">
                    {trade.strategyName}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>Qty: {quantity}</span>
                <span>·</span>
                <span>Entry: {entryPrice > 0 ? entryPrice.toFixed(2) : '—'}</span>
                {exitPrice && (
                  <>
                    <span>·</span>
                    <span>Exit: {exitPrice.toFixed(2)}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right: Net P&L + Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right mr-1">
              <div
                className={cn(
                  'text-lg sm:text-xl font-black tabular-nums',
                  !hasPnl
                    ? 'text-muted-foreground'
                    : isWin
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                )}
              >
                {!hasPnl ? '—' : (isWin ? '+' : '') + format(netPnl)}
              </div>
              {trade.rMultiple != null && (
                <div className="text-2xs font-bold text-muted-foreground">
                  {trade.rMultiple > 0 ? `+${trade.rMultiple.toFixed(2)}R` : `${trade.rMultiple.toFixed(2)}R`}
                </div>
              )}
            </div>

            {/* AI Copilot Autopsy */}
            <button
              onClick={handleAskCopilot}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
              title="Get instant AI execution autopsy"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Autopsy</span>
            </button>

            {/* Full Replay Page Link */}
            <Link
              href={`/dashboard/trades/${trade.id}/replay`}
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent hover:bg-accent/80 text-foreground border border-border flex items-center gap-1.5 transition-colors"
              title="Open full tick replay with tape reader"
            >
              <Play className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Replay</span>
            </Link>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label="Close chart modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Candlestick Chart Viewport */}
        <div className="flex-1 min-h-[460px] p-2 sm:p-4 overflow-hidden relative">
          <LightweightCandleChart
            data={replayData}
            timeframe={selectedTf}
            onTimeframeChange={setSelectedTf}
            currency={currency}
            className="h-full w-full rounded-2xl border border-border/40"
          />
        </div>

        {/* Footer Info Strip */}
        <div className="px-5 py-3 border-t border-border/60 bg-muted/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            {trade.openedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Opened: {new Date(trade.openedAt).toLocaleDateString()}</span>
              </span>
            )}
            {trade.maxFavorableExcursion != null && (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="font-bold">MFE:</span>
                <span>{trade.maxFavorableExcursion.toFixed(2)}</span>
              </span>
            )}
            {trade.maxAdverseExcursion != null && (
              <span className="flex items-center gap-1 text-rose-400">
                <span className="font-bold">MAE:</span>
                <span>{trade.maxAdverseExcursion.toFixed(2)}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/trades/${trade.id}`}
              onClick={onClose}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Full Trade Details</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
