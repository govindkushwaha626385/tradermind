// ──────────────────────────────────────────────
// TradeMind — Institutional Live Trading Terminal & Simulation
//
// Interactive flagship simulator for the Landing Page.
// Showcases TradeMind's real-time candlestick rendering,
// Smart Money Concepts (SMC) annotations, MFE/MAE metrics,
// and AI behavioral risk telemetry.
//
// NOTE: Strictly an analytics, journal & replay simulator.
// No live trade execution (buy/sell broker order entry)
// as specified in product constraints.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Sliders,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Layers,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Clock,
  Compass,
  Cpu,
  Lock,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

export type SimulationMarketId = 'BTC' | 'NIFTY' | 'NVDA' | 'EURUSD' | 'GOLD' | 'BANKNIFTY';
export type SimulationTimeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SimulatedTrade {
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  entryCandleIndex: number;
  exitCandleIndex: number;
  rMultiple: number;
  mfe: number; // Max favorable price reached
  mae: number; // Max adverse price reached
  playbook: string;
  aiAutopsy: string;
  ruleAdherence: number;
}

interface MarketConfig {
  id: SimulationMarketId;
  symbol: string;
  name: string;
  assetClass: 'Crypto' | 'Indian Index' | 'US Tech' | 'Forex' | 'Commodity';
  currency: string;
  currencyPrefix: string;
  currentPrice: number;
  change24h: number;
  timeframes: SimulationTimeframe[];
  trade: SimulatedTrade;
  generateCandles: () => CandleData[];
}

// ── Realistic Multi-Asset Simulation Feeds ───────────

