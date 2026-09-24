// ──────────────────────────────────────────────
// TradeMind — TradingView Live Terminal Widget
//
// Powered by the official TradingView Advanced Real-Time Charting Widget.
// 100% Free CDN Embed (Zero Extra Cost).
// Features:
// - Live multi-market data (Indian NSE/BSE, Global Crypto, US Stocks, Forex)
// - Full left-side vector drawing toolbar (Trendlines, Fib, Long/Short box, etc.)
// - Full top timeframe switcher (1m, 3m, 5m, 15m, 30m, 1h, 4h, 1D, 1W)
// - 100+ native technical indicators
// - Seamless dark theme (#09090b) matching TradeMind UI
// ──────────────────────────────────────────────

'use client';

import React, { useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';

export interface TradingViewLiveWidgetProps {
  symbol?: string;
  interval?: string;
  theme?: 'dark' | 'light';
  timezone?: string;
  className?: string;
  height?: number | string;
  hideSideToolbar?: boolean;
  allowSymbolChange?: boolean;
}

function TradingViewLiveWidgetComponent({
  symbol = 'BINANCE:ETHUSDT',
  interval = '5',
  theme = 'dark',
  timezone = 'Asia/Kolkata',
  className,
  height = '100%',
  hideSideToolbar = false,
  allowSymbolChange = true,
}: TradingViewLiveWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerIdRef = useRef<string>(`tv_chart_container_${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    const containerId = containerIdRef.current;
    let isMounted = true;

    const initWidget = () => {
      if (!isMounted || !containerRef.current) return;

      // Clear container contents
      containerRef.current.innerHTML = `<div id="${containerId}" style="width: 100%; height: 100%;"></div>`;

      if (typeof (window as any).TradingView !== 'undefined') {
        try {
          new (window as any).TradingView.widget({
            autosize: true,
            symbol,
            interval,
            timezone,
            theme,
            style: '1', // Candlestick style
            locale: 'en',
            toolbar_bg: '#09090b',
            enable_publishing: false,
            hide_side_toolbar: hideSideToolbar,
            allow_symbol_change: allowSymbolChange,
            container_id: containerId,
            backgroundColor: '#09090b',
            gridColor: 'rgba(255, 255, 255, 0.04)',
            withdateranges: true,
            hide_legend: false,
            save_image: true,
            studies: [
              'Volume@tv-basicstudies',
              'MASimple@tv-basicstudies',
            ],
          });
        } catch (e) {
          console.error('[TradingView Widget Init Error]', e);
        }
      }
    };

    // Load TradingView TV.js script if not present
    if (!document.getElementById('tradingview-tv-script')) {
      const script = document.createElement('script');
      script.id = 'tradingview-tv-script';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => {
        if (isMounted) initWidget();
      };
      document.head.appendChild(script);
    } else {
      // Script already loaded or in progress
      if (typeof (window as any).TradingView !== 'undefined') {
        initWidget();
      } else {
        const existingScript = document.getElementById('tradingview-tv-script') as HTMLScriptElement;
        const prevOnload = existingScript.onload;
        existingScript.onload = (e) => {
          if (prevOnload) (prevOnload as any)(e);
          if (isMounted) initWidget();
        };
      }
    }

    return () => {
      isMounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, interval, theme, timezone, hideSideToolbar, allowSymbolChange]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full rounded-2xl overflow-hidden bg-zinc-950 border border-border/40 shadow-inner', className)}
      style={{ height }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground animate-pulse font-mono">
        Connecting to TradingView Real-Time Engine...
      </div>
    </div>
  );
}

export const TradingViewLiveWidget = memo(TradingViewLiveWidgetComponent);
