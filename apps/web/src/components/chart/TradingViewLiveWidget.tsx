// ──────────────────────────────────────────────
// TradeMind — TradingView Live Terminal Widget
//
// Powered by the official TradingView Advanced Real-Time Charting Widget.
// Features:
// - Live multi-market data (Indian NSE/BSE, Global Crypto, US Stocks, Forex)
// - Automatic symbol resolution for F&O options/futures to underlying tickers
// - CSP-safe script injection with error boundary and fallback
// - React-safe isolated DOM mount (zero 'removeChild' DOM reconciliation errors)
// - Full left-side vector drawing toolbar (Trendlines, Fib, Long/Short box, etc.)
// - Full top timeframe switcher (1m, 3m, 5m, 15m, 30m, 1h, 4h, 1D, 1W)
// - Seamless dark theme (#09090b) matching TradeMind UI
// ──────────────────────────────────────────────

'use client';

import React, { useEffect, useRef, useState, memo, Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Layers, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveTradingViewSymbol } from '@/lib/tradingview-symbols';

export interface TradingViewLiveWidgetProps {
  symbol?: string;
  interval?: string;
  theme?: 'dark' | 'light';
  timezone?: string;
  className?: string;
  height?: number | string;
  hideSideToolbar?: boolean;
  allowSymbolChange?: boolean;
  onFallbackToCanvas?: () => void;
  onSymbolChange?: (symbol: string) => void;
}

// ── Local Error Boundary to catch any 3rd-party widget crashes ───────────────
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WidgetErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[TradingView Widget Boundary Error]', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