const SIMULATION_MARKETS: Record<SimulationMarketId, MarketConfig> = {
  BTC: {
    id: 'BTC',
    symbol: 'BTC/USDT',
    name: 'Bitcoin Perpetual',
    assetClass: 'Crypto',
    currency: 'USD',
    currencyPrefix: '$',
    currentPrice: 67420.50,
    change24h: 3.82,
    timeframes: ['1m', '5m', '15m', '1H', '4H', '1D'],
    trade: {
      type: 'LONG',
      entryPrice: 66200.00,
      stopLoss: 65800.00,
      takeProfit: 67560.00,
      entryCandleIndex: 14,
      exitCandleIndex: 26,
      rMultiple: 3.40,
      mfe: 67700.00,
      mae: 66050.00,
      playbook: 'SMC 15m Liquidity Sweep + Bullish FVG Retest',
      aiAutopsy: 'Entry precision: 96/100. Trade entered immediately upon 15m order block retest after Asian session low was purged. Exit captured 92% of the total MFE expansion. Zero psychological tilt detected.',
      ruleAdherence: 98,
    },
    generateCandles: () => [
      { time: '10:00', open: 66100, high: 66350, low: 66050, close: 66280, volume: 142 },
      { time: '10:15', open: 66280, high: 66420, low: 66190, close: 66220, volume: 98 },
      { time: '10:30', open: 66220, high: 66260, low: 65980, close: 66020, volume: 185 },
      { time: '10:45', open: 66020, high: 66150, low: 65920, close: 65950, volume: 220 },
      { time: '11:00', open: 65950, high: 66040, low: 65860, close: 65890, volume: 310 },
      { time: '11:15', open: 65890, high: 65980, low: 65820, close: 65910, volume: 240 },
      { time: '11:30', open: 65910, high: 66050, low: 65880, close: 66040, volume: 160 },
      { time: '11:45', open: 66040, high: 66190, low: 65990, close: 66150, volume: 195 },
      { time: '12:00', open: 66150, high: 66240, low: 66080, close: 66120, volume: 130 },
      { time: '12:15', open: 66120, high: 66210, low: 66060, close: 66190, volume: 110 },
      { time: '12:30', open: 66190, high: 66280, low: 66140, close: 66230, volume: 125 },
      { time: '12:45', open: 66230, high: 66290, low: 66180, close: 66210, volume: 90 },
      { time: '13:00', open: 66210, high: 66250, low: 66160, close: 66190, volume: 85 },
      { time: '13:15', open: 66190, high: 66230, low: 66170, close: 66200, volume: 95 },
      // ENTRY AT INDEX 14:
      { time: '13:30', open: 66200, high: 66450, low: 66180, close: 66420, volume: 420 },
      { time: '13:45', open: 66420, high: 66580, low: 66360, close: 66540, volume: 380 },
      { time: '14:00', open: 66540, high: 66690, low: 66480, close: 66620, volume: 290 },
      { time: '14:15', open: 66620, high: 66710, low: 66550, close: 66600, volume: 210 },
      { time: '14:30', open: 66600, high: 66850, low: 66580, close: 66810, volume: 340 },
      { time: '14:45', open: 66810, high: 66940, low: 66740, close: 66910, volume: 310 },
      { time: '15:00', open: 66910, high: 67120, low: 66880, close: 67080, volume: 460 },
      { time: '15:15', open: 67080, high: 67250, low: 67010, close: 67190, volume: 390 },
      { time: '15:30', open: 67190, high: 67340, low: 67120, close: 67280, volume: 280 },
      { time: '15:45', open: 67280, high: 67450, low: 67220, close: 67410, volume: 320 },
      { time: '16:00', open: 67410, high: 67580, low: 67350, close: 67520, volume: 410 },
      { time: '16:15', open: 67520, high: 67700, low: 67480, close: 67560, volume: 510 }, // TARGET HIT
      { time: '16:30', open: 67560, high: 67620, low: 67380, close: 67420, volume: 290 },
      { time: '16:45', open: 67420, high: 67490, low: 67310, close: 67380, volume: 210 },
      { time: '17:00', open: 67380, high: 67520, low: 67340, close: 67450, volume: 180 },
      { time: '17:15', open: 67450, high: 67510, low: 67390, close: 67420, volume: 150 },
    ],
  },
  NIFTY: {
    id: 'NIFTY',
    symbol: 'NIFTY 50',
    name: 'NSE Indian Benchmark Index',
    assetClass: 'Indian Index',
    currency: 'INR',
    currencyPrefix: '₹',
    currentPrice: 24850.25,
    change24h: 0.65,
    timeframes: ['1m', '5m', '15m', '1H', '1D'],
    trade: {
      type: 'LONG',
      entryPrice: 24680.00,
      stopLoss: 24620.00,
      takeProfit: 24860.00,
      entryCandleIndex: 12,
      exitCandleIndex: 25,
      rMultiple: 3.00,
      mfe: 24885.00,
      mae: 24650.00,
      playbook: 'Opening Range Breakout + VWAP Mean Reversion Confluence',
      aiAutopsy: 'High-conviction intraday execution. NIFTY broke IB high with institutional banking volume. Stop-loss was never under stress (MAE only 0.5R). Planned exit was executed flawlessly at 24,860.',
      ruleAdherence: 95,
    },
    generateCandles: () => [
      { time: '09:15', open: 24620, high: 24690, low: 24600, close: 24660, volume: 450 },
      { time: '09:30', open: 24660, high: 24700, low: 24640, close: 24650, volume: 320 },
      { time: '09:45', open: 24650, high: 24670, low: 24620, close: 24630, volume: 280 },
      { time: '10:00', open: 24630, high: 24650, low: 24610, close: 24640, volume: 210 },
      { time: '10:15', open: 24640, high: 24660, low: 24630, close: 24650, volume: 180 },
      { time: '10:30', open: 24650, high: 24670, low: 24640, close: 24660, volume: 150 },
      { time: '10:45', open: 24660, high: 24680, low: 24640, close: 24650, volume: 140 },
      { time: '11:00', open: 24650, high: 24670, low: 24630, close: 24660, volume: 160 },
      { time: '11:15', open: 24660, high: 24680, low: 24650, close: 24670, volume: 190 },
      { time: '11:30', open: 24670, high: 24690, low: 24660, close: 24680, volume: 230 },
      { time: '11:45', open: 24680, high: 24710, low: 24670, close: 24680, volume: 310 },
      { time: '12:00', open: 24680, high: 24720, low: 24670, close: 24680, volume: 280 },
      // ENTRY AT INDEX 12:
      { time: '12:15', open: 24680, high: 24740, low: 24670, close: 24730, volume: 540 },
      { time: '12:30', open: 24730, high: 24760, low: 24710, close: 24750, volume: 420 },
      { time: '12:45', open: 24750, high: 24780, low: 24730, close: 24770, volume: 380 },
      { time: '13:00', open: 24770, high: 24800, low: 24760, close: 24790, volume: 460 },
      { time: '13:15', open: 24790, high: 24820, low: 24780, close: 24810, volume: 390 },
      { time: '13:30', open: 24810, high: 24840, low: 24800, close: 24830, volume: 410 },
      { time: '13:45', open: 24830, high: 24860, low: 24810, close: 24840, volume: 480 },
      { time: '14:00', open: 24840, high: 24870, low: 24820, close: 24850, volume: 520 },
      { time: '14:15', open: 24850, high: 24875, low: 24830, close: 24860, volume: 490 },
      { time: '14:30', open: 24860, high: 24885, low: 24840, close: 24870, volume: 580 },
      { time: '14:45', open: 24870, high: 24880, low: 24850, close: 24860, volume: 410 },
      { time: '15:00', open: 24860, high: 24870, low: 24840, close: 24850, volume: 340 },
      { time: '15:15', open: 24850, high: 24860, low: 24830, close: 24845, volume: 290 },
      { time: '15:30', open: 24845, high: 24860, low: 24840, close: 24850, volume: 220 },
    ],
  },
  NVDA: {
    id: 'NVDA',
    symbol: 'NVDA',
    name: 'NVIDIA Corp (NASDAQ)',
    assetClass: 'US Tech',
    currency: 'USD',
    currencyPrefix: '$',
    currentPrice: 128.40,
    change24h: 4.20,
    timeframes: ['1m', '5m', '15m', '1H', '1D'],
    trade: {
      type: 'LONG',
      entryPrice: 123.50,
      stopLoss: 121.80,
      takeProfit: 128.60,
      entryCandleIndex: 10,
      exitCandleIndex: 24,
      rMultiple: 3.00,
      mfe: 129.10,
      mae: 123.10,
      playbook: 'Earnings Catalyst Drift + AI Datacenter Guidance Extension',
      aiAutopsy: 'Trend continuation model executed with textbook precision. 0.8% account risk applied. Trailing stop captured +3.0R with negligible intraday drawdown.',
      ruleAdherence: 96,
    },
    generateCandles: () => [
      { time: '09:30', open: 122.0, high: 123.2, low: 121.5, close: 122.8, volume: 820 },
      { time: '10:00', open: 122.8, high: 123.4, low: 122.2, close: 123.1, volume: 640 },
      { time: '10:30', open: 123.1, high: 123.5, low: 122.6, close: 123.0, volume: 510 },
      { time: '11:00', open: 123.0, high: 123.6, low: 122.8, close: 123.3, volume: 490 },
      { time: '11:30', open: 123.3, high: 123.8, low: 123.1, close: 123.5, volume: 580 },
      // ENTRY AT INDEX 10:
      { time: '12:00', open: 123.5, high: 124.8, low: 123.3, close: 124.5, volume: 920 },
      { time: '12:30', open: 124.5, high: 125.4, low: 124.1, close: 125.2, volume: 810 },
      { time: '13:00', open: 125.2, high: 126.3, low: 124.9, close: 126.0, volume: 760 },
      { time: '13:30', open: 126.0, high: 127.1, low: 125.7, close: 126.8, volume: 880 },
      { time: '14:00', open: 126.8, high: 127.9, low: 126.4, close: 127.5, volume: 940 },
      { time: '14:30', open: 127.5, high: 128.5, low: 127.2, close: 128.2, volume: 1020 },
      { time: '15:00', open: 128.2, high: 129.1, low: 127.9, close: 128.6, volume: 1180 },
      { time: '15:30', open: 128.6, high: 128.9, low: 128.1, close: 128.4, volume: 730 },
      { time: '16:00', open: 128.4, high: 128.7, low: 128.2, close: 128.4, volume: 610 },
    ],
  },
  EURUSD: {
    id: 'EURUSD',
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    assetClass: 'Forex',
    currency: 'USD',
    currencyPrefix: '$',
    currentPrice: 1.0842,
    change24h: 0.18,
    timeframes: ['1m', '5m', '15m', '1H', '4H', '1D'],
    trade: {
      type: 'LONG',
      entryPrice: 1.0795,
      stopLoss: 1.0778,
      takeProfit: 1.0846,
      entryCandleIndex: 8,
      exitCandleIndex: 20,
      rMultiple: 3.00,
      mfe: 1.0850,
      mae: 1.0790,
      playbook: 'London Open Killzone + ICT Judas Swing',
      aiAutopsy: 'Clean manipulation wick into Asian session lows followed by energetic displacement above London session VWAP. Position held through high-impact news with zero deviation from trading plan.',
      ruleAdherence: 94,
    },
    generateCandles: () => [
      { time: '07:00', open: 1.0810, high: 1.0815, low: 1.0805, close: 1.0808, volume: 320 },
      { time: '07:30', open: 1.0808, high: 1.0812, low: 1.0798, close: 1.0802, volume: 410 },
      { time: '08:00', open: 1.0802, high: 1.0806, low: 1.0788, close: 1.0792, volume: 680 },
      { time: '08:30', open: 1.0792, high: 1.0801, low: 1.0782, close: 1.0795, volume: 850 },
      // ENTRY AT INDEX 8
      { time: '09:00', open: 1.0795, high: 1.0812, low: 1.0793, close: 1.0810, volume: 920 },
      { time: '09:30', open: 1.0810, high: 1.0825, low: 1.0806, close: 1.0822, volume: 840 },
      { time: '10:00', open: 1.0822, high: 1.0834, low: 1.0818, close: 1.0830, volume: 760 },
      { time: '10:30', open: 1.0830, high: 1.0842, low: 1.0826, close: 1.0838, volume: 710 },
      { time: '11:00', open: 1.0838, high: 1.0850, low: 1.0834, close: 1.0846, volume: 880 },
      { time: '11:30', open: 1.0846, high: 1.0848, low: 1.0839, close: 1.0842, volume: 540 },
    ],
  },
  GOLD: {
    id: 'GOLD',
    symbol: 'XAU/USD',
    name: 'Spot Gold',
    assetClass: 'Commodity',
    currency: 'USD',
    currencyPrefix: '$',
    currentPrice: 2645.10,
    change24h: 0.94,
    timeframes: ['1m', '5m', '15m', '1H', '4H', '1D'],
    trade: {
      type: 'LONG',
      entryPrice: 2622.00,
      stopLoss: 2614.00,
      takeProfit: 2646.00,
      entryCandleIndex: 6,
      exitCandleIndex: 18,
      rMultiple: 3.00,
      mfe: 2648.50,
      mae: 2619.50,
      playbook: 'Daily Order Block + US CPI Inflation Hedge Flow',
      aiAutopsy: 'Institutional commodity momentum confirmed. Gold respected key 2,620 psychological support level. Strict R-multiple scaling ensured 100% win capture at target.',
      ruleAdherence: 97,
    },
    generateCandles: () => [
      { time: '08:00', open: 2625, high: 2628, low: 2619, close: 2621, volume: 410 },
      { time: '09:00', open: 2621, high: 2624, low: 2618, close: 2622, volume: 520 },
      // ENTRY
      { time: '10:00', open: 2622, high: 2631, low: 2620, close: 2629, volume: 890 },
      { time: '11:00', open: 2629, high: 2637, low: 2626, close: 2635, volume: 760 },
      { time: '12:00', open: 2635, high: 2642, low: 2632, close: 2640, volume: 810 },
      { time: '13:00', open: 2640, high: 2648, low: 2638, close: 2645, volume: 950 },
    ],
  },
  BANKNIFTY: {
    id: 'BANKNIFTY',
    symbol: 'BANKNIFTY',
    name: 'NSE Bank Nifty Index',
    assetClass: 'Indian Index',
    currency: 'INR',
    currencyPrefix: '₹',
    currentPrice: 52140.00,
    change24h: -0.22,
    timeframes: ['1m', '5m', '15m', '1H', '1D'],
    trade: {
      type: 'LONG',
      entryPrice: 51850.00,
      stopLoss: 51720.00,
      takeProfit: 52240.00,
      entryCandleIndex: 7,
      exitCandleIndex: 19,
      rMultiple: 3.00,
      mfe: 52280.00,
      mae: 51810.00,
      playbook: 'Private Bank Heavyweight Momentum + Open-Low Rejection',
      aiAutopsy: 'Clean index rejection of 51,800 whole-number demand shelf. Strict risk management kept total trade risk at 0.75% of capital.',
      ruleAdherence: 93,
    },
    generateCandles: () => [
      { time: '09:15', open: 51920, high: 52010, low: 51820, close: 51860, volume: 640 },
      { time: '09:45', open: 51860, high: 51900, low: 51810, close: 51850, volume: 510 },
      // ENTRY
      { time: '10:15', open: 51850, high: 51980, low: 51830, close: 51950, volume: 820 },
      { time: '10:45', open: 51950, high: 52060, low: 51920, close: 52040, volume: 740 },
      { time: '11:15', open: 52040, high: 52160, low: 52010, close: 52140, volume: 790 },
      { time: '11:45', open: 52140, high: 52260, low: 52110, close: 52210, volume: 860 },
    ],
  },
};

