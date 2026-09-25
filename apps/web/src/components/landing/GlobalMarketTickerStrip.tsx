// ──────────────────────────────────────────────
// TradeMind — Live Global Multi-Asset Market Pulse Strip
// Institutional real-time ticker showing Global Indices, F&O,
// US Equities, Commodities, and Crypto with live market status.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Globe,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetTicker {
  symbol: string;
  name: string;
  region: 'US' | 'IN' | 'CRYPTO' | 'FOREX' | 'COMMODITY';
  price: number;
  changePercent: number;
  currency: string;
  prefix: string;
}

const INITIAL_ASSETS: AssetTicker[] = [
  {
    symbol: 'NIFTY 50',
    name: 'India Benchmark',
    region: 'IN',
    price: 25142.80,
    changePercent: 0.62,
    currency: 'INR',
    prefix: '₹',
  },
  {
    symbol: 'BANKNIFTY',
    name: 'Banking Index',
    region: 'IN',
    price: 53910.45,
    changePercent: 0.84,
    currency: 'INR',
    prefix: '₹',
  },
  {
    symbol: 'SPY (S&P 500)',
    name: 'US Large Cap',
    region: 'US',
    price: 574.80,
    changePercent: 0.45,
    currency: 'USD',
    prefix: '$',
  },
  {
    symbol: 'QQQ (NASDAQ)',
    name: 'US Tech 100',
    region: 'US',
    price: 489.20,
    changePercent: 0.78,
    currency: 'USD',
    prefix: '$',
  },
  {
    symbol: 'BTC/USDT',
    name: 'Bitcoin Perpetual',
    region: 'CRYPTO',
    price: 67845.00,
    changePercent: 2.85,
    currency: 'USD',
    prefix: '$',
  },
  {
    symbol: 'ETH/USDT',
    name: 'Ethereum',
    region: 'CRYPTO',
    price: 2642.50,
    changePercent: 1.74,
    currency: 'USD',
    prefix: '$',
  },
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    region: 'FOREX',
    price: 1.0874,
    changePercent: 0.12,
    currency: 'USD',
    prefix: '',
  },
  {
    symbol: 'XAU/USD',
    name: 'Spot Gold',
    region: 'COMMODITY',
    price: 2748.20,
    changePercent: 0.38,
    currency: 'USD',
    prefix: '$',
  },
];

export function GlobalMarketTickerStrip() {
  const [assets, setAssets] = useState<AssetTicker[]>(INITIAL_ASSETS);
  const [pulsingIndex, setPulsingIndex] = useState<number | null>(null);

  // Subtle real-time price fluctuation simulation to mimic live market tick feed
  useEffect(() => {
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * assets.length);
      const deltaPercent = (Math.random() - 0.48) * 0.08;
      setPulsingIndex(idx);

      setAssets((prev) =>
        prev.map((item, i) => {
          if (i !== idx) return item;
          const newPrice = item.price * (1 + deltaPercent / 100);
          const newChange = item.changePercent + deltaPercent;
          return {
            ...item,
            price: Number(newPrice.toFixed(item.price > 100 ? 2 : 4)),
            changePercent: Number(newChange.toFixed(2)),
          };
        }),
      );

      setTimeout(() => setPulsingIndex(null), 1000);
    }, 2500);

    return () => clearInterval(interval);
  }, [assets.length]);

  return (
    <div className="w-full border-y border-white/[0.08] bg-black/40 backdrop-blur-md overflow-hidden relative">
      {/* Session indicator left pill */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 text-[11px]">
        <div className="flex items-center gap-2 shrink-0 text-slate-400">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-white tracking-wide uppercase">
            Global Market Pulse
          </span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-400">
            Real-Time Tick Ingestion
          </span>
        </div>

        {/* Global ticker items */}
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none py-0.5">
          {assets.map((asset, i) => {
            const isPositive = asset.changePercent >= 0;
            const isPulsing = pulsingIndex === i;

            return (
              <div
                key={asset.symbol}
                className={cn(
                  'flex items-center gap-2 shrink-0 transition-colors duration-300 font-mono text-xs',
                  isPulsing && (isPositive ? 'text-emerald-300' : 'text-rose-300'),
                )}
              >
                <span className="text-slate-300 font-sans font-bold text-[11px]">
                  {asset.symbol}
                </span>
                <span className="text-white font-medium">
                  {asset.prefix}
                  {asset.price.toLocaleString(undefined, {
                    minimumFractionDigits: asset.price > 100 ? 2 : 4,
                    maximumFractionDigits: asset.price > 100 ? 2 : 4,
                  })}
                </span>
                <span
                  className={cn(
                    'flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded',
                    isPositive
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-rose-400 bg-rose-500/10',
                  )}
                >
                  {isPositive ? '+' : ''}
                  {asset.changePercent.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
