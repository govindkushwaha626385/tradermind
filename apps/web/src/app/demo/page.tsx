// ──────────────────────────────────────────────
// TradeMind — Interactive Public Sandbox Terminal (/demo)
//
// 100% Free, zero-registration required sandbox.
// Allows prospective traders to experience the full TradeMind
// institutional suite:
// - TradingView Lightweight Candlestick Replay Chart (v5.2.1)
// - 1-Click AI Trade Autopsy with psychological insights
// - Interactive Setup Filters & Risk-Reward Ledger
// - Real-time Multi-Currency switcher ($ / € / £ / ₹ / ₮)
// - High-conversion CTA back into free registration
// ──────────────────────────────────────────────

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Layers,
  Zap,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { LightweightCandleChart, ChartTimeframe } from '@/components/chart/LightweightCandleChart';
import { TradeAutopsyModal } from '@/components/ai/TradeAutopsyModal';
import { BrandedShareCardModal } from '@/components/social/BrandedShareCardModal';
import { cn, formatCurrency } from '@/lib/utils';
import type { TradeReplayData } from '@trademind/shared';

const DEMO_TRADES = [
  {
    id: 'demo-t1',
    symbol: 'NIFTY 25500 CE',
    assetClass: 'OPTIONS',
    direction: 'BUY',
    entryPrice: 142.50,
    exitPrice: 218.00,
    quantity: 300,
    netPnl: 22650.00,
    pnlPercent: 52.98,
    rMultiple: 3.1,
    openedAt: '2026-09-25T09:32:00Z',
    closedAt: '2026-09-25T10:45:00Z',
    strategyName: 'SMC Order Block Retest',
    emotions: ['DISCIPLINED', 'FOCUSED'],
    executionRating: 95,
    mfe: 230.00,
    mae: 136.00,
    tags: ['Breakout', 'A+ Setup', 'High Volume'],
  },
  {
    id: 'demo-t2',
    symbol: 'BANKNIFTY 53200 PE',
    assetClass: 'OPTIONS',
    direction: 'BUY',
    entryPrice: 285.00,
    exitPrice: 390.50,
    quantity: 150,
    netPnl: 15825.00,
    pnlPercent: 37.02,
    rMultiple: 2.4,
    openedAt: '2026-09-25T11:15:00Z',
    closedAt: '2026-09-25T12:05:00Z',
    strategyName: 'VWAP Mean Reversion',
    emotions: ['CALM', 'PATIENT'],
    executionRating: 88,
    mfe: 410.00,
    mae: 272.00,
    tags: ['VWAP Cross', 'Institutional Supply'],
  },
  {
    id: 'demo-t3',
    symbol: 'RELIANCE',
    assetClass: 'EQUITY',
    direction: 'SELL',
    entryPrice: 3020.00,
    exitPrice: 2985.00,
    quantity: 200,
    netPnl: 7000.00,
    pnlPercent: 1.16,
    rMultiple: 1.8,
    openedAt: '2026-09-25T13:10:00Z',
    closedAt: '2026-09-25T14:30:00Z',
    strategyName: 'Liquidity Sweep Short',
    emotions: ['OBJECTIVE'],
    executionRating: 91,
    mfe: 2978.00,
    mae: 3029.00,
    tags: ['Liquidity Grab', 'Session High'],
  },
  {
    id: 'demo-t4',
    symbol: 'BTC/USDT',
    assetClass: 'CRYPTO',
    direction: 'BUY',
    entryPrice: 63200.00,
    exitPrice: 62750.00,
    quantity: 0.5,
    netPnl: -225.00,
    pnlPercent: -0.71,
    rMultiple: -1.0,
    openedAt: '2026-09-24T18:00:00Z',
    closedAt: '2026-09-24T19:30:00Z',
    strategyName: 'Trend Continuation Pullback',
    emotions: ['HESITANT'],
    executionRating: 62,
    mfe: 63500.00,
    mae: 62700.00,
    tags: ['Chased Entry', 'Early Stop Out'],
  },
];

