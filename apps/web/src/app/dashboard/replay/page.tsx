// ──────────────────────────────────────────────
// TradeMind — Trade Replay Page
// /dashboard/replay
//
// Features:
// - Select any closed journal trade from history
// - Interactive candlestick-style bar chart with entry/exit overlay
// - Timeline scrubber to "replay" the trade minute-by-minute (simulated)
// - Emotion + compliance annotations at key moments
// - P&L progress line
// - Trade metadata panel: MFE, MAE, R-multiple, holding time
//
// Note: Price candle data is simulated from trade entry/exit. In
// production, integrate with a market data provider (e.g., Upstox
// historical data API) using the broker connection token.
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn, formatCurrency } from '@/lib/utils';
import { LightweightCandleChart } from '@/components/chart/LightweightCandleChart';
import { TradingViewLiveWidget } from '@/components/chart/TradingViewLiveWidget';
import { TradingWatchlistSidebar } from '@/components/chart/TradingWatchlistSidebar';
import { useCurrency } from '@/hooks/useCurrency';
import type { TradeReplayData } from '@trademind/shared';

// ── Types ──────────────────────────────────────

interface TradeOption {
  id: string;
  tradingsymbol: string;
  direction: 'LONG' | 'SHORT';
  openedAt: string;
  closedAt: string;
  netPnl: number;
  avgEntryPrice: number;
  avgExitPrice: number;
  maxFavorableExcursion: number | null;
  maxAdverseExcursion: number | null;
  rMultiple: number | null;
  holdingPeriodMinutes: number | null;
  exchange: string;
  currency?: string;
}

interface Candle {
  t: number;       // timestamp index
  o: number;       // open
  h: number;       // high
  l: number;       // low
  c: number;       // close
  isEntry?: boolean;
  isExit?: boolean;
  label?: string;
  emotion?: string;
}

function normalizeTrade(t: any): TradeOption {
  const rawEntry = Number(t.avgEntryPrice ?? t.executionPrice ?? t.entryPrice ?? 0);
  const entryPrice = (!isNaN(rawEntry) && rawEntry > 0) ? rawEntry : 100;
  const rawExit = t.avgExitPrice ? Number(t.avgExitPrice) : (t.status === 'OPEN' ? entryPrice : (Number(t.executionPrice) || entryPrice));
  const exitPrice = (!isNaN(rawExit) && rawExit > 0) ? rawExit : entryPrice;
  const rawOpen = t.openedAt ?? t.executionTimestamp ?? t.createdAt;
  const openTime = rawOpen && !isNaN(new Date(rawOpen).getTime()) ? new Date(rawOpen).toISOString() : new Date().toISOString();
  const rawClose = t.closedAt ?? openTime;
  const closeTime = rawClose && !isNaN(new Date(rawClose).getTime()) ? new Date(rawClose).toISOString() : openTime;
  const direction = (t.direction ?? (t.transactionType === 'BUY' ? 'LONG' : 'SHORT')) as 'LONG' | 'SHORT';
  const symbol = t.tradingsymbol || t.symbol || 'TRADE';
  const exchange = t.exchange || 'NSE';
  const netPnl = Number(t.netPnl ?? ((Number(t.grossPnl ?? 0)) - Number(t.totalCharges ?? 0)));
  const currency = t.currency || (['NASDAQ', 'NYSE', 'DELTA', 'BINANCE', 'BYBIT', 'CRYPTO'].includes(exchange.toUpperCase()) ? 'USD' : undefined);

  return {
    id: t.id,
    tradingsymbol: symbol,
    exchange,
    currency,
    direction,
    openedAt: openTime,
    closedAt: closeTime,
    netPnl,
    avgEntryPrice: entryPrice,
    avgExitPrice: exitPrice,
    maxFavorableExcursion: t.maxFavorableExcursion != null ? Number(t.maxFavorableExcursion) : null,
    maxAdverseExcursion: t.maxAdverseExcursion != null ? Number(t.maxAdverseExcursion) : null,
    rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
    holdingPeriodMinutes: t.holdingPeriodMinutes != null ? Number(t.holdingPeriodMinutes) : null,
  };
}