export function LiveTradingSimulationTerminal() {
  const [selectedMarketId, setSelectedMarketId] = useState<SimulationMarketId>('BTC');
  const [selectedTimeframe, setSelectedTimeframe] = useState<SimulationTimeframe>('15m');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(18);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showIndicators, setShowIndicators] = useState<boolean>(true);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  const market = SIMULATION_MARKETS[selectedMarketId];
  const allCandles = useMemo(() => market.generateCandles(), [market]);
  const visibleCandles = useMemo(
    () => allCandles.slice(0, Math.min(currentStepIndex + 1, allCandles.length)),
    [allCandles, currentStepIndex],
  );

  // Auto-play timer for interactive live simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= allCandles.length - 1) {
          return 10; // loop back to trade development phase
        }
        return prev + 1;
      });
    }, 1400 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, allCandles.length]);

  // Reset step index when changing market
  const handleMarketSelect = (id: SimulationMarketId) => {
    setSelectedMarketId(id);
    setCurrentStepIndex(14);
    setIsPlaying(true);
  };

  // Min and max prices for chart scaling
  const chartBounds = useMemo(() => {
    if (visibleCandles.length === 0) return { min: 0, max: 100 };
    let min = Infinity;
    let max = -Infinity;
    visibleCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });
    // Add trade markers to scale
    min = Math.min(min, market.trade.stopLoss);
    max = Math.max(max, market.trade.takeProfit, market.trade.mfe);
    const padding = (max - min) * 0.08;
    return { min: min - padding, max: max + padding };
  }, [visibleCandles, market.trade]);

  const activeCandle = hoveredCandle || visibleCandles[visibleCandles.length - 1] || allCandles[0];
  const tradeActive = currentStepIndex >= market.trade.entryCandleIndex;
  const targetReached = currentStepIndex >= market.trade.exitCandleIndex;

  return (
    <section id="simulation" className="relative py-20 lg:py-28 overflow-hidden bg-slate-950">
      {/* Background illumination grid */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-violet-950/10 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Interactive Replay &amp; AI Autopsy Terminal</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight font-display">
            Experience the Terminal{' '}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              in Live Simulation
            </span>
          </h2>

          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Test TradeMind’s bar-by-bar candlestick replay, Smart Money Concepts (SMC) order-block detection, MFE/MAE excursion metrics, and instant AI trade autopsy across global markets.
          </p>

          {/* Institutional Compliance Notice as explicitly requested */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium text-left">
            <Lock className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Platform Notice:</strong> TradeMind is an institutional automated journal, analytics &amp; AI copilot engine. Trade executions are managed strictly and securely via your linked brokers; live broker orders are not placed from this simulator.
            </span>
          </div>
        </div>

        {/* ── Main Terminal Shell ── */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Terminal Top Control Bar */}
          <div className="border-b border-white/[0.08] bg-white/[0.02] p-4 flex flex-wrap items-center justify-between gap-4">
            {/* Market Ticker Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(SIMULATION_MARKETS) as SimulationMarketId[]).map((mId) => {
                const item = SIMULATION_MARKETS[mId];
                const isSelected = item.id === selectedMarketId;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMarketSelect(item.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                      isSelected
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]',
                    )}
                  >
                    <span>{item.symbol}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded-md',
                        item.change24h >= 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400',
                      )}
                    >
                      {item.change24h >= 0 ? '+' : ''}
                      {item.change24h}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Timeframe & Overlays Toggles */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/[0.06] p-1">
                {(['1m', '5m', '15m', '1H', '1D'] as SimulationTimeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors',
                      selectedTimeframe === tf
                        ? 'bg-white/10 text-white font-bold'
                        : 'text-slate-400 hover:text-white',
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowIndicators(!showIndicators)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5',
                  showIndicators
                    ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                    : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white',
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>SMC &amp; VWAP</span>
              </button>
            </div>
          </div>

          {/* Terminal Body: Chart + Sidecar Telemetry */}
          <div className="grid lg:grid-cols-[1fr,360px] divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
            {/* Chart Column */}
            <div className="p-4 sm:p-6 flex flex-col space-y-4">
              {/* Active Candle Telemetry Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-sm">{market.name}</span>
                  <span className="text-slate-400">Time: {activeCandle?.time || '--'}</span>
                </div>
                {activeCandle && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <span>O: <span className="text-white">{market.currencyPrefix}{activeCandle.open.toLocaleString()}</span></span>
                    <span>H: <span className="text-emerald-400">{market.currencyPrefix}{activeCandle.high.toLocaleString()}</span></span>
                    <span>L: <span className="text-rose-400">{market.currencyPrefix}{activeCandle.low.toLocaleString()}</span></span>
                    <span>C: <span className="text-cyan-400 font-bold">{market.currencyPrefix}{activeCandle.close.toLocaleString()}</span></span>
                    <span>Vol: <span className="text-slate-400">{activeCandle.volume}k</span></span>
                  </div>
                )}
              </div>

              {/* Interactive SVG / Canvas Candlestick Display */}
              <div className="relative w-full h-[360px] bg-slate-950/70 rounded-2xl border border-white/[0.06] overflow-hidden p-2 flex flex-col justify-between">
                {/* Background grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                {/* SMC Overlay Annotation Ribbon */}
                {showIndicators && (
                  <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-bold flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> Bullish FVG Zone
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold">
                      15m BOS (Break of Structure)
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-bold">
                      Session VWAP Confluence
                    </span>
                  </div>
                )}

                {/* Candlestick & Replay Visualizer */}
                <div className="relative w-full h-full pt-8 pb-4">
                  <svg className="w-full h-full overflow-visible">
                    {/* Horizontal Price Grid Lines */}
                    {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                      const y = ratio * 320;
                      const price = chartBounds.max - ratio * (chartBounds.max - chartBounds.min);
                      return (
                        <g key={ratio}>
                          <line
                            x1="0"
                            y1={y}
                            x2="100%"
                            y2={y}
                            stroke="rgba(255,255,255,0.06)"
                            strokeDasharray="4 4"
                          />
                          <text
                            x="98%"
                            y={y - 4}
                            textAnchor="end"
                            fill="rgba(255,255,255,0.25)"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            {market.currencyPrefix}{price.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Trade Markers (Entry, Stop Loss, Target) */}
                    {tradeActive && (
                      <>
                        {/* Target Price Line */}
                        <line
                          x1="0"
                          y1={
                            ((chartBounds.max - market.trade.takeProfit) /
                              (chartBounds.max - chartBounds.min)) *
                            320
                          }
                          x2="100%"
                          y2={
                            ((chartBounds.max - market.trade.takeProfit) /
                              (chartBounds.max - chartBounds.min)) *
                            320
                          }
                          stroke="#10b981"
                          strokeWidth="1.5"
                          strokeDasharray="6 3"
                        />
                        <text
                          x="10"
                          y={
                            ((chartBounds.max - market.trade.takeProfit) /
                              (chartBounds.max - chartBounds.min)) *
                              320 -
                            4
                          }
                          fill="#10b981"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          TARGET TP (+{market.trade.rMultiple}R) @ {market.currencyPrefix}{market.trade.takeProfit}
                        </text>

                        {/* Entry Price Line */}
                        <line
                          x1="0"
                          y1={
                            ((chartBounds.max - market.trade.entryPrice) /
                              (chartBounds.max - chartBounds.min)) *
                            320
                          }
                          x2="100%"
                          y2={
                            ((chartBounds.max - market.trade.entryPrice) /
                              (chartBounds.max - chartBounds.min)) *
                            320
                          }
                          stroke="#6366f1"
                          strokeWidth="1.5"
                        />
                        <text
                          x="10"
                          y={
                            ((chartBounds.max - market.trade.entryPrice) /
                              (chartBounds.max - chartBounds.min)) *
                              320 -
                            4
                          }
                          fill="#a5b4fc"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          ENTRY LONG @ {market.currencyPrefix}{market.trade.entryPrice}
                        </text>

                        {/* Stop Loss Line */}
                        <line
                          x1="0"
                          y1={
                            ((chartBounds.max - market.trade.stopLoss) /
                              (chartBounds.max - chartBounds.min)) *
                            320
                          }
                          x2="100%"
                          y2={
                            ((chartBounds.max - market.trade.stopLoss) /
                              (chartBounds.max - chartBounds.min)) *
                            320
                          }
                          stroke="#f43f5e"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                        />
                        <text
                          x="10"
                          y={
                            ((chartBounds.max - market.trade.stopLoss) /
                              (chartBounds.max - chartBounds.min)) *
                              320 -
                            4
                          }
                          fill="#fda4af"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          STOP LOSS (1.0R Risk) @ {market.currencyPrefix}{market.trade.stopLoss}
                        </text>
                      </>
                    )}

                    {/* Candlesticks loop */}
                    {visibleCandles.map((c, i) => {
                      const totalSlots = Math.max(allCandles.length, 24);
                      const candleX = `${(i / totalSlots) * 94 + 3}%`;
                      const isBullish = c.close >= c.open;
                      const range = chartBounds.max - chartBounds.min;

                      const highY = ((chartBounds.max - c.high) / range) * 320;
                      const lowY = ((chartBounds.max - c.low) / range) * 320;
                      const openY = ((chartBounds.max - c.open) / range) * 320;
                      const closeY = ((chartBounds.max - c.close) / range) * 320;

                      const bodyTop = Math.min(openY, closeY);
                      const bodyHeight = Math.max(Math.abs(closeY - openY), 2);

                      const isEntryCandle = i === market.trade.entryCandleIndex;
                      const isExitCandle = i === market.trade.exitCandleIndex;

                      return (
                        <g
                          key={c.time}
                          onMouseEnter={() => setHoveredCandle(c)}
                          onMouseLeave={() => setHoveredCandle(null)}
                          className="cursor-pointer transition-opacity hover:opacity-80"
                        >
                          {/* Upper & Lower Wick */}
                          <line
                            x1={candleX}
                            y1={highY}
                            x2={candleX}
                            y2={lowY}
                            stroke={isBullish ? '#10b981' : '#f43f5e'}
                            strokeWidth="1.5"
                          />

                          {/* Candle Real Body */}
                          <rect
                            x={`calc(${candleX} - 5px)`}
                            y={bodyTop}
                            width="10px"
                            height={bodyHeight}
                            rx="1.5"
                            fill={isBullish ? '#10b981' : '#f43f5e'}
                          />

                          {/* Entry Pill Marker */}
                          {isEntryCandle && (
                            <g>
                              <circle
                                cx={candleX}
                                cy={lowY + 14}
                                r="4"
                                fill="#6366f1"
                                className="animate-ping"
                              />
                              <text
                                x={candleX}
                                y={lowY + 26}
                                textAnchor="middle"
                                fill="#a5b4fc"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                BUY FILL
                              </text>
                            </g>
                          )}

                          {/* Exit Pill Marker */}
                          {isExitCandle && (
                            <g>
                              <circle
                                cx={candleX}
                                cy={highY - 14}
                                r="4"
                                fill="#10b981"
                                className="animate-pulse"
                              />
                              <text
                                x={candleX}
                                y={highY - 20}
                                textAnchor="middle"
                                fill="#34d399"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                EXIT (+3.4R)
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Simulation Player Scrubber Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCurrentStepIndex(5);
                      setIsPlaying(false);
                    }}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-colors"
                    title="Rewind to start"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setCurrentStepIndex((p) => Math.max(p - 1, 0))}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-colors"
                    title="Previous bar"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/30 transition-all"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause Simulation</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Play Replay</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setCurrentStepIndex((p) => Math.min(p + 1, allCandles.length - 1))}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-colors"
                    title="Next bar"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar scrubber */}
                <div className="flex-1 max-w-xs flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    Bar {currentStepIndex + 1}/{allCandles.length}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={allCandles.length - 1}
                    value={currentStepIndex}
                    onChange={(e) => {
                      setCurrentStepIndex(Number(e.target.value));
                      setIsPlaying(false);
                    }}
                    className="w-full accent-violet-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>

                {/* Speed buttons */}
                <div className="flex items-center gap-1">
                  {[1, 2, 5].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={cn(
                        'px-2 py-1 text-[11px] font-mono rounded-lg transition-colors',
                        playbackSpeed === spd
                          ? 'bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30'
                          : 'text-slate-400 hover:text-white',
                      )}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: AI Risk Shield & Execution Telemetry Sidecar */}
            <div className="p-4 sm:p-6 bg-white/[0.01] flex flex-col justify-between space-y-6">
              {/* Telemetry Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Risk Shield Telemetry
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                    Active · 0 Tilt
                  </span>
                </div>

                {/* Strategy Playbook Pill */}
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Playbook Model</div>
                  <div className="text-xs font-bold text-white">{market.trade.playbook}</div>
                </div>

                {/* Key Execution Metrics Ribbon */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                    <div className="text-[10px] uppercase font-mono text-slate-400">R-Multiple</div>
                    <div className="text-lg font-black text-emerald-400 font-mono">
                      +{market.trade.rMultiple.toFixed(2)}R
                    </div>
                    <div className="text-[10px] text-slate-500">Risked 1.0R ($250)</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Rule Adherence</div>
                    <div className="text-lg font-black text-cyan-400 font-mono">
                      {market.trade.ruleAdherence}%
                    </div>
                    <div className="text-[10px] text-slate-500">Discipline Score: A+</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                    <div className="text-[10px] uppercase font-mono text-slate-400">MFE (Peak Run)</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {market.currencyPrefix}{market.trade.mfe.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-400">Left 8% on table</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                    <div className="text-[10px] uppercase font-mono text-slate-400">MAE (Drawdown)</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {market.currencyPrefix}{market.trade.mae.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">-0.35R Max Heat</div>
                  </div>
                </div>

                {/* AI Trade Autopsy Feed */}
                <div className="p-4 rounded-2xl bg-violet-950/20 border border-violet-500/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-violet-300">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    <span>AI Copilot Autopsy Verdict</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {market.trade.aiAutopsy}
                  </p>
                </div>
              </div>

              {/* Bottom Quick Action CTAs */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <Link
                  href="/demo"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/25 transition-all"
                >
                  <span>Open Full Sandbox Terminal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href="/register"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 hover:bg-white/[0.05] text-slate-300 hover:text-white font-semibold text-xs transition-colors"
                >
                  <span>Start Free Automated Journal</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
