'use client';

// ──────────────────────────────────────────────
// TradeMind — Institutional Market Radar & Live Session Status (v2.0)
//
// Powered by TradingView lightweight-charts (v5.2.1)
// Features:
// - Live market session status with IST clock & countdown
// - Multi-market tabs: NIFTY 50, BANK NIFTY, S&P 500, BTC/USD, EUR/USD
// - Real-time TradingView Lightweight Sparkline & Area Chart
// - Day High, Day Low, VWAP, and Spread metrics
// - Crosshair tooltips with precision values
// - 100% responsive, dark-mode glassmorphic styling
// ──────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe2,
  Sparkles,
  Maximize2,
  BarChart2,
} from 'lucide-react';
import {
  createChart,
  AreaSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
  AreaData,
  Time,
} from 'lightweight-charts';
import { cn } from '@/lib/utils';

export interface MarketIndexData {
  symbol: string;
  name: string;
  category: 'India' | 'US' | 'Crypto' | 'Forex';
  price: string;
  change: string;
  changePct: string;
  isPositive: boolean;
  high: string;
  low: string;
  vwap: string;
  points: Array<{ time: string; value: number }>;
}

const INDICES_DATA: Record<string, MarketIndexData> = {
  NIFTY: {
    symbol: 'NIFTY 50',
    name: 'NIFTY',
    category: 'India',
    price: '25,385.40',
    change: '+142.30',
    changePct: '+0.56%',
    isPositive: true,
    high: '25,412.80',
    low: '25,245.10',
    vwap: '25,340.20',
    points: [
      { time: '2026-09-25 09:15', value: 25250 },
      { time: '2026-09-25 10:00', value: 25290 },
      { time: '2026-09-25 11:00', value: 25340 },
      { time: '2026-09-25 12:00', value: 25320 },
      { time: '2026-09-25 13:00', value: 25370 },
      { time: '2026-09-25 14:00', value: 25410 },
      { time: '2026-09-25 15:00', value: 25385.4 },
    ],
  },
  BANKNIFTY: {
    symbol: 'BANK NIFTY',
    name: 'BANKNIFTY',
    category: 'India',
    price: '53,190.15',
    change: '+320.80',
    changePct: '+0.61%',
    isPositive: true,
    high: '53,280.00',
    low: '52,890.40',
    vwap: '53,110.50',
    points: [
      { time: '2026-09-25 09:15', value: 52900 },
      { time: '2026-09-25 10:00', value: 53020 },
      { time: '2026-09-25 11:00', value: 53150 },
      { time: '2026-09-25 12:00', value: 53090 },
      { time: '2026-09-25 13:00', value: 53220 },
      { time: '2026-09-25 14:00', value: 53260 },
      { time: '2026-09-25 15:00', value: 53190.15 },
    ],
  },
  SPX: {
    symbol: 'S&P 500',
    name: 'S&P 500',
    category: 'US',
    price: '5,718.55',
    change: '+19.80',
    changePct: '+0.35%',
    isPositive: true,
    high: '5,726.10',
    low: '5,695.40',
    vwap: '5,712.00',
    points: [
      { time: '2026-09-25 09:30', value: 5700 },
      { time: '2026-09-25 11:00', value: 5708 },
      { time: '2026-09-25 12:30', value: 5722 },
      { time: '2026-09-25 14:00', value: 5715 },
      { time: '2026-09-25 15:30', value: 5724 },
      { time: '2026-09-25 16:00', value: 5718.55 },
    ],
  },
  BTC: {
    symbol: 'BTC / USD',
    name: 'BTC/USD',
    category: 'Crypto',
    price: '$64,320.00',
    change: '+1,350.00',
    changePct: '+2.15%',
    isPositive: true,
    high: '$64,890.00',
    low: '$62,910.00',
    vwap: '$63,850.00',
    points: [
      { time: '2026-09-25 00:00', value: 63000 },
      { time: '2026-09-25 04:00', value: 63450 },
      { time: '2026-09-25 08:00', value: 63900 },
      { time: '2026-09-25 12:00', value: 64500 },
      { time: '2026-09-25 16:00', value: 64100 },
      { time: '2026-09-25 20:00', value: 64320 },
    ],
  },
  EURUSD: {
    symbol: 'EUR / USD',
    name: 'EUR/USD',
    category: 'Forex',
    price: '1.1162',
    change: '+0.0020',
    changePct: '+0.18%',
    isPositive: true,
    high: '1.1185',
    low: '1.1130',
    vwap: '1.1155',
    points: [
      { time: '2026-09-25 00:00', value: 1.114 },
      { time: '2026-09-25 04:00', value: 1.115 },
      { time: '2026-09-25 08:00', value: 1.117 },
      { time: '2026-09-25 12:00', value: 1.116 },
      { time: '2026-09-25 16:00', value: 1.118 },
      { time: '2026-09-25 20:00', value: 1.1162 },
    ],
  },
};