// ── Candle generation (simulated from real trade data) ────────────────────────

function generateCandles(trade: TradeOption, count = 30): Candle[] {
  const rawEntry = Number(trade.avgEntryPrice);
  const entry = (!isNaN(rawEntry) && rawEntry > 0) ? rawEntry : 100;
  const rawExit = Number(trade.avgExitPrice);
  const exit = (!isNaN(rawExit) && rawExit > 0) ? rawExit : entry;
  const mfe = trade.maxFavorableExcursion ?? Math.abs(exit - entry) * 1.5;
  const mae = trade.maxAdverseExcursion ?? Math.abs(exit - entry) * 0.5;
  const isLong = trade.direction === 'LONG';

  const candles: Candle[] = [];
  let price = entry;

  // Phase 1: initial adverse move (1/3 of candles)
  const phase1 = Math.floor(count / 3);
  // Phase 2: favorable move peaking (2/3)
  const phase2 = Math.floor(count * 0.65);

  for (let i = 0; i < count; i++) {
    const open = price;
    let momentum = 0;

    if (i < phase1) {
      // Adverse phase
      momentum = isLong ? -mae / phase1 : mae / phase1;
    } else if (i < phase2) {
      // Recovery & peak
      momentum = isLong
        ? (exit - entry + mfe) / (phase2 - phase1)
        : -(exit - entry + mfe) / (phase2 - phase1);
    } else {
      // Exit approach
      const remaining = count - phase2;
      const target = exit;
      momentum = (target - price) / (remaining + 1);
    }

    const noise = (Math.random() - 0.5) * Math.abs(momentum) * 0.8;
    const close = open + momentum + noise;
    const wick = Math.abs(momentum) * (0.3 + Math.random() * 0.4);
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick * 0.6;

    price = close;

    candles.push({
      t: i,
      o: open,
      h: high,
      l: low,
      c: close,
      isEntry: i === 0,
      isExit: i === count - 1,
      label: i === 0 ? 'Entry' : i === count - 1 ? 'Exit' : undefined,
      emotion: i === Math.floor(count * 0.4) ? trade.direction === 'LONG' ? '😟 Anxiety' : '😤 FOMO' : undefined,
    });
  }

  return candles;
}

// ── Chart component ──────────────────────────────────────────────────────────

