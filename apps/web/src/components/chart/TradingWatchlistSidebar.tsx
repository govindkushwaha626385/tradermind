// ──────────────────────────────────────────────
// TradeMind — Trading Watchlist Sidebar
//
// Categorized Multi-Market Watchlist for Indian & Global Markets:
// - Indian Indices & Stocks (NSE / BSE)
// - Global Crypto (Binance / Bybit)
// - US Equities & Tech (NASDAQ / NYSE)
// - Global Forex & Commodities (OANDA / FX / MCX)
// ──────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Flame,
  Globe,
  Coins,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WatchlistItem {
  symbol: string;         // TradingView symbol format, e.g., 'NSE:NIFTY'
  name: string;           // Display title, e.g., 'NIFTY 50'
  category: 'indian' | 'crypto' | 'us' | 'forex';
  exchange: string;
  price?: string;
  change?: string;
  isPositive?: boolean;
}

export const WATCHLIST_PRESETS: WatchlistItem[] = [
  // 🇮🇳 Indian Market
  { symbol: 'NSE:NIFTY', name: 'NIFTY 50', category: 'indian', exchange: 'NSE', price: '25,385.40', change: '+0.56%', isPositive: true },
  { symbol: 'NSE:BANKNIFTY', name: 'BANK NIFTY', category: 'indian', exchange: 'NSE', price: '53,910.20', change: '+0.68%', isPositive: true },
  { symbol: 'BSE:SENSEX', name: 'BSE SENSEX', category: 'indian', exchange: 'BSE', price: '83,184.80', change: '+0.50%', isPositive: true },
  { symbol: 'NSE:FINNIFTY', name: 'FINNIFTY', category: 'indian', exchange: 'NSE', price: '24,688.00', change: '+0.35%', isPositive: true },
  { symbol: 'NSE:RELIANCE', name: 'RELIANCE', category: 'indian', exchange: 'NSE', price: '3,014.20', change: '+1.15%', isPositive: true },
  { symbol: 'NSE:HDFCBANK', name: 'HDFC BANK', category: 'indian', exchange: 'NSE', price: '1,642.50', change: '-0.30%', isPositive: false },
  { symbol: 'NSE:TCS', name: 'TCS', category: 'indian', exchange: 'NSE', price: '4,285.00', change: '+0.80%', isPositive: true },
  { symbol: 'BSE:POLICYBZR', name: 'POLICY BAZAAR', category: 'indian', exchange: 'BSE', price: '1,885.20', change: '+2.40%', isPositive: true },
  { symbol: 'BSE:ZOMATO', name: 'ZOMATO', category: 'indian', exchange: 'BSE', price: '274.60', change: '+1.85%', isPositive: true },

  // 🪙 Crypto 24/7
  { symbol: 'BINANCE:ETHUSDT', name: 'ETH / USDT', category: 'crypto', exchange: 'Binance', price: '$2,684.60', change: '+0.11%', isPositive: true },
  { symbol: 'BINANCE:BTCUSDT', name: 'BTC / USDT', category: 'crypto', exchange: 'Binance', price: '$64,320.00', change: '+2.15%', isPositive: true },
  { symbol: 'BINANCE:SOLUSDT', name: 'SOL / USDT', category: 'crypto', exchange: 'Binance', price: '$152.40', change: '+4.20%', isPositive: true },
  { symbol: 'BINANCE:XRPUSDT', name: 'XRP / USDT', category: 'crypto', exchange: 'Binance', price: '$0.589', change: '-0.45%', isPositive: false },
  { symbol: 'BINANCE:DOGEUSDT', name: 'DOGE / USDT', category: 'crypto', exchange: 'Binance', price: '$0.108', change: '+1.80%', isPositive: true },

  // 🇺🇸 US Equities & Tech
  { symbol: 'SP:SPX', name: 'S&P 500', category: 'us', exchange: 'CBOE', price: '$5,718.55', change: '+0.35%', isPositive: true },
  { symbol: 'NASDAQ:NDX', name: 'NASDAQ 100', category: 'us', exchange: 'NASDAQ', price: '$18,074.50', change: '+0.52%', isPositive: true },
  { symbol: 'NASDAQ:NVDA', name: 'NVIDIA', category: 'us', exchange: 'NASDAQ', price: '$128.40', change: '+3.10%', isPositive: true },
  { symbol: 'NASDAQ:AAPL', name: 'APPLE', category: 'us', exchange: 'NASDAQ', price: '$227.80', change: '+0.25%', isPositive: true },
  { symbol: 'NASDAQ:TSLA', name: 'TESLA', category: 'us', exchange: 'NASDAQ', price: '$254.20', change: '-1.40%', isPositive: false },

  // 💱 Forex & Commodities
  { symbol: 'FX:EURUSD', name: 'EUR / USD', category: 'forex', exchange: 'FX', price: '1.1162', change: '+0.18%', isPositive: true },
  { symbol: 'FX:GBPUSD', name: 'GBP / USD', category: 'forex', exchange: 'FX', price: '1.3325', change: '+0.22%', isPositive: true },
  { symbol: 'FX:USDJPY', name: 'USD / JPY', category: 'forex', exchange: 'FX', price: '143.85', change: '-0.35%', isPositive: false },
  { symbol: 'OANDA:XAUUSD', name: 'GOLD (XAU/USD)', category: 'forex', exchange: 'OANDA', price: '$2,658.40', change: '+0.45%', isPositive: true },
  { symbol: 'TVC:USOIL', name: 'CRUDE OIL', category: 'forex', exchange: 'TVC', price: '$71.20', change: '-0.85%', isPositive: false },
];

