// ──────────────────────────────────────────────
// TradeMind — Trade Detail & Analytics View
//
// World-class trade deep-dive interface:
// - TradingView Lightweight Candlestick Chart with entry/exit/stop/target markers
// - Full trade performance metrics (Net PnL, R-Multiple, MFE, MAE, Hold Time)
// - Psychological leaks & emotion breakdown (FOMO, Revenge, Early Exit)
// - Execution Fills breakdown & Fees
// - AI Copilot Trade Autopsy modal integration
// - One-click jump to full bar-by-bar Replay simulator
// ──────────────────────────────────────────────

'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  PlayCircle,
  Sparkles,
  ExternalLink,
  Brain,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  DollarSign,
  Activity,
  Layers,
  Shield,
  Edit3,
  Calendar,
  Share2,
  FileText,
  BadgePercent,
  Compass,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { LightweightCandleChart } from '@/components/chart/LightweightCandleChart';
import { TradingViewLiveWidget } from '@/components/chart/TradingViewLiveWidget';
import { resolveTradingViewSymbol } from '@/lib/tradingview-symbols';
import { TradeScreenshotGallery } from '@/components/chart/TradeScreenshotGallery';
import { TradeAutopsy } from '@/components/ai/TradeAutopsy';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/Toast';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { TradeReplayData } from '@trademind/shared';

interface TradeDetailProps {
  params: Promise<{ tradeId: string }>;
}

