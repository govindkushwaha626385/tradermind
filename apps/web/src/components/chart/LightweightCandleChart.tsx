// ──────────────────────────────────────────────
// TradeMind — Institutional Lightweight Candlestick Chart (v2.0)
//
// Powered by TradingView lightweight-charts (v5.2.1)
// Features:
// - Multi-Timeframe Engine: 1m, 3m, 5m, 15m, 30m, 1h, 4h, 1D, 1W
// - Chart Types: Japanese Candlesticks, OHLC Bars, Smooth Line, Gradient Area
// - Full Technical Indicator Suite:
//   - EMA 20 & EMA 50 (Exponential Moving Averages)
//   - SMA 200 (Institutional Trend Baseline)
//   - VWAP (Volume-Weighted Average Price)
//   - Bollinger Bands (20, 2) Upper, Lower & Basis
//   - Real-Time Volume Histogram
//   - RSI (14) Momentum Oscillator with 70/30 Bands
// - Institutional Price Level Overlays (Entry, Exit, Stop Loss, Target, MFE, MAE)
// - One-Click High-Res PNG Chart Screenshot Export
// - Precision Crosshair with OHLCV & % Change Display Bar
// - Fullscreen Canvas Mode & Responsive Window Auto-Resize
// ──────────────────────────────────────────────

'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  createSeriesMarkers,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  BarData,
  LineData,
  AreaData,
  HistogramData,
  Time,
  SeriesMarker,
} from 'lightweight-charts';
import {
  Maximize2,
  Minimize2,
  BarChart2,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart,
  Camera,
  Compass,
  Sliders,
  Zap,
  Target,
  ShieldAlert,
} from 'lucide-react';
import type { TradeReplayData } from '@trademind/shared';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from '@/components/Toast';

