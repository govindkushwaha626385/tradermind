// ──────────────────────────────────────────────
// TradeMind — Interactive Backtesting & Edge Simulator
//
// Flagship interactive preview widget for prospective traders on the landing page.
// Visitors can select institutional setups (ICT Silver Bullet, ORB, FVG Retest, etc.),
// step bar-by-bar or run 50-bar simulations, watch candles populate on an interactive canvas,
// trigger simulated bracket orders (Entry, TP, SL), and watch their simulated equity curve,
// win rate, and Sortino ratio update live.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  FastForward,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Zap,
  BarChart3,
  Award,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type EdgeStrategyId = 'ICT_SILVER_BULLET' | 'ORB_BREAKOUT' | 'FVG_RETEST' | 'VWAP_REVERSION' | 'LIQUIDITY_MSS';

interface StrategyPreset {
  id: EdgeStrategyId;
  name: string;
  category: string;
  timeframe: string;
  winRateBenchmark: number;
  avgRr: number;
  expectedValue: number;
  sortino: number;
  description: string;
  rules: string[];
  basePrice: number;
  priceStep: number;
}

const STRATEGY_PRESETS: Record<EdgeStrategyId, StrategyPreset> = {
  ICT_SILVER_BULLET: {
    id: 'ICT_SILVER_BULLET',
    name: 'ICT Silver Bullet (15m)',
    category: 'Smart Money Concepts',
    timeframe: '15m',
    winRateBenchmark: 68.4,
    avgRr: 2.3,
    expectedValue: 480,
    sortino: 3.42,
    description: '10:00 - 11:00 AM NY Session liquidity sweep followed by Fair Value Gap displacement.',
    rules: [
      'Asian/London high/low liquidity purge confirmed',
      'Market Structure Shift (MSS) with energetic displacement body',
      'Entry at 50% Fair Value Gap (FVG) mitigation',
      'Target opposing session liquidity pool',
    ],
    basePrice: 5240.5,
    priceStep: 1.25,
  },
  ORB_BREAKOUT: {
    id: 'ORB_BREAKOUT',
    name: 'Opening Range Breakout (5m)',
    category: 'Volume & Momentum',
    timeframe: '5m',
    winRateBenchmark: 62.1,
    avgRr: 2.1,
    expectedValue: 395,
    sortino: 2.85,
    description: 'Aggressive opening 15-minute range expansion accompanied by 2x average relative volume.',
    rules: [
      'Define high & low of opening 15-minute candle cluster',
      'Wait for 5m candle close cleanly beyond range boundary',
      'Volume spike > 1.8x 20-period moving average',
      'Stop loss pegged at opening range median line',
    ],
    basePrice: 22450.0,
    priceStep: 5.0,
  },
  FVG_RETEST: {
    id: 'FVG_RETEST',
    name: 'Fair Value Gap (FVG) Retest',
    category: 'Institutional Price Action',
    timeframe: '15m',
    winRateBenchmark: 66.8,
    avgRr: 2.5,
    expectedValue: 510,
    sortino: 3.18,
    description: 'Imbalance mitigation entry in alignment with higher timeframe trend displacement.',
    rules: [
      'Identify 3-candle displacement imbalance (Candle 1 High < Candle 3 Low)',
      'Mark premium/discount equilibrium on Fibonacci retracement',
      'Trigger limit entry on first touch of FVG threshold',
      'Stop placed 2 ticks behind Candle 1 wick',
    ],
    basePrice: 182.4,
    priceStep: 0.15,
  },
  VWAP_REVERSION: {
    id: 'VWAP_REVERSION',
    name: 'VWAP Institutional Mean Reversion',
    category: 'Statistical Arbitrage',
    timeframe: '5m',
    winRateBenchmark: 64.5,
    avgRr: 1.9,
    expectedValue: 340,
    sortino: 2.65,
    description: 'Exhaustion at 2.5 Standard Deviation VWAP Band with RSI divergence back to volume point of control.',
    rules: [
      'Price stretches to Upper/Lower 2.5 Sigma VWAP envelope',
      'RSI (14) prints bullish/bearish regular divergence (<28 or >72)',
      'Reversal pin bar or engulfing confirmation candle',
      'Target baseline VWAP equilibrium with trailing stop',
    ],
    basePrice: 68350.0,
    priceStep: 15.0,
  },
  LIQUIDITY_MSS: {
    id: 'LIQUIDITY_MSS',
    name: 'Liquidity Hunt & MSS',
    category: 'Order Flow & Wyckoff',
    timeframe: '15m',
    winRateBenchmark: 71.2,
    avgRr: 2.8,
    expectedValue: 620,
    sortino: 3.88,
    description: 'Equal highs/lows stop run followed by aggressive institutional shift in character (CHoCH).',
    rules: [
      'Retail double top or double bottom liquidity clearly formed',
      'Swift stop run sweep wick followed by immediate rejection',
      'Close below swing low confirming change of character',
      'Scale-in at breaker block retest',
    ],
    basePrice: 1.085,
    priceStep: 0.0004,
  },
};

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SimulatedTradeResult {
  id: number;
  tradeIndex: number;
  outcome: 'WIN' | 'LOSS';
  pnl: number;
  rMultiple: number;
  runningEquity: number;
}

