'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Clock,
  Sparkles,
  ChevronRight,
  Layers,
  Award,
} from 'lucide-react';
import type { TradeReplayData } from '@trademind/shared';

interface TradeReplayChartProps {
  data: TradeReplayData;
}

export type ReplayTimeframe = '1m' | '3m' | '5m' | '15m' | '1D';

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  phase: 'pre' | 'entry' | 'in_trade' | 'exit' | 'post';
  note?: string;
}

function TradeReplayChartInner({ data }: TradeReplayChartProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [timeframe, setTimeframe] = useState<ReplayTimeframe>('5m');
  const [showTargetStop, setShowTargetStop] = useState(true);
  const [showExcursions, setShowExcursions] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showPremarket, setShowPremarket] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synthesize rich candlestick timeline based on entry, exit, MFE, MAE & timeframe
  const candles: Candle[] = useMemo(() => {
    const list: Candle[] = [];
    const entry = data.entryPrice;
    const exit = data.exitPrice ?? entry * (data.direction === 'LONG' ? 1.015 : 0.985);
    const mfe = data.mfe ?? (data.direction === 'LONG' ? Math.max(entry, exit) * 1.02 : Math.min(entry, exit) * 0.98);
    const mae = data.mae ?? (data.direction === 'LONG' ? Math.min(entry, exit) * 0.99 : Math.max(entry, exit) * 1.01);

    const priceSpread = Math.abs(exit - entry) || entry * 0.01;
    const noise = () => (Math.random() - 0.5) * (priceSpread * 0.15);

    // Number of progression candles based on timeframe
    const progressionCount = timeframe === '1m' ? 8 : timeframe === '3m' ? 6 : timeframe === '5m' ? 4 : timeframe === '15m' ? 3 : 2;
    const preCount = timeframe === '1D' ? 1 : 3;

    // 1. Pre-entry setup candles
    let p = entry - (data.direction === 'LONG' ? priceSpread * 0.4 : -priceSpread * 0.4);
    for (let i = 0; i < preCount; i++) {
      const o = p;
      const c = o + (data.direction === 'LONG' ? priceSpread * 0.15 : -priceSpread * 0.15) + noise();
      const h = Math.max(o, c) + Math.abs(noise());
      const l = Math.min(o, c) - Math.abs(noise());
      list.push({ time: `T-${preCount - i} (${timeframe})`, open: o, high: h, low: l, close: c, phase: 'pre' });
      p = c;
    }

    // 2. Entry Candle
    const entryOpen = p;
    const entryClose = entry;
    const entryHigh = Math.max(entryOpen, entryClose) + Math.abs(noise());
    const entryLow = Math.min(entryOpen, entryClose) - Math.abs(noise());
    list.push({
      time: 'ENTRY',
      open: entryOpen,
      high: entryHigh,
      low: entryLow,
      close: entryClose,
      phase: 'entry',
      note: `Executed ${data.direction} @ ₹${entry.toFixed(2)}`,
    });

    // 3. MAE candle (adverse excursion / test of stop)
    const maeCandleLow = Math.min(entry, mae);
    const maeCandleHigh = Math.max(entry, mae) + noise();
    list.push({
      time: 'MAE TEST',
      open: entry,
      high: maeCandleHigh,
      low: maeCandleLow,
      close: (entry + mae) / 2,
      phase: 'in_trade',
      note: `Max Adverse Excursion tested: ₹${mae.toFixed(2)}`,
    });

    // 4. Trend progression candles towards MFE
    let curr = (entry + mae) / 2;
    for (let i = 1; i <= progressionCount; i++) {
      const targetP = curr + ((mfe - curr) * (i / progressionCount));
      const o = curr;
      const c = targetP + noise();
      const h = Math.max(o, c) + Math.abs(noise());
      const l = Math.min(o, c) - Math.abs(noise());
      list.push({ time: `IN-TRADE +${i}`, open: o, high: h, low: l, close: c, phase: 'in_trade' });
      curr = c;
    }

    // 5. MFE peak candle
    list.push({
      time: 'MFE PEAK',
      open: curr,
      high: Math.max(curr, mfe),
      low: Math.min(curr, mfe) - Math.abs(noise()),
      close: mfe,
      phase: 'in_trade',
      note: `Peak Profit Potential (MFE): ₹${mfe.toFixed(2)}`,
    });

    // 6. Pullback / Exit candle
    list.push({
      time: 'EXIT',
      open: mfe,
      high: Math.max(mfe, exit),
      low: Math.min(mfe, exit) - Math.abs(noise()),
      close: exit,
      phase: 'exit',
      note: `Closed @ ₹${exit.toFixed(2)}`,
    });

    // 7. Post-exit follow-through (2 candles)
    let postCurr = exit;
    for (let i = 1; i <= 2; i++) {
      const o = postCurr;
      const c = o + (data.direction === 'LONG' ? -priceSpread * 0.1 : priceSpread * 0.1) + noise();
      const h = Math.max(o, c) + Math.abs(noise());
      const l = Math.min(o, c) - Math.abs(noise());
      list.push({ time: `POST +${i}`, open: o, high: h, low: l, close: c, phase: 'post' });
      postCurr = c;
    }

    return list;
  }, [data, timeframe]);

  const maxSteps = candles.length - 1;

  // Autoplay loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= maxSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200 / playbackSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, maxSteps]);

  // Price boundaries for chart coordinates
  const allPrices = candles.flatMap((c) => [c.open, c.high, c.low, c.close]);
  if (data.planTarget) allPrices.push(data.planTarget);
  if (data.planStop) allPrices.push(data.planStop);

  const minPrice = Math.min(...allPrices) * 0.998;
  const maxPrice = Math.max(...allPrices) * 1.002;
  const priceRange = maxPrice - minPrice || 1;

  const svgHeight = 420;
  const svgWidth = 840;
  const padding = { top: 40, bottom: 40, left: 60, right: 120 };
  const chartHeight = svgHeight - padding.top - padding.bottom;
  const chartWidth = svgWidth - padding.left - padding.right;

  const getY = (price: number) => {
    return padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  const getX = (index: number) => {
    return padding.left + (index / maxSteps) * chartWidth;
  };

  const visibleCandles = candles.slice(0, currentStep + 1);
  const activeCandle = candles[currentStep];

  const isWin = (data.realizedPnl ?? 0) >= 0;

  return (
    <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 shadow-2xl space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg ${
              data.direction === 'LONG'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}
          >
            {data.direction === 'LONG' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{data.symbol}</h2>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-800 text-zinc-300">
                {data.exchange}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  data.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {data.direction}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Qty: {data.quantity} • Entry: ₹{data.entryPrice.toFixed(2)}
              {data.exitPrice && ` • Exit: ₹${data.exitPrice.toFixed(2)}`}
            </p>
          </div>
        </div>

        {/* Financial outcome badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Realized P&L</div>
            <div className={`text-xl font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
              {data.realizedPnl !== undefined ? (isWin ? `+₹${data.realizedPnl.toFixed(2)}` : `-₹${Math.abs(data.realizedPnl).toFixed(2)}`) : 'Pending'}
            </div>
          </div>
          {data.autopsyGrade && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider">Grade</div>
              <div className="text-base font-black">{data.autopsyGrade}</div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Replay'}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(0);
            }}
            title="Reset to beginning"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 bg-zinc-800/60 p-0.5 rounded-lg border border-zinc-700/50">
            {([1, 2, 5] as const).map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  playbackSpeed === speed ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-zinc-800/60 p-0.5 rounded-lg border border-zinc-700/50">
            {(['1m', '3m', '5m', '15m', '1D'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf);
                  setCurrentStep(0);
                  setIsPlaying(false);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  timeframe === tf ? 'bg-primary text-primary-foreground' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Scrubber slider */}
        <div className="flex-1 min-w-[200px] flex items-center gap-3 px-2">
          <input
            type="range"
            min={0}
            max={maxSteps}
            value={currentStep}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStep(Number(e.target.value));
            }}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
          />
          <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
            {currentStep + 1} / {candles.length}
          </span>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showAnnotations
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-500'
            }`}
          >
            Annotations
          </button>
          <button
            onClick={() => setShowTargetStop(!showTargetStop)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showTargetStop
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-500'
            }`}
          >
            Target/Stop
          </button>
          <button
            onClick={() => setShowExcursions(!showExcursions)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showExcursions
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-500'
            }`}
          >
            MFE / MAE
          </button>
        </div>
      </div>

      {/* SVG Canvas Chart */}
      <div className="relative overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800/90 shadow-inner">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Horizontal Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
            const y = padding.top + chartHeight * ratio;
            const price = maxPrice - ratio * priceRange;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={svgWidth - padding.right + 8}
                  y={y + 4}
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ₹{price.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Planned Target Line */}
          {showTargetStop && data.planTarget && (
            <g>
              <line
                x1={padding.left}
                y1={getY(data.planTarget)}
                x2={svgWidth - padding.right}
                y2={getY(data.planTarget)}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <rect
                x={svgWidth - padding.right + 4}
                y={getY(data.planTarget) - 10}
                width={70}
                height={20}
                rx={4}
                fill="#064e3b"
              />
              <text
                x={svgWidth - padding.right + 8}
                y={getY(data.planTarget) + 4}
                fill="#34d399"
                fontSize="10"
                fontWeight="bold"
              >
                TP: ₹{data.planTarget.toFixed(1)}
              </text>
            </g>
          )}

          {/* Planned Stop Loss Line */}
          {showTargetStop && data.planStop && (
            <g>
              <line
                x1={padding.left}
                y1={getY(data.planStop)}
                x2={svgWidth - padding.right}
                y2={getY(data.planStop)}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <rect
                x={svgWidth - padding.right + 4}
                y={getY(data.planStop) - 10}
                width={70}
                height={20}
                rx={4}
                fill="#4c0519"
              />
              <text
                x={svgWidth - padding.right + 8}
                y={getY(data.planStop) + 4}
                fill="#fb7185"
                fontSize="10"
                fontWeight="bold"
              >
                SL: ₹{data.planStop.toFixed(1)}
              </text>
            </g>
          )}

          {/* Entry annotation reference line */}
          {showAnnotations && (
            <g>
              <line
                x1={padding.left}
                y1={getY(data.entryPrice)}
                x2={svgWidth - padding.right}
                y2={getY(data.entryPrice)}
                stroke="#6366f1"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <rect
                x={svgWidth - padding.right + 4}
                y={getY(data.entryPrice) - 10}
                width={70}
                height={20}
                rx={4}
                fill="#312e81"
              />
              <text
                x={svgWidth - padding.right + 8}
                y={getY(data.entryPrice) + 4}
                fill="#c7d2fe"
                fontSize="10"
                fontWeight="bold"
              >
                Entry: ₹{data.entryPrice.toFixed(1)}
              </text>
            </g>
          )}

          {/* Exit annotation reference line */}
          {showAnnotations && data.exitPrice && (
            <g>
              <line
                x1={padding.left}
                y1={getY(data.exitPrice)}
                x2={svgWidth - padding.right}
                y2={getY(data.exitPrice)}
                stroke={isWin ? '#10b981' : '#f43f5e'}
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <rect
                x={svgWidth - padding.right + 4}
                y={getY(data.exitPrice) - 10}
                width={70}
                height={20}
                rx={4}
                fill={isWin ? '#064e3b' : '#4c0519'}
              />
              <text
                x={svgWidth - padding.right + 8}
                y={getY(data.exitPrice) + 4}
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
              >
                Exit: ₹{data.exitPrice.toFixed(1)}
              </text>
            </g>
          )}

          {/* Crosshair when hovering */}
          {hoveredIndex !== null && (
            <line
              x1={getX(hoveredIndex)}
              y1={padding.top}
              x2={getX(hoveredIndex)}
              y2={svgHeight - padding.bottom}
              stroke="#818cf8"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          )}

          {/* Candlesticks rendering up to currentStep */}
          {visibleCandles.map((c, i) => {
            const x = getX(i);
            const isGreen = c.close >= c.open;
            const candleColor = isGreen ? '#10b981' : '#f43f5e';
            const bodyTop = getY(Math.max(c.open, c.close));
            const bodyBottom = getY(Math.min(c.open, c.close));
            const bodyHeight = Math.max(2, bodyBottom - bodyTop);
            const candleWidth = 18;
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={i}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Wick */}
                <line
                  x1={x}
                  y1={getY(c.high)}
                  x2={x}
                  y2={getY(c.low)}
                  stroke={candleColor}
                  strokeWidth={isHovered ? '2.5' : '1.5'}
                />
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={candleColor}
                  stroke={isHovered ? '#ffffff' : 'none'}
                  strokeWidth={isHovered ? 1.5 : 0}
                  rx={2}
                />

                {/* Entry marker badge */}
                {showAnnotations && c.phase === 'entry' && (
                  <g transform={`translate(${x}, ${getY(data.entryPrice)})`}>
                    <circle r="6" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                    <rect x="-35" y="-28" width="70" height="18" rx="4" fill="#312e81" />
                    <text x="0" y="-16" fill="#c7d2fe" fontSize="9" fontWeight="bold" textAnchor="middle">
                      ENTRY {data.direction}
                    </text>
                  </g>
                )}

                {/* Exit marker badge */}
                {showAnnotations && c.phase === 'exit' && (
                  <g transform={`translate(${x}, ${getY(data.exitPrice ?? c.close)})`}>
                    <circle r="6" fill={isWin ? '#10b981' : '#f43f5e'} stroke="#ffffff" strokeWidth="2" />
                    <rect x="-30" y="-28" width="60" height="18" rx="4" fill={isWin ? '#064e3b' : '#4c0519'} />
                    <text x="0" y="-16" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                      EXIT
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* MFE / MAE Guides */}
          {showExcursions && data.mfe && currentStep >= 4 && (
            <g>
              <line
                x1={getX(1)}
                y1={getY(data.mfe)}
                x2={getX(currentStep)}
                y2={getY(data.mfe)}
                stroke="#38bdf8"
                strokeDasharray="2 4"
                strokeWidth="1"
              />
              <text
                x={getX(currentStep) - 60}
                y={getY(data.mfe) - 6}
                fill="#38bdf8"
                fontSize="9"
                fontFamily="monospace"
              >
                MFE ₹{data.mfe.toFixed(1)}
              </text>
            </g>
          )}

          {showExcursions && data.mae && currentStep >= 2 && (
            <g>
              <line
                x1={getX(1)}
                y1={getY(data.mae)}
                x2={getX(currentStep)}
                y2={getY(data.mae)}
                stroke="#fb923c"
                strokeDasharray="2 4"
                strokeWidth="1"
              />
              <text
                x={getX(currentStep) - 60}
                y={getY(data.mae) + 14}
                fill="#fb923c"
                fontSize="9"
                fontFamily="monospace"
              >
                MAE ₹{data.mae.toFixed(1)}
              </text>
            </g>
          )}
        </svg>

        {/* Floating HUD Inspector Tooltip */}
        {(hoveredIndex !== null ? visibleCandles[hoveredIndex] : activeCandle) && (
          <div className="absolute top-3 left-4 px-3 py-1.5 rounded-lg bg-zinc-900/95 border border-zinc-700/80 backdrop-blur text-xs font-mono text-zinc-300 shadow-xl flex items-center gap-3 flex-wrap">
            {(() => {
              const c = hoveredIndex !== null ? visibleCandles[hoveredIndex] : activeCandle;
              if (!c) return null;
              return (
                <>
                  <span className="font-bold text-white uppercase">{c.time}</span>
                  <span>O: <strong className="text-zinc-200">₹{c.open.toFixed(1)}</strong></span>
                  <span>H: <strong className="text-emerald-400">₹{c.high.toFixed(1)}</strong></span>
                  <span>L: <strong className="text-rose-400">₹{c.low.toFixed(1)}</strong></span>
                  <span>C: <strong className={c.close >= c.open ? 'text-emerald-400' : 'text-rose-400'}>₹{c.close.toFixed(1)}</strong></span>
                  {c.note && (
                    <span className="text-indigo-300 border-l border-zinc-700 pl-2 font-sans font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      {c.note}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Trade Context & Behavioral Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Pre-Market Plan vs Execution */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            <Target className="w-4 h-4 text-indigo-400" />
            Pre-Market Confluence
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Market Bias:</span>
              <span className="font-semibold text-zinc-200">{data.premarketBias ?? 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Key Levels:</span>
              <span className="font-semibold text-zinc-200 truncate max-w-[140px]">
                {data.premarketKeyLevels ?? 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Plan Adherence:</span>
              <span className="font-semibold text-emerald-400">
                {data.journalRatings?.plan ? `${data.journalRatings.plan}/5 Stars` : 'Logged'}
              </span>
            </div>
          </div>
        </div>

        {/* Risk / Excursion Metrics */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Excursion Efficiency
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Max Excursion (MFE):</span>
              <span className="font-semibold text-sky-400">{data.mfe ? `₹${data.mfe.toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Drawdown Tested (MAE):</span>
              <span className="font-semibold text-orange-400">{data.mae ? `₹${data.mae.toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Holding Quality:</span>
              <span className="font-semibold text-zinc-200">
                {data.journalRatings?.execution ? `${data.journalRatings.execution}/5 Rating` : 'Standard'}
              </span>
            </div>
          </div>
        </div>

        {/* Reflection & Psychology */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            <Award className="w-4 h-4 text-emerald-400" />
            Psychological Notes
          </div>
          <p className="text-xs text-zinc-300 italic line-clamp-3">
            {data.journalReflection
              ? `"${data.journalReflection}"`
              : 'No reflection note was entered for this execution.'}
          </p>
          {data.journalMistakes && data.journalMistakes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {data.journalMistakes.map((m, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const TradeReplayChart = React.memo(TradeReplayChartInner);