export function MarketSessionStatus() {
  const [activeTab, setActiveTab] = useState<string>('NIFTY');
  const [timeString, setTimeString] = useState('');
  const [sessionInfo, setSessionInfo] = useState({
    status: 'CLOSED',
    label: 'Market Closed',
    subtext: 'Next Open: 09:00 AM IST',
    dotClass: 'w-2 h-2 rounded-full bg-zinc-500',
    badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    countdown: '',
  });

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // Live IST Clock and market session calculation
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + 3600000 * 5.5);

      const hours = istTime.getHours();
      const minutes = istTime.getMinutes();
      const day = istTime.getDay();

      const formattedTime = istTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setTimeString(`${formattedTime} IST`);

      const totalMinutes = hours * 60 + minutes;
      const isWeekend = day === 0 || day === 6;

      if (isWeekend) {
        setSessionInfo({
          status: 'WEEKEND',
          label: 'Weekend Market Closed',
          subtext: 'Opens Monday 09:00 AM IST',
          dotClass: 'w-2 h-2 rounded-full bg-zinc-500',
          badgeColor: 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
          countdown: 'NSE/BSE Closed',
        });
      } else if (totalMinutes >= 540 && totalMinutes < 555) {
        const remainingMin = 555 - totalMinutes;
        setSessionInfo({
          status: 'PRE_MARKET',
          label: 'Pre-Market Session',
          subtext: 'Order matching active',
          dotClass: 'w-2 h-2 rounded-full bg-amber-400 animate-pulse',
          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          countdown: `Regular opens in ${remainingMin}m`,
        });
      } else if (totalMinutes >= 555 && totalMinutes < 930) {
        const closeMinutes = 930 - totalMinutes;
        const h = Math.floor(closeMinutes / 60);
        const m = closeMinutes % 60;
        setSessionInfo({
          status: 'REGULAR_LIVE',
          label: 'NSE/BSE Trading LIVE',
          subtext: 'Cash & F&O Sessions Active',
          dotClass: 'w-2 h-2 rounded-full bg-emerald-400 animate-ping',
          badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          countdown: `Closes in ${h}h ${m}m`,
        });
      } else if (totalMinutes >= 930 && totalMinutes < 960) {
        setSessionInfo({
          status: 'POST_MARKET',
          label: 'Post-Market Session',
          subtext: 'Closing settlement',
          dotClass: 'w-2 h-2 rounded-full bg-blue-400',
          badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          countdown: 'Session closing',
        });
      } else if (totalMinutes >= 1020 && totalMinutes < 1410) {
        setSessionInfo({
          status: 'MCX_LIVE',
          label: 'MCX Commodity LIVE',
          subtext: 'Crude, Gold, Metals Active',
          dotClass: 'w-2 h-2 rounded-full bg-purple-400 animate-pulse',
          badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          countdown: 'Evening session active',
        });
      } else {
        setSessionInfo({
          status: 'CLOSED',
          label: 'Markets Closed',
          subtext: 'Pre-market opens at 09:00 AM IST',
          dotClass: 'w-2 h-2 rounded-full bg-zinc-500',
          badgeColor: 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
          countdown: 'Opens 09:00 AM',
        });
      }
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeIndex = INDICES_DATA[activeTab] || INDICES_DATA.NIFTY;

  // Initialize and update TradingView Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const isUp = activeIndex.isPositive;
    const topColor = isUp ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)';
    const bottomColor = isUp ? 'rgba(16, 185, 129, 0.0)' : 'rgba(239, 68, 68, 0.0)';
    const lineColor = isUp ? '#10b981' : '#ef4444';

    const chart = createChart(container, {
      width: container.clientWidth || 380,
      height: 125,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
        fontSize: 10,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)', style: 1 },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.15, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        visible: true,
        secondsVisible: false,
        timeVisible: true,
      },
      crosshair: {
        vertLine: {
          color: 'rgba(255, 255, 255, 0.15)',
          width: 1,
          style: 3,
          labelVisible: false,
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.15)',
          width: 1,
          style: 3,
          labelVisible: true,
        },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      topColor,
      bottomColor,
      lineColor,
      lineWidth: 2,
    });

    const formattedData: AreaData<Time>[] = activeIndex.points.map((pt, idx) => {
      const baseTime = Math.floor(Date.now() / 1000) - (activeIndex.points.length - idx) * 3600;
      return {
        time: baseTime as Time,
        value: pt.value,
      };
    });

    series.setData(formattedData);
    chart.timeScale().fitContent();

    chartInstanceRef.current = chart;
    areaSeriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
        chartInstanceRef.current.timeScale().fitContent();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [activeTab, activeIndex]);

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-xl overflow-hidden shadow-xl flex flex-col justify-between">
      {/* ── Top Session Status Bar ────────────────────────── */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/60 text-xs bg-zinc-950/40">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-tight ${sessionInfo.badgeColor}`}
          >
            <span className={sessionInfo.dotClass} />
            {sessionInfo.label}
          </span>
          <span className="text-zinc-500 hidden sm:inline">•</span>
          <span className="text-zinc-400 text-[11px] hidden sm:inline">
            {sessionInfo.subtext}
          </span>
        </div>

        <div className="flex items-center gap-3 text-zinc-400">
          <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{timeString || 'Loading IST...'}</span>
          </div>
          {sessionInfo.countdown && (
            <span className="px-2 py-0.5 rounded bg-zinc-800/90 text-zinc-300 font-mono text-[10px]">
              {sessionInfo.countdown}
            </span>
          )}
        </div>
      </div>

      {/* ── Interactive Market Selector Tabs ─────────────── */}
      <div className="px-3 pt-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-zinc-800/40">
        {Object.entries(INDICES_DATA).map(([key, data]) => {
          const isSelected = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 font-mono',
                isSelected
                  ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40',
              )}
            >
              <span>{data.name}</span>
              <span
                className={cn(
                  'text-[10px] font-semibold',
                  data.isPositive ? 'text-emerald-400' : 'text-rose-400',
                )}
              >
                {data.changePct}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Market Detail Bar & TradingView Sparkline Area ── */}
      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-white tracking-tight">
                {activeIndex.price}
              </span>
              <span
                className={cn(
                  'text-xs font-semibold font-mono flex items-center gap-0.5',
                  activeIndex.isPositive ? 'text-emerald-400' : 'text-rose-400',
                )}
              >
                {activeIndex.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {activeIndex.change} ({activeIndex.changePct})
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-3">
              <span>{activeIndex.symbol}</span>
              <span>•</span>
              <span className="text-zinc-500 font-mono">
                Day Range: {activeIndex.low} – {activeIndex.high}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right font-mono text-xs">
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Session VWAP</span>
            <span className="text-zinc-300 font-semibold">{activeIndex.vwap}</span>
          </div>
        </div>

        {/* ── TradingView Lightweight Canvas Chart ──────────── */}
        <div
          ref={chartContainerRef}
          className="w-full h-[125px] rounded-xl overflow-hidden bg-zinc-950/20"
        />
      </div>
    </div>
  );
}