interface TradingWatchlistSidebarProps {
  activeSymbol: string;
  onSelectSymbol: (symbol: string, item: WatchlistItem) => void;
  className?: string;
  defaultCollapsed?: boolean;
}

export function TradingWatchlistSidebar({
  activeSymbol,
  onSelectSymbol,
  className,
  defaultCollapsed = false,
}: TradingWatchlistSidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'indian' | 'crypto' | 'us' | 'forex'>('all');

  const filteredItems = WATCHLIST_PRESETS.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.symbol.toLowerCase().includes(search.toLowerCase()) ||
      item.exchange.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className={cn(
        'relative flex flex-col bg-zinc-950 border-l border-zinc-800/80 transition-all duration-300 select-none overflow-hidden',
        collapsed ? 'w-12' : 'w-72 sm:w-80',
        className
      )}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -left-3.5 top-5 z-20 w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        title={collapsed ? 'Expand Watchlist' : 'Collapse Watchlist'}
      >
        {collapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {collapsed ? (
        <div className="flex flex-col items-center py-6 gap-4 text-zinc-400">
          <Layers className="w-5 h-5 text-indigo-400" />
          <div className="rotate-90 text-xs font-mono tracking-wider font-semibold whitespace-nowrap mt-8">
            WATCHLIST
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-3.5 border-b border-zinc-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-zinc-200 tracking-wide flex items-center gap-1.5 font-sans">
                <Layers className="w-4 h-4 text-indigo-400" />
                Global Watchlist
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                Live Feeds
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search symbol, index, crypto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 mt-2.5 overflow-x-auto scrollbar-none pb-0.5 text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'indian', label: '🇮🇳 India' },
                { id: 'crypto', label: '🪙 Crypto' },
                { id: 'us', label: '🇺🇸 US' },
                { id: 'forex', label: '💱 FX/Metals' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={cn(
                    'px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-all',
                    activeCategory === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Asset List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/80 scrollbar-thin">
            {filteredItems.map((item) => {
              const isActive = activeSymbol === item.symbol;
              return (
                <button
                  key={item.symbol}
                  onClick={() => onSelectSymbol(item.symbol, item)}
                  className={cn(
                    'w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors font-mono group',
                    isActive
                      ? 'bg-indigo-500/10 border-l-2 border-indigo-500 text-white'
                      : 'hover:bg-zinc-900/70 text-zinc-300'
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-xs font-bold font-sans truncate', isActive && 'text-indigo-400')}>
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-normal">
                      {item.exchange} · {item.symbol.split(':')[1] || item.symbol}
                    </span>
                  </div>

                  {item.price && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-zinc-200 tabular-nums">
                        {item.price}
                      </div>
                      <div
                        className={cn(
                          'text-[10px] font-semibold tabular-nums',
                          item.isPositive ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {item.change}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Status */}
          <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-900/40 text-[10px] text-zinc-500 flex items-center justify-between font-mono">
            <span>TradingView Feeds</span>
            <span className="flex items-center gap-1 text-emerald-400 font-sans font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
