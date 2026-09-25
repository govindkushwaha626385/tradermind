// ──────────────────────────────────────────────
// TradeMind — Public Verified Trade Share Page
//
// Accessible by anyone with the link (no registration required).
// Sanitized for user privacy: account balances and private IDs are excluded.
// Viral organic growth loop for community sharing on Twitter/X, Discord & Reddit.
// ──────────────────────────────────────────────

'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Target,
  Layers,
  Award,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { LightweightCandleChart } from '@/components/chart/LightweightCandleChart';
import { toast } from '@/components/Toast';

interface PublicTradePageProps {
  params: Promise<{ tradeId: string }>;
}

export default function PublicTradeSharePage({ params }: PublicTradePageProps) {
  const resolvedParams = use(params);
  const tradeId = resolvedParams.tradeId;

  const [trade, setTrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!tradeId) return;
    setLoading(true);
    setError(null);

    api
      .getPublicSharedTrade(tradeId)
      .then((res: any) => {
        if (res?.success && res.data) {
          setTrade(res.data);
        } else {
          setError(res?.error?.message ?? 'Trade not found or is private.');
        }
      })
      .catch((err: any) => {
        setError(err?.message ?? 'Failed to load shared trade.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tradeId]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      toast.success('Trade share link copied to clipboard!');
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center animate-pulse">
          <Brain className="w-6 h-6 text-violet-400" />
        </div>
        <p className="text-sm text-slate-400 font-mono animate-pulse">Loading verified trade execution...</p>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white">Trade Record Unavailable</h1>
        <p className="text-sm text-slate-400 max-w-md">{error ?? 'This trade is marked as private or does not exist.'}</p>
        <div className="pt-2 flex items-center gap-3">
          <Link
            href="/demo"
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            Try Live Sandbox
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-all"
          >
            Return to TradeMind
          </Link>
        </div>
      </div>
    );
  }

  const isLong = trade.direction === 'LONG' || trade.direction === 'BUY';
  const pnl = Number(trade.realizedPnl ?? trade.netPnl ?? 0);
  const isWin = pnl > 0;
  const isBreakeven = pnl === 0;

  // Format holding duration
  let holdText = '—';
  if (trade.holdingPeriodMinutes) {
    const mins = Number(trade.holdingPeriodMinutes);
    if (mins < 60) holdText = `${mins}m`;
    else {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      holdText = m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
  }

  // Calculate return %
  let returnPct = 0;
  if (trade.entryPrice && trade.exitPrice) {
    const diff = isLong ? trade.exitPrice - trade.entryPrice : trade.entryPrice - trade.exitPrice;
    returnPct = Number(((diff / trade.entryPrice) * 100).toFixed(2));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-violet-500/30">
      {/* Top Navigation & Viral CTA Banner */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white font-display">TradeMind</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyLink}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{linkCopied ? 'Link Copied' : 'Share Trade'}</span>
          </button>

          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Try Live Sandbox</span>
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition-all hover:scale-105"
          >
            <span>Start Free Journal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        {/* Verification Pill */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Broker Execution • Automated Journal Record</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {formatDate(trade.entryTime)}
          </span>
        </div>

        {/* Hero Title & Primary Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold text-white font-display tracking-tight">
                {trade.symbol}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                  isLong
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                )}
              >
                {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {trade.direction}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                {trade.exchange || 'GLOBAL'}
              </span>
              <span
                className={cn(
                  'text-xs font-bold px-2.5 py-0.5 rounded-md',
                  isWin
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isBreakeven
                    ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                )}
              >
                {isWin ? 'WINNER' : isBreakeven ? 'BREAKEVEN' : 'LOSS'}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Segment: <span className="text-slate-200 font-medium">{trade.segment || 'EQUITY'}</span> • Execution Strategy:{' '}
              <span className="text-violet-400 font-medium">{trade.strategyName || 'Core Rule-Based Setup'}</span>
            </p>
          </div>

          {/* Primary PnL Badge */}
          <div className="text-right sm:border-l sm:border-white/10 sm:pl-6">
            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Realized Outcome</p>
            <p
              className={cn(
                'text-2xl sm:text-3xl font-extrabold font-mono tracking-tight',
                pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, trade.currency)}
            </p>
            {returnPct !== 0 && (
              <span className={cn('text-xs font-bold', returnPct > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {returnPct > 0 ? '+' : ''}{returnPct}% return
              </span>
            )}
          </div>
        </div>

        {/* TradingView Lightweight Candlestick Chart */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/[0.06] bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-slate-300">
                TradingView Candlestick Replay
              </span>
              <span className="text-slate-400">• Verified Fill Markers & Price Action</span>
            </div>
            <div className="flex items-center gap-4 font-mono text-slate-300">
              <span>Entry: <strong className="text-white">{formatCurrency(trade.entryPrice, trade.currency)}</strong></span>
              {trade.exitPrice && <span>Exit: <strong className="text-white">{formatCurrency(trade.exitPrice, trade.currency)}</strong></span>}
            </div>
          </div>

          <div className="p-2 sm:p-4">
            <LightweightCandleChart
              data={trade}
              currency={trade.currency}
              timeframe="5m"
            />
          </div>
        </div>

        {/* Institutional Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">R-Multiple</p>
            <p className={cn('text-lg sm:text-xl font-bold font-mono', (trade.rMultiple ?? 0) >= 2 ? 'text-purple-400' : (trade.rMultiple ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {trade.rMultiple ? `${trade.rMultiple > 0 ? '+' : ''}${trade.rMultiple}R` : '—'}
            </p>
            <span className="text-[10px] text-slate-500">Risk-to-reward ratio</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Entry Fill</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-white">
              {formatCurrency(trade.entryPrice, trade.currency)}
            </p>
            <span className="text-[10px] text-slate-500">Avg executed entry</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Exit Fill</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-white">
              {trade.exitPrice ? formatCurrency(trade.exitPrice, trade.currency) : 'Open'}
            </p>
            <span className="text-[10px] text-slate-500">Avg executed exit</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Holding Time</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-violet-400" />
              {holdText}
            </p>
            <span className="text-[10px] text-slate-500">In-market duration</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Max Fav (MFE)</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-blue-400">
              {trade.mfe ? `+${formatCurrency(trade.mfe, trade.currency)}` : '—'}
            </p>
            <span className="text-[10px] text-slate-500">Peak unrealized profit</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Max Adv (MAE)</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-orange-400">
              {trade.mae ? `-${formatCurrency(trade.mae, trade.currency)}` : '—'}
            </p>
            <span className="text-[10px] text-slate-500">Adverse drawdown</span>
          </div>
        </div>

        {/* Reflection & Psychology */}
        {(trade.journalReflection || trade.journalEmotions?.length > 0) && (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-400" />
              <h2 className="font-bold text-white text-base">Trader Journal & Reflection</h2>
            </div>
            {trade.journalReflection && (
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {trade.journalReflection}
              </p>
            )}
            {trade.journalEmotions?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                <span className="text-xs text-slate-400">Mental State:</span>
                {trade.journalEmotions.map((e: string) => (
                  <span
                    key={e}
                    className="px-2.5 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium"
                  >
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Viral Conversion Box */}
        <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-slate-900 to-slate-950 p-8 text-center space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Join 10,000+ Disciplined Traders</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Elevate Your Trading Edge with TradeMind
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Auto-sync trades from 12+ brokers (Zerodha, Dhan, Upstox, Groww, Binance, Bybit, MT4/5, IBKR), eliminate emotional leaks with AI, and track your institutional performance.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold border border-white/20 transition-all"
            >
              <span>Try Live Sandbox</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-105"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} TradeMind — Automated Multi-Asset Trading Journal & Behavioral Analytics.</p>
      </footer>
    </div>
  );
}