function CandlestickChart({
  candles,
  replayIndex,
}: {
  candles: Candle[];
  replayIndex: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 700;
  const H = 260;
  const PAD = { top: 20, right: 40, bottom: 30, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const visible = candles.slice(0, replayIndex + 1);
  const prices = visible.flatMap((c) => [c.h, c.l]);
  const minP = Math.min(...prices) * 0.9995;
  const maxP = Math.max(...prices) * 1.0005;
  const range = maxP - minP || 1;

  const toX = (i: number) =>
    PAD.left + (i / (candles.length - 1)) * chartW;
  const toY = (p: number) =>
    PAD.top + chartH - ((p - minP) / range) * chartH;

  const candleWidth = Math.max(4, chartW / candles.length - 2);

  // P&L line
  const pnlPoints = visible
    .map((c, i) => `${toX(i)},${toY(c.c)}`)
    .join(' ');

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 260 }}
    >
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD.top + chartH * t;
        const price = maxP - range * t;
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="rgba(255,255,255,0.35)"
            >
              {price.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* P&L polyline (area fill) */}
      <defs>
        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(124,58,237,0.3)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0)" />
        </linearGradient>
      </defs>
      {visible.length > 1 && (
        <>
          <polygon
            points={`${toX(0)},${PAD.top + chartH} ${pnlPoints} ${toX(visible.length - 1)},${PAD.top + chartH}`}
            fill="url(#pnlGrad)"
          />
          <polyline
            points={pnlPoints}
            fill="none"
            stroke="rgba(124,58,237,0.7)"
            strokeWidth={1.5}
          />
        </>
      )}

      {/* Candles */}
      {visible.map((c, i) => {
        const x = toX(i);
        const isUp = c.c >= c.o;
        const color = c.isEntry
          ? '#3b82f6'
          : c.isExit
          ? '#f59e0b'
          : isUp
          ? '#10b981'
          : '#ef4444';

        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyBot = toY(Math.min(c.o, c.c));
        const bodyH = Math.max(1, bodyBot - bodyTop);

        return (
          <g key={i}>
            {/* Wick */}
            <line
              x1={x}
              y1={toY(c.h)}
              x2={x}
              y2={toY(c.l)}
              stroke={color}
              strokeWidth={1}
              opacity={0.6}
            />
            {/* Body */}
            <rect
              x={x - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyH}
              fill={color}
              opacity={0.85}
              rx={1}
            />
            {/* Entry/Exit labels */}
            {c.label && (
              <>
                <line
                  x1={x}
                  y1={PAD.top}
                  x2={x}
                  y2={PAD.top + chartH}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  opacity={0.4}
                />
                <rect
                  x={x - 18}
                  y={PAD.top + chartH + 8}
                  width={36}
                  height={14}
                  rx={3}
                  fill={color}
                  opacity={0.9}
                />
                <text
                  x={x}
                  y={PAD.top + chartH + 19}
                  textAnchor="middle"
                  fontSize={8}
                  fill="white"
                  fontWeight="600"
                >
                  {c.label}
                </text>
              </>
            )}
            {/* Emotion annotation */}
            {c.emotion && i <= replayIndex && (
              <text
                x={x}
                y={toY(c.h) - 6}
                textAnchor="middle"
                fontSize={9}
                fill="rgba(255,255,255,0.6)"
              >
                {c.emotion}
              </text>
            )}
          </g>
        );
      })}

      {/* Current price line */}
      {visible.length > 0 && (
        <>
          <line
            x1={PAD.left}
            y1={toY(visible[visible.length - 1]!.c)}
            x2={W - PAD.right}
            y2={toY(visible[visible.length - 1]!.c)}
            stroke="rgba(124,58,237,0.5)"
            strokeWidth={1}
            strokeDasharray="6 3"
          />
          <rect
            x={W - PAD.right + 2}
            y={toY(visible[visible.length - 1]!.c) - 8}
            width={36}
            height={16}
            rx={3}
            fill="rgba(124,58,237,0.8)"
          />
          <text
            x={W - PAD.right + 20}
            y={toY(visible[visible.length - 1]!.c) + 4}
            textAnchor="middle"
            fontSize={9}
            fill="white"
            fontWeight="600"
          >
            {visible[visible.length - 1]!.c.toFixed(1)}
          </text>
        </>
      )}
    </svg>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TradeReplayPage() {
  const { currency } = useCurrency();
  const [trades, setTrades] = useState<TradeOption[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<TradeOption | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [chartView, setChartView] = useState<'live' | 'canvas' | 'scrubber'>('live');
  const [liveSymbol, setLiveSymbol] = useState<string>('BINANCE:ETHUSDT');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const selectTrade = useCallback((trade: TradeOption) => {
    setSelectedTrade(trade);
    const c = generateCandles(trade, 40);
    setCandles(c);
    setReplayIndex(c.length - 1);
    setIsPlaying(false);
    setShowDropdown(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Sync live terminal symbol if switching
    const rawSym = (trade.tradingsymbol || '').toUpperCase().trim();
    const ex = (trade.exchange || '').toUpperCase();
    if (rawSym.includes(':')) {
      setLiveSymbol(rawSym);
    } else if (ex === 'NSE') {
      setLiveSymbol(`NSE:${rawSym}`);
    } else if (ex === 'BSE') {
      setLiveSymbol(`BSE:${rawSym}`);
    } else if (ex === 'MCX') {
      setLiveSymbol(`MCX:${rawSym}`);
    } else if (ex === 'NASDAQ') {
      setLiveSymbol(`NASDAQ:${rawSym}`);
    } else if (ex === 'NYSE') {
      setLiveSymbol(`NYSE:${rawSym}`);
    } else if (['FOREX', 'FX', 'OANDA'].includes(ex)) {
      setLiveSymbol(`FX:${rawSym}`);
    } else if (['BINANCE', 'DELTA', 'BYBIT', 'CRYPTO'].includes(ex)) {
      const sym = rawSym.includes('USDT') || rawSym.includes('USD')
        ? rawSym
        : `${rawSym}USDT`;
      setLiveSymbol(`BINANCE:${sym}`);
    } else {
      setLiveSymbol(rawSym);
    }
  }, []);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getJournalTrades({ limit: 100 });
      const raw = res.data as any;
      const list = Array.isArray(raw) ? raw : (raw?.trades ?? raw?.data ?? []);
      let normalized = list.map(normalizeTrade);

      if (normalized.length === 0) {
        try {
          const execRes = await api.getTrades({ limit: 50 });
          const execRaw = execRes.data as any;
          const execList = Array.isArray(execRaw) ? execRaw : (execRaw?.trades ?? []);
          normalized = execList.map(normalizeTrade);
        } catch {}
      }

      setTrades(normalized);
      if (normalized.length > 0) {
        setSelectedTrade((prev) => {
          if (prev && normalized.some((t: TradeOption) => t.id === prev.id)) return prev;
          selectTrade(normalized[0]!);
          return normalized[0]!;
        });
      }
    } catch {
      try {
        const execRes = await api.getTrades({ limit: 50 });
        const execRaw = execRes.data as any;
        const execList = Array.isArray(execRaw) ? execRaw : (execRaw?.trades ?? []);
        const normalized = execList.map(normalizeTrade);
        setTrades(normalized);
        if (normalized.length > 0) selectTrade(normalized[0]!);
      } catch {
        toast.error('Failed to load trades');
      }
    } finally {
      setLoading(false);
    }
  }, [selectTrade]);

  // Fetch on mount
  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  // Listen for real-time broker sync
  useEffect(() => {
    const handleBrokerSynced = () => {
      loadTrades();
    };
    window.addEventListener('broker-synced', handleBrokerSynced);
    return () => window.removeEventListener('broker-synced', handleBrokerSynced);
  }, [loadTrades]);

  // Replay controls
  const startReplay = useCallback(() => {
    setReplayIndex(0);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= candles.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 180);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, candles.length]);

  const pnl = selectedTrade?.netPnl ?? 0;
  const isProfit = pnl >= 0;
  const currentCandle = candles[replayIndex];
  const currentPrice = currentCandle?.c ?? selectedTrade?.avgExitPrice ?? 0;
  const progressPct = candles.length > 0 ? ((replayIndex + 1) / candles.length) * 100 : 0;

  const replayData: TradeReplayData | null = selectedTrade ? {
    tradeId: selectedTrade.id,
    symbol: selectedTrade.tradingsymbol,
    exchange: selectedTrade.exchange,
    direction: selectedTrade.direction,
    segment: 'EQUITY',
    entryPrice: selectedTrade.avgEntryPrice,
    exitPrice: selectedTrade.avgExitPrice,
    quantity: 1,
    entryTime: selectedTrade.openedAt,
    exitTime: selectedTrade.closedAt,
    mfe: selectedTrade.maxFavorableExcursion ?? undefined,
    mae: selectedTrade.maxAdverseExcursion ?? undefined,
    realizedPnl: selectedTrade.netPnl,
    markers: [
      {
        label: `BUY @ ${selectedTrade.avgEntryPrice}`,
        price: selectedTrade.avgEntryPrice,
        timestamp: selectedTrade.openedAt,
        type: 'ENTRY',
        color: '#10b981',
      },
      ...(selectedTrade.avgExitPrice ? [{
        label: `EXIT @ ${selectedTrade.avgExitPrice} (${selectedTrade.netPnl >= 0 ? '+' : ''}${selectedTrade.netPnl.toFixed(0)})`,
        price: selectedTrade.avgExitPrice,
        timestamp: selectedTrade.closedAt,
        type: 'EXIT' as const,
        color: selectedTrade.netPnl >= 0 ? '#10b981' : '#ef4444',
      }] : []),
    ],
  } : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <PageHeader
        title="Trade Replay"
        description="Step through any closed trade and understand every decision with hindsight clarity"
        icon={BarChart2}
      />

      {loading ? (
        <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : trades.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <BarChart2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No closed trades yet. Complete a trade to replay it here.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr,320px] gap-5">

          {/* ── Chart Panel ─────────────────────────────────────────── */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            {/* Trade selector */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-xs">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-accent transition-colors"
                >
                  <span className="truncate">
                    {selectedTrade
                      ? `${selectedTrade.tradingsymbol} (${selectedTrade.exchange}) · ${selectedTrade.direction} · ${new Date(selectedTrade.openedAt).toLocaleDateString('en-IN')}`
                      : 'Select a trade'}
                  </span>
                  <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                </button>
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
                    {trades.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectTrade(t)}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-accent transition-colors text-left',
                          selectedTrade?.id === t.id && 'bg-accent',
                        )}
                      >
                        <span className="font-medium truncate">{t.tradingsymbol} ({t.exchange})</span>
                        <span className={cn('text-xs font-semibold flex-shrink-0', t.netPnl >= 0 ? 'text-profit' : 'text-loss')}>
                          {t.netPnl >= 0 ? '+' : ''}{formatCurrency(t.netPnl, currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View switch & Playback controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center rounded-xl p-1 bg-muted/40 border border-border/40 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartView('live')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5',
                      chartView === 'live'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Terminal
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('canvas')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-medium transition-all',
                      chartView === 'canvas'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Execution Replay
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('scrubber')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-medium transition-all',
                      chartView === 'scrubber'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Step Scrubber
                  </button>
                </div>

                {chartView === 'scrubber' && (
                  <>
                    <button
                      onClick={() => { setReplayIndex(candles.length - 1); setIsPlaying(false); }}
                      className="p-2 rounded-xl border border-border hover:bg-accent transition-colors text-muted-foreground"
                      title="Show full trade"
                    >
                      <SkipBack className="w-4 h-4 rotate-180" />
                    </button>
                    <button
                      onClick={isPlaying ? () => setIsPlaying(false) : startReplay}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? 'Pause' : 'Replay'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Chart Area */}
            {chartView === 'live' ? (
              <div className="flex flex-col lg:flex-row rounded-2xl overflow-hidden border border-border/40 bg-zinc-950 min-h-[580px]">
                <div className="flex-1 min-h-[520px]">
                  <TradingViewLiveWidget
                    symbol={liveSymbol}
                    height={580}
                    interval="5"
                    hideSideToolbar={false}
                    allowSymbolChange={true}
                  />
                </div>
                <TradingWatchlistSidebar
                  activeSymbol={liveSymbol}
                  onSelectSymbol={(sym) => setLiveSymbol(sym)}
                />
              </div>
            ) : chartView === 'canvas' && replayData ? (
              <div className="rounded-xl overflow-hidden border border-border/40">
                <LightweightCandleChart
                  data={replayData}
                  currency={selectedTrade?.currency || (['NASDAQ', 'NYSE', 'DELTA', 'BINANCE', 'BYBIT', 'CRYPTO'].includes(selectedTrade?.exchange?.toUpperCase() ?? '') ? 'USD' : currency)}
                  className="h-[460px]"
                />
              </div>
            ) : (
              <>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  {candles.length > 0 && (
                    <CandlestickChart candles={candles} replayIndex={replayIndex} />
                  )}
                </div>

            {/* Scrubber */}
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={candles.length - 1}
                value={replayIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setReplayIndex(Number(e.target.value));
                }}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Entry</span>
                <span className="font-medium text-foreground">
                  {progressPct.toFixed(0)}% through trade
                </span>
                <span>Exit</span>
              </div>
            </div>

            {/* Current candle info */}
            {currentCandle && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Open', value: currentCandle.o.toFixed(2) },
                  { label: 'High', value: currentCandle.h.toFixed(2) },
                  { label: 'Low', value: currentCandle.l.toFixed(2) },
                  { label: 'Close', value: currentCandle.c.toFixed(2) },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="text-xs text-muted-foreground mb-0.5">{m.label}</div>
                    <div className="text-sm font-semibold tabular-nums">{m.value}</div>
                  </div>
                ))}
              </div>
            )}
            </>
          )}
          </div>

          {/* ── Trade Metadata Panel ─────────────────────────────────── */}
          <div className="space-y-4">
            {/* P&L card */}
            <div
              className="glass-card rounded-2xl p-5"
              style={{
                borderColor: isProfit ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                background: isProfit ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                {isProfit
                  ? <ArrowUpRight className="w-5 h-5 text-profit" />
                  : <ArrowDownRight className="w-5 h-5 text-loss" />}
                <span className="text-sm font-semibold text-muted-foreground">Net P&L</span>
              </div>
              <div className={cn('text-3xl font-extrabold tabular-nums', isProfit ? 'text-profit' : 'text-loss')}>
                {isProfit ? '+' : ''}{formatCurrency(pnl, currency)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedTrade?.tradingsymbol} · {selectedTrade?.direction}
              </div>
            </div>

            {/* Stats grid */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold">Trade Analytics</h3>
              <div className="space-y-3">
                {[
                  {
                    icon: TrendingUp,
                    label: 'Entry Price',
                    value: selectedTrade ? formatCurrency(selectedTrade.avgEntryPrice, currency) : '—',
                    color: 'text-blue-400',
                  },
                  {
                    icon: TrendingDown,
                    label: 'Exit Price',
                    value: selectedTrade ? formatCurrency(selectedTrade.avgExitPrice ?? 0, currency) : '—',
                    color: 'text-amber-400',
                  },
                  {
                    icon: Target,
                    label: 'MFE (Max Upside)',
                    value: selectedTrade?.maxFavorableExcursion != null
                      ? formatCurrency(selectedTrade.maxFavorableExcursion, currency)
                      : '—',
                    color: 'text-emerald-400',
                  },
                  {
                    icon: AlertTriangle,
                    label: 'MAE (Max Drawdown)',
                    value: selectedTrade?.maxAdverseExcursion != null
                      ? formatCurrency(selectedTrade.maxAdverseExcursion, currency)
                      : '—',
                    color: 'text-rose-400',
                  },
                  {
                    icon: BarChart2,
                    label: 'R-Multiple',
                    value: selectedTrade?.rMultiple != null
                      ? `${selectedTrade.rMultiple.toFixed(2)}R`
                      : '—',
                    color: 'text-violet-400',
                  },
                  {
                    icon: Clock,
                    label: 'Holding Time',
                    value: selectedTrade?.holdingPeriodMinutes != null
                      ? selectedTrade.holdingPeriodMinutes < 60
                        ? `${selectedTrade.holdingPeriodMinutes}m`
                        : `${(selectedTrade.holdingPeriodMinutes / 60).toFixed(1)}h`
                      : '—',
                    color: 'text-slate-400',
                  },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <s.icon className={cn('w-4 h-4', s.color)} />
                      <span className="text-muted-foreground">{s.label}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live price during replay */}
            <div className="glass-card rounded-2xl p-5">
              <div className="text-xs text-muted-foreground mb-1">Price at Replay Position</div>
              <div className="text-2xl font-extrabold tabular-nums">
                {formatCurrency(currentPrice, currency)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Candle {replayIndex + 1} of {candles.length}
              </div>
            </div>

            {/* Tip */}
            <div
              className="rounded-xl p-4 text-xs leading-relaxed"
              style={{
                background: 'rgba(124,58,237,0.06)',
                border: '1px solid rgba(124,58,237,0.15)',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              💡 <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Tip:</strong> Drag the scrubber or click Replay to step through the trade. Watch how price moved from entry to exit, and where max adverse excursion (MAE) occurred.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
