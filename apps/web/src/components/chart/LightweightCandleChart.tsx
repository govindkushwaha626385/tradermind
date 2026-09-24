'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  Time,
  SeriesMarker,
} from 'lightweight-charts';
import {
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  BarChart2,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart,
} from 'lucide-react';
import type { TradeReplayData } from '@trademind/shared';
import { formatCurrency } from '@/lib/utils';

export type ChartTimeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1D' | '1W';

interface LightweightCandleChartProps {
  data: TradeReplayData;
  timeframe?: ChartTimeframe;
  onTimeframeChange?: (tf: ChartTimeframe) => void;
  currency?: string;
  className?: string;
}

export function LightweightCandleChart({
  data,
  timeframe: initialTf = '5m',
  onTimeframeChange,
  currency = 'INR',
  className = '',
}: LightweightCandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [timeframe, setTimeframe] = useState<ChartTimeframe>(initialTf);
  const [showLevels, setShowLevels] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Change timeframe handler
  const handleSelectTimeframe = (tf: ChartTimeframe) => {
    setTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  // Generate realistic, consistent price action candles for the trade
  const generateCandles = (): {
    candles: (CandlestickData<Time> & { volume?: number })[];
    entryTime: Time;
    exitTime: Time;
  } => {
    const rawEntry = Number(data.entryPrice);
    const entry = (!isNaN(rawEntry) && rawEntry > 0) ? rawEntry : 100;
    const isLong = data.direction === 'LONG';
    const rawExit = Number(data.exitPrice);
    const exit = (!isNaN(rawExit) && rawExit > 0) ? rawExit : entry * (isLong ? 1.018 : 0.982);
    const mfe = data.mfe != null ? Number(data.mfe) : (isLong ? Math.max(entry, exit) * 1.025 : Math.min(entry, exit) * 0.975);
    const mae = data.mae != null ? Number(data.mae) : (isLong ? Math.min(entry, exit) * 0.988 : Math.max(entry, exit) * 1.012);

    const priceDelta = Math.abs(exit - entry) || entry * 0.012;
    const stepSeconds =
      timeframe === '1m' ? 60 :
      timeframe === '3m' ? 180 :
      timeframe === '5m' ? 300 :
      timeframe === '15m' ? 900 :
      timeframe === '30m' ? 1800 :
      timeframe === '1h' ? 3600 :
      timeframe === '4h' ? 14400 :
      timeframe === '1D' ? 86400 : 604800;

    const baseTimestamp = Math.floor(new Date().getTime() / 1000) - 30 * stepSeconds;
    const result: (CandlestickData<Time> & { volume?: number })[] = [];

    let currentPrice = entry - (isLong ? priceDelta * 0.4 : -priceDelta * 0.4);

    // 1. Pre-trade context candles (8 candles)
    for (let i = 0; i < 8; i++) {
      const t = (baseTimestamp + i * stepSeconds) as Time;
      const noise = Math.sin(i) * priceDelta * 0.15;
      const open = currentPrice;
      const close = open + (isLong ? priceDelta * 0.05 : -priceDelta * 0.05) + noise;
      const high = Math.max(open, close) + Math.abs(noise * 0.8);
      const low = Math.min(open, close) - Math.abs(noise * 0.8);
      const volume = Math.floor(1200 + Math.random() * 2500);
      result.push({ time: t, open, high, low, close, volume });
      currentPrice = close;
    }

    // 2. Entry Candle (Candle 8)
    const entryTime = (baseTimestamp + 8 * stepSeconds) as Time;
    const entryOpen = currentPrice;
    const entryClose = entry;
    const entryHigh = Math.max(entryOpen, entryClose) + priceDelta * 0.1;
    const entryLow = Math.min(entryOpen, entryClose) - priceDelta * 0.1;
    result.push({ time: entryTime, open: entryOpen, high: entryHigh, low: entryLow, close: entryClose });
    currentPrice = entryClose;

    // 3. In-trade progression with MAE dip and MFE peak
    const inTradeSteps = 12;
    for (let i = 1; i <= inTradeSteps; i++) {
      const t = (baseTimestamp + (8 + i) * stepSeconds) as Time;
      const open = currentPrice;
      let targetProgress = entry + ((exit - entry) * (i / inTradeSteps));

      if (i === 3) targetProgress = mae;
      if (i === 8) targetProgress = mfe;

      const noise = Math.cos(i) * priceDelta * 0.1;
      const close = targetProgress + noise;
      const high = Math.max(open, close) + Math.abs(noise * 0.7);
      const low = Math.min(open, close) - Math.abs(noise * 0.7);
      result.push({ time: t, open, high, low, close });
      currentPrice = close;
    }

    // 4. Exit Candle (Candle 20)
    const exitTime = (baseTimestamp + (8 + inTradeSteps) * stepSeconds) as Time;
    const lastCandle = result[result.length - 1];
    lastCandle.close = exit;
    lastCandle.high = Math.max(lastCandle.high, exit);
    lastCandle.low = Math.min(lastCandle.low, exit);
    currentPrice = exit;

    // 5. Post-trade aftermath (6 candles)
    for (let i = 1; i <= 6; i++) {
      const t = (baseTimestamp + (8 + inTradeSteps + i) * stepSeconds) as Time;
      const open = currentPrice;
      const noise = Math.sin(i) * priceDelta * 0.2;
      const close = open + noise;
      const high = Math.max(open, close) + Math.abs(noise * 0.6);
      const low = Math.min(open, close) - Math.abs(noise * 0.6);
      result.push({ time: t, open, high, low, close });
      currentPrice = close;
    }

    return { candles: result, entryTime, exitTime };
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const { clientWidth, clientHeight } = container;
    const width = clientWidth || 800;
    const height = clientHeight || 420;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#a1a1aa',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: 3,
          labelBackgroundColor: '#4f46e5',
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: 3,
          labelBackgroundColor: '#4f46e5',
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.15,
        },
      },
    });

    chartRef.current = chart;

    // Add Candlestick Series using lightweight-charts v5 addSeries API
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    seriesRef.current = candleSeries;

    const { candles, entryTime, exitTime } = generateCandles();
    candleSeries.setData(candles);

    // Add Entry & Exit Markers
    const markers: SeriesMarker<Time>[] = [
      {
        time: entryTime,
        position: data.direction === 'LONG' ? 'belowBar' : 'aboveBar',
        color: '#10b981',
        shape: data.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
        text: `ENTRY @ ${formatCurrency(data.entryPrice, currency)}`,
      },
    ];

    if (data.exitPrice) {
      markers.push({
        time: exitTime,
        position: data.direction === 'LONG' ? 'aboveBar' : 'belowBar',
        color: '#f59e0b',
        shape: data.direction === 'LONG' ? 'arrowDown' : 'arrowUp',
        text: `EXIT @ ${formatCurrency(data.exitPrice, currency)}`,
      });
    }

    createSeriesMarkers(candleSeries, markers);

    // Add Horizontal Price Lines for key levels
    if (showLevels) {
      // Entry Level
      candleSeries.createPriceLine({
        price: data.entryPrice,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'ENTRY',
      });

      // Exit Level
      if (data.exitPrice) {
        candleSeries.createPriceLine({
          price: data.exitPrice,
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: 0,
          axisLabelVisible: true,
          title: 'EXIT',
        });
      }

      // Stop Loss Level
      if (data.planStop) {
        candleSeries.createPriceLine({
          price: data.planStop,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'STOP LOSS',
        });
      }

      // Target Level
      if (data.planTarget) {
        candleSeries.createPriceLine({
          price: data.planTarget,
          color: '#8b5cf6',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'TARGET',
        });
      }

      // MFE Band
      if (data.mfe) {
        candleSeries.createPriceLine({
          price: data.mfe,
          color: '#06b6d4',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: 'MAX FAVORABLE (MFE)',
        });
      }

      // MAE Band
      if (data.mae) {
        candleSeries.createPriceLine({
          price: data.mae,
          color: '#ec4899',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: 'MAX ADVERSE (MAE)',
        });
      }
    }

    // Add Volume Series
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale',
      });
      chart.priceScale('volume_scale').applyOptions({
        scaleMargins: {
          top: 0.82,
          bottom: 0,
        },
      });
      const volData: HistogramData<Time>[] = candles.map((c) => ({
        time: c.time,
        value: c.volume || 1800,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
      }));
      volumeSeries.setData(volData);
    }

    // Add EMA 20 & 50 Indicator lines
    if (showEma && candles.length >= 3) {
      const ema20Series = chart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 2,
        title: 'EMA 20',
      });
      const ema50Series = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
        title: 'EMA 50',
      });

      const ema20Data: LineData<Time>[] = [];
      const ema50Data: LineData<Time>[] = [];
      let e20 = candles[0]!.close;
      let e50 = candles[0]!.close;
      const k20 = 2 / (20 + 1);
      const k50 = 2 / (50 + 1);

      candles.forEach((c) => {
        e20 = c.close * k20 + e20 * (1 - k20);
        e50 = c.close * k50 + e50 * (1 - k50);
        ema20Data.push({ time: c.time, value: parseFloat(e20.toFixed(2)) });
        ema50Data.push({ time: c.time, value: parseFloat(e50.toFixed(2)) });
      });

      ema20Series.setData(ema20Data);
      ema50Series.setData(ema50Data);
    }

    chart.timeScale().fitContent();

    // Resize Observer for fluid responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      chart.applyOptions({ width: newWidth, height: newHeight });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, timeframe, showLevels, showEma, showVolume, currency]);

  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 p-4' : className
      }`}
    >
      {/* Chart Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur">
        {/* Symbol & Direction Tag */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs font-bold text-white tracking-wider">
            <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
            {data.symbol}
          </div>

          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
              data.direction === 'LONG'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {data.direction === 'LONG' ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {data.direction}
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400">
            <span>Entry:</span>
            <strong className="text-zinc-200 font-mono">
              {formatCurrency(Number(data.entryPrice) || 0, currency)}
            </strong>
            {data.exitPrice != null && (
              <>
                <span className="ml-1.5">Exit:</span>
                <strong className="text-zinc-200 font-mono">
                  {formatCurrency(Number(data.exitPrice) || 0, currency)}
                </strong>
              </>
            )}
          </div>
        </div>

        {/* Timeframe Selectors & View Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Buttons */}
          <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
            {(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1D'] as ChartTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => handleSelectTimeframe(tf)}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  timeframe === tf
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Toggle EMA Indicator */}
          <button
            onClick={() => setShowEma((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showEma
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title="Toggle 20 & 50 EMA lines"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EMA</span>
          </button>

          {/* Toggle Volume */}
          <button
            onClick={() => setShowVolume((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showVolume
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title="Toggle Volume Bars"
          >
            <BarChart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vol</span>
          </button>

          {/* Toggle Price Levels */}
          <button
            onClick={() => setShowLevels((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showLevels
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title="Toggle Stop/Target/MFE/MAE lines"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Levels</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Canvas Mount Container */}
      <div
        ref={containerRef}
        className="w-full flex-1 min-h-[380px] bg-zinc-950 relative"
      />

      {/* Legend Footer */}
      <div className="px-4 py-2.5 bg-zinc-900/40 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
        <div className="flex items-center gap-4 flex-wrap font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Bullish</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span>Bearish</span>
          </div>
          {showEma && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400" />
                <span>EMA 20</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-400" />
                <span>EMA 50</span>
              </div>
            </>
          )}
          {showVolume && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40" />
              <span>Volume</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400" />
            <span>Entry</span>
          </div>
          {data.exitPrice && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400" />
              <span>Exit</span>
            </div>
          )}
          {data.planStop && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-rose-500" />
              <span>Stop Loss</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>TradingView Canvas Engine</span>
        </div>
      </div>
    </div>
  );
}
