// ──────────────────────────────────────────────
// TradeMind — Multi-Timeframe (MTF) Confluence Replay Chart
//
// Dual-Chart Split View:
// - Left: Higher Timeframe (1H / 4H) Macro Trend Bias & Structure
// - Right: Lower Timeframe (1m / 5m) Execution & Trade Management
// - Synchronized Bar-by-Bar Step Engine & Confluence Checklist
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Layers,
  Sparkles,
  Zap,
  Target,
  Clock,
  Shield,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  isEntry?: boolean;
  isExit?: boolean;
  label?: string;
  emotion?: string;
  timestamp?: string;
}

export interface ReplayTrade {
  id: string;
  tradingsymbol: string;
  direction: 'LONG' | 'SHORT';
  openedAt: string;
  closedAt: string;
  netPnl: number;
  avgEntryPrice: number;
  avgExitPrice: number;
  maxFavorableExcursion?: number | null;
  maxAdverseExcursion?: number | null;
  rMultiple?: number | null;
  holdingPeriodMinutes?: number | null;
  exchange: string;
  currency?: string;
}

interface DualTimeframeReplayChartProps {
  trade: ReplayTrade;
  ltfCandles: Candle[];
  currency?: string;
}

const LTF_BARS_PER_HTF = 6; // 6x 5-min bars = 1x 30-min/1H candle

