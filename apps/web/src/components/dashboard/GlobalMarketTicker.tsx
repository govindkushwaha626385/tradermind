'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Globe,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketItem {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
  region: 'INDIA' | 'US' | 'CRYPTO' | 'FOREX';
}

const DEFAULT_MARKETS: MarketItem[] = [
  { symbol: 'NIFTY 50', name: 'NSE Nifty', price: '25,840.50', change: '+0.42%', isPositive: true, region: 'INDIA' },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', price: '53,910.20', change: '+0.68%', isPositive: true, region: 'INDIA' },
  { symbol: 'S&P 500', name: 'US 500', price: '5,718.55', change: '+0.35%', isPositive: true, region: 'US' },
  { symbol: 'NASDAQ', name: 'US Tech 100', price: '18,074.50', change: '+0.52%', isPositive: true, region: 'US' },
  { symbol: 'BTC / USD', name: 'Bitcoin', price: '$64,320.00', change: '+2.15%', isPositive: true, region: 'CRYPTO' },
  { symbol: 'ETH / USD', name: 'Ethereum', price: '$2,650.00', change: '+1.85%', isPositive: true, region: 'CRYPTO' },
  { symbol: 'EUR / USD', name: 'Euro / Dollar', price: '1.1150', change: '+0.08%', isPositive: true, region: 'FOREX' },
  { symbol: 'USD / INR', name: 'Dollar / Rupee', price: '₹83.65', change: '-0.05%', isPositive: false, region: 'FOREX' },
];

export function GlobalMarketTicker({ className }: { className?: string }) {
  const [markets] = useState<MarketItem[]>(DEFAULT_MARKETS);
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const ist = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrentTime(ist);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine market open/closed status (IST)
  const isIndianMarketOpen = () => {
    const now = new Date();
    // Convert to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
    const day = istDate.getDay();
    if (day === 0 || day === 6) return false;
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30;
  };

  const nseOpen = isIndianMarketOpen();

  return (
    <div className={cn('w-full border-b border-border/40 bg-zinc-950/70 backdrop-blur-md select-none transition-all duration-200', className)}>
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-[11px]">
        {/* Left: Market Session Status Badges */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 font-mono text-[10px] font-semibold text-zinc-300">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                nseOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500',
              )}
            />
            <span>NSE {nseOpen ? 'LIVE' : 'CLOSED'}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 font-mono text-[10px] font-semibold text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>CRYPTO 24/7</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-zinc-400 font-mono text-[10px]">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span>IST: {currentTime || '--:--:--'}</span>
          </div>
        </div>

        {/* Center: Scrolling Marquee Tape */}
        {!collapsed && (
          <div className="flex-1 overflow-hidden mx-4 relative [mask-image:linear-gradient(to_right,transparent,black_15px,black_calc(100%-15px),transparent)]">
            <div className="flex items-center gap-6 whitespace-nowrap animate-ticker hover:[animation-play-state:paused] cursor-default">
              {[...markets, ...markets].map((m, idx) => (
                <div key={`${m.symbol}-${idx}`} className="inline-flex items-center gap-2 font-mono text-[11px]">
                  <span className="font-semibold text-zinc-300">{m.symbol}</span>
                  <span className="text-zinc-100">{m.price}</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.2 rounded',
                      m.isPositive
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-rose-400 bg-rose-500/10',
                    )}
                  >
                    {m.isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {m.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right: Collapse / Expand Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition-colors ml-2 shrink-0"
          title={collapsed ? 'Show Market Ticker' : 'Hide Market Ticker'}
          aria-label="Toggle market ticker"
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