const DEMO_REPLAY_DATA: TradeReplayData = {
  tradeId: 'demo-t1',
  symbol: 'NIFTY 25500 CE',
  exchange: 'NSE',
  direction: 'LONG',
  segment: 'OPTIONS',
  entryPrice: 142.50,
  exitPrice: 218.00,
  quantity: 300,
  entryTime: '2026-09-25T09:32:00Z',
  exitTime: '2026-09-25T10:45:00Z',
  planStop: 118.00,
  planTarget: 220.00,
  mfe: 230.00,
  mae: 136.00,
  realizedPnl: 22650.00,
  markers: [
    {
      type: 'ENTRY',
      price: 142.50,
      timestamp: '2026-09-25T09:32:00Z',
      label: 'BUY 300 @ ₹142.50',
      color: '#10b981',
    },
    {
      type: 'EXIT',
      price: 218.00,
      timestamp: '2026-09-25T10:45:00Z',
      label: 'SELL 300 @ ₹218.00 (+53%)',
      color: '#ef4444',
    },
  ],
};

export default function DemoPage() {
  const [selectedTrade, setSelectedTrade] = useState(DEMO_TRADES[0]);
  const [autopsyTrade, setAutopsyTrade] = useState<any | null>(null);
  const [shareTrade, setShareTrade] = useState<any | null>(null);
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('5m');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTrades = useMemo(() => {
    return DEMO_TRADES.filter((t) =>
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.strategyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const totalNetPnl = DEMO_TRADES.reduce((acc, t) => acc + t.netPnl, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ── Demo Top Ribbon ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-violet-900/60 via-indigo-900/40 to-slate-900 border-b border-violet-500/20 px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-bold text-white font-display">TradeMind Live Sandbox</span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="hidden sm:inline text-slate-400">
            Interactive Test Drive — Zero registration required
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
            {(['INR', 'USD', 'EUR', 'GBP'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-semibold font-mono transition-all',
                  currency === curr
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                {curr === 'INR' ? '₹' : curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '£'}
              </button>
            ))}
          </div>

          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-sm"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Main Sandbox Body ───────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
            <div className="text-xs text-slate-400 font-medium">Net Realized P&L</div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
              +{formatCurrency(totalNetPnl, currency)}
            </div>
            <div className="text-[11px] text-emerald-500/80 font-mono mt-0.5">
              ↑ 75% Win Rate Session
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
            <div className="text-xs text-slate-400 font-medium">Profit Factor</div>
            <div className="text-2xl font-black font-mono text-violet-400 mt-1">
              2.84
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Institutional Baseline (Target &gt; 1.8)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
            <div className="text-xs text-slate-400 font-medium">Avg Risk : Reward</div>
            <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
              1 : 2.45
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Strict asymmetric trade entries
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
            <div className="text-xs text-slate-400 font-medium">Discipline &amp; Tilt Score</div>
            <div className="text-2xl font-black font-mono text-amber-400 mt-1">
              94 / 100
            </div>
            <div className="text-[11px] text-amber-400/80 mt-0.5">
              Zero revenge trades detected
            </div>
          </div>
        </div>

        {/* ── TradingView Lightweight Candlestick Replay Chart ──── */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl p-5 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">{selectedTrade.symbol}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {selectedTrade.strategyName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  +{selectedTrade.pnlPercent}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                TradingView Lightweight Charts v5.2.1 bar-by-bar execution replay
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutopsyTrade(selectedTrade)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-md shadow-violet-600/30"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run AI Autopsy</span>
              </button>
              <button
                onClick={() => setShareTrade(selectedTrade)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-all"
              >
                <span>Share Card</span>
              </button>
            </div>
          </div>

          {/* Chart Component */}
          <div className="rounded-xl overflow-hidden bg-slate-950/80 border border-white/[0.06] p-2">
            <LightweightCandleChart
              data={DEMO_REPLAY_DATA}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              currency={currency}
            />
          </div>
        </div>

        {/* ── Demo Trade Ledger ───────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-white">Live Execution Ledger</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any trade to replay candlestick bars or generate an AI autopsy
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search symbol or setup..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="pb-3 pl-2">Symbol</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Strategy Setup</th>
                  <th className="pb-3 text-right">Entry / Exit</th>
                  <th className="pb-3 text-right">Net P&amp;L</th>
                  <th className="pb-3 text-center">Score</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredTrades.map((t) => {
                  const isSelected = selectedTrade.id === t.id;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrade(t)}
                      className={cn(
                        'hover:bg-white/[0.03] transition-colors cursor-pointer',
                        isSelected && 'bg-violet-500/10',
                      )}
                    >
                      <td className="py-3.5 pl-2 font-bold font-mono text-white">
                        {t.symbol}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold font-mono',
                            t.direction === 'BUY'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-rose-500/15 text-rose-400',
                          )}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-300 font-medium">
                        {t.strategyName}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-300">
                        {formatCurrency(t.entryPrice, currency)} → {formatCurrency(t.exitPrice, currency)}
                      </td>
                      <td
                        className={cn(
                          'py-3.5 text-right font-mono font-bold',
                          t.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400',
                        )}
                      >
                        {t.netPnl >= 0 ? '+' : ''}
                        {formatCurrency(t.netPnl, currency)}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono text-[10px] text-amber-300 font-bold">
                          {t.executionRating}/100
                        </span>
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAutopsyTrade(t);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/30 font-semibold text-[11px] transition-all"
                        >
                          Autopsy
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom Conversion Banner ─────────────────────── */}
        <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-slate-900 to-slate-900 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center md:text-left max-w-xl">
            <h2 className="text-2xl font-black text-white font-display">
              Ready to sync your real broker trades?
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Connect Zerodha, Dhan, Upstox, Groww, Interactive Brokers, or Binance with 1-click read-only API access. Completely automated, zero manual CSV maintenance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-violet-600/30 transition-all hover:-translate-y-0.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/calculators"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all"
            >
              <span>Explore 17 Free Calculators</span>
            </Link>
          </div>
        </div>
      </main>

      {/* ── 1-Click AI Trade Autopsy Modal ─────────────────── */}
      {autopsyTrade && (
        <TradeAutopsyModal
          isOpen={!!autopsyTrade}
          onClose={() => setAutopsyTrade(null)}
          trade={{
            id: autopsyTrade.id,
            symbol: autopsyTrade.symbol,
            direction: autopsyTrade.direction,
            entryPrice: autopsyTrade.entryPrice,
            exitPrice: autopsyTrade.exitPrice,
            quantity: autopsyTrade.quantity,
            netPnl: autopsyTrade.netPnl,
            pnlPercent: autopsyTrade.pnlPercent,
            rMultiple: autopsyTrade.rMultiple,
            strategyName: autopsyTrade.strategyName,
            emotions: autopsyTrade.emotions,
            mfe: autopsyTrade.mfe,
            mae: autopsyTrade.mae,
            openedAt: autopsyTrade.openedAt,
            closedAt: autopsyTrade.closedAt,
            currency: currency,
          }}
        />
      )}

      {/* ── Branded Social Share Card Modal ───────────────── */}
      {shareTrade && (
        <BrandedShareCardModal
          isOpen={!!shareTrade}
          onClose={() => setShareTrade(null)}
          trade={{
            id: shareTrade.id,
            symbol: shareTrade.symbol,
            direction: shareTrade.direction,
            entryPrice: shareTrade.entryPrice,
            exitPrice: shareTrade.exitPrice,
            quantity: shareTrade.quantity,
            netPnl: shareTrade.netPnl,
            pnlPercent: shareTrade.pnlPercent,
            rMultiple: shareTrade.rMultiple,
            tradeDate: shareTrade.closedAt || shareTrade.openedAt,
            strategyName: shareTrade.strategyName,
            currency: currency,
          }}
        />
      )}
    </div>
  );
}