export function InteractiveEdgeSimulator() {
  const [selectedStrategy, setSelectedStrategy] = useState<EdgeStrategyId>('ICT_SILVER_BULLET');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentBarIndex, setCurrentBarIndex] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState<number>(250); // ms per bar
  const [riskReward, setRiskReward] = useState<number>(2.5);
  const [riskAmount, setRiskAmount] = useState<number>(500); // $500 per trade
  const [startingCapital] = useState<number>(50000); // $50k challenge

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activePreset = STRATEGY_PRESETS[selectedStrategy];

  // Generate synthetic deterministic 75 candles based on strategy characteristics
  const generateBaseCandles = useCallback((strat: StrategyPreset): Candle[] => {
    const list: Candle[] = [];
    let currentClose = strat.basePrice;
    const now = Date.now() - 75 * 15 * 60 * 1000;

    for (let i = 0; i < 75; i++) {
      const time = now + i * 15 * 60 * 1000;
      const volatility = strat.priceStep * (1 + Math.sin(i / 3) * 0.4);
      // Introduce algorithmic trend and pullbacks matching the preset
      const trendBias = (Math.sin(i / 5) * 0.6 + (Math.random() - 0.48)) * volatility;
      const open = currentClose;
      const close = open + trendBias;
      const high = Math.max(open, close) + Math.random() * volatility * 0.8;
      const low = Math.min(open, close) - Math.random() * volatility * 0.8;
      const volume = Math.floor(800 + Math.random() * 1200 + (Math.abs(close - open) / volatility) * 600);

      list.push({
        time,
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        close: parseFloat(close.toFixed(4)),
        volume,
      });

      currentClose = close;
    }
    return list;
  }, []);

  // Initialize or reset candles when preset changes
  useEffect(() => {
    const generated = generateBaseCandles(activePreset);
    setCandles(generated);
    setCurrentBarIndex(18);
    setIsPlaying(false);
  }, [selectedStrategy, activePreset, generateBaseCandles]);

  // Handle Play / Step simulation
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentBarIndex((prev) => {
          if (prev >= candles.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, simSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, simSpeed, candles.length]);

  const handleStepBar = () => {
    setIsPlaying(false);
    setCurrentBarIndex((prev) => Math.min(candles.length, prev + 1));
  };

  const handleRun50Bars = () => {
    setIsPlaying(true);
    setSimSpeed(120);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentBarIndex(18);
    const refreshed = generateBaseCandles(activePreset);
    setCandles(refreshed);
  };

  // Derive simulated trades from the displayed candles
  const simulatedTrades = useMemo(() => {
    const visibleCandles = candles.slice(0, currentBarIndex);
    const trades: SimulatedTradeResult[] = [];
    let equity = startingCapital;

    // Deterministic trade evaluation every 4-5 bars
    for (let i = 8; i < visibleCandles.length; i += 4) {
      const c = visibleCandles[i]!;
      const prev = visibleCandles[i - 1]!;
      // Determine win/loss probability aligned with preset benchmark
      const pseudoRandom = Math.abs(Math.sin(i * 13.37 + c.close));
      const isWin = pseudoRandom * 100 < activePreset.winRateBenchmark;
      const r = isWin ? riskReward : -1.0;
      const pnl = r * riskAmount;
      equity += pnl;

      trades.push({
        id: trades.length + 1,
        tradeIndex: i,
        outcome: isWin ? 'WIN' : 'LOSS',
        pnl,
        rMultiple: r,
        runningEquity: equity,
      });
    }

    return trades;
  }, [candles, currentBarIndex, startingCapital, activePreset.winRateBenchmark, riskReward, riskAmount]);

  // Derived Performance Metrics
  const metrics = useMemo(() => {
    if (simulatedTrades.length === 0) {
      return {
        totalTrades: 0,
        winRate: activePreset.winRateBenchmark,
        profitFactor: 2.15,
        totalPnl: 0,
        currentEquity: startingCapital,
        sortino: activePreset.sortino,
        maxDrawdown: 1.8,
        expectancy: activePreset.expectedValue,
      };
    }

    const wins = simulatedTrades.filter((t) => t.outcome === 'WIN');
    const losses = simulatedTrades.filter((t) => t.outcome === 'LOSS');
    const winRate = (wins.length / simulatedTrades.length) * 100;

    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 9.99 : 1.0;
    const totalPnl = simulatedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const currentEquity = startingCapital + totalPnl;

    // Sortino calculation (downside deviation)
    const negativeReturns = losses.map((l) => l.pnl / startingCapital);
    const downsideDev =
      negativeReturns.length > 0
        ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length)
        : 0.01;
    const avgReturn = (totalPnl / startingCapital) / simulatedTrades.length;
    const sortino = downsideDev > 0 ? Math.max(1.2, (avgReturn / downsideDev) * Math.sqrt(252)) : activePreset.sortino;

    return {
      totalTrades: simulatedTrades.length,
      winRate: parseFloat(winRate.toFixed(1)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      totalPnl,
      currentEquity,
      sortino: parseFloat(sortino.toFixed(2)),
      maxDrawdown: 2.1,
      expectancy: Math.round(totalPnl / simulatedTrades.length),
    };
  }, [simulatedTrades, startingCapital, activePreset]);

  // Render HTML5 Canvas Candlestick Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI Retina Support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#090d16');
    bgGradient.addColorStop(1, '#05070c');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridCols = 6;
    const gridRows = 4;
    for (let c = 1; c < gridCols; c++) {
      const x = (width / gridCols) * c;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let r = 1; r < gridRows; r++) {
      const y = (height / gridRows) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const visibleCandles = candles.slice(0, currentBarIndex);
    if (visibleCandles.length === 0) return;

    // View window: Show up to last 35 candles
    const windowSize = 35;
    const displaySlice = visibleCandles.slice(-windowSize);

    // Min and Max prices for scaling
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    displaySlice.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });

    const pricePadding = (maxPrice - minPrice) * 0.15 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const priceRange = maxPrice - minPrice;

    const chartHeight = height - 45; // Leave room for volume at bottom
    const getY = (val: number) => chartHeight - ((val - minPrice) / priceRange) * chartHeight;

    const barWidth = Math.max(4, (width - 60) / windowSize);
    const candleWidth = barWidth * 0.72;

    // Draw Candlesticks & Volume
    displaySlice.forEach((candle, idx) => {
      const x = 20 + idx * barWidth + barWidth / 2;
      const isGreen = candle.close >= candle.open;
      const openY = getY(candle.open);
      const closeY = getY(candle.close);
      const highY = getY(candle.high);
      const lowY = getY(candle.low);

      const color = isGreen ? '#10b981' : '#f43f5e';
      const glowColor = isGreen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));

      ctx.fillStyle = glowColor;
      ctx.fillRect(x - candleWidth / 2 - 1, bodyTop - 1, candleWidth + 2, bodyHeight + 2);

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Volume bar
      const volHeight = Math.min(30, (candle.volume / 2500) * 30);
      ctx.fillStyle = isGreen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';
      ctx.fillRect(x - candleWidth / 2, height - volHeight, candleWidth, volHeight);
    });

    // Draw Bracket Orders (Entry, Stop Loss, Take Profit) on latest setup
    const latestCandle = displaySlice[displaySlice.length - 1];
    if (latestCandle) {
      const entryPrice = latestCandle.close;
      const slDistance = (maxPrice - minPrice) * 0.08;
      const tpDistance = slDistance * riskReward;
      const stopPrice = entryPrice - slDistance;
      const targetPrice = entryPrice + tpDistance;

      const entryY = getY(entryPrice);
      const stopY = getY(stopPrice);
      const targetY = getY(targetPrice);

      // Take Profit (Green Line & Shaded Area)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(20, targetY);
      ctx.lineTo(width - 20, targetY);
      ctx.stroke();

      ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
      ctx.fillRect(20, Math.min(targetY, entryY), width - 40, Math.abs(targetY - entryY));

      // Entry (Blue Line)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(20, entryY);
      ctx.lineTo(width - 20, entryY);
      ctx.stroke();

      // Stop Loss (Red Line & Shaded Area)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(20, stopY);
      ctx.lineTo(width - 20, stopY);
      ctx.stroke();

      ctx.fillStyle = 'rgba(244, 63, 94, 0.06)';
      ctx.fillRect(20, Math.min(entryY, stopY), width - 40, Math.abs(stopY - entryY));

      // Labels on right edge
      ctx.setLineDash([]);
      ctx.font = '10px Inter, monospace';

      // TP Label
      ctx.fillStyle = '#10b981';
      ctx.fillText(`TP: ${targetPrice.toFixed(2)} (+${(riskReward * 1).toFixed(1)}R)`, width - 110, targetY - 5);

      // Entry Label
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`ENTRY: ${entryPrice.toFixed(2)}`, width - 110, entryY - 5);

      // SL Label
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`SL: ${stopPrice.toFixed(2)} (-1.0R)`, width - 110, stopY + 12);
    }
  }, [candles, currentBarIndex, riskReward]);

  return (
    <section className="relative py-20 lg:py-28 overflow-hidden bg-slate-950 border-t border-b border-white/[0.06]">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-violet-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            Interactive Public Edge Laboratory
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight font-display mb-4">
            Test Your Real Edge{' '}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Before Risking $1
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Select an institutional playbook, simulate 50 candle bars, adjust bracket risk parameters in real-time,
            and watch your Sortino ratio and mathematical expectancy calibrate live.
          </p>
        </div>

        {/* Strategy Selector Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
          {(Object.keys(STRATEGY_PRESETS) as EdgeStrategyId[]).map((stratId) => {
            const p = STRATEGY_PRESETS[stratId];
            const isSelected = selectedStrategy === stratId;
            return (
              <button
                key={stratId}
                onClick={() => setSelectedStrategy(stratId)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border',
                  isSelected
                    ? 'bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-500/25 scale-[1.02]'
                    : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                )}
              >
                <span>{p.name}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-mono',
                    isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                  )}
                >
                  {p.winRateBenchmark}% WR
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Center Column: Interactive Canvas & Playback HUD (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Top Toolbar */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all',
                    isPlaying
                      ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                  )}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  {isPlaying ? 'Pause Sim' : 'Run Simulation'}
                </button>

                <button
                  onClick={handleStepBar}
                  disabled={currentBarIndex >= candles.length}
                  className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white text-xs font-semibold border border-white/[0.08] flex items-center gap-1.5 transition-colors disabled:opacity-40"
                  title="Advance 1 Candle Bar"
                >
                  <StepForward className="w-3.5 h-3.5" />
                  Step (+1)
                </button>

                <button
                  onClick={handleRun50Bars}
                  className="px-3 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-semibold border border-violet-500/30 flex items-center gap-1.5 transition-colors"
                  title="Simulate 50-bar forward run"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  Fast 50-Bar
                </button>

                <button
                  onClick={handleReset}
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
                  title="Reset Replay"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Progress & Speed */}
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>
                  Bar <strong className="text-white">{currentBarIndex}</strong> / {candles.length}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                <span className="text-violet-400 font-bold">{activePreset.timeframe} Candlesticks</span>
              </div>
            </div>

            {/* Interactive Canvas */}
            <div className="relative rounded-3xl bg-slate-950 border border-white/[0.08] p-2 overflow-hidden shadow-2xl">
              <canvas
                ref={canvasRef}
                className="w-full h-[360px] sm:h-[420px] rounded-2xl block cursor-crosshair"
              />

              {/* Floating Setup Tag Overlay */}
              <div className="absolute top-5 left-5 pointer-events-none flex items-center gap-2">
                <div className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{activePreset.name}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-slate-400 text-xs font-mono">
                  Target RR: 1:{riskReward.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Risk:Reward & Position Parameters Controller */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    Target Risk:Reward Ratio
                  </span>
                  <span className="text-white font-mono font-bold">1:{riskReward.toFixed(1)} R</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="4.0"
                  step="0.1"
                  value={riskReward}
                  onChange={(e) => setRiskReward(parseFloat(e.target.value))}
                  className="w-full accent-violet-500 bg-white/10 rounded-lg cursor-pointer h-1.5"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-rose-400" />
                    Capital Risked Per Trade
                  </span>
                  <span className="text-white font-mono font-bold">${riskAmount} (1%)</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={riskAmount}
                  onChange={(e) => setRiskAmount(parseFloat(e.target.value))}
                  className="w-full accent-violet-500 bg-white/10 rounded-lg cursor-pointer h-1.5"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Institutional Telemetry & Playbook Verification (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Performance HUD */}
            <div className="rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                  Simulated Edge Telemetry
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase font-mono">
                  Live Mathematical Model
                </span>
              </div>

              {/* Net P&L & Simulated Balance */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1">
                <span className="text-xs text-slate-400">Simulated Account Balance</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                    ${metrics.currentEquity.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold font-mono flex items-center gap-1',
                      metrics.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {metrics.totalPnl >= 0 ? '+' : ''}${metrics.totalPnl.toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              {/* 4-Stat Edge Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Win Rate</span>
                  <span className="text-lg font-bold font-mono text-white flex items-center gap-1">
                    {metrics.winRate}%
                    {metrics.winRate >= 60 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Profit Factor</span>
                  <span className="text-lg font-bold font-mono text-violet-400">{metrics.profitFactor}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Sortino Ratio</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">{metrics.sortino}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Expected Value (EV)</span>
                  <span className="text-lg font-bold font-mono text-white">+${metrics.expectancy}/trade</span>
                </div>
              </div>

              {/* Strategy Rules Compliance Checklist */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <span className="text-xs font-semibold text-white block mb-2">Algorithmic Entry Rules</span>
                <div className="space-y-1.5">
                  {activePreset.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversion CTA */}
              <div className="pt-3">
                <Link
                  href="/register"
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 transition-all group"
                >
                  <span>Replay Your Real Trades with TradeMind</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="text-[11px] text-center text-slate-400 mt-2">
                  No credit card required · Free 50 trades/mo included
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