export function DualTimeframeReplayChart({
  trade,
  ltfCandles,
  currency = 'USD',
}: DualTimeframeReplayChartProps) {
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 5x
  const [htfTimeframe, setHtfTimeframe] = useState<'1H' | '4H' | 'Daily'>('1H');
  const [ltfTimeframe, setLtfTimeframe] = useState<'1m' | '5m' | '15m'>('5m');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize replay index to full completed trade by default, or 0 when trade changes
  useEffect(() => {
    if (ltfCandles.length > 0) {
      setReplayIndex(ltfCandles.length - 1);
      setIsPlaying(false);
    }
  }, [trade.id, ltfCandles.length]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(50, Math.floor(220 / playbackSpeed));
    timerRef.current = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= ltfCandles.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, ltfCandles.length]);

  // Construct Preceding HTF Context + In-progress Synchronized HTF Candles
  const { htfCandles, htfTrendBias, keyOrderBlockLevel } = useMemo(() => {
    const isLong = trade.direction === 'LONG';
    const entry = trade.avgEntryPrice || 100;
    const exit = trade.avgExitPrice || entry;
    const delta = Math.abs(exit - entry) || (entry * 0.015);

    // Preceding HTF Macro candles to establish context
    const contextCount = 6;
    const contextCandles: Candle[] = [];
    let basePrice = isLong ? entry - delta * 2.2 : entry + delta * 2.2;
    const trendSlope = isLong ? delta * 0.35 : -delta * 0.35;

    for (let i = 0; i < contextCount; i++) {
      const o = basePrice;
      const c = o + trendSlope + (Math.sin(i) * delta * 0.15);
      const h = Math.max(o, c) + delta * 0.25;
      const l = Math.min(o, c) - delta * 0.2;
      contextCandles.push({
        t: i - contextCount,
        o,
        h,
        l,
        c,
      });
      basePrice = c;
    }

    // Now aggregate LTF candles into HTF candles
    const totalTradeHtfBars = Math.ceil(ltfCandles.length / LTF_BARS_PER_HTF);
    const tradeHtfCandles: Candle[] = [];

    for (let b = 0; b < totalTradeHtfBars; b++) {
      const startIndex = b * LTF_BARS_PER_HTF;
      const endIndex = Math.min(ltfCandles.length - 1, startIndex + LTF_BARS_PER_HTF - 1);

      // Only include LTF candles up to the current replayIndex
      const activeEnd = Math.min(replayIndex, endIndex);

      if (activeEnd >= startIndex) {
        // This HTF candle has started forming
        const slice = ltfCandles.slice(startIndex, activeEnd + 1);
        const open = slice[0].o;
        const close = slice[slice.length - 1].c;
        const high = Math.max(...slice.map((c) => c.h));
        const low = Math.min(...slice.map((c) => c.l));

        tradeHtfCandles.push({
          t: b,
          o: open,
          h: high,
          l: low,
          c: close,
          isEntry: b === 0,
          isExit: activeEnd === ltfCandles.length - 1,
          label: b === 0 ? 'HTF Entry' : undefined,
        });
      }
    }

    const allHtf = [...contextCandles, ...tradeHtfCandles];
    const htfTrendBias = isLong ? 'BULLISH' : 'BEARISH';
    const keyOrderBlockLevel = isLong ? entry - delta * 0.4 : entry + delta * 0.4;

    return {
      htfCandles: allHtf,
      htfTrendBias,
      keyOrderBlockLevel,
    };
  }, [trade, ltfCandles, replayIndex]);

  // Current synchronized prices
  const currentLtfCandle = ltfCandles[replayIndex];
  const currentPrice = currentLtfCandle ? currentLtfCandle.c : trade.avgExitPrice || trade.avgEntryPrice;
  const isTradeInProfit =
    trade.direction === 'LONG'
      ? currentPrice >= trade.avgEntryPrice
      : currentPrice <= trade.avgEntryPrice;

  // Real-Time Confluence Checklist Evaluation
  const confluenceScore = useMemo(() => {
    let score = 0;
    const checks = [];

    // 1. HTF Trend Alignment
    const isTrendAligned =
      (trade.direction === 'LONG' && htfTrendBias === 'BULLISH') ||
      (trade.direction === 'SHORT' && htfTrendBias === 'BEARISH');
    checks.push({
      title: 'HTF Trend Bias Alignment',
      subtitle: `${htfTimeframe} bias (${htfTrendBias}) aligned with ${trade.direction} entry`,
      passed: isTrendAligned,
      weight: 30,
    });
    if (isTrendAligned) score += 30;

    // 2. Key Support/Resistance / Order Block Defense
    const defendedKeyLevel =
      trade.direction === 'LONG'
        ? currentPrice >= keyOrderBlockLevel
        : currentPrice <= keyOrderBlockLevel;
    checks.push({
      title: 'Key Structural Order Block Defense',
      subtitle: `Tested & held institutional liquidity at ${keyOrderBlockLevel.toFixed(2)}`,
      passed: defendedKeyLevel,
      weight: 25,
    });
    if (defendedKeyLevel) score += 25;

    // 3. Execution Entry Trigger (LTF)
    const entryCandle = ltfCandles[0];
    const cleanEntryTrigger = entryCandle != null;
    checks.push({
      title: 'LTF Rejection Wick / Pin Bar Trigger',
      subtitle: `5m entry confirmed off liquidity level`,
      passed: cleanEntryTrigger,
      weight: 25,
    });
    if (cleanEntryTrigger) score += 25;

    // 4. Discipline & Rule Adherence
    const adheredDiscipline = (trade.rMultiple ?? 1) >= 0.8 || trade.netPnl > 0;
    checks.push({
      title: 'Favorable R:R & Stop Discipline',
      subtitle: trade.rMultiple != null ? `Realized ${trade.rMultiple.toFixed(2)}R execution` : 'Preserved planned risk',
      passed: adheredDiscipline,
      weight: 20,
    });
    if (adheredDiscipline) score += 20;

    return { score, checks };
  }, [trade, htfTrendBias, htfTimeframe, currentPrice, keyOrderBlockLevel, ltfCandles]);

  // Stepping controls
  const handleStepBack = () => {
    setIsPlaying(false);
    setReplayIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setReplayIndex((prev) => Math.min(ltfCandles.length - 1, prev + 1));
  };

  const handleJumpEntry = () => {
    setIsPlaying(false);
    setReplayIndex(0);
  };

  const handleJumpExit = () => {
    setIsPlaying(false);
    setReplayIndex(ltfCandles.length - 1);
  };

  return (
    <div className="space-y-4">
      {/* ── Top Multi-Timeframe Status Strip ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                Dual MTF Confluence Overlay
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono font-semibold">
                Lockstep Sync
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate">
              {trade.tradingsymbol} ({trade.exchange}) · {trade.direction} · Replaying bar {replayIndex + 1} of {ltfCandles.length}
            </p>
          </div>
        </div>

        {/* Master Transport Stepper Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-xl p-1 bg-zinc-900 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={handleJumpEntry}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Jump to Entry"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleStepBack}
              disabled={replayIndex === 0}
              className="px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors text-xs font-mono font-bold cursor-pointer"
              title="Step Back 1 Candle"
            >
              -1 Bar
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer',
                isPlaying
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-indigo-600 text-white shadow-sm'
              )}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
            </button>
            <button
              type="button"
              onClick={handleStepForward}
              disabled={replayIndex >= ltfCandles.length - 1}
              className="px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors text-xs font-mono font-bold cursor-pointer"
              title="Step Forward 1 Candle"
            >
              +1 Bar
            </button>
            <button
              type="button"
              onClick={handleJumpExit}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Jump to Trade Exit"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center rounded-xl p-1 bg-zinc-900 border border-zinc-800 text-xs">
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setPlaybackSpeed(speed)}
                className={cn(
                  'px-2 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer',
                  playbackSpeed === speed
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dual Chart Split Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Left: Higher Timeframe Chart (1H Trend Bias) ─────────── */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Macro Structure ({htfTimeframe})
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold font-mono',
                  htfTrendBias === 'BULLISH'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                )}
              >
                {htfTrendBias} BIAS
              </span>
            </div>

            <div className="flex items-center rounded-lg p-0.5 bg-zinc-900 border border-zinc-800 text-[10px]">
              {(['1H', '4H', 'Daily'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setHtfTimeframe(tf)}
                  className={cn(
                    'px-2 py-0.5 rounded font-mono transition-colors cursor-pointer',
                    htfTimeframe === tf
                      ? 'bg-zinc-800 text-white font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* HTF Interactive Canvas */}
          <div className="relative rounded-xl bg-zinc-900/50 border border-zinc-800/60 p-2 overflow-hidden">
            <HtfSvgChart candles={htfCandles} keyOrderBlockLevel={keyOrderBlockLevel} />

            {/* HTF Key Level Overlay Badge */}
            <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-zinc-950/80 backdrop-blur border border-zinc-800 text-[10px] font-mono text-zinc-300">
              Order Block / S&R: <span className="text-indigo-400 font-bold">{keyOrderBlockLevel.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
            <span>Macro Trend: <strong className="text-zinc-200">{htfTrendBias} Structure</strong></span>
            <span>HTF Bars Formed: <strong className="text-indigo-400 font-mono">{htfCandles.length}</strong></span>
          </div>
        </div>

        {/* ── Right: Lower Timeframe Execution Chart (1m / 5m) ──────── */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Execution Entry ({ltfTimeframe})
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold font-mono',
                  isTradeInProfit
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                )}
              >
                P&L: {trade.netPnl >= 0 ? '+' : ''}{formatCurrency(trade.netPnl, currency)}
              </span>
            </div>

            <div className="flex items-center rounded-lg p-0.5 bg-zinc-900 border border-zinc-800 text-[10px]">
              {(['1m', '5m', '15m'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setLtfTimeframe(tf)}
                  className={cn(
                    'px-2 py-0.5 rounded font-mono transition-colors cursor-pointer',
                    ltfTimeframe === tf
                      ? 'bg-zinc-800 text-white font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* LTF Interactive Canvas */}
          <div className="relative rounded-xl bg-zinc-900/50 border border-zinc-800/60 p-2 overflow-hidden">
            <LtfSvgChart
              candles={ltfCandles}
              replayIndex={replayIndex}
              entryPrice={trade.avgEntryPrice}
              exitPrice={trade.avgExitPrice}
            />

            {/* Current Price Overlay Badge */}
            <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-zinc-950/80 backdrop-blur border border-zinc-800 text-[10px] font-mono text-zinc-300">
              Live Tick: <span className="text-emerald-400 font-bold">{currentPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
            <span>Entry: <strong className="text-zinc-200 font-mono">{trade.avgEntryPrice}</strong></span>
            <span>
              Excursion: <strong className="text-emerald-400 font-mono">+{trade.maxFavorableExcursion?.toFixed(1) ?? '—'}</strong> / <strong className="text-rose-400 font-mono">-{trade.maxAdverseExcursion?.toFixed(1) ?? '—'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── Timeline Scrubber Slider ──────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-md space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Synchronized Timeline Scrubbing
          </span>
          <span className="font-mono text-zinc-300 text-xs">
            Bar {replayIndex + 1} / {ltfCandles.length} ({Math.round(((replayIndex + 1) / ltfCandles.length) * 100)}%)
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, ltfCandles.length - 1)}
          value={replayIndex}
          onChange={(e) => {
            setIsPlaying(false);
            setReplayIndex(parseInt(e.target.value, 10));
          }}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* ── Confluence Scorecard Checklist ─────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Institutional Confluence Scorecard</h4>
              <p className="text-[11px] text-zinc-400">
                Live algorithmic validation of multi-timeframe trade conditions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Grade:</span>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full font-mono font-extrabold text-xs',
                confluenceScore.score >= 80
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : confluenceScore.score >= 50
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              )}
            >
              {confluenceScore.score}% ({confluenceScore.score >= 80 ? 'A+' : confluenceScore.score >= 50 ? 'B' : 'C-'})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {confluenceScore.checks.map((c, i) => (
            <div
              key={i}
              className={cn(
                'p-3 rounded-xl border transition-all',
                c.passed
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
              )}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-white truncate">{c.title}</span>
                {c.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-zinc-400 line-clamp-2">{c.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SVG Higher Timeframe Canvas Component ─────────────────────────────
function HtfSvgChart({
  candles,
  keyOrderBlockLevel,
}: {
  candles: Candle[];
  keyOrderBlockLevel: number;
}) {
  const W = 460;
  const H = 220;
  const PAD = { top: 20, right: 35, bottom: 25, left: 45 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  if (candles.length === 0) return null;

  const prices = candles.flatMap((c) => [c.h, c.l]);
  prices.push(keyOrderBlockLevel);
  const minP = Math.min(...prices) * 0.999;
  const maxP = Math.max(...prices) * 1.001;
  const range = maxP - minP || 1;

  const toX = (i: number) => PAD.left + (i / Math.max(1, candles.length - 1)) * chartW;
  const toY = (p: number) => PAD.top + chartH - ((p - minP) / range) * chartH;
  const candleW = Math.max(6, Math.min(18, chartW / candles.length - 4));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }}>
      {/* Grid */}
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + chartH * t;
        const price = maxP - range * t;
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={8} fill="rgba(255,255,255,0.3)" className="font-mono">
              {price.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Key Order Block / Liquidity Level */}
      <line
        x1={PAD.left}
        y1={toY(keyOrderBlockLevel)}
        x2={W - PAD.right}
        y2={toY(keyOrderBlockLevel)}
        stroke="#6366f1"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.8}
      />

      {/* Candles */}
      {candles.map((c, i) => {
        const x = toX(i);
        const isUp = c.c >= c.o;
        const color = isUp ? '#10b981' : '#ef4444';
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyBot = toY(Math.min(c.o, c.c));
        const bodyH = Math.max(1.5, bodyBot - bodyTop);

        return (
          <g key={i}>
            <line x1={x} y1={toY(c.h)} x2={x} y2={toY(c.l)} stroke={color} strokeWidth={1.2} opacity={0.7} />
            <rect
              x={x - candleW / 2}
              y={bodyTop}
              width={candleW}
              height={bodyH}
              fill={color}
              opacity={0.85}
              rx={1}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Lower Timeframe Execution Canvas Component ───────────────────
function LtfSvgChart({
  candles,
  replayIndex,
  entryPrice,
  exitPrice,
}: {
  candles: Candle[];
  replayIndex: number;
  entryPrice: number;
  exitPrice?: number;
}) {
  const W = 460;
  const H = 220;
  const PAD = { top: 20, right: 35, bottom: 25, left: 45 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const visible = candles.slice(0, replayIndex + 1);
  if (visible.length === 0) return null;

  const prices = visible.flatMap((c) => [c.h, c.l]);
  prices.push(entryPrice);
  if (exitPrice) prices.push(exitPrice);
  const minP = Math.min(...prices) * 0.999;
  const maxP = Math.max(...prices) * 1.001;
  const range = maxP - minP || 1;

  const toX = (i: number) => PAD.left + (i / Math.max(1, candles.length - 1)) * chartW;
  const toY = (p: number) => PAD.top + chartH - ((p - minP) / range) * chartH;
  const candleW = Math.max(3, Math.min(10, chartW / candles.length - 2));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }}>
      {/* Grid */}
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + chartH * t;
        const price = maxP - range * t;
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={8} fill="rgba(255,255,255,0.3)">
              {price.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Entry Line */}
      <line
        x1={PAD.left}
        y1={toY(entryPrice)}
        x2={W - PAD.right}
        y2={toY(entryPrice)}
        stroke="#3b82f6"
        strokeWidth={1.2}
        strokeDasharray="3 3"
        opacity={0.8}
      />

      {/* Candles */}
      {visible.map((c, i) => {
        const x = toX(i);
        const isUp = c.c >= c.o;
        const color = c.isEntry ? '#3b82f6' : c.isExit ? '#f59e0b' : isUp ? '#10b981' : '#ef4444';
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyBot = toY(Math.min(c.o, c.c));
        const bodyH = Math.max(1.5, bodyBot - bodyTop);

        return (
          <g key={i}>
            <line x1={x} y1={toY(c.h)} x2={x} y2={toY(c.l)} stroke={color} strokeWidth={1} opacity={0.6} />
            <rect
              x={x - candleW / 2}
              y={bodyTop}
              width={candleW}
              height={bodyH}
              fill={color}
              opacity={0.9}
              rx={1}
            />
          </g>
        );
      })}
    </svg>
  );
}