function TradingViewLiveWidgetInternal({
  symbol = 'BINANCE:ETHUSDT',
  interval = '5',
  theme = 'dark',
  timezone = 'Asia/Kolkata',
  className,
  height = '100%',
  hideSideToolbar,
  allowSymbolChange = true,
  onFallbackToCanvas,
  onSymbolChange,
}: TradingViewLiveWidgetProps) {
  // CRITICAL: chartMountRef is an isolated DOM leaf with ZERO React children.
  // This guarantees that script innerHTML mutations never collide with React's reconciler.
  const chartMountRef = useRef<HTMLDivElement>(null);
  const containerIdRef = useRef<string>(`tv_chart_container_${Math.random().toString(36).substring(2, 9)}`);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [symbolOverride, setSymbolOverride] = useState<string | null>(null);

  // Reset override if parent symbol prop changes
  useEffect(() => {
    setSymbolOverride(null);
  }, [symbol]);

  // Smart responsive toolbar: on mobile (<640px), auto-hide side toolbar to give maximum room for candles
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
  const effectiveHideToolbar = hideSideToolbar !== undefined ? hideSideToolbar : isMobile;

  // Normalize symbol to valid TradingView ticker
  const activeSymbol = symbolOverride || symbol;
  const resolved = resolveTradingViewSymbol(activeSymbol);
  const targetSymbol = resolved.cleanSymbol;

  const handleSwitchExchange = (newSym: string) => {
    setSymbolOverride(newSym);
    if (onSymbolChange) {
      onSymbolChange(newSym);
    }
  };

  const initWidget = () => {
    const containerId = containerIdRef.current;
    if (!chartMountRef.current) return;

    // Reset ONLY the isolated mount container
    chartMountRef.current.innerHTML = `<div id="${containerId}" style="width: 100%; height: 100%;"></div>`;

    if (typeof (window as any).TradingView !== 'undefined') {
      try {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: targetSymbol,
          interval,
          timezone,
          theme,
          style: '1', // Candlestick
          locale: 'en',
          toolbar_bg: '#09090b',
          enable_publishing: false,
          hide_side_toolbar: effectiveHideToolbar,
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
        setIsInitializing(false);
        setLoadError(null);
      } catch (err: any) {
        console.error('[TradingView Widget Init Error]', err);
        setLoadError(err?.message ?? 'Failed to initialize TradingView terminal.');
        setIsInitializing(false);
      }
    } else {
      setLoadError('TradingView library failed to load.');
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsInitializing(true);
    setLoadError(null);

    // If already loaded globally
    if (typeof (window as any).TradingView !== 'undefined') {
      initWidget();
      return () => {
        isMounted = false;
        if (chartMountRef.current) {
          chartMountRef.current.innerHTML = '';
        }
      };
    }

    // Script injection check
    let script = document.getElementById('tradingview-tv-script') as HTMLScriptElement | null;
    let pollInterval: NodeJS.Timeout | null = null;
    let timeoutTimer: NodeJS.Timeout | null = null;

    if (!script) {
      script = document.createElement('script');
      script.id = 'tradingview-tv-script';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;

      script.onload = () => {
        if (isMounted) initWidget();
      };

      script.onerror = () => {
        if (isMounted) {
          setLoadError('TradingView script was blocked by browser or network.');
          setIsInitializing(false);
        }
      };

      document.head.appendChild(script);
    } else {
      // Script already injected, wait for window.TradingView
      pollInterval = setInterval(() => {
        if (!isMounted) return;
        if (typeof (window as any).TradingView !== 'undefined') {
          if (pollInterval) clearInterval(pollInterval);
          initWidget();
        }
      }, 100);
    }

    // Safety timeout: If after 4.5 seconds TradingView still hasn't initialized, show graceful fallback
    timeoutTimer = setTimeout(() => {
      if (isMounted && typeof (window as any).TradingView === 'undefined') {
        if (pollInterval) clearInterval(pollInterval);
        setLoadError('Connection timed out while loading TradingView library.');
        setIsInitializing(false);
      }
    }, 4500);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (chartMountRef.current) {
        chartMountRef.current.innerHTML = '';
      }
    };
  }, [targetSymbol, interval, theme, timezone, effectiveHideToolbar, allowSymbolChange]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Underlying asset notice or Canvas fallback recommendation */}
      {(resolved.isDerivative || resolved.suggestCanvasFallback || resolved.bseAlternative) && (
        <div className="px-3.5 py-1.5 bg-zinc-900/90 border-b border-border/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              Feed: <strong className="text-white font-mono">{targetSymbol}</strong>
              {resolved.isDerivative && (
                <span className="text-zinc-400"> (Underlying of {activeSymbol})</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {targetSymbol.startsWith('NSE:') && resolved.bseAlternative && (
              <button
                type="button"
                onClick={() => handleSwitchExchange(resolved.bseAlternative!)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-medium transition-colors cursor-pointer"
                title="If TradingView shows 'symbol only available on TradingView' for NSE, switch to BSE feed which is embed-enabled"
              >
                <span>🔄 Try {resolved.bseAlternative}</span>
              </button>
            )}

            {targetSymbol.startsWith('BSE:') && resolved.underlying && (
              <button
                type="button"
                onClick={() => handleSwitchExchange(`NSE:${resolved.underlying}`)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[10px] font-medium transition-colors cursor-pointer"
                title="Switch to NSE feed"
              >
                <span>🔄 Try NSE feed</span>
              </button>
            )}

            {onFallbackToCanvas && (
              <button
                type="button"
                onClick={onFallbackToCanvas}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold transition-colors cursor-pointer"
                title="Switch to TradeMind Native Canvas Chart with 100% data availability, trade markers, and zero external blocks"
              >
                <LineChart className="w-3 h-3" />
                <span>Switch to Native Canvas Replay</span>
              </button>
            )}
            <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Stream
            </span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div
        className={cn('relative w-full flex-1 rounded-2xl overflow-hidden bg-zinc-950 border border-border/40 shadow-inner', className)}
        style={{ minHeight: typeof height === 'number' ? `${height}px` : height }}
      >
        {/* ISOLATED LEAF NODE: Zero React Children Inside. TradingView mounts here. */}
        <div ref={chartMountRef} className="w-full h-full" />

        {/* Loading Overlay — Sibling to chartMountRef, not child */}
        {isInitializing && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-zinc-950/90 backdrop-blur-xs z-10 pointer-events-none">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center animate-pulse">
              <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
            </div>
            <p className="text-xs text-slate-400 font-mono animate-pulse">
              Connecting to TradingView Real-Time Terminal ({targetSymbol})...
            </p>
          </div>
        )}

        {/* Fallback & Error Overlay */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-zinc-950 z-20">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-white">TradingView Live Feed Offline</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {loadError} You can retry the live feed or view the trade in the zero-latency Execution Replay canvas.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsInitializing(true);
                  setLoadError(null);
                  initWidget();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>

              {resolved.bseAlternative && targetSymbol.startsWith('NSE:') && (
                <button
                  type="button"
                  onClick={() => {
                    handleSwitchExchange(resolved.bseAlternative!);
                    setIsInitializing(true);
                    setLoadError(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-xs font-semibold border border-amber-500/40 transition-colors cursor-pointer"
                >
                  <span>Try BSE Feed ({resolved.bseAlternative})</span>
                </button>
              )}

              {onFallbackToCanvas && (
                <button
                  type="button"
                  onClick={onFallbackToCanvas}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer"
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span>Switch to Execution Replay</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TradingViewLiveWidgetSafe(props: TradingViewLiveWidgetProps) {
  return (
    <WidgetErrorBoundary
      fallback={(err, reset) => (
        <div className="relative w-full h-[580px] rounded-2xl overflow-hidden bg-zinc-950 border border-border/40 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="text-sm font-bold text-white">Live Terminal Encoutered an Issue</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {err?.message || 'Unexpected widget error'}. You can reset the chart or switch to Execution Replay.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Widget</span>
            </button>
            {props.onFallbackToCanvas && (
              <button
                type="button"
                onClick={props.onFallbackToCanvas}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer"
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Switch to Execution Replay</span>
              </button>
            )}
          </div>
        </div>
      )}
    >
      <TradingViewLiveWidgetInternal {...props} />
    </WidgetErrorBoundary>
  );
}

export const TradingViewLiveWidget = memo(TradingViewLiveWidgetSafe);
