'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Flame,
  Globe2,
} from 'lucide-react';

interface MarketIndex {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePct: string;
  isPositive: boolean;
}

const INITIAL_INDICES: MarketIndex[] = [
  { symbol: 'NIFTY 50', name: 'NIFTY', price: '25,385.40', change: '+142.30', changePct: '+0.56%', isPositive: true },
  { symbol: 'BANK NIFTY', name: 'BANKNIFTY', price: '53,190.15', change: '+320.80', changePct: '+0.61%', isPositive: true },
  { symbol: 'FIN NIFTY', name: 'FINNIFTY', price: '24,680.00', change: '+85.20', changePct: '+0.35%', isPositive: true },
  { symbol: 'INDIA VIX', name: 'VIX', price: '12.45', change: '-0.38', changePct: '-2.96%', isPositive: false },
  { symbol: 'SENSEX', name: 'BSE SENSEX', price: '83,184.80', change: '+415.60', changePct: '+0.50%', isPositive: true },
  { symbol: 'CRUDEOIL', name: 'MCX CRUDE', price: '6,140.00', change: '-32.00', changePct: '-0.52%', isPositive: false },
];

export function MarketSessionStatus() {
  const [timeString, setTimeString] = useState('');
  const [sessionInfo, setSessionInfo] = useState({
    status: 'CLOSED',
    label: 'Market Closed',
    subtext: 'Next Open: 09:00 AM IST',
    dotClass: 'market-closed-dot',
    badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    countdown: '',
  });

  useEffect(() => {
    function updateClock() {
      // Calculate current IST time
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + 3600000 * 5.5);

      const hours = istTime.getHours();
      const minutes = istTime.getMinutes();
      const seconds = istTime.getSeconds();
      const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday

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
        // 09:00 - 09:15
        const remainingMin = 555 - totalMinutes;
        setSessionInfo({
          status: 'PRE_MARKET',
          label: 'Pre-Market Session',
          subtext: 'Order matching in progress',
          dotClass: 'w-2 h-2 rounded-full bg-amber-400 market-closed-dot',
          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          countdown: `Regular opens in ${remainingMin}m`,
        });
      } else if (totalMinutes >= 555 && totalMinutes < 930) {
        // 09:15 - 15:30
        const closeMinutes = 930 - totalMinutes;
        const h = Math.floor(closeMinutes / 60);
        const m = closeMinutes % 60;
        setSessionInfo({
          status: 'REGULAR_LIVE',
          label: 'NSE/BSE Trading LIVE',
          subtext: 'Cash & F&O Sessions Active',
          dotClass: 'w-2 h-2 rounded-full bg-emerald-400 market-live-dot',
          badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          countdown: `Closes in ${h}h ${m}m`,
        });
      } else if (totalMinutes >= 930 && totalMinutes < 960) {
        // 15:30 - 16:00
        setSessionInfo({
          status: 'POST_MARKET',
          label: 'Post-Market Session',
          subtext: 'Closing price settlement',
          dotClass: 'w-2 h-2 rounded-full bg-blue-400',
          badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          countdown: 'Session closing',
        });
      } else if (totalMinutes >= 1020 && totalMinutes < 1410) {
        // 17:00 - 23:30 (MCX Commodity)
        setSessionInfo({
          status: 'MCX_LIVE',
          label: 'MCX Commodity LIVE',
          subtext: 'Crude, Gold, Metals Active',
          dotClass: 'w-2 h-2 rounded-full bg-purple-400 market-live-dot',
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

  return (
    <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl overflow-hidden shadow-lg">
      {/* ── Top Session Status Bar ────────────────────────── */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/60 text-xs">
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

      {/* ── Indices Ticker Bar ────────────────────────────── */}
      <div className="px-4 py-2 flex items-center gap-4 overflow-x-auto scrollbar-none bg-zinc-950/40">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Market Pulse</span>
        </div>

        <div className="flex items-center gap-6 text-xs shrink-0">
          {INITIAL_INDICES.map((idx) => (
            <div key={idx.symbol} className="flex items-center gap-2 font-mono">
              <span className="font-semibold text-zinc-300 text-[11px]">{idx.name}</span>
              <span className="text-white text-[11px] font-medium">{idx.price}</span>
              <span
                className={`flex items-center gap-0.5 text-[10px] font-medium ${
                  idx.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {idx.isPositive ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5" />
                )}
                {idx.changePct}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