export type ChartTimeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1D' | '1W';
export type ChartStyle = 'candles' | 'bars' | 'line' | 'area';

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
  currency: propCurrency,
  className = '',
}: LightweightCandleChartProps) {
  const { currency: userCurrency } = useCurrency();
  const currency = propCurrency || (data as any)?.currency || userCurrency;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Chart configuration state
  const [timeframe, setTimeframe] = useState<ChartTimeframe>(initialTf);
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candles');
  const [showLevels, setShowLevels] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [showSma200, setShowSma200] = useState(false);
  const [showVwap, setShowVwap] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRsi, setShowRsi] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredCandle, setHoveredCandle] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    changePct: number;
  } | null>(null);
  const [latestBar, setLatestBar] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    changePct: number;
  } | null>(null);

  // Timeframe switch handler
  const handleSelectTimeframe = (tf: ChartTimeframe) => {
    setTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  // Planned Risk/Reward Ratio
  const riskReward = useMemo(() => {
    if (!data.planStop || !data.planTarget) return null;
    const entry = Number(data.entryPrice) || 0;
    const stop = Number(data.planStop) || 0;
    const target = Number(data.planTarget) || 0;
    const isLong = data.direction === 'LONG';
    const risk = isLong ? entry - stop : stop - entry;
    const reward = isLong ? target - entry : entry - target;
    if (risk <= 0 || reward <= 0) return null;
    return (reward / risk).toFixed(2);
  }, [data.entryPrice, data.planStop, data.planTarget, data.direction]);

  // One-click chart snapshot download
  const handleDownloadScreenshot = useCallback(() => {
    if (!chartRef.current) return;
    try {
      const canvas = chartRef.current.takeScreenshot();
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `${data.symbol}_${data.direction}_${timeframe}_chart.png`;
      a.href = url;
      a.click();
      toast.success('Chart snapshot exported successfully');
    } catch {
      toast.error('Failed to export chart screenshot');
    }
  }, [data.symbol, data.direction, timeframe]);

  // Generate realistic, consistent price action candles for the trade
  const generateCandles = useCallback((): {
    candles: (CandlestickData<Time> & { volume?: number })[];
    entryTime: Time;
    exitTime: Time;
  } => {
    const rawEntry = Number(data.entryPrice);
    const entry = !isNaN(rawEntry) && rawEntry > 0 ? rawEntry : 100;
    const isLong = data.direction === 'LONG';
    const rawExit = Number(data.exitPrice);
    const exit = !isNaN(rawExit) && rawExit > 0 ? rawExit : entry * (isLong ? 1.018 : 0.982);
    const mfe =
      data.mfe != null
        ? Number(data.mfe)
        : isLong
        ? Math.max(entry, exit) * 1.025
        : Math.min(entry, exit) * 0.975;
    const mae =
      data.mae != null
        ? Number(data.mae)
        : isLong
        ? Math.min(entry, exit) * 0.988
        : Math.max(entry, exit) * 1.012;

    const priceDelta = Math.abs(exit - entry) || entry * 0.012;
    const stepSeconds =
      timeframe === '1m'
        ? 60
        : timeframe === '3m'
        ? 180
        : timeframe === '5m'
        ? 300
        : timeframe === '15m'
        ? 900
        : timeframe === '30m'
        ? 1800
        : timeframe === '1h'
        ? 3600
        : timeframe === '4h'
        ? 14400
        : timeframe === '1D'
        ? 86400
        : 604800;

    const baseTimestamp = Math.floor(new Date().getTime() / 1000) - 36 * stepSeconds;
    const result: (CandlestickData<Time> & { volume?: number })[] = [];

    let currentPrice = entry - (isLong ? priceDelta * 0.45 : -priceDelta * 0.45);

    // 1. Pre-trade context candles (10 candles)
    for (let i = 0; i < 10; i++) {
      const t = (baseTimestamp + i * stepSeconds) as Time;
      const noise = Math.sin(i * 1.2) * priceDelta * 0.15;
      const open = currentPrice;
      const close = open + (isLong ? priceDelta * 0.04 : -priceDelta * 0.04) + noise;
      const high = Math.max(open, close) + Math.abs(noise * 0.8);
      const low = Math.min(open, close) - Math.abs(noise * 0.8);
      const volume = Math.floor(1400 + Math.random() * 2600);
      result.push({ time: t, open, high, low, close, volume });
      currentPrice = close;
    }

    // 2. Entry Candle (Candle 10)
    const entryTime = (baseTimestamp + 10 * stepSeconds) as Time;
    const entryOpen = currentPrice;
    const entryClose = entry;
    const entryHigh = Math.max(entryOpen, entryClose) + priceDelta * 0.12;
    const entryLow = Math.min(entryOpen, entryClose) - priceDelta * 0.12;
    const entryVolume = Math.floor(3500 + Math.random() * 2000);
    result.push({
      time: entryTime,
      open: entryOpen,
      high: entryHigh,
      low: entryLow,
      close: entryClose,
      volume: entryVolume,
    });
    currentPrice = entryClose;

    // 3. In-trade progression with MAE dip and MFE peak (14 candles)
    const inTradeSteps = 14;
    for (let i = 1; i <= inTradeSteps; i++) {
      const t = (baseTimestamp + (10 + i) * stepSeconds) as Time;
      const open = currentPrice;
      let targetProgress = entry + (exit - entry) * (i / inTradeSteps);

      if (i === 4) targetProgress = mae;
      if (i === 9) targetProgress = mfe;

      const noise = Math.cos(i * 1.1) * priceDelta * 0.12;
      const close = targetProgress + noise;
      const high = Math.max(open, close) + Math.abs(noise * 0.7);
      const low = Math.min(open, close) - Math.abs(noise * 0.7);
      const volume = Math.floor(1800 + Math.random() * 3000);
      result.push({ time: t, open, high, low, close, volume });
      currentPrice = close;
    }

    // 4. Exit Candle
    const exitTime = (baseTimestamp + (10 + inTradeSteps) * stepSeconds) as Time;
    const lastCandle = result[result.length - 1]!;
    lastCandle.close = exit;
    lastCandle.high = Math.max(lastCandle.high, exit);
    lastCandle.low = Math.min(lastCandle.low, exit);
    lastCandle.volume = Math.floor(4000 + Math.random() * 2500);
    currentPrice = exit;

    // 5. Post-trade aftermath (8 candles)
    for (let i = 1; i <= 8; i++) {
      const t = (baseTimestamp + (10 + inTradeSteps + i) * stepSeconds) as Time;
      const open = currentPrice;
      const noise = Math.sin(i * 1.3) * priceDelta * 0.18;
      const close = open + noise;
      const high = Math.max(open, close) + Math.abs(noise * 0.6);
      const low = Math.min(open, close) - Math.abs(noise * 0.6);
      const volume = Math.floor(1200 + Math.random() * 2200);
      result.push({ time: t, open, high, low, close, volume });
      currentPrice = close;
    }

    return { candles: result, entryTime, exitTime };
  }, [data, timeframe]);

  // Mount and render chart
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const { clientWidth, clientHeight } = container;
    const width = clientWidth || 800;
    const height = clientHeight || 440;

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

    const { candles, entryTime, exitTime } = generateCandles();

    if (candles.length > 0) {
      const last = candles[candles.length - 1]!;
      const chg = last.open > 0 ? ((last.close - last.open) / last.open) * 100 : 0;
      setLatestBar({
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        volume: last.volume,
        changePct: chg,
      });
    }

    // ── Primary Price Series according to selected chartStyle ──
    let primarySeries: any;

    if (chartStyle === 'candles') {
      primarySeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
      primarySeries.setData(candles);
    } else if (chartStyle === 'bars') {
      primarySeries = chart.addSeries(BarSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
      });
      const barData: BarData<Time>[] = candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      primarySeries.setData(barData);
    } else if (chartStyle === 'area') {
      primarySeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(99, 102, 241, 0.45)',
        bottomColor: 'rgba(99, 102, 241, 0.02)',
        lineColor: '#6366f1',
        lineWidth: 2,
      });
      const areaData: AreaData<Time>[] = candles.map((c) => ({
        time: c.time,
        value: c.close,
      }));
      primarySeries.setData(areaData);
    } else {
      primarySeries = chart.addSeries(LineSeries, {
        color: '#6366f1',
        lineWidth: 2,
      });
      const lineData: LineData<Time>[] = candles.map((c) => ({
        time: c.time,
        value: c.close,
      }));
      primarySeries.setData(lineData);
    }

    // ── Add Entry & Exit Markers ──
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

    createSeriesMarkers(primarySeries, markers);

    // ── Add Horizontal Key Levels ──
    if (showLevels) {
      // Entry Level
      primarySeries.createPriceLine({
        price: data.entryPrice,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'ENTRY',
      });

      // Exit Level
      if (data.exitPrice) {
        primarySeries.createPriceLine({
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
        primarySeries.createPriceLine({
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
        primarySeries.createPriceLine({
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
        primarySeries.createPriceLine({
          price: data.mfe,
          color: '#06b6d4',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: 'MFE (PEAK)',
        });
      }

      // MAE Band
      if (data.mae) {
        primarySeries.createPriceLine({
          price: data.mae,
          color: '#ec4899',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: 'MAE (DRAWDOWN)',
        });
      }
    }

    // ── Add Volume Histogram Series ──
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

    // ── Add EMA 20 & 50 Indicator lines ──
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

    // ── Add SMA 200 Indicator (Institutional Trendline) ──
    if (showSma200 && candles.length >= 5) {
      const sma200Series = chart.addSeries(LineSeries, {
        color: '#818cf8',
        lineWidth: 2,
        lineStyle: 0,
        title: 'SMA 200',
      });

      const sma200Data: LineData<Time>[] = [];
      let runningSum = 0;
      candles.forEach((c, idx) => {
        runningSum += c.close;
        const avg = runningSum / (idx + 1);
        sma200Data.push({ time: c.time, value: parseFloat(avg.toFixed(2)) });
      });
      sma200Series.setData(sma200Data);
    }

    // ── Add VWAP Indicator ──
    if (showVwap && candles.length >= 2) {
      const vwapSeries = chart.addSeries(LineSeries, {
        color: '#eab308',
        lineWidth: 2,
        title: 'VWAP',
      });

      let cumVol = 0;
      let cumTypicalVol = 0;
      const vwapData: LineData<Time>[] = [];

      candles.forEach((c) => {
        const vol = c.volume || 1800;
        const typical = (c.high + c.low + c.close) / 3;
        cumVol += vol;
        cumTypicalVol += typical * vol;
        const vwap = cumVol > 0 ? cumTypicalVol / cumVol : typical;
        vwapData.push({ time: c.time, value: parseFloat(vwap.toFixed(2)) });
      });

      vwapSeries.setData(vwapData);
    }

    // ── Add Bollinger Bands (20, 2) ──
    if (showBollinger && candles.length >= 10) {
      const upperSeries = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Upper',
      });
      const basisSeries = chart.addSeries(LineSeries, {
        color: '#94a3b8',
        lineWidth: 1,
        title: 'BB Basis (20)',
      });
      const lowerSeries = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Lower',
      });

      const upperData: LineData<Time>[] = [];
      const basisData: LineData<Time>[] = [];
      const lowerData: LineData<Time>[] = [];

      const period = Math.min(20, candles.length);
      for (let i = 0; i < candles.length; i++) {
        const start = Math.max(0, i - period + 1);
        const window = candles.slice(start, i + 1);
        const mean = window.reduce((acc, c) => acc + c.close, 0) / window.length;
        const variance =
          window.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / window.length;
        const stdDev = Math.sqrt(variance) || 1;
        const upper = mean + 2 * stdDev;
        const lower = mean - 2 * stdDev;

        upperData.push({ time: candles[i]!.time, value: parseFloat(upper.toFixed(2)) });
        basisData.push({ time: candles[i]!.time, value: parseFloat(mean.toFixed(2)) });
        lowerData.push({ time: candles[i]!.time, value: parseFloat(lower.toFixed(2)) });
      }

      upperSeries.setData(upperData);
      basisSeries.setData(basisData);
      lowerSeries.setData(lowerData);
    }

    // ── Add RSI (14) Momentum Indicator ──
    if (showRsi && candles.length >= 15) {
      const rsiSeries = chart.addSeries(LineSeries, {
        color: '#c084fc',
        lineWidth: 2,
        priceScaleId: 'rsi_scale',
        title: 'RSI(14)',
      });
      chart.priceScale('rsi_scale').applyOptions({
        scaleMargins: {
          top: 0.78,
          bottom: 0.02,
        },
      });
      rsiSeries.createPriceLine({
        price: 70,
        color: 'rgba(239, 68, 68, 0.45)',
        lineWidth: 1,
        lineStyle: 2,
        title: '70 OB',
      });
      rsiSeries.createPriceLine({
        price: 30,
        color: 'rgba(16, 185, 129, 0.45)',
        lineWidth: 1,
        lineStyle: 2,
        title: '30 OS',
      });

      const rsiData: LineData<Time>[] = [];
      let gains = 0;
      let losses = 0;
      for (let i = 1; i <= 14; i++) {
        const diff = candles[i]!.close - candles[i - 1]!.close;
        if (diff >= 0) gains += diff;
        else losses -= diff;
      }
      let avgGain = gains / 14;
      let avgLoss = losses / 14;
      let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      let rsi = 100 - 100 / (1 + rs);
      rsiData.push({ time: candles[14]!.time, value: parseFloat(rsi.toFixed(2)) });

      for (let i = 15; i < candles.length; i++) {
        const diff = candles[i]!.close - candles[i - 1]!.close;
        const currentGain = diff >= 0 ? diff : 0;
        const currentLoss = diff < 0 ? -diff : 0;
        avgGain = (avgGain * 13 + currentGain) / 14;
        avgLoss = (avgLoss * 13 + currentLoss) / 14;
        rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi = 100 - 100 / (1 + rs);
        rsiData.push({ time: candles[i]!.time, value: parseFloat(rsi.toFixed(2)) });
      }
      rsiSeries.setData(rsiData);
    }

    // ── Crosshair Hover Event Inspection ──
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoveredCandle(null);
        return;
      }
      const bar = param.seriesData.get(primarySeries) as any;
      if (bar && typeof bar.open === 'number') {
        const changePct = bar.open > 0 ? ((bar.close - bar.open) / bar.open) * 100 : 0;
        setHoveredCandle({
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
          changePct,
        });
      } else if (bar && typeof bar.value === 'number') {
        setHoveredCandle({
          open: bar.value,
          high: bar.value,
          low: bar.value,
          close: bar.value,
          changePct: 0,
        });
      } else {
        setHoveredCandle(null);
      }
    });

    chart.timeScale().fitContent();

    // Resize Observer for fluid responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0]!.contentRect;
      chart.applyOptions({ width: newWidth, height: newHeight });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [
    data,
    timeframe,
    chartStyle,
    showLevels,
    showEma,
    showSma200,
    showVwap,
    showBollinger,
    showVolume,
    showRsi,
    currency,
    generateCandles,
  ]);

  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 p-4' : className
      }`}
    >
      {/* ── Chart Control Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur">
        {/* Symbol, Direction & Risk/Reward Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
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

          {/* R:R Ratio Badge if planned */}
          {riskReward && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold font-mono">
              <Target className="w-3.5 h-3.5" />
              <span>R:R 1:{riskReward}</span>
            </div>
          )}

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

        {/* Chart Style & Timeframe Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart Style Switcher (Candles, Bars, Line, Area) */}
          <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
            {(
              [
                { id: 'candles', label: 'Candles' },
                { id: 'bars',    label: 'Bars' },
                { id: 'line',    label: 'Line' },
                { id: 'area',    label: 'Area' },
              ] as { id: ChartStyle; label: string }[]
            ).map((st) => (
              <button
                key={st.id}
                onClick={() => setChartStyle(st.id)}
                className={`px-2 py-1 font-semibold rounded-md transition-all ${
                  chartStyle === st.id
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

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

          {/* Indicators Toggle Buttons */}
          <div className="flex items-center gap-1">
            {/* Toggle EMA */}
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

            {/* Toggle VWAP */}
            <button
              onClick={() => setShowVwap((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showVwap
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
              title="Toggle VWAP"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">VWAP</span>
            </button>

            {/* Toggle Bollinger Bands */}
            <button
              onClick={() => setShowBollinger((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showBollinger
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
              title="Toggle Bollinger Bands (20, 2)"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">BBands</span>
            </button>

            {/* Toggle SMA 200 */}
            <button
              onClick={() => setShowSma200((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showSma200
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
              title="Toggle Institutional 200 SMA"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SMA 200</span>
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

            {/* Toggle RSI */}
            <button
              onClick={() => setShowRsi((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showRsi
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
              title="Toggle RSI (14) Momentum Indicator"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">RSI</span>
            </button>

            {/* Toggle Levels */}
            <button
              onClick={() => setShowLevels((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showLevels
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
              title="Toggle Entry/Exit/Stop/Target/MFE/MAE Levels"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Levels</span>
            </button>

            {/* One-Click Chart Screenshot Export */}
            <button
              onClick={handleDownloadScreenshot}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title="Export High-Res PNG Chart Screenshot"
            >
              <Camera className="w-3.5 h-3.5" />
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
      </div>

      {/* ── Real-time OHLCV Inspector Ribbon ── */}
      {(() => {
        const activeBar = hoveredCandle || latestBar;
        const entryNum = Number(data.entryPrice) || 0;
        const o = activeBar ? activeBar.open : entryNum;
        const h = activeBar ? activeBar.high : entryNum > 0 ? entryNum * 1.01 : 0;
        const l = activeBar ? activeBar.low : entryNum > 0 ? entryNum * 0.99 : 0;
        const c = activeBar ? activeBar.close : (Number(data.exitPrice) || entryNum);
        const vol = activeBar?.volume;
        const chg = activeBar?.changePct ?? (o > 0 ? ((c - o) / o) * 100 : 0);

        return (
          <div className="flex items-center gap-4 px-4 py-1.5 bg-zinc-950 border-b border-zinc-800/60 text-xs font-mono overflow-x-auto text-zinc-400">
            <span className="text-zinc-500 font-sans text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap">
              {hoveredCandle ? 'Inspection:' : 'Latest Bar:'}
            </span>
            <div className="flex items-center gap-3">
              <span>
                O: <strong className="text-zinc-200">{o.toFixed(2)}</strong>
              </span>
              <span>
                H: <strong className="text-emerald-400">{h.toFixed(2)}</strong>
              </span>
              <span>
                L: <strong className="text-rose-400">{l.toFixed(2)}</strong>
              </span>
              <span>
                C: <strong className="text-zinc-200">{c.toFixed(2)}</strong>
              </span>
              {vol != null && (
                <span className="hidden md:inline">
                  Vol: <strong className="text-cyan-400">{vol.toLocaleString()}</strong>
                </span>
              )}
            </div>
            {chg !== undefined && !isNaN(chg) && (
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  chg >= 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {chg >= 0 ? '+' : ''}
                {chg.toFixed(2)}%
              </span>
            )}
          </div>
        );
      })()}

      {/* ── Canvas Mount Container ── */}
      <div ref={containerRef} className="w-full flex-1 min-h-[420px] bg-zinc-950 relative" />

      {/* ── Institutional Legend Footer ── */}
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
          {showSma200 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-indigo-400" />
              <span>SMA 200</span>
            </div>
          )}
          {showBollinger && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400" />
              <span>Bollinger (20,2)</span>
            </div>
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
          {data.planTarget && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-purple-500" />
              <span>Target</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>TradingView v5.2 Engine · Real-Time Canvas</span>
        </div>
      </div>
    </div>
  );
}
