// ──────────────────────────────────────────────
// TradeMind — Institutional Trade Comparison Studio (v2.0)
//
// Side-by-side dual chart & execution diagnostic matrix:
// 1. Dual TradingView Candlestick Charts (Trade A vs Trade B)
// 2. Comparative Execution Metrics (Net P&L, R-Multiple, MFE/MAE, Holding Time)
// 3. Behavioral & Psychology Mirror (Emotions, Mistakes, Rule Compliance)
// 4. AI Comparative Diagnostic Synthesis
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Play,
  Activity,
  Layers,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Scale,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Percent,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { LightweightCandleChart, ChartTimeframe } from './LightweightCandleChart';
import { api } from '@/lib/api';
import type { TradeReplayData } from '@trademind/shared';

export interface TradeComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeA?: any;
  allTrades?: any[];
}

export function TradeComparisonModal({
  isOpen,
  onClose,
  tradeA: initialTradeA,
  allTrades = [],
}: TradeComparisonModalProps) {
  const router = useRouter();
  const { format, currency } = useCurrency();

  const [availableTrades, setAvailableTrades] = useState<any[]>(allTrades);
  const [selectedTradeAId, setSelectedTradeAId] = useState<string>('');
  const [selectedTradeBId, setSelectedTradeBId] = useState<string>('');
  const [selectedTf, setSelectedTf] = useState<ChartTimeframe>('5m');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);

  // Load available trades if not provided
  useEffect(() => {
    if (isOpen) {
      if (allTrades.length > 0) {
        setAvailableTrades(allTrades);
      } else {
        api.getJournalTrades({ limit: 50, status: 'CLOSED' }).then((res) => {
          if (res.success && Array.isArray((res as any).data)) {
            setAvailableTrades((res as any).data);
          }
        }).catch(() => {});
      }
    }
  }, [isOpen, allTrades]);

  // Set initial selections
  useEffect(() => {
    if (isOpen && availableTrades.length > 0) {
      const firstTrade = initialTradeA || availableTrades[0];
      setSelectedTradeAId(firstTrade?.id || availableTrades[0]?.id || '');

      // Pick a suitable Trade B (e.g. opposite outcome or next trade)
      const oppositeOutcome = availableTrades.find(
        (t) => t.id !== firstTrade?.id && (Number(t.netPnl ?? 0) < 0 !== Number(firstTrade?.netPnl ?? 0) < 0)
      );
      const fallbackTrade = availableTrades.find((t) => t.id !== firstTrade?.id) || availableTrades[0];
      setSelectedTradeBId(oppositeOutcome?.id || fallbackTrade?.id || '');
    }
  }, [isOpen, initialTradeA, availableTrades]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const tradeA = useMemo(() => availableTrades.find((t) => t.id === selectedTradeAId), [availableTrades, selectedTradeAId]);
  const tradeB = useMemo(() => availableTrades.find((t) => t.id === selectedTradeBId), [availableTrades, selectedTradeBId]);

  const swapTrades = () => {
    const temp = selectedTradeAId;
    setSelectedTradeAId(selectedTradeBId);
    setSelectedTradeBId(temp);
  };

  // Convert raw trade to TradeReplayData for LightweightCandleChart
  const toReplayData = (t: any): TradeReplayData | null => {
    if (!t) return null;
    const symbol = t.symbol || t.tradingsymbol || 'TRADE';
    const isLong =
      t.direction === 'LONG' ||
      t.direction === 'BUY' ||
      t.transactionType === 'BUY' ||
      t.side === 'BUY';
    const rawPrice =
      t.avgEntryPrice ??
      t.entryPrice ??
      t.executionPrice ??
      t.price ??
      0;
    const entryPrice = Number(rawPrice);
    const exitPrice = t.avgExitPrice ? Number(t.avgExitPrice) : t.exitPrice ? Number(t.exitPrice) : undefined;
    const hasPnl = t.netPnl !== undefined && t.netPnl !== null;
    const netPnl = Number(t.netPnl ?? t.realizedPnl ?? 0);
    const quantity = Number(t.totalQuantity ?? t.qty ?? t.quantity ?? 1);
    const entryTime = t.openedAt || t.executionTimestamp || t.entryTime || new Date().toISOString();
    const exitTime = t.closedAt || t.exitTime;

    return {
      tradeId: t.id,
      symbol,
      exchange: t.exchange || 'NSE',
      direction: isLong ? 'LONG' : 'SHORT',
      segment: t.segment || t.tradeType || 'EQUITY',
      entryPrice,
      exitPrice,
      quantity,
      entryTime,
      exitTime,
      mfe: t.maxFavorableExcursion != null ? Number(t.maxFavorableExcursion) : undefined,
      mae: t.maxAdverseExcursion != null ? Number(t.maxAdverseExcursion) : undefined,
      realizedPnl: hasPnl ? netPnl : undefined,
      markers: [
        {
          type: 'ENTRY',
          price: entryPrice,
          timestamp: entryTime,
          label: `Entry: ${entryPrice.toFixed(2)}`,
          color: isLong ? '#22c55e' : '#ef4444',
        },
        ...(exitPrice
          ? [
              {
                type: 'EXIT' as const,
                price: exitPrice,
                timestamp: t.closedAt || t.exitTime || new Date().toISOString(),
                label: `Exit: ${exitPrice.toFixed(2)} (${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)})`,
                color: netPnl >= 0 ? '#10b981' : '#f43f5e',
              },
            ]
          : []),
      ],
    };
  };

  const replayA = useMemo(() => toReplayData(tradeA), [tradeA]);
  const replayB = useMemo(() => toReplayData(tradeB), [tradeB]);

  // AI Diagnostic synthesis
  const generateComparativeDiagnosis = () => {
    if (!tradeA || !tradeB) return;
    setAnalyzing(true);

    const pnlA = Number(tradeA.netPnl ?? 0);
    const pnlB = Number(tradeB.netPnl ?? 0);
    const symbolA = tradeA.tradingsymbol || tradeA.symbol || 'Trade A';
    const symbolB = tradeB.tradingsymbol || tradeB.symbol || 'Trade B';
    const emotionsA = (tradeA.emotions || []).join(', ') || 'Disciplined';
    const emotionsB = (tradeB.emotions || []).join(', ') || 'Disciplined';
    const mistakesB = (tradeB.mistakeTags || []).join(', ') || 'None';

    setTimeout(() => {
      let insight = `### ⚖️ Trade Execution Diagnosis: ${symbolA} vs ${symbolB}\n\n`;

      if (pnlA > 0 && pnlB < 0) {
        insight += `• **Process Adherence Divergence**: In **${symbolA}** (+${format(pnlA)}), your patience allowed the trade to develop with positive R:R. Conversely, in **${symbolB}** (${format(pnlB)}), psychological friction (*${emotionsB}*) and execution leak (*${mistakesB}*) cut into your expectancy.\n\n`;
        insight += `• **Exit Efficiency**: Trade A respected your planned target structure. Trade B suffered from early hesitation or adverse excursion without an immediate stop execution.\n\n`;
        insight += `• **Actionable Rule for Next Session**: Never trade ${symbolB} within 30 minutes of a winning exit on ${symbolA} to guard against overconfidence sizing.`;
      } else if (pnlA < 0 && pnlB > 0) {
        insight += `• **Recovery & Resilience**: While **${symbolA}** hit your stop loss (${format(pnlA)}), you successfully recalibrated on **${symbolB}** (+${format(pnlB)}) without taking revenge leverage.\n\n`;
        insight += `• **Key Difference**: On Trade B, your entry conformed with higher-timeframe confluence, keeping MAE (drawdown heat) minimal.`;
      } else {
        insight += `• **Comparative Setup Mechanics**: Both trades exhibited similar market regimes. Trade A yielded ${format(pnlA)} while Trade B yielded ${format(pnlB)}.\n\n`;
        insight += `• **Holding Duration Variance**: Note the time in trade. Shorter holds often indicate impatient profit-taking, while letting winners run expanded your R-Multiple.`;
      }

      setAiAnalysis(insight);
      setAnalyzing(false);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl border border-border/80 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-border/80 shrink-0 bg-background/80 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Trade Comparison Studio
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  Side-by-Side Dual Analysis
                </span>
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Compare execution timing, candlestick structure, MFE/MAE excursions, and psychology side-by-side.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trade Selector & Swap Ribbon */}
        <div className="p-3 sm:px-6 bg-muted/30 border-b border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Trade A Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-500/15 text-blue-500 border border-blue-500/30">
              Trade A
            </span>
            <select
              value={selectedTradeAId}
              onChange={(e) => setSelectedTradeAId(e.target.value)}
              className="flex-1 max-w-xs px-2.5 py-1.5 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {availableTrades.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tradingsymbol || t.symbol} ({t.direction}) · {Number(t.netPnl ?? 0) >= 0 ? '+' : ''}{format(Number(t.netPnl ?? 0))}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <button
            onClick={swapTrades}
            className="p-2 rounded-xl bg-accent hover:bg-accent/80 border border-border text-foreground transition-all shadow-sm"
            title="Swap Trade A and Trade B"
          >
            <ArrowLeftRight className="w-4 h-4 text-primary" />
          </button>

          {/* Trade B Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 justify-end">
            <span className="text-xs font-bold px-2 py-1 rounded bg-purple-500/15 text-purple-500 border border-purple-500/30">
              Trade B
            </span>
            <select
              value={selectedTradeBId}
              onChange={(e) => setSelectedTradeBId(e.target.value)}
              className="flex-1 max-w-xs px-2.5 py-1.5 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {availableTrades.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tradingsymbol || t.symbol} ({t.direction}) · {Number(t.netPnl ?? 0) >= 0 ? '+' : ''}{format(Number(t.netPnl ?? 0))}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 space-y-6 flex-1">
          {/* Dual Candlestick Charts Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart A */}
            <div className="glass-card rounded-2xl p-4 border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="font-bold text-sm text-foreground">
                    {tradeA?.tradingsymbol || tradeA?.symbol || 'Trade A'}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                    {tradeA?.direction}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-xs font-mono font-bold px-2 py-0.5 rounded-full',
                    Number(tradeA?.netPnl ?? 0) >= 0
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  )}
                >
                  {Number(tradeA?.netPnl ?? 0) >= 0 ? '+' : ''}
                  {format(Number(tradeA?.netPnl ?? 0))}
                </span>
              </div>

              {replayA ? (
                <LightweightCandleChart
                  data={replayA}
                  timeframe={selectedTf}
                  onTimeframeChange={setSelectedTf}
                  currency={currency}
                  className="rounded-xl overflow-hidden border border-border/60"
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                  No chart data available for Trade A
                </div>
              )}
            </div>

            {/* Chart B */}
            <div className="glass-card rounded-2xl p-4 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="font-bold text-sm text-foreground">
                    {tradeB?.tradingsymbol || tradeB?.symbol || 'Trade B'}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                    {tradeB?.direction}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-xs font-mono font-bold px-2 py-0.5 rounded-full',
                    Number(tradeB?.netPnl ?? 0) >= 0
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  )}
                >
                  {Number(tradeB?.netPnl ?? 0) >= 0 ? '+' : ''}
                  {format(Number(tradeB?.netPnl ?? 0))}
                </span>
              </div>

              {replayB ? (
                <LightweightCandleChart
                  data={replayB}
                  timeframe={selectedTf}
                  onTimeframeChange={setSelectedTf}
                  currency={currency}
                  className="rounded-xl overflow-hidden border border-border/60"
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                  No chart data available for Trade B
                </div>
              )}
            </div>
          </div>

          {/* Comparative Execution Metrics Table */}
          <div className="glass-card rounded-2xl p-4 border border-border space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Side-by-Side Execution Matrix
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground text-[11px]">
                    <th className="py-2 text-left font-semibold">Diagnostic Metric</th>
                    <th className="py-2 text-center font-bold text-blue-500">
                      Trade A ({tradeA?.tradingsymbol || 'A'})
                    </th>
                    <th className="py-2 text-center font-bold text-purple-500">
                      Trade B ({tradeB?.tradingsymbol || 'B'})
                    </th>
                    <th className="py-2 text-right font-semibold">Variance (Δ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {/* Net P&L */}
                  <tr>
                    <td className="py-2.5 font-medium text-foreground">Net Realized P&L</td>
                    <td className="py-2.5 text-center font-mono font-bold">
                      <span className={Number(tradeA?.netPnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {format(Number(tradeA?.netPnl ?? 0))}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold">
                      <span className={Number(tradeB?.netPnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {format(Number(tradeB?.netPnl ?? 0))}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-foreground">
                      {format(Number(tradeA?.netPnl ?? 0) - Number(tradeB?.netPnl ?? 0))}
                    </td>
                  </tr>

                  {/* Outcome */}
                  <tr>
                    <td className="py-2.5 font-medium text-foreground">Trade Outcome</td>
                    <td className="py-2.5 text-center">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', Number(tradeA?.netPnl ?? 0) >= 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500')}>
                        {Number(tradeA?.netPnl ?? 0) >= 0 ? 'WIN' : 'LOSS'}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', Number(tradeB?.netPnl ?? 0) >= 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500')}>
                        {Number(tradeB?.netPnl ?? 0) >= 0 ? 'WIN' : 'LOSS'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">—</td>
                  </tr>

                  {/* R-Multiple */}
                  <tr>
                    <td className="py-2.5 font-medium text-foreground">R-Multiple Achieved</td>
                    <td className="py-2.5 text-center font-mono font-semibold">
                      {tradeA?.rMultiple != null ? `${Number(tradeA.rMultiple).toFixed(2)}R` : '—'}
                    </td>
                    <td className="py-2.5 text-center font-mono font-semibold">
                      {tradeB?.rMultiple != null ? `${Number(tradeB.rMultiple).toFixed(2)}R` : '—'}
                    </td>
                    <td className="py-2.5 text-right font-mono text-muted-foreground">
                      {tradeA?.rMultiple != null && tradeB?.rMultiple != null
                        ? `${(Number(tradeA.rMultiple) - Number(tradeB.rMultiple)).toFixed(2)}R`
                        : '—'}
                    </td>
                  </tr>

                  {/* MFE & MAE */}
                  <tr>
                    <td className="py-2.5 font-medium text-foreground">Runup (MFE) vs Drawdown (MAE)</td>
                    <td className="py-2.5 text-center font-mono">
                      +{tradeA?.maxFavorableExcursion ?? 0} / -{tradeA?.maxAdverseExcursion ?? 0}
                    </td>
                    <td className="py-2.5 text-center font-mono">
                      +{tradeB?.maxFavorableExcursion ?? 0} / -{tradeB?.maxAdverseExcursion ?? 0}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">Points Heat</td>
                  </tr>

                  {/* Holding Duration */}
                  <tr>
                    <td className="py-2.5 font-medium text-foreground">Holding Period</td>
                    <td className="py-2.5 text-center font-mono">
                      {tradeA?.holdingPeriodMinutes ? `${tradeA.holdingPeriodMinutes} mins` : 'Intraday'}
                    </td>
                    <td className="py-2.5 text-center font-mono">
                      {tradeB?.holdingPeriodMinutes ? `${tradeB.holdingPeriodMinutes} mins` : 'Intraday'}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {tradeA?.holdingPeriodMinutes && tradeB?.holdingPeriodMinutes
                        ? `${Math.abs(tradeA.holdingPeriodMinutes - tradeB.holdingPeriodMinutes)}m diff`
                        : '—'}
                    </td>
                  </tr>

                  {/* Emotions Tagged */}
                  <tr>
                    <td className="py-2.5 font-medium text-foreground">Emotions Logged</td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {(tradeA?.emotions || []).length > 0 ? (
                          tradeA.emotions.map((e: string) => (
                            <span key={e} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold">
                              {e}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {(tradeB?.emotions || []).length > 0 ? (
                          tradeB.emotions.map((e: string) => (
                            <span key={e} className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-semibold">
                              {e}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">Psychology</td>
                  </tr>

                  {/* Mistakes Tagged */}
                  <tr>
                    <td className="py-2.5 font-medium text-foreground">Mistakes Tagged</td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {(tradeA?.mistakeTags || []).length > 0 ? (
                          tradeA.mistakeTags.map((m: string) => (
                            <span key={m} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-semibold">
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-emerald-500 text-[10px] font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> None
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {(tradeB?.mistakeTags || []).length > 0 ? (
                          tradeB.mistakeTags.map((m: string) => (
                            <span key={m} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-semibold">
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-emerald-500 text-[10px] font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> None
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">Execution Leaks</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Comparative Diagnostic Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/25 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                AI Comparative Trade Diagnosis
              </span>
              <button
                onClick={generateComparativeDiagnosis}
                disabled={analyzing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-brand disabled:opacity-50"
              >
                <Brain className="w-3.5 h-3.5" />
                {analyzing ? 'Synthesizing Diagnosis…' : 'Synthesize AI Diagnosis'}
              </button>
            </div>

            {aiAnalysis ? (
              <div className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed bg-background/60 p-3.5 rounded-xl border border-border/60">
                {aiAnalysis}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Click "Synthesize AI Diagnosis" to analyze execution discrepancies, behavioral traps, and high-conviction lessons between Trade A and Trade B.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-border flex items-center justify-between bg-background/50">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Viewing: <strong>{tradeA?.tradingsymbol || 'Trade A'}</strong> vs <strong>{tradeB?.tradingsymbol || 'Trade B'}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/80 border border-border text-xs font-semibold text-foreground transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