export default function TradeDetailPage({ params }: TradeDetailProps) {
  const resolvedParams = use(params);
  const tradeId = resolvedParams.tradeId;
  const router = useRouter();
  const { format, currency } = useCurrency();

  const [replayData, setReplayData] = useState<TradeReplayData | null>(null);
  const [tradeData, setTradeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autopsyOpen, setAutopsyOpen] = useState(false);
  const [chartViewMode, setChartViewMode] = useState<'live' | 'replay'>('live');

  useEffect(() => {
    if (!tradeId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getTradeReplay(tradeId),
      api.getTrade(tradeId),
    ])
      .then(([replayRes, tradeRes]) => {
        if (replayRes?.data) {
          setReplayData(replayRes.data);
        }
        if (tradeRes?.data) {
          setTradeData(tradeRes.data);
        }
        if (!replayRes?.data && !tradeRes?.data) {
          setError('Trade not found or unauthorized.');
        }
      })
      .catch((err: any) => {
        setError(err?.message ?? 'Failed to load trade details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tradeId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-pulse">
        <div className="h-10 w-48 bg-muted/60 rounded-xl" />
        <div className="h-96 bg-muted/40 rounded-2xl border border-border/40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted/40 rounded-xl border border-border/40" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !replayData) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Trade Details Unavailable</h2>
        <p className="text-sm text-muted-foreground">{error ?? 'Unable to find this trade.'}</p>
        <Link
          href="/dashboard/trades"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trades
        </Link>
      </div>
    );
  }

  const isLong = replayData.direction === 'LONG';
  const pnl = replayData.realizedPnl ?? tradeData?.netPnl ?? 0;
  const isWin = pnl > 0;
  const isBreakeven = pnl === 0;

  // Calculate hold duration in minutes / hours
  let holdDurationText = '—';
  if (replayData.entryTime && replayData.exitTime) {
    const start = new Date(replayData.entryTime).getTime();
    const end = new Date(replayData.exitTime).getTime();
    const diffMins = Math.max(1, Math.round((end - start) / 60000));
    if (diffMins < 60) {
      holdDurationText = `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      holdDurationText = `${hours}h ${mins}m`;
    }
  }

  const returnPct =
    replayData.entryPrice && replayData.exitPrice
      ? ((replayData.exitPrice - replayData.entryPrice) / replayData.entryPrice) * (isLong ? 100 : -100)
      : null;

  // Institutional Risk-Reward & R-Multiple
  let calculatedR: number | null = null;
  if (tradeData?.rMultiple != null && !isNaN(Number(tradeData.rMultiple))) {
    calculatedR = Number(tradeData.rMultiple);
  } else if (replayData.planStop && replayData.entryPrice && replayData.exitPrice) {
    const risk = Math.abs(replayData.entryPrice - replayData.planStop);
    const reward = isLong ? replayData.exitPrice - replayData.entryPrice : replayData.entryPrice - replayData.exitPrice;
    if (risk > 0) {
      calculatedR = Number((reward / risk).toFixed(2));
    }
  }

  // MFE Efficiency (% of peak gain captured)
  let mfeEfficiency: number | null = null;
  if (replayData.mfe && replayData.mfe > 0 && pnl > 0) {
    mfeEfficiency = Math.min(100, Math.round((pnl / replayData.mfe) * 100));
  }

  // Total Fees & Tax Drag
  const totalFeesAndTaxes = Number(tradeData?.totalFeesAndTaxes ?? tradeData?.fees ?? 0);
  const grossPnl = Number(tradeData?.grossPnl ?? pnl + totalFeesAndTaxes);
  const feeDragPct = grossPnl > 0 && totalFeesAndTaxes > 0 ? Number(((totalFeesAndTaxes / grossPnl) * 100).toFixed(1)) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/trades"
            className="p-2 rounded-xl border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Back to Trades List"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-jakarta">
                {replayData.symbol}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase',
                  isLong
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                )}
              >
                {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {replayData.direction}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                {replayData.exchange}
              </span>
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-md',
                  isWin
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : isBreakeven
                    ? 'bg-zinc-500/15 text-zinc-400'
                    : 'bg-red-500/15 text-red-500'
                )}
              >
                {isWin ? 'WIN' : isBreakeven ? 'BE' : 'LOSS'}
              </span>
              {calculatedR !== null && (
                <span
                  className={cn(
                    'text-xs font-bold font-mono px-2 py-0.5 rounded-md border',
                    calculatedR >= 2
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : calculatedR > 0
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  )}
                >
                  {calculatedR > 0 ? `+${calculatedR}` : calculatedR}R
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(replayData.entryTime)} • Qty: {replayData.quantity.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const el = document.getElementById('ai-autopsy-section');
              el?.scrollIntoView({ behavior: 'smooth' });
              const btn = document.getElementById(`ai-analyze-btn-${tradeId}`);
              btn?.click();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/30 text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-violet-400" />
            AI Trade Autopsy
          </button>
          <Link
            href={`/dashboard/trades/${tradeId}/replay`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:opacity-95 shadow-md shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            <PlayCircle className="w-4 h-4" />
            Candle Replay
          </Link>
        </div>
      </div>

      {/* Main Interactive Candlestick Chart */}
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xl">
        <div className="p-3.5 sm:p-4 border-b border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-xl p-1 bg-muted/50 border border-border/40 text-xs">
              <button
                type="button"
                onClick={() => setChartViewMode('live')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                  chartViewMode === 'live'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-Time TradingView Terminal</span>
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('replay')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                  chartViewMode === 'replay'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>Execution Replay & Fills</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
            {chartViewMode === 'live' ? (() => {
              const tvRes = resolveTradingViewSymbol(replayData.symbol, replayData.exchange);
              return (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live Feed: <strong className="text-white font-mono">{tvRes.cleanSymbol}</strong>
                  {tvRes.isDerivative && (
                    <span className="hidden sm:inline text-zinc-400">· Underlying of {replayData.symbol}</span>
                  )}
                </span>
              );
            })() : (
              <>
                <span>
                  Entry: <strong className="text-foreground">{format(replayData.entryPrice, tradeData?.currency)}</strong>
                </span>
                {replayData.exitPrice && (
                  <span>
                    Exit: <strong className="text-foreground">{format(replayData.exitPrice, tradeData?.currency)}</strong>
                  </span>
                )}
                {returnPct !== null && (
                  <span className={cn('font-bold', returnPct >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                    {returnPct >= 0 ? '+' : ''}
                    {returnPct.toFixed(2)}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-2 sm:p-4">
          {chartViewMode === 'live' ? (
            <div className="w-full h-[480px] sm:h-[560px] lg:h-[620px] rounded-2xl overflow-hidden border border-border/40 bg-zinc-950">
              <TradingViewLiveWidget
                symbol={resolveTradingViewSymbol(replayData.symbol, replayData.exchange).cleanSymbol}
                height="100%"
                interval="5"
                allowSymbolChange={true}
                onFallbackToCanvas={() => setChartViewMode('replay')}
              />
            </div>
          ) : (
            <LightweightCandleChart
              data={replayData}
              currency={tradeData?.currency ?? currency}
              timeframe="5m"
            />
          )}
        </div>
      </div>

      {/* Performance KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net P&L</p>
          <p
            className={cn(
              'text-lg sm:text-xl font-bold font-mono tracking-tight',
              pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
            )}
          >
            {pnl >= 0 ? '+' : ''}
            {format(pnl, tradeData?.currency)}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {returnPct !== null ? `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}% return` : 'After charges'}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">R-Multiple</p>
          <p
            className={cn(
              'text-lg sm:text-xl font-bold font-mono',
              calculatedR !== null
                ? calculatedR >= 2
                  ? 'text-purple-400'
                  : calculatedR > 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
                : 'text-muted-foreground'
            )}
          >
            {calculatedR !== null ? `${calculatedR > 0 ? '+' : ''}${calculatedR}R` : '—'}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {replayData.planStop ? 'Calculated vs Stop' : 'No planned stop'}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Holding Time</p>
          <p className="text-lg sm:text-xl font-bold font-mono text-foreground flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />
            {holdDurationText}
          </p>
          <span className="text-[10px] text-muted-foreground">Open to close duration</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Max Fav. (MFE)</p>
          <p className="text-lg sm:text-xl font-bold font-mono text-blue-400">
            {replayData.mfe != null ? `+${format(replayData.mfe, tradeData?.currency)}` : '—'}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {mfeEfficiency !== null ? `${mfeEfficiency}% capture rate` : 'Peak unrealized'}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Max Adv. (MAE)</p>
          <p className="text-lg sm:text-xl font-bold font-mono text-orange-400">
            {replayData.mae != null ? `-${format(replayData.mae, tradeData?.currency)}` : '—'}
          </p>
          <span className="text-[10px] text-muted-foreground">Maximum adverse drawdown</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fees & Taxes</p>
          <p className="text-lg sm:text-xl font-bold font-mono text-foreground">
            {totalFeesAndTaxes > 0 ? format(totalFeesAndTaxes, tradeData?.currency) : '₹0.00'}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {feeDragPct !== null ? `${feeDragPct}% of gross profit` : 'Brokerage & statutory'}
          </span>
        </div>
      </div>

      {/* Psychology, Rules & Plan Evaluation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Behavioral & Emotional Leaks */}
        <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-foreground">Psychological & Emotion Tracker</h2>
            </div>
            {replayData.journalRatings && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold">
                Quality: {Math.round(((replayData.journalRatings.execution + replayData.journalRatings.plan + replayData.journalRatings.psychology) / 15) * 100)}%
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Emotions Logged:</p>
              {replayData.journalEmotions && replayData.journalEmotions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {replayData.journalEmotions.map((e) => (
                    <span
                      key={e}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-medium"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No emotions recorded.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Rule Violations / Mistakes:</p>
              {replayData.journalMistakes && replayData.journalMistakes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {replayData.journalMistakes.map((m) => (
                    <span
                      key={m}
                      className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-500 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Clean execution — no mistakes logged.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pre-Market Plan vs Execution */}
        <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-foreground">Pre-Market Plan & Guardrails</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-muted-foreground">Market Bias:</span>
              <span className="font-semibold text-foreground uppercase">
                {replayData.premarketBias || 'Neutral / Unplanned'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-muted-foreground">Planned Stop Loss:</span>
              <span className="font-mono font-semibold text-foreground">
                {replayData.planStop ? format(replayData.planStop, tradeData?.currency) : 'None set'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-muted-foreground">Planned Target:</span>
              <span className="font-mono font-semibold text-foreground">
                {replayData.planTarget ? format(replayData.planTarget, tradeData?.currency) : 'None set'}
              </span>
            </div>

            {replayData.premarketKeyLevels && (
              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                <span className="text-muted-foreground block mb-1">Key Technical Levels:</span>
                <span className="text-foreground">{replayData.premarketKeyLevels}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trade Journal & Trader Reflection Notes */}
      <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Trader Journal & Reflection</h2>
          </div>
          <Link
            href="/dashboard/journal"
            className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
          >
            Open in Journal <ArrowLeft className="w-3 h-3 rotate-180" />
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {replayData.journalReflection ||
            tradeData?.notes ||
            'No journal reflection logged for this trade yet. Head over to the Journal tab to add entry notes, market context, and lessons.'}
        </div>
      </div>

      {/* Multi-Timeframe Chart Screenshots & AI Vision */}
      <TradeScreenshotGallery
        tradeId={tradeId}
        symbol={replayData.symbol}
        initialScreenshots={
          Array.isArray(tradeData?.screenshotUrls)
            ? tradeData.screenshotUrls.map((url: string, idx: number) => ({
                id: `existing-${idx}`,
                url,
                tag: idx === 0 ? 'HTF_CONTEXT' : 'LTF_ENTRY',
                uploadedAt: new Date().toISOString(),
              }))
            : []
        }
      />

      {/* AI Trade Autopsy Section */}
      <div id="ai-autopsy-section" className="p-5 rounded-2xl border border-violet-500/30 bg-card space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="font-bold text-foreground">AI Copilot Trade Autopsy & Execution Grade</h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">Powered by Gemini & Groq</span>
        </div>
        <TradeAutopsy
          tradeId={tradeId}
          symbol={replayData.symbol}
        />
      </div>
    </div>
  );
}
